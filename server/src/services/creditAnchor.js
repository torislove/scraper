/**
 * creditAnchor.js
 *
 * Tamper anchor for the one-time free credit grant.
 *
 * The ledger file lives in the app's data folder and is therefore deletable.
 * Deleting it must not hand out another 1,000 credits, so the grant is mirrored
 * into the Windows registry under HKCU, which is per-machine and per-user
 * without needing administrator rights.
 *
 * The anchor is a speed bump, not cryptography: a determined user with admin
 * rights can still clear it. That is why the licence server keeps its own
 * record per device id — it is the authoritative source when configured.
 *
 * No-ops on non-Windows platforms.
 */

const { execFileSync } = require('child_process');

const KEY = 'HKCU\\Software\\Scraper';

function enabled() {
  return process.platform === 'win32' && process.env.SCRAPER_CREDITS_ANCHOR !== '0';
}

function read() {
  if (!enabled()) return null;

  try {
    const out = execFileSync('reg', ['query', KEY], {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true
    });

    const values = {};
    for (const line of out.split(/\r?\n/)) {
      const match = line.match(/^\s{2,}(Granted|Used|GrantedAt|DeviceId)\s+REG_\w+\s+(.*)$/);
      if (match) values[match[1]] = match[2].trim();
    }

    const granted = Number(values.Granted) || 0;
    if (!granted) return null;

    return {
      granted,
      used: Number(values.Used) || 0,
      grantedAt: Number(values.GrantedAt) || 0,
      deviceId: values.DeviceId || ''
    };
  } catch (e) {
    return null;
  }
}

function put(name, value) {
  execFileSync(
    'reg',
    ['add', KEY, '/v', name, '/t', 'REG_SZ', '/d', String(value), '/f'],
    { timeout: 4000, windowsHide: true }
  );
}

function write(record) {
  if (!enabled() || !record) return false;

  try {
    put('Granted', record.granted || 0);
    put('Used', record.used || 0);
    put('GrantedAt', record.grantedAt || 0);
    put('DeviceId', record.deviceId || '');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { read, write, enabled };
