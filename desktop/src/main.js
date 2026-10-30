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
const { getDeviceId } = require('./license/machine');
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

/**
 * A renderer that fails to load used to leave the window fully black with no
 * explanation. Show the reason instead, so a failed boot is diagnosable.
 */
function rendererErrorPage({ title, detail, url }) {
  const body = `
    <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050b16;color:#dbe7f3;font-family:Segoe UI,system-ui,sans-serif">
      <div style="max-width:620px;padding:32px">
        <div style="font-size:11px;letter-spacing:2px;color:#67e8f9;text-transform:uppercase">scraper.co.in</div>
        <h1 style="font-size:22px;margin:10px 0 12px">${escapeHtml(title)}</h1>
        <p style="color:#93a7ba;font-size:13px;line-height:1.6;margin:0 0 18px">${escapeHtml(detail)}</p>
        ${url ? `<div style="font-size:11px;color:#6f8698;word-break:break-all;border:1px solid #16293c;border-radius:8px;padding:10px 12px;margin-bottom:18px">${escapeHtml(url)}</div>` : ''}
        <p style="color:#93a7ba;font-size:12px;line-height:1.7;margin:0">
          Engine → Restart retries. If this repeats, open the logs folder and send
          <b>main.log</b> plus the newest engine log to support@scraper.co.in.
        </p>
      </div>
    </body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><title>Scraper</title></head>${body}</html>`)}`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showRendererFailure(detail, url) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const page = rendererErrorPage({
    title: 'The workspace could not load',
    detail,
    url
  });
  closeSplash();
  mainWindow.loadURL(page).catch(() => {});
  if (!mainWindow.isVisible()) mainWindow.show();
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

function engineEnv() {
  const st = license.status();

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
    // Always on: free credits are now the gate, so deleting the activation
    // screen must not unlock the engine.
    LICENSE_ENFORCE: '1',
    SCRAPER_CREDITS_ENFORCE: '1',
    SCRAPER_FREE_CREDITS: String(config.FREE_CREDITS),
    SCRAPER_DEVICE_ID: getDeviceId(),
    SCRAPER_CREDITS_FILE: path.join(paths.dataDir, 'credits.json'),
    SCRAPER_LICENSE_API: config.API_URL,
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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    // -3 is ABORTED, which happens on every intentional navigation.
    if (errorCode === -3) return;
    log.error('[renderer] failed to load', { errorCode, errorDescription, validatedURL });
    showRendererFailure(
      `The engine answered, but the page did not load (${errorCode}: ${errorDescription || 'unknown'}).`,
      validatedURL
    );
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error('[renderer] process gone', details);
    showRendererFailure(
      `The page process stopped (${details?.reason || 'unknown'}).`,
      `${baseUrl}/command`
    );
  });

  mainWindow.webContents.on('unresponsive', () => {
    log.warn('[renderer] unresponsive');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    closeSplash();
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  });

  // Every renderer console error goes to main.log, so a silent blank screen
  // leaves a trace even when DevTools is closed.
  mainWindow.webContents.on('console-message', (...args) => {
    try {
      const event = args[0];
      const level = typeof event === 'object' && event ? event.level : args[1];
      const message = typeof event === 'object' && event ? event.message : args[2];
      const severity = typeof level === 'number' ? level : String(level || '');
      if (severity === 3 || severity === 2 || severity === 'error' || severity === 'warning') {
        log.warn('[renderer console]', severity, message);
      }
    } catch (err) {
      /* logging must never break startup */
    }
  });

  mainWindow.once('ready-to-show', () => {
    closeSplash();
    mainWindow.show();
    if (process.env.ELECTRON_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Safety net: if ready-to-show never fires, reveal the window anyway so the
  // user sees the error page instead of an invisible black frame.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      closeSplash();
      mainWindow.show();
    }
  }, 25000).unref?.();

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

    // The engine owns the ledger and only it knows when credits actually run
    // out, so watch the file instead of guessing from a timer.
    let lastLeft = null;
    setInterval(() => {
      const st = license.status();
      if (lastLeft === null || st.creditsLeft !== lastLeft) {
        lastLeft = st.creditsLeft;
        broadcastLicense();
      }
    }, 4000);

    license.startMonitor(() => {
      broadcastLicense();
      dialog
        .showMessageBox(mainWindow || undefined, {
          type: 'warning',
          title: 'Your credits are finished',
          message: 'You have used all your credits.',
          detail:
            'Your saved folders, CRM notes and exports are untouched. Add a licence key to keep finding new businesses.',
          buttons: ['See plans', 'Later'],
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

    // The app always opens: a customer out of credits can still read and
    // export everything they already have. Only new searches are blocked.
    if (!license.status().canScrape) {
      openLicenseWindow();
      boot();
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
