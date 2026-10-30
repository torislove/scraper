const { Menu, shell } = require('electron');
const config = require('./config');

function buildMenu(handlers = {}) {
  const {
    onCheckUpdates,
    onOpenLicense,
    onOpenLogs,
    onOpenData,
    onRestartEngine,
    onAbout
  } = handlers;

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Manage subscription…', click: () => onOpenLicense && onOpenLicense() },
        { type: 'separator' },
        { label: 'Open data folder', click: () => onOpenData && onOpenData() },
        { label: 'Open logs', click: () => onOpenLogs && onOpenLogs() },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(process.env.ELECTRON_DEV ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : [])
      ]
    },
    {
      label: 'Engine',
      submenu: [
        { label: 'Restart scraping engine', click: () => onRestartEngine && onRestartEngine() },
        { type: 'separator' },
        {
          label: 'Engine health',
          click: () => shell.openExternal('http://127.0.0.1:5002/api/app/info')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for updates…', click: () => onCheckUpdates && onCheckUpdates() },
        { label: 'Release notes', click: () => shell.openExternal('https://github.com/torislove/scraper/releases') },
        { label: 'Support', click: () => shell.openExternal(config.SUPPORT_URL) },
        { type: 'separator' },
        { label: 'About Scraper', click: () => onAbout && onAbout() }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu };
