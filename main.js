const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
// app.disableHardwareAcceleration()

// IMPORT
const obsHelper = require('./lib/obsHelper');

ipcMain.handle('recording-start', (event) => {
  obsHelper.start();
  return { recording: true };
});

ipcMain.handle('recording-stop', (event) => {
  obsHelper.stop();
  return { recording: false };
});

// Transitions
ipcMain.handle('getTransitions', (event) => {
  return obsHelper.getTransitions();
});

ipcMain.handle('setTransition', (event, transitionName) => {
  return obsHelper.setTransition(transitionName);
});

ipcMain.handle('playTransition', (event, transitionName) => {
  return obsHelper.playTransition(transitionName);
});

// Virtual Camera
ipcMain.handle('installVirtualCamPlugin', (event) => {
  return obsHelper.installVirtualCamPlugin();
});

ipcMain.handle('uninstallVirtualCamPlugin', (event) => {
  return obsHelper.uninstallVirtualCamPlugin();
});

ipcMain.handle('isVirtualCamPluginInstalled', (event) => {
  return obsHelper.isVirtualCamPluginInstalled();
});
ipcMain.handle('startVirtualCam', (event) => {
  return obsHelper.startVirtualCam();
});
ipcMain.handle('stopVirtualCam', (event) => {
  return obsHelper.stopVirtualCam();
});

ipcMain.handle('close-app', (event) => {
  app.quit();
});

ipcMain.handle('open-new-window', (event, url) => {
  const win = new BrowserWindow({
    minWidth: 455,
    minHeight: 580,
    height: 600,
    width: 800,
    webPreferences: {
      preload: path.join(__dirname, '/pages/settings/preload.js'),
    },
  });
  console.log(url)
  win.loadFile("pages/settings.html");
  win.webContents.openDevTools();
});


app.on('will-quit', obsHelper.shutdown);

function createWindow () {
  const mainWindow = new BrowserWindow({
    minWidth: 720,
    minHeight: 600,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '/pages/main/preload.js'),
      nodeIntegration: true, // Disable nodeIntegration
      enableRemoteModule: false, // Disable remote
      contextIsolation: true // Enable contextIsolation
    }
  });

  // mainWindow.minimize();

  ipcMain.handle('get-current-window-id', (event) => {
    const window = BrowserWindow.getFocusedWindow();
    return window ? window.id : null;
  });


  ipcMain.handle('recording-init', (event) => {
    console.log("Recording init")
      obsHelper.initialize(mainWindow);
      return true;
  });

  ipcMain.handle('preview-init', (event, bounds) => {
    return obsHelper.setupPreview(mainWindow, bounds);
  });

  ipcMain.handle('preview-bounds', (event, bounds) => {
    return obsHelper.resizePreview(mainWindow, bounds);
  });

  ipcMain.handle('open-folder', (event, folderPath) => {
    shell.openPath(folderPath);
  });

  ipcMain.handle('get-path', (event, name) => {
    return app.getPath(name);
  });


  mainWindow.on('resize', () => {
    mainWindow.webContents.send('window-resize');
  });

  mainWindow.loadFile('pages/main.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});