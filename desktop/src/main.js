const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

app.setName('Scraper');
app.setAppUserModelId('in.scraper.desktop');

log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024;
log.transports.console.level = process.env.ELECTRON_DEV ? 'debug' : 'info';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'desktop.log');

const paths = require('./paths');
const config = require('./config');
const license = require('./license');
const { bootEngine } = require('./serverManager');
const updater = require('./updater');
const { buildMenu } = require('./menu');

paths.ensure();

const SHOT_PATH = process.env.SCRAPER_SHOT || '';
const SHOT_DELAY = Number(process.env.SCRAPER_SHOT_DELAY || 9000);

let mainWindow = null;
let splashWindow = null;
let licenseWindow = null;
let engine = null;
let quitting = false;
let restarting = false;

/* ------------------------------------------------------------------ */
/* Splash                                                              */
/* ------------------------------------------------------------------ */

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    movable: true,
    show: true,
    backgroundColor: '#050b16',
    skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  splashWindow.loadFile(path.join(paths.rendererDir, 'splash.html')).catch(() => {});
  splashWindow.on('closed', () => { splashWindow = null; });
}

function setSplash(message) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const safe = JSON.stringify(String(message));
  splashWindow.webContents
    .executeJavaScript(`window.setStatus && window.setStatus(${safe});`)
    .catch(() => {});
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function engineEnv() {
  const st = license.status();
  const enforced = st.state === 'active' || st.state === 'grace';

  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: '0',
    SCRAPER_HOST: '127.0.0.1',
    SCRAPER_DESKTOP: '1',
    SCRAPER_BROWSER_CHANNEL: 'msedge',
    SCRAPER_PROXY: 'off',
    SCRAPER_DATA_DIR: paths.dataDir,
    SCRAPER_DB_DIR: paths.dbDir,
    SCRAPER_CLIENT_DIST: paths.clientDist,
    SCRAPER_SETTINGS_FILE: path.join(paths.userData, 'settings.json'),
    LICENSE_FILE: paths.licenseFile,
    LICENSE_PUBLIC_KEY: config.PUBLIC_KEY,
    LICENSE_ENFORCE: enforced ? '1' : '0',
    SCRAPER_MAX_LEADS: st.maxLeads ? String(st.maxLeads) : '',
    APP_VERSION: app.getVersion(),
    NODE_OPTIONS: '--max-old-space-size=4096'
  };
}

async function startEngine() {
  setSplash('Starting engine…');
  const handle = await bootEngine({
    entry: paths.serverEntry,
    cwd: paths.serverDir,
    env: engineEnv(),
    onStatus: setSplash,
    onExit: ({ code }) => {
      if (quitting || restarting) return;
      log.error('[engine] exited unexpectedly', code);
      const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
      dialog
        .showMessageBox(win, {
          type: 'error',
          title: 'Engine stopped',
          message: 'The scraping engine stopped unexpectedly.',
          detail: 'You can restart it from Engine → Restart, or open the logs for details.',
          buttons: ['Restart engine', 'Open logs', 'Quit'],
          defaultId: 0,
          cancelId: 2
        })
        .then(async ({ response }) => {
          if (response === 0) await restartEngine();
          else if (response === 1) shell.openPath(paths.logsDir);
          else app.quit();
        })
        .catch(() => {});
    }
  });

  engine = handle;
  return handle;
}

async function restartEngine() {
  if (restarting) return;
  restarting = true;
  try {
    if (engine) await engine.stop();
    engine = null;
    const handle = await startEngine();
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(`${handle.baseUrl}/command`);
    }
  } catch (err) {
    dialog.showErrorBox('Could not restart the engine', err.message);
  } finally {
    restarting = false;
  }
}

/* ------------------------------------------------------------------ */
/* Windows                                                             */
/* ------------------------------------------------------------------ */

function createMainWindow(baseUrl) {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: '#050b16',
    autoHideMenuBar: true,
    title: 'Scraper — Lead Intelligence',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webSecurity: true
    }
  });

  // The Windows build has no marketing site: it opens straight into the workspace.
  mainWindow.loadURL(`${baseUrl}/command`);

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    if (process.env.ELECTRON_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(baseUrl)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write');
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  if (SHOT_PATH) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await mainWindow.webContents.capturePage();
          fs.writeFileSync(SHOT_PATH, image.toPNG());
          log.info('[shot] saved', SHOT_PATH);
        } catch (e) {
          log.error('[shot] failed', e.message);
        }
        app.quit();
      }, SHOT_DELAY);
    });
  }

  return mainWindow;
}

function openLicenseWindow() {
  if (licenseWindow && !licenseWindow.isDestroyed()) {
    licenseWindow.show();
    licenseWindow.focus();
    return licenseWindow;
  }

  licenseWindow = new BrowserWindow({
    width: 940,
    height: 660,
    minWidth: 860,
    minHeight: 620,
    show: false,
    resizable: true,
    backgroundColor: '#050b16',
    title: 'Scraper — Subscription',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(paths.rendererDir, 'license-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  licenseWindow.loadFile(path.join(paths.rendererDir, 'license.html'));
  licenseWindow.once('ready-to-show', () => licenseWindow.show());
  licenseWindow.on('closed', () => {
    licenseWindow = null;
    // Activation from the first-run window is what boots the app.
    if (!mainWindow && license.status().canUse) boot();
  });

  licenseWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  return licenseWindow;
}

function broadcastLicense() {
  const status = license.status();
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      win.webContents.send('license:changed', status);
    } catch (e) {
      /* closing */
    }
  }
  return status;
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  try {
    const handle = await startEngine();
    createMainWindow(handle.baseUrl);

    license.startMonitor(() => {
      broadcastLicense();
      dialog
        .showMessageBox(mainWindow || undefined, {
          type: 'warning',
          title: 'Subscription expired',
          message: 'Your Scraper subscription has expired.',
          detail: 'Renew to keep searching for leads. Your saved folders are untouched.',
          buttons: ['Manage subscription', 'Later'],
          defaultId: 0,
          cancelId: 1
        })
        .then(({ response }) => {
          if (response === 0) openLicenseWindow();
        })
        .catch(() => {});
    });
  } catch (err) {
    closeSplash();
    log.error('[boot] failed:', err.stack || err.message);
    const { response } = await dialog.showMessageBox({
      type: 'error',
      title: 'Scraper could not start',
      message: 'The scraping engine failed to start.',
      detail: `${err.message}\n\nLogs: ${paths.logsDir}`,
      buttons: ['Open logs', 'Quit'],
      defaultId: 0,
      cancelId: 1
    });
    if (response === 0) shell.openPath(paths.logsDir);
    app.quit();
  }
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function registerIpc() {
  ipcMain.handle('license:status', () => license.status());
  ipcMain.handle('license:plans', () => config.PLANS);

  ipcMain.handle('license:activate', async (_e, payload) => {
    const result = await license.activate(payload || {});
    broadcastLicense();
    return result;
  });

  ipcMain.handle('license:import', async () => {
    const result = await license.importFile(licenseWindow);
    broadcastLicense();
    return result;
  });

  ipcMain.handle('license:apply', (_e, token) => {
    const result = license.applyToken(token);
    broadcastLicense();
    return result;
  });

  ipcMain.handle('license:deactivate', () => {
    license.deactivate();
    return broadcastLicense();
  });

  ipcMain.handle('license:refresh', async () => {
    await license.refresh({ force: true }).catch(() => {});
    return broadcastLicense();
  });

  ipcMain.handle('license:open-portal', () => license.openPortal());
  ipcMain.handle('license:open-window', () => openLicenseWindow());

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
    dataDir: paths.dataDir,
    logsDir: paths.logsDir,
    server: engine ? engine.baseUrl : null
  }));

  ipcMain.handle('app:open-logs', () => shell.openPath(paths.logsDir));
  ipcMain.handle('app:open-data', () => shell.openPath(paths.dataDir));
  ipcMain.handle('app:open-external', (_e, url) => {
    if (/^(https?|mailto):/i.test(String(url || ''))) shell.openExternal(String(url));
  });

  ipcMain.handle('updater:check', () => updater.checkNow());
  ipcMain.handle('updater:install', () => updater.installNow());
  ipcMain.handle('updater:state', () => updater.getState());
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(
      buildMenu({
        onCheckUpdates: () => updater.checkNow(),
        onOpenLicense: () => openLicenseWindow(),
        onOpenLogs: () => shell.openPath(paths.logsDir),
        onOpenData: () => shell.openPath(paths.dataDir),
        onRestartEngine: () => restartEngine(),
        onAbout: () =>
          dialog.showMessageBox({
            type: 'info',
            title: 'About Scraper',
            message: `Scraper ${app.getVersion()}`,
            detail: `Lead intelligence for India.\n\nEngine: ${engine ? engine.baseUrl : 'not running'}\nData: ${paths.dataDir}\nElectron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
            buttons: ['OK']
          })
      })
    );

    registerIpc();
    updater.initUpdater();

    await license.init();

    if (!license.status().canUse) {
      openLicenseWindow();
    } else {
      boot();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) boot();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  let engineStopped = false;
  app.on('before-quit', event => {
    quitting = true;
    if (engineStopped || !engine) return;

    // Give the engine a moment to close browsers and flush leads to disk.
    event.preventDefault();
    engineStopped = true;
    Promise.resolve(engine.stop())
      .catch(() => {})
      .finally(() => {
        engine = null;
        app.quit();
      });
  });
}

process.on('uncaughtException', err => {
  log.error('[main] uncaught:', err.stack || err.message);
});

process.on('unhandledRejection', reason => {
  log.error('[main] rejection:', reason);
});
