const crypto = require('crypto');
const config = require('../config');

function b64uToBuffer(value) {
  const normalised = String(value).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalised, 'base64');
}

/**
 * Verifies an offline license token: base64url(payload).base64url(signature)
 * signed with the vendor's Ed25519 private key.
 */
function verifyToken(token) {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'malformed' };
  }

  let payload;
  try {
    payload = JSON.parse(b64uToBuffer(parts[0]).toString('utf8'));
  } catch (e) {
    return { valid: false, reason: 'malformed' };
  }

  let ok = false;
  try {
    ok = crypto.verify(
      null,
      Buffer.from(parts[0], 'utf8'),
      crypto.createPublicKey(config.PUBLIC_KEY),
      b64uToBuffer(parts[1])
    );
  } catch (e) {
    return { valid: false, reason: 'bad_signature' };
  }

  if (!ok) return { valid: false, reason: 'bad_signature' };

  const now = Date.now();
  const expiresAt = Number(payload.expiresAt) || 0;
  const graceMs = (Number(payload.graceDays) || config.GRACE_DAYS) * 86400000;

  if (expiresAt && now > expiresAt + graceMs) {
    return { valid: false, reason: 'expired', payload };
  }

  return {
    valid: true,
    inGrace: Boolean(expiresAt && now > expiresAt),
    payload
  };
}

module.exports = { verifyToken, b64uToBuffer };
