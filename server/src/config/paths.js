/**
 * paths.js
 *
 * Single source of truth for every writable location used by the engine.
 *
 * Historically every module hardcoded `path.join(__dirname, '../../data')`.
 * That works for a dev checkout but fails in a packaged desktop build, where
 * the app directory lives under Program Files and is read-only.
 *
 * Resolution order for each root:
 *   1. explicit env var (set by the Electron launcher)
 *   2. the legacy repo-relative folder (dev + server deployments)
 */

const path = require('path');
const fs = require('fs');

const APP_ROOT = path.resolve(__dirname, '../..');

function resolveRoot(envValue, fallback) {
  if (envValue && String(envValue).trim()) {
    return path.resolve(String(envValue).trim());
  }
  return fallback;
}

const DATA_DIR = resolveRoot(process.env.SCRAPER_DATA_DIR, path.join(APP_ROOT, 'data'));
const DB_DIR = resolveRoot(process.env.SCRAPER_DB_DIR, path.join(APP_ROOT, 'db'));

const DEEP_PROFILES_DIR = path.join(DATA_DIR, 'deep_profiles');
const SESSIONS_DIR = path.join(DB_DIR, 'user_sessions');
const DOWNLOADS_DIR = path.join(APP_ROOT, 'downloads');
const CLIENT_DIST = resolveRoot(
  process.env.SCRAPER_CLIENT_DIST,
  path.resolve(APP_ROOT, '../client/dist')
);

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    return false;
  }
}

function ensureAll() {
  [DATA_DIR, DB_DIR, DEEP_PROFILES_DIR, SESSIONS_DIR].forEach(ensureDir);
}

module.exports = {
  APP_ROOT,
  DATA_DIR,
  DB_DIR,
  DEEP_PROFILES_DIR,
  SESSIONS_DIR,
  DOWNLOADS_DIR,
  CLIENT_DIST,
  ensureDir,
  ensureAll,
  isDesktop: Boolean(process.env.SCRAPER_DESKTOP)
};
