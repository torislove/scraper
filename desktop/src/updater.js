/**
 * Automatic updates.
 *
 * electron-updater reads the publish config baked into the installer
 * (app-update.yml, generated from electron-builder.yml) and pulls signed
 * releases from the GitHub repository. Pushing a `v*` tag is therefore the
 * whole release process - see .github/workflows/release.yml.
 */

const { app, dialog, BrowserWindow, shell } = require('electron');
const log = require('electron-log');

let autoUpdater = null;
let state = { state: 'idle', version: null, percent: 0, error: null };
let manualCheck = false;

function broadcast() {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send('updater:status', state);
    } catch (e) {
      /* window closing */
    }
  }
}

function setState(next) {
  state = { ...state, ...next };
  broadcast();
  return state;
}

function getUpdater() {
  if (autoUpdater) return autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    log.warn('[updater] electron-updater unavailable:', e.message);
    return null;
  }
  return autoUpdater;
}

function initUpdater() {
  const updater = getUpdater();
  if (!updater) return () => {};

  updater.logger = log;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;

  if (process.env.SCRAPER_UPDATE_FEED) {
    updater.setFeedURL({ provider: 'generic', url: process.env.SCRAPER_UPDATE_FEED });
  }

  updater.on('checking-for-update', () => setState({ state: 'checking', error: null }));
  updater.on('update-available', info => {
    setState({ state: 'available', version: info && info.version });
    if (manualCheck) {
      manualCheck = false;
      const win = BrowserWindow.getAllWindows()[0];
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Update available',
        message: `Scraper ${info.version} is downloading.`,
        detail: 'You will be asked to restart once the download finishes.',
        buttons: ['OK']
      });
    }
  });
  updater.on('update-not-available', () => {
    setState({ state: 'up-to-date', percent: 0 });
    if (manualCheck) {
      manualCheck = false;
      const win = BrowserWindow.getAllWindows()[0];
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'You are up to date',
        message: `Scraper ${app.getVersion()} is the latest version.`,
        buttons: ['OK']
      });
    }
  });
  updater.on('download-progress', progress => {
    setState({ state: 'downloading', percent: Math.round(progress.percent || 0) });
  });
  updater.on('update-downloaded', info => {
    setState({ state: 'downloaded', version: info && info.version, percent: 100 });
    const win = BrowserWindow.getAllWindows()[0];
    dialog
      .showMessageBox(win, {
        type: 'info',
        title: 'Update ready',
        message: `Scraper ${info.version} has been downloaded.`,
        detail: 'Restart now to finish updating. Your leads and folders are kept.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
      .then(({ response }) => {
        if (response === 0) updater.quitAndInstall(false, true);
      })
      .catch(() => {});
  });
  updater.on('error', err => {
    log.warn('[updater] error:', err && err.message);
    setState({ state: 'error', error: err ? String(err.message || err) : 'unknown' });
    if (manualCheck) {
      manualCheck = false;
      const win = BrowserWindow.getAllWindows()[0];
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'Update check failed',
        message: 'Could not reach the update server.',
        detail: 'Check your internet connection, then try again from Help → Check for updates.',
        buttons: ['OK']
      });
    }
  });

  const check = () => {
    if (!app.isPackaged) return;
    updater.checkForUpdates().catch(err => log.warn('[updater] check failed:', err.message));
  };

  setTimeout(check, 12000);
  const interval = setInterval(check, 4 * 60 * 60 * 1000);

  app.on('before-quit', () => clearInterval(interval));
  return () => clearInterval(interval);
}

function checkNow() {
  manualCheck = true;
  if (!app.isPackaged) {
    manualCheck = false;
    dialog.showMessageBox({
      type: 'info',
      title: 'Development build',
      message: 'Automatic updates are disabled in development.',
      detail: 'Install the packaged build to test GitHub update delivery.',
      buttons: ['OK']
    });
    return;
  }
  const updater = getUpdater();
  if (!updater) return;
  setState({ state: 'checking', error: null });
  updater.checkForUpdates().catch(err => log.warn('[updater] check failed:', err.message));
}

function installNow() {
  const updater = getUpdater();
  if (!updater) return;
  updater.quitAndInstall(false, true);
}

function openReleaseNotes() {
  shell.openExternal('https://github.com/torislove/scraper/releases');
}

module.exports = { initUpdater, checkNow, installNow, openReleaseNotes, getState: () => state };
