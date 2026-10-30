const fs = require('fs');
const path = require('path');

// Desktop installs point this at the writable user-data folder.
const SETTINGS_FILE =
  process.env.SCRAPER_SETTINGS_FILE || path.join(__dirname, 'settings.json');

// No secrets in source. Real values come from the environment (see .env.example)
// or from the user's own settings.json, which is never committed.
const defaultSettings = {
  nvidiaApiKey: '',
  olaMapsApiKey: ''
};

function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    try {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    } catch (err) {
      return defaultSettings;
    }
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8').replace(/^\uFEFF/, '');
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.error('[Settings] Failed to read settings.json', err.message);
    return defaultSettings;
  }
}

function updateSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('[Settings] Failed to write settings.json', err.message);
  }
  return updated;
}

function getNvidiaApiKey() {
  const settings = getSettings();
  return process.env.NVIDIA_API_KEY || settings.nvidiaApiKey;
}

function getOlaMapsApiKey() {
  const settings = getSettings();
  return process.env.OLA_MAPS_API_KEY || settings.olaMapsApiKey;
}

module.exports = {
  getSettings,
  updateSettings,
  getNvidiaApiKey,
  getOlaMapsApiKey
};
