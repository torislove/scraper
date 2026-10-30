/**
 * Scraper licence server (minimal, dependency-light).
 *
 * Responsibilities
 *   POST /activate    bind a licence key to a device and return a signed token
 *   POST /validate    refresh a token (device must still be bound)
 *   POST /deactivate  release a seat
 *   GET  /plans       public plan catalogue
 *   POST /webhooks/razorpay   subscription payment hook (optional)
 *   POST /admin/keys  mint a key        (x-admin-token)
 *   POST /admin/revoke revoke a key     (x-admin-token)
 *
 * The private key never leaves this service. The desktop app only embeds the
 * matching public key, so a cracked installer still cannot mint licences.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const PORT = Number(process.env.PORT) || 8790;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DATA_FILE = process.env.LICENSE_DATA || path.join(__dirname, 'data', 'licenses.json');
const KEY_FILE = process.env.LICENSE_PRIVATE_KEY_FILE || path.join(__dirname, '.keys', 'private.pem');

const PLANS = {
  starter: { maxLeads: 500, credits: 2000, price: 1999, seats: 1 },
  pro: { maxLeads: 2000, credits: 10000, price: 3999, seats: 3 },
  agency: { maxLeads: 10000, credits: 50000, price: 7999, seats: 10 }
};

const FREE_CREDITS = Number(process.env.FREE_CREDITS || 1000);

function loadPrivateKey() {
  if (process.env.LICENSE_PRIVATE_KEY) {
    return String(process.env.LICENSE_PRIVATE_KEY).replace(/\\n/g, '\n');
  }
  return fs.readFileSync(KEY_FILE, 'utf8');
}

const PRIVATE_KEY = loadPrivateKey();

/* ------------------------------------------------------------------ */
/* storage                                                             */
/* ------------------------------------------------------------------ */

function loadDb() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return { licenses: {}, creditGrants: {}, ...parsed };
  } catch (e) {
    return { licenses: {}, creditGrants: {} };
  }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function newLicenseKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `SCRA-${block()}-${block()}-${block()}`;
}

/* ------------------------------------------------------------------ */
/* tokens                                                              */
/* ------------------------------------------------------------------ */

function b64u(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  const signature = crypto.sign(null, Buffer.from(body, 'utf8'), PRIVATE_KEY);
  return `${body}.${b64u(signature)}`;
}

function verifyToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  try {
    const ok = crypto.verify(
      null,
      Buffer.from(body, 'utf8'),
      crypto.createPublicKey(PRIVATE_KEY),
      Buffer.from(sig, 'base64url')
    );
    if (!ok) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

function issueToken(record, deviceId, email) {
  const now = Date.now();
  const plan = PLANS[record.plan] || PLANS.starter;

  return signToken({
    v: 1,
    sub: record.id,
    key: record.key,
    plan: record.plan,
    email: email || record.email || '',
    deviceId: deviceId || '',
    maxLeads: plan.maxLeads,
    // Monthly credit allowance. The engine trusts this number, never a local
    // setting, so a customer cannot inflate their balance by editing files.
    credits: plan.credits,
    periodEndsAt: record.expiresAt,
    issuedAt: now,
    expiresAt: record.expiresAt,
    graceDays: Number(process.env.GRACE_DAYS || 7)
  });
}

/* ------------------------------------------------------------------ */
/* app                                                                 */
/* ------------------------------------------------------------------ */

const app = express();
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  const db = loadDb();
  res.json({ ok: true, licenses: Object.keys(db.licenses).length, uptime: process.uptime() });
});

app.get('/plans', (req, res) => {
  res.json(
    Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      price: `₹${plan.price.toLocaleString('en-IN')}`,
      period: '/month',
      maxLeads: plan.maxLeads,
      credits: plan.credits,
      seats: plan.seats
    }))
  );
});

/* ------------------------------------------------------------------ */
/* free credits (one claim per computer)                               */
/* ------------------------------------------------------------------ */

/**
 * The desktop app calls this on first launch. The grant is keyed by the
 * machine fingerprint, so reinstalling the app — or wiping its data folder —
 * does not produce a second 1,000 credits.
 */
app.post('/credits/claim', (req, res) => {
  const deviceId = String((req.body || {}).deviceId || '').trim();
  if (!deviceId) {
    return res.status(400).json({ error: 'device_required', message: 'Device id is required.' });
  }

  const db = loadDb();
  db.creditGrants = db.creditGrants || {};

  const existing = db.creditGrants[deviceId];

  if (existing) {
    existing.lastSeen = Date.now();
    saveDb(db);
    return res.json({
      deviceId,
      granted: existing.granted,
      used: existing.used,
      grantedAt: existing.grantedAt,
      alreadyClaimed: true
    });
  }

  const record = {
    deviceId,
    granted: FREE_CREDITS,
    used: 0,
    grantedAt: Date.now(),
    lastSeen: Date.now()
  };

  db.creditGrants[deviceId] = record;
  saveDb(db);

  res.json({ ...record, alreadyClaimed: false });
});

/** Authoritative balance lookup (used for support and reinstalls). */
app.post('/credits/status', (req, res) => {
  const deviceId = String((req.body || {}).deviceId || '').trim();
  const db = loadDb();
  const record = (db.creditGrants || {})[deviceId];
  if (!record) return res.status(404).json({ error: 'not_found' });
  res.json({ ...record, left: Math.max(0, record.granted - record.used) });
});

app.post('/activate', (req, res) => {
  const { licenseKey, deviceId, deviceName, email } = req.body || {};
  const key = String(licenseKey || '').trim().toUpperCase();

  if (!key) return res.status(400).json({ error: 'invalid_key', message: 'Licence key is required.' });
  if (!deviceId) return res.status(400).json({ error: 'device_required', message: 'Device id is required.' });

  const db = loadDb();
  const record = db.licenses[key];

  if (!record) return res.status(404).json({ error: 'invalid_key', message: 'Licence key not found.' });
  if (record.revoked) return res.status(403).json({ error: 'revoked', message: 'This licence was revoked.' });
  if (Date.now() > record.expiresAt) {
    return res.status(402).json({ error: 'expired', message: 'This subscription has expired.' });
  }

  const seats = (PLANS[record.plan] || PLANS.starter).seats;
  const devices = record.devices || [];
  const existing = devices.find(d => d.id === deviceId);

  if (!existing && devices.length >= seats) {
    return res.status(409).json({
      error: 'seat_limit',
      message: `This key allows ${seats} computer${seats === 1 ? '' : 's'}. Deactivate another device first.`
    });
  }

  if (existing) {
    existing.lastSeen = Date.now();
    existing.name = deviceName || existing.name;
  } else {
    devices.push({ id: deviceId, name: deviceName || 'Windows PC', firstSeen: Date.now(), lastSeen: Date.now() });
  }

  record.devices = devices;
  if (email) record.email = email;
  saveDb(db);

  res.json({ token: issueToken(record, deviceId, email), plan: record.plan, expiresAt: record.expiresAt });
});

app.post('/validate', (req, res) => {
  const { token, deviceId } = req.body || {};
  const payload = verifyToken(token);

  if (!payload) return res.status(401).json({ error: 'bad_token', message: 'Invalid licence token.' });

  const db = loadDb();
  const record = db.licenses[payload.key];

  if (!record) return res.status(404).json({ error: 'not_found', message: 'Licence no longer exists.' });
  if (record.revoked) return res.status(403).json({ error: 'revoked', message: 'This licence was revoked.' });
  if (Date.now() > record.expiresAt) {
    return res.status(402).json({ error: 'expired', message: 'This subscription has expired.' });
  }

  const bound = (record.devices || []).find(d => d.id === (deviceId || payload.deviceId));
  if (!bound) return res.status(403).json({ error: 'device_mismatch', message: 'This device is not activated.' });

  bound.lastSeen = Date.now();
  saveDb(db);

  res.json({ token: issueToken(record, bound.id, record.email), plan: record.plan, expiresAt: record.expiresAt });
});

app.post('/deactivate', (req, res) => {
  const { licenseKey, deviceId } = req.body || {};
  const key = String(licenseKey || '').trim().toUpperCase();
  const db = loadDb();
  const record = db.licenses[key];

  if (!record) return res.status(404).json({ error: 'not_found' });

  record.devices = (record.devices || []).filter(d => d.id !== deviceId);
  saveDb(db);
  res.json({ ok: true, devices: record.devices.length });
});

/* ------------------------------ admin ----------------------------- */

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'admin_disabled' });
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.post('/admin/keys', requireAdmin, (req, res) => {
  const { plan = 'pro', days = 30, email = '', seats } = req.body || {};
  const planConfig = PLANS[plan] || PLANS.starter;
  const db = loadDb();

  let key = newLicenseKey();
  while (db.licenses[key]) key = newLicenseKey();

  const record = {
    id: crypto.randomUUID(),
    key,
    plan,
    email,
    seats: Number(seats) || planConfig.seats,
    createdAt: Date.now(),
    expiresAt: Date.now() + Number(days) * 86400000,
    revoked: false,
    devices: []
  };

  db.licenses[key] = record;
  saveDb(db);
  res.json({ ok: true, key, plan, expiresAt: record.expiresAt });
});

app.post('/admin/revoke', requireAdmin, (req, res) => {
  const key = String((req.body || {}).licenseKey || '').trim().toUpperCase();
  const db = loadDb();
  if (!db.licenses[key]) return res.status(404).json({ error: 'not_found' });
  db.licenses[key].revoked = true;
  saveDb(db);
  res.json({ ok: true });
});

app.post('/admin/extend', requireAdmin, (req, res) => {
  const { licenseKey, days = 30 } = req.body || {};
  const key = String(licenseKey || '').trim().toUpperCase();
  const db = loadDb();
  if (!db.licenses[key]) return res.status(404).json({ error: 'not_found' });
  const base = Math.max(Date.now(), db.licenses[key].expiresAt);
  db.licenses[key].expiresAt = base + Number(days) * 86400000;
  saveDb(db);
  res.json({ ok: true, expiresAt: db.licenses[key].expiresAt });
});

/**
 * Support tool: correct a device's free-credit record.
 *   { deviceId, used }  set the spent counter
 *   { deviceId, grant } reset a grant (only for genuine support cases)
 */
app.post('/admin/credits', requireAdmin, (req, res) => {
  const { deviceId, used, grant } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: 'device_required' });

  const db = loadDb();
  db.creditGrants = db.creditGrants || {};
  const record =
    db.creditGrants[deviceId] || {
      deviceId,
      granted: FREE_CREDITS,
      used: 0,
      grantedAt: Date.now()
    };

  if (used !== undefined) record.used = Math.max(0, Number(used) || 0);
  if (grant) {
    record.granted = Math.max(0, Number(grant) || 0);
    record.grantedAt = Date.now();
  }
  record.lastSeen = Date.now();

  db.creditGrants[deviceId] = record;
  saveDb(db);
  res.json({ ok: true, ...record, left: Math.max(0, record.granted - record.used) });
});

/**
 * Razorpay / Stripe webhook stub.
 * Verify the signature before trusting the payload, then mint or extend a key.
 * Left intentionally explicit so nothing is silently insecure.
 */
app.post('/webhooks/payment', (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'webhook_disabled' });

  const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'missing_signature' });

  const raw = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (expected !== signature) return res.status(401).json({ error: 'bad_signature' });

  res.json({ ok: true, note: 'Implement plan provisioning here.' });
});

app.use((err, req, res, next) => {
  console.error('[license-server]', err.message);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`[license-server] listening on :${PORT}`);
  console.log(`[license-server] data: ${DATA_FILE}`);
});

module.exports = app;
