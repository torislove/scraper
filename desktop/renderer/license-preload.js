const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('scraperLicense', {
  status: () => ipcRenderer.invoke('license:status'),
  plans: () => ipcRenderer.invoke('license:plans'),
  activate: payload => ipcRenderer.invoke('license:activate', payload),
  importFile: () => ipcRenderer.invoke('license:import'),
  apply: token => ipcRenderer.invoke('license:apply', token),
  openPortal: () => ipcRenderer.invoke('license:open-portal'),
  close: () => window.close()
});
