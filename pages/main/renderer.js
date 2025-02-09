const ipcRenderer = window.electron.ipcRenderer;
const shell = window.electron.shell;
const remote = window.electron.remote;
const browserWindow = window.electron.browserWindow;

let recording = false;
let virtualCamRunning = false;
let recordingStartedAt = null;
let timer = null;

function closeApp() {
  ipcRenderer.invoke('close-app');
}

function openSettings() {
  ipcRenderer.invoke('open-new-window', 'settings');
}

async function initOBS() {
  const result = ipcRenderer.invoke('recording-init');
  console.debug("initOBS result:", result);
  if (result) {
    ipcRenderer.on("performanceStatistics", (event, data) => onPerformanceStatistics(data));
  }
}

async function startRecording() {
  const result = await ipcRenderer.invoke('recording-start');
  console.debug("startRecording result:", result);
  return result;
}

async function stopRecording() {
  const result = await ipcRenderer.invoke('recording-stop');
  console.debug("stopRecording result:", result);
  return result;
}

async function switchRecording() {
  if (recording) {  // <---- Possible issue: 'recording' is not properly initialized
    const result = await stopRecording();
    recording = result.recording;
  } else {
    const result = await startRecording();
    recording = result.recording;
  }
  updateRecordingUI();
}


function updateRecordingUI() {
  const button = document.getElementById('rec-button');
  button.disabled = false;
  if (recording) {
    button.innerText = '⏹️ Stop recording';
    startTimer();
  } else {
    button.innerText = '⏺️ Start recording';
    stopTimer();
  }
}

function playTransition(transitionName) {
  ipcRenderer.invoke('playTransition', transitionName);
}

// Virtual Camera

async function updateVirtualCamUI() {
  if (await ipcRenderer.invoke('isVirtualCamPluginInstalled')) {
    document.querySelector("#install-virtual-cam-plugin-button").style.display = "none";
    if (virtualCamRunning) {
      // Camera Running
    } else {
      // Camera Disabled, Plugin Installed
    }
  } else {
    // Plugin not installed
  }
}

async function uninstallVirtualCamPlugin() {
  await ipcRenderer.invoke('uninstallVirtualCamPlugin');
  updateVirtualCamUI();
}

async function installVirtualCamPlugin() {
  await ipcRenderer.invoke('installVirtualCamPlugin');
  updateVirtualCamUI();
}

async function startVirtualCam() {
  await ipcRenderer.invoke('startVirtualCam');
  virtualCamRunning = true;
  updateVirtualCamUI();
}

async function stopVirtualCam() {
  await ipcRenderer.invoke('stopVirtualCam');
  virtualCamRunning = false;
  updateVirtualCamUI();
}

function startTimer() {
  recordingStartedAt = Date.now();
  timer = setInterval(updateTimer, 100);
}

function stopTimer() {
  clearInterval(timer);
}

function updateTimer() {
  const diff = Date.now() - recordingStartedAt;
  const timerElem = document.getElementById('rec-timer');
  const decimals = `${Math.floor(diff % 1000 / 100)}`;
  const seconds  = `${Math.floor(diff % 60000 / 1000)}`.padStart(2, '0');
  const minutes  = `${Math.floor(diff % 3600000 / 60000)}`.padStart(2, '0');
  const hours    = `${Math.floor(diff / 3600000)}`.padStart(2, '0');
  timerElem.innerText = `${hours}:${minutes}:${seconds}.${decimals}`;
}

async function openFolder() {
  const videosPath = await window.electron.getPath('videos');
  window.electron.openFolder(videosPath);
}

function onPerformanceStatistics(data) {

  const cpuMeter = document.querySelector(".performanceStatistics #cpuMeter");
  const cpuValue = data.CPU;

  if (cpuValue !== undefined && isFinite(cpuValue)) {
    cpuMeter.value = cpuValue;
    document.querySelector(".performanceStatistics #cpu").innerText = `${cpuValue} %`;
  } else {
    console.error("Non-finite value for CPU:", cpuValue);
  }

  if (data.numberDroppedFrames !== undefined) {
    document.querySelector(".performanceStatistics #numberDroppedFrames").innerText = data.numberDroppedFrames;
  } else {
    console.error("numberDroppedFrames is undefined");
  }

  if (data.percentageDroppedFrames !== undefined) {
    document.querySelector(".performanceStatistics #percentageDroppedFrames").innerText = `${data.percentageDroppedFrames} %`;
  } else {
    console.error("percentageDroppedFrames is undefined");
  }

  if (data.recordingBandwidth !== undefined) {
    document.querySelector(".performanceStatistics #bandwidth").innerText = data.bandwidth;
  } else {
    document.querySelector(".performanceStatistics #bandwidth").innerText = "0 kbps";
    console.error("bandwidth is undefined");
  }

  if (data.frameRate !== undefined) {
    document.querySelector(".performanceStatistics #frameRate").innerText = `${Math.round(data.frameRate)} fps`;
  } else {
    console.error("frameRate is undefined");
  }
}

const previewContainer = document.getElementById('preview-screen');

async function setupPreview() {
  const { width, height, x, y } = previewContainer.getBoundingClientRect();
  const result = await ipcRenderer.invoke('preview-init', { width, height, x, y });
  previewContainer.style = `height: ${result.height-100}px`;
}

// async function resizePreview() {
//   const { width, height, x, y } = previewContainer.getBoundingClientRect();
//   // const result = await ipcRenderer.invoke('preview-bounds', { width, height, x, y });
//   const result = await window.electron.previewBounds({ width, height });
//   previewContainer.style = `height: ${result.height}px`;
// }

async function getWindowId() {
  const windowId = await window.electron.getWindowId();
  console.log("Window ID:", windowId);
}
getWindowId();


// async function getCurrentWindow() {
//   const windowId = await ipcRenderer.invoke('get-current-window-id');
//   return require('electron').remote.BrowserWindow.fromId(windowId);
// }

// window.electron.onWindowResize(resizePreview);

// document.addEventListener("scroll", resizePreview);
// var ro = new ResizeObserver(resizePreview);
// ro.observe(document.querySelector("#preview"));



try {
  initOBS();
  setupPreview();
  // updateRecordingUI();
  // updateVirtualCamUI();
} catch (err) {
  console.log(err)
}

window.switchRecording = switchRecording;
window.openFolder = openFolder;
window.installVirtualCamPlugin = installVirtualCamPlugin;
window.uninstallVirtualCamPlugin = uninstallVirtualCamPlugin;
window.startVirtualCam = startVirtualCam;
window.stopVirtualCam = stopVirtualCam;
window.main = {
  openSettings: openSettings,
  closeApp: closeApp,
  playTransition: playTransition
}

window.main = main;