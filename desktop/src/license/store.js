const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const DEFAULTS = {
  token: '',
  licenseKey: '',
  email: '',
  plan: '',
  activatedAt: 0,
  lastCheck: 0,
  trialStartedAt: 0,
  deviceId: ''
};

function file() {
  return path.join(app.getPath('userData'), 'license.json');
}

function read() {
  try {
    const raw = fs.readFileSync(file(), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

/**
 * Writes atomically. The token is encrypted with DPAPI (machine + user bound)
 * when available; it is still a signed token, so tampering is detectable.
 */
function write(data) {
  const target = file();
  const payload = { ...DEFAULTS, ...data };

  if (payload.token && safeStorage.isEncryptionAvailable()) {
    try {
      payload.token = `enc:${safeStorage.encryptString(payload.token).toString('base64')}`;
    } catch (e) {
      /* fall back to plaintext token */
    }
  }

  const tmp = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, target);
  return payload;
}

function readDecrypted() {
  const data = read();
  if (typeof data.token === 'string' && data.token.startsWith('enc:')) {
    try {
      data.token = safeStorage.decryptString(Buffer.from(data.token.slice(4), 'base64'));
    } catch (e) {
      data.token = '';
    }
  }
  return data;
}

function clear() {
  try {
    fs.unlinkSync(file());
  } catch (e) {
    /* already gone */
  }
}

module.exports = { read, readDecrypted, write, clear };
