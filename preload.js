const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  openInTerminal: (path) => ipcRenderer.invoke('open-in-terminal', path),
  getFolderInfo: (path) => ipcRenderer.invoke('get-folder-info', path),
  resolveDroppedPaths: (paths) => ipcRenderer.invoke('resolve-dropped-paths', paths),
  resizeWindow: (folderCount) => ipcRenderer.invoke('resize-window', folderCount),
  togglePin: () => ipcRenderer.invoke('toggle-pin'),
  getPinned: () => ipcRenderer.invoke('get-pinned'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openGithub: () => ipcRenderer.invoke('open-github'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  showFolderMenu: (index) => ipcRenderer.invoke('show-folder-menu', index),
  showWsMenu: (wsId) => ipcRenderer.invoke('show-ws-menu', wsId),
  onFolderAction: (cb) => ipcRenderer.on('folder-action', (_, data) => cb(data)),
  onWsAction: (cb) => ipcRenderer.on('ws-action', (_, data) => cb(data))
});
