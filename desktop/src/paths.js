/**
 * Resolves every filesystem location the desktop shell needs.
 *
 * Packaged layout
 *   <install>/resources/server          engine source + node_modules
 *   <install>/resources/client-dist     built SPA
 *   %APPDATA%/Scraper/data              vendors, deep profiles, caches
 *   %APPDATA%/Scraper/db                session folders, village index copies
 *   %APPDATA%/Scraper/logs              rotating app + engine logs
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const REPO_ROOT = path.join(__dirname, '..', '..');

const userData = app.getPath('userData');

const paths = {
  isDev,
  repoRoot: REPO_ROOT,
  userData,
  dataDir: path.join(userData, 'data'),
  dbDir: path.join(userData, 'db'),
  logsDir: path.join(userData, 'logs'),
  licenseFile: path.join(userData, 'license.json'),
  settingsFile: path.join(userData, 'desktop-settings.json'),
  serverDir: isDev ? path.join(REPO_ROOT, 'server') : path.join(process.resourcesPath, 'server'),
  clientDist: isDev ? path.join(REPO_ROOT, 'client', 'dist-desktop') : path.join(process.resourcesPath, 'client-dist'),
  rendererDir: path.join(__dirname, '..', 'renderer')
};

paths.serverEntry = path.join(paths.serverDir, 'index.js');

function ensure() {
  [paths.dataDir, paths.dbDir, paths.logsDir].forEach(dir => {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      /* surfaced later by the server itself */
    }
  });
}

paths.ensure = ensure;

module.exports = paths;
