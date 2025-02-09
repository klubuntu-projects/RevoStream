const { contextBridge, ipcRenderer, shell, remote, BrowserWindow } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: ipcRenderer.invoke.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
  },
  shell: shell,
  remote: remote,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  // Custom for RevoStream
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  getPath: (name) => ipcRenderer.invoke('get-path', name),
  getWindowId: () => ipcRenderer.invoke('get-current-window-id'),
  installVirtualCamPlugin: () => ipcRenderer.invoke('installVirtualCamPlugin'),
  recordingInit: () => ipcRenderer.invoke('recording-init'),
  previewBounds: (bounds) => ipcRenderer.invoke('preview-bounds', bounds),
  onWindowResize: (callback) => ipcRenderer.on('window-resize', callback),
  openNewWindow: (url) => ipcRenderer.invoke('open-new-window', url)
});

// document.getElementsByClassName("selected")[0].classList.remove("selected")