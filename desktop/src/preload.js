const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel) {
  return handler => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('scraperDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },

  license: {
    status: () => ipcRenderer.invoke('license:status'),
    plans: () => ipcRenderer.invoke('license:plans'),
    activate: payload => ipcRenderer.invoke('license:activate', payload),
    importFile: () => ipcRenderer.invoke('license:import'),
    apply: token => ipcRenderer.invoke('license:apply', token),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    refresh: () => ipcRenderer.invoke('license:refresh'),
    openPortal: () => ipcRenderer.invoke('license:open-portal'),
    openWindow: () => ipcRenderer.invoke('license:open-window'),
    onChange: subscribe('license:changed')
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    state: () => ipcRenderer.invoke('updater:state'),
    onStatus: subscribe('updater:status')
  },

  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openLogs: () => ipcRenderer.invoke('app:open-logs'),
    openData: () => ipcRenderer.invoke('app:open-data'),
    openExternal: url => ipcRenderer.invoke('app:open-external', url)
  }
});
