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
  getPinned: () => ipcRenderer.invoke('get-pinned')
});
