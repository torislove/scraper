const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, 'settings.json');

const defaultSettings = {
  nvidiaApiKey: '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',
  olaMapsApiKey: ''
};

function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.error('[Settings] Failed to read settings.json', err);
    return defaultSettings;
  }
}

function updateSettings(newSettings) {
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
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
