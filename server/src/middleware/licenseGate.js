/**
 * licenseGate.js
 *
 * Defence-in-depth check for the desktop/subscription build.
 *
 * The Electron shell owns activation and writes a signed token to disk. The
 * engine re-verifies that token on every non-GET /api/scrape call so a user
 * cannot simply delete the activation screen and keep scraping.
 *
 * Disabled (pass-through) when LICENSE_PUBLIC_KEY is not configured, which is
 * the normal case for local development and self-hosted server deployments.
 */

const crypto = require('crypto');
const fs = require('fs');

const credits = require('../services/credits');

const CACHE_TTL_MS = 30 * 1000;
let cached = null;
let cachedAt = 0;
let cachedMtime = 0;

function b64uToBuffer(value) {
  const normalised = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalised, 'base64');
}

function readPublicKey() {
  const inline = process.env.LICENSE_PUBLIC_KEY;
  if (!inline || !String(inline).trim()) return null;
  const raw = String(inline).trim();
  if (raw.includes('BEGIN PUBLIC KEY')) return raw.replace(/\\n/g, '\n');
  return `-----BEGIN PUBLIC KEY-----\n${raw}\n-----END PUBLIC KEY-----`;
}

function verifyToken(token, publicKeyPem) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'malformed_token' };
  }

  let payload;
  try {
    payload = JSON.parse(b64uToBuffer(parts[0]).toString('utf8'));
  } catch (e) {
    return { valid: false, reason: 'malformed_payload' };
  }

  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(parts[0], 'utf8'),
      crypto.createPublicKey(publicKeyPem),
      b64uToBuffer(parts[1])
    );
  } catch (e) {
    return { valid: false, reason: 'bad_signature' };
  }

  if (!ok) return { valid: false, reason: 'bad_signature' };

  const now = Date.now();
  const expiresAt = Number(payload.expiresAt) || 0;
  const graceMs = (Number(payload.graceDays) || 0) * 24 * 60 * 60 * 1000;

  if (expiresAt && now > expiresAt + graceMs) {
    return {
      valid: false,
      reason: 'expired',
      expiredAt: new Date(expiresAt).toISOString(),
      payload
    };
  }

  return {
    valid: true,
    reason: now > expiresAt ? 'grace' : 'active',
    payload
  };
}

function readLicenseFile(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch (e) {
    return { valid: false, reason: 'missing_license' };
  }

  if (cached && stat.mtimeMs === cachedMtime && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  let token = '';
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    token = parsed.token || parsed.license || '';
  } catch (e) {
    return { valid: false, reason: 'unreadable_license' };
  }

  const publicKey = readPublicKey();
  if (!publicKey) return { valid: true, reason: 'gate_disabled' };

  const result = verifyToken(token, publicKey);
  cached = result;
  cachedAt = Date.now();
  cachedMtime = stat.mtimeMs;
  return result;
}

function createLicenseGate() {
  return function licenseGate(req, res, next) {
    // Only the packaged desktop build opts in. Self-hosted and development
    // deployments keep the historical open behaviour.
    if (process.env.LICENSE_ENFORCE !== '1') return next();

    const file = process.env.LICENSE_FILE;
    if (!file || req.method === 'GET' || req.method === 'OPTIONS') return next();

    const status = readLicenseFile(file);

    /* ---------------------------------------------------------------- */
    /* Credit model (desktop).                                          */
    /*                                                                  */
    /* Free credits are a free tier: a machine with credits left may     */
    /* scrape without any licence at all. A paid plan adds a monthly     */
    /* allowance, taken from the signed token so it cannot be inflated.  */
    /* ---------------------------------------------------------------- */
    if (credits.ENFORCED) {
      const payload = status.valid ? status.payload || {} : null;

      credits.applyPlan(
        payload
          ? {
              plan: payload.plan,
              // `credits` is the monthly allowance minted into the token.
              allowance: Number(payload.credits) || 0,
              endsAt: Number(payload.periodEndsAt) || 0
            }
          : null
      );

      if (credits.canStart()) return next();

      const snapshot = credits.status();
      return res.status(402).json({
        error: 'credits_exhausted',
        reason: status.valid ? 'plan_exhausted' : 'free_credits_used',
        credits: snapshot,
        message: status.valid
          ? 'Your monthly credits are used up. They reset at the start of your next billing period.'
          : 'You have used all 1,000 free credits on this computer. Upgrade to keep scraping.'
      });
    }

    if (status.valid) return next();

    return res.status(402).json({
      error: 'subscription_required',
      reason: status.reason,
      message:
        status.reason === 'expired'
          ? 'Your subscription has expired. Renew in the app to continue scraping.'
          : 'Activate your subscription to continue scraping.'
    });
  };
}

module.exports = { createLicenseGate, verifyToken };
