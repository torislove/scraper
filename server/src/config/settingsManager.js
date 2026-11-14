/**
 * Settings manager — keyless by design.
 *
 * This product has no API keys, no AI keys and no third-party accounts. Every
 * engine it ships either uses a free public endpoint (OpenStreetMap/Nominatim,
 * Photon, a browser session against public pages) or the local brain. There is
 * nothing for a user to paste in and nothing that can expire.
 *
 * The file still exists because some non-secret preferences (and older installs
 * that already wrote settings.json) need a single read/write place. Secret keys
 * from previous builds are deleted on read so they cannot be resurrected.
 */

const fs = require('fs');
const path = require('path');

// Desktop installs point this at the writable user-data folder.
const SETTINGS_FILE =
  process.env.SCRAPER_SETTINGS_FILE || path.join(__dirname, 'settings.json');

// Only non-secret preferences live here. Empty by default.
const defaultSettings = {};

const LEGACY_SECRET_KEYS = [
  'nvidiaApiKey',
  'olaMapsApiKey',
  'yelpApiKey',
  'foursquareApiKey',
  'googlePlacesApiKey'
];

function stripLegacySecrets(settings) {
  const clean = { ...(settings || {}) };
  for (const key of LEGACY_SECRET_KEYS) delete clean[key];
  return clean;
}

function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    try {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    } catch (err) {
      /* a read-only install simply uses defaults */
    }
    return { ...defaultSettings };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...stripLegacySecrets(parsed) };
  } catch (err) {
    console.error('[Settings] Failed to read settings.json', err.message);
    return { ...defaultSettings };
  }
}

function updateSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...stripLegacySecrets(newSettings) };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('[Settings] Failed to write settings.json', err.message);
  }
  return updated;
}

module.exports = {
  getSettings,
  updateSettings
};
