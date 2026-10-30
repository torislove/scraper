const crypto = require('crypto');
const os = require('os');
const { execSync } = require('child_process');

let cached = null;

function readMachineGuid() {
  if (process.platform !== 'win32') return '';
  try {
    const out = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
      { encoding: 'utf8', timeout: 4000, windowsHide: true }
    );
    const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-fA-F-]{36})/);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
}

/**
 * Stable, privacy-preserving device identifier.
 * Never leaves the machine except as part of an activation request.
 */
function getDeviceId() {
  if (cached) return cached;

  const guid = readMachineGuid();
  const cpu = (os.cpus()[0] && os.cpus()[0].model) || '';
  const seed = [guid || os.hostname(), cpu.trim(), os.platform(), os.arch(), String(os.totalmem())].join('|');

  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  cached = `DEV-${hash.slice(0, 24).toUpperCase()}`;
  return cached;
}

function getDeviceName() {
  return os.hostname();
}

module.exports = { getDeviceId, getDeviceName };
