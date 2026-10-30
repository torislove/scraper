#!/usr/bin/env node
/**
 * Mint a licence without running the HTTP service.
 *
 *   node mint.js --plan pro --days 30 --email client@agency.com
 *   node mint.js --plan pro --days 365 --device DEV-ABCD... --out client.scraperlic
 *
 * The --out file can be sent to a customer who has no internet access; they
 * import it from the activation screen.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.LICENSE_DATA || path.join(__dirname, 'data', 'licenses.json');
const KEY_FILE = process.env.LICENSE_PRIVATE_KEY_FILE || path.join(__dirname, '.keys', 'private.pem');

const PLANS = {
  starter: { maxLeads: 500, seats: 1 },
  pro: { maxLeads: 2000, seats: 3 },
  agency: { maxLeads: 10000, seats: 10 }
};

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function b64u(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { licenses: {} };
  }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function newLicenseKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return `SCRA-${block()}-${block()}-${block()}`;
}

function main() {
  const plan = arg('plan', 'pro');
  const days = Number(arg('days', '30'));
  const email = arg('email', '');
  const device = arg('device', '');
  const out = arg('out', '');
  const seats = Number(arg('seats', String((PLANS[plan] || PLANS.starter).seats)));

  if (!PLANS[plan]) {
    console.error(`Unknown plan "${plan}". Use: ${Object.keys(PLANS).join(', ')}`);
    process.exit(1);
  }

  const privateKey = fs.readFileSync(KEY_FILE, 'utf8');
  const db = loadDb();

  let key = newLicenseKey();
  while (db.licenses[key]) key = newLicenseKey();

  const now = Date.now();
  const expiresAt = now + days * 86400000;

  const record = {
    id: crypto.randomUUID(),
    key,
    plan,
    email,
    seats,
    createdAt: now,
    expiresAt,
    revoked: false,
    devices: device ? [{ id: device, name: 'Issued offline', firstSeen: now, lastSeen: now }] : []
  };

  db.licenses[key] = record;
  saveDb(db);

  const body = b64u(
    JSON.stringify({
      v: 1,
      sub: record.id,
      key,
      plan,
      email,
      deviceId: device,
      maxLeads: PLANS[plan].maxLeads,
      issuedAt: now,
      expiresAt,
      graceDays: Number(process.env.GRACE_DAYS || 7)
    })
  );
  const token = `${body}.${b64u(crypto.sign(null, Buffer.from(body, 'utf8'), privateKey))}`;

  console.log('');
  console.log('  Licence key :', key);
  console.log('  Plan        :', plan);
  console.log('  Seats       :', seats);
  console.log('  Expires     :', new Date(expiresAt).toISOString());
  console.log('');

  if (out) {
    const target = path.resolve(out);
    fs.writeFileSync(
      target,
      JSON.stringify(
        {
          product: 'scraper-desktop',
          format: 1,
          key,
          plan,
          email,
          expiresAt: new Date(expiresAt).toISOString(),
          token
        },
        null,
        2
      ),
      'utf8'
    );
    console.log('  Offline file:', target);
    console.log('');
  }
}

main();
