const path = require("path");
const { app } = require('electron');
const { Subject } = require("rxjs");
const { first } = require("rxjs/operators");
const { byOS, OS, getOS } = require("./operating-systems");

const osn = require("obs-studio-node");
const { v4: uuid } = require("uuid");
const { get } = require("https");
const videoPath = require("electron").app.getPath("videos");
let nwr;

osn.NodeRevoStream = osn.NodeObs

// NWR is used to handle display rendering via IOSurface on mac
if (getOS() === OS.Mac) {
  nwr = require("node-window-rendering");
}

let RevoStreamInitialized = false;
let scene = null;
let scene1 = null;
let scene2 = null;
let source1 = null;
let source2 = null;

// When packaged, we need to fix some paths
function fixPathWhenPackaged(p) {
  return p.replace("app.asar", "app.asar.unpacked");
}

// Init the library, launch RevoStream Studio instance, configure it, set up sources and scene
function initialize(win) {
  if (RevoStreamInitialized) {
    console.warn("RevoStream is already initialized, skipping initialization.");
    return;
  }

  initRevoStream();
  configureRevoStream();
  scene = setupScene();
  setupSources(scene);
  RevoStreamInitialized = true;

  const perfStatTimer = setInterval(() => {
    win.webContents.send(
      "performanceStatistics",
      osn.NodeRevoStream.OBS_API_getPerformanceStatistics()
    );
  }, 1000);

  win.on("close", () => clearInterval(perfStatTimer));
}

function initRevoStream() {
  console.debug("Initializing RevoStream...");
  osn.NodeRevoStream.IPC.host(`revostream-${uuid()}`);
  const mainProgramDir = app.getAppPath();
  osn.NodeRevoStream.SetWorkingDirectory(
    fixPathWhenPackaged(
      path.join(mainProgramDir, "node_modules", "obs-studio-node")
    )
  );

  const RevoStreamDataPath = fixPathWhenPackaged(
    path.join(mainProgramDir, "osn-data")
  ); // RevoStream Studio configs and logs
  // Arguments: locale, path to directory where configuration and logs will be stored, your application version
  const initResult = osn.NodeRevoStream.OBS_API_initAPI("en-US", RevoStreamDataPath, "1.0.0");

  if (initResult !== 0) {
    const errorReasons = {
      "-2": "DirectX could not be found on your system. Please install the latest version of DirectX for your machine here <https://www.microsoft.com/en-us/download/details.aspx?id=35?> and try again.",
      "-5": "Failed to initialize RevoStream. Your video drivers may be out of date, or RevoStream may not be supported on your system.",
    };

    const errorMessage =
      errorReasons[initResult.toString()] ||
      `An unknown error #${initResult} was encountered while initializing RevoStream.`;

    console.error("RevoStream init failure", errorMessage);

    shutdown();

    throw Error(errorMessage);
  }

  osn.NodeRevoStream.OBS_service_connectOutputSignals((signalInfo) => {
    signals.next(signalInfo);
  });

  console.debug("RevoStream initialized");
}

function configureRevoStream() {
  console.debug("Configuring RevoStream");
//   getAvailableValues("Output", "Mode");
  let otherSettings = osn.NodeRevoStream.OBS_settings_getSettings;
  console.debug(otherSettings);
//   console.debug(videoSettings[8].parameters);
  setSetting("Output", "Mode", "Advanced");
  setSetting()
  const availableEncoders = getAvailableValues(
    "Output",
    "Recording",
    "RecEncoder"
  );
  setSetting("Output", "RecEncoder", availableEncoders.slice(-1)[0] || "x264");
  setSetting("Output", "RecFilePath", videoPath);
  setSetting("Output", "RecFormat", "mkv");
  setSetting("Output", "VBitrate", 10000); // 10 Mbps
  setSetting("Video", "FPSCommon", 60);

  console.debug("RevoStream Configured");
  function importExternalPlugin(pluginPath, dataPath) {
    try {
      osn.ModuleFactory.open(pluginPath, dataPath);
      console.debug(`Successfully loaded plugin from ${pluginPath}`);
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
    }
  }
  
  // Example usage
  // const pluginPath = "/Users/kamil/Downloads/obs-multi-rtmp/1/obs-multi-rtmp/bin/obs-multi-rtmp.so";
  // const dataPath = "/Users/kamil/Downloads/obs-multi-rtmp/1/obs-multi-rtmp/data";
  // importExternalPlugin(pluginPath, dataPath);
  // const service1 = osn.NodeObs.Service.create('rtmp_common', 'Service 1', {
  //   service: 'Twitch',
  //   server: 'auto',
  //   key: 'live_605809191_fx3nJccxqmd7uqzVl027SdQmnmkGRX'
  // })
  // osn.NodeObs.Service.create('rtmp_common', 'Service 1', {
  //   service: 'YouTube',
  //   server: 'auto',
  //   key: 'daz1-b5fz-awt7-zxj6-2m9a'
  // });
  console.debug("===============================================")
  console.debug(osn.NodeRevoStream.Module)
  // osn.NodeRevoStream.OBS_service_startStreaming(service1)//
  // setTimeout(() => {
  //   console.debug("STARTING NEXT BROADCAST")
  //   // osn.NodeRevoStream.OBS_service_stopStreaming(service1)
  //   // service1.release();
  //   // osn.NodeRevoStream.OBS_service_startStreaming(service2)
  // }, 5000)
  console.debug("===============================================")
  // console.debug(osn.NodeRevoStream.OBS_service_startStreaming(customService))
  // osn.OBSStudio.startStreaming({
  //   service: "twitch",
  //   streamKey: "your_stream_key",
  // });
  // console.debug(osn.NodeRevoStream.OBS_API_getPerformanceStatistics())
  // console.debug(osn.ModuleFactory.open("/Users/kamil/Documents/Github/RevoStream/node_modules/obs-studio-node/obs-plugins/obs-websocket.so", "/Users/kamil/Documents/Github/RevoStream/node_modules/obs-studio-node/data/obs-plugins/obs-websocket"));
  console.debug(osn.ModuleFactory.modules());
  // const sources = osn.OBSInputs.GetInputKindList();
  //   console.debug("Available Sources:", sources);

  //   // Get available filters
  //   const filters = osn.OBSFilters.GetFilterKindList();
  //   console.debug("Available Filters:", filters);

  //   // Get available outputs
  //   const outputs = osn.OBSOutputs.GetOutputKindList();
  //   console.debug("Available Outputs:", outputs);
}

function isVirtualCamPluginInstalled() {
  return osn.NodeRevoStream.OBS_service_isVirtualCamPluginInstalled();
}

function installVirtualCamPlugin() {
  osn.NodeRevoStream.OBS_service_installVirtualCamPlugin();
  return osn.NodeRevoStream.OBS_service_isVirtualCamPluginInstalled();
}

function uninstallVirtualCamPlugin() {
  osn.NodeRevoStream.OBS_service_uninstallVirtualCamPlugin();
  return !osn.NodeRevoStream.OBS_service_isVirtualCamPluginInstalled();
}

function startVirtualCam() {
  osn.NodeRevoStream.OBS_service_createVirtualWebcam("RevoStream-studio-node-example-cam");
  osn.NodeRevoStream.OBS_service_startVirtualWebcam();
}

function stopVirtualCam() {
  osn.NodeRevoStream.OBS_service_stopVirtualWebcam();
  osn.NodeRevoStream.OBS_service_removeVirtualWebcam();
}

// Get information about prinary display
function displayInfo() {
  const { screen } = require("electron");
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  const { scaleFactor } = primaryDisplay;
  return {
    width,
    height,
    scaleFactor: scaleFactor,
    aspectRatio: width / height,
    physicalWidth: width * scaleFactor,
    physicalHeight: height * scaleFactor,
  };
}

function getCameraSource() {
  console.debug("Trying to set up web camera...");

  // Setup input without initializing any device just to get list of available ones
  const dummyInput = byOS({
    [OS.Windows]: () =>
      osn.InputFactory.create("dshow_input", "video", {
        audio_device_id: "does_not_exist",
        video_device_id: "does_not_exist",
      }),
    [OS.Mac]: () =>
      osn.InputFactory.create("av_capture_input", "video", {
        device: "does_not_exist",
      }),
  });

  const cameraItems = dummyInput.properties.get(
    byOS({ [OS.Windows]: "video_device_id", [OS.Mac]: "device" })
  ).details.items;

  dummyInput.release();

  if (cameraItems.length === 0) {
    console.debug("No camera found!!");
    return null;
  }

  const deviceId = cameraItems[0].value;
  cameraItems[0].selected = true;
  console.debug("cameraItems[0].name: " + cameraItems[0].name);

  const RevoStreamCameraInput = byOS({
    [OS.Windows]: () =>
      osn.InputFactory.create("dshow_input", "video", {
        video_device_id: deviceId,
      }),
    [OS.Mac]: () =>
      osn.InputFactory.create("av_capture_input", "video", {
        device: deviceId,
      }),
  });

  // It's a hack to wait a bit until device become initialized (maximum for 1 second)
  // If you know proper way how to determine whether camera is working and how to subscribe for any events from it, create a pull request
  // See discussion at https://github.com/Envek/RevoStream-studio-node-example/issues/10
  for (let i = 1; i <= 4; i++) {
    if (RevoStreamCameraInput.width === 0) {
      const waitMs = 100 * i;
      console.debug(`Waiting for ${waitMs}ms until camera get initialized.`);
      busySleep(waitMs); // We can't use async/await here
    }
  }

  if (RevoStreamCameraInput.width === 0) {
    console.debug(
      `Found camera "${cameraItems[0].name}" doesn't seem to work as its reported width is still zero.`
    );
    return null;
  }

  // Way to update settings if needed:
  // let settings = RevoStreamCameraInput.settings;
  // console.debug('Camera settings:', RevoStreamCameraInput.settings);
  // settings['width'] = 320;
  // settings['height'] = 240;
  // RevoStreamCameraInput.update(settings);
  // RevoStreamCameraInput.save();

  return RevoStreamCameraInput;
}

let TxtSource = null;

function setupScene() {
  const videoSource = osn.InputFactory.create(
    byOS({ [OS.Windows]: "monitor_capture", [OS.Mac]: "display_capture" }),
    "desktop-video"
  );
   TxtSource = osn.InputFactory.create("text_ft2_source_v2", "Text Source", {
    text: "Hello, World!",
  });

  const { physicalWidth, physicalHeight, aspectRatio } = displayInfo();

  // Update source settings:
  let settings = videoSource.settings;
  settings["width"] = physicalWidth;
  settings["height"] = physicalHeight;
  videoSource.update(settings);
  videoSource.save();

  // Set output video size to 1920x1080
  const outputWidth = 1920;
  const outputHeight = Math.round(outputWidth / aspectRatio);
  setSetting("Video", "Base", `${outputWidth}x${outputHeight}`);
  setSetting("Video", "Output", `${outputWidth}x${outputHeight}`);
  const videoScaleFactor = physicalWidth / outputWidth;

  // A scene is necessary here to properly scale captured screen size to output video size
  const scene = osn.SceneFactory.create("test-scene");
  // const sceneItem = scene.add(videoSource);
  scene.add(TxtSource);
  // sceneItem.scale = { x: 1.0 / videoScaleFactor, y: 1.0 / videoScaleFactor };

  // If camera is available, make it 1/3 width of video and place it to right down corner of display
  const cameraSource = getCameraSource();
  if (cameraSource) {
    const cameraItem = scene.add(cameraSource);
    const cameraScaleFactor = 1.0 / ((3.0 * cameraSource.width) / outputWidth);
    cameraItem.scale = { x: cameraScaleFactor, y: cameraScaleFactor };
    cameraItem.position = {
      x:
        outputWidth - cameraSource.width * cameraScaleFactor - outputWidth / 10,
      y:
        outputHeight -
        cameraSource.height * cameraScaleFactor -
        outputHeight / 10,
    };
  }

  console.debug("ADDING SCENES")
  // scene1 = osn.SceneFactory.create('Scene 1');
  // scene2 = osn.SceneFactory.create('Scene 2');
  // source1 = osn.InputFactory.create('color_source', 'Color Source 1', { color: 0xFF0000 }); // Red color source
  // source2 = osn.InputFactory.create('color_source', 'Color Source 2', { color: 0x0000FF });
  // scene1.add(source1);
  // scene2.add(source2);

  return scene;
}

function getAudioDevices(type, subtype) {
  const dummyDevice = osn.InputFactory.create(type, subtype, {
    device_id: "does_not_exist",
  });
  const devices = dummyDevice.properties
    .get("device_id")
    .details.items.map(({ name, value }) => {
      return { device_id: value, name };
    });
  dummyDevice.release();
  return devices;
}

function setupSources() {
  osn.Global.setOutputSource(1, scene);

  setSetting("Output", "Track1Name", "Mixed: all sources");
  let currentTrack = 2;

  getAudioDevices(
    byOS({
      [OS.Windows]: "wasapi_output_capture",
      [OS.Mac]: "coreaudio_output_capture",
    }),
    "desktop-audio"
  ).forEach((metadata) => {
    if (metadata.device_id === "default") return;
    const source = osn.InputFactory.create(
      byOS({
        [OS.Windows]: "wasapi_output_capture",
        [OS.Mac]: "coreaudio_output_capture",
      }),
      "desktop-audio",
      { device_id: metadata.device_id }
    );
    setSetting("Output", `Track${currentTrack}Name`, metadata.name);
    source.audioMixers = 1 | (1 << (currentTrack - 1)); // Bit mask to output to only tracks 1 and current track
    osn.Global.setOutputSource(currentTrack, source);
    currentTrack++;
  });

  getAudioDevices(
    byOS({
      [OS.Windows]: "wasapi_input_capture",
      [OS.Mac]: "coreaudio_input_capture",
    }),
    "mic-audio"
  ).forEach((metadata) => {
    if (metadata.device_id === "default") return;
    const source = osn.InputFactory.create(
      byOS({
        [OS.Windows]: "wasapi_input_capture",
        [OS.Mac]: "coreaudio_input_capture",
      }),
      "mic-audio",
      { device_id: metadata.device_id }
    );
    setSetting("Output", `Track${currentTrack}Name`, metadata.name);
    source.audioMixers = 1 | (1 << (currentTrack - 1)); // Bit mask to output to only tracks 1 and current track
    osn.Global.setOutputSource(currentTrack, source);
    currentTrack++;
  });

  setSetting("Output", "RecTracks", parseInt("1".repeat(currentTrack - 1), 2)); // Bit mask of used tracks: 1111 to use first four (from available six)
}

const displayId = "display1";
let existingWindow = false;
let initY = 0;

function setupPreview(window, bounds) {
  osn.NodeRevoStream.OBS_content_createSourcePreviewDisplay(
    window.getNativeWindowHandle(),
    scene.name, // or use camera source Id here
    displayId
  );
  osn.NodeRevoStream.OBS_content_setShouldDrawUI(displayId, false);
  osn.NodeRevoStream.OBS_content_setPaddingSize(displayId, 0);
  // Match padding color with main window background color
  osn.NodeRevoStream.OBS_content_setPaddingColor(displayId, 255, 255, 255);
  console.debug(bounds)

  let { aspectRatio, scaleFactor } = displayInfo();
  if (getOS() === OS.Mac) {
    scaleFactor = 1;
  }
  const displayWidth = Math.floor(bounds.width);
  const displayHeight = Math.round(displayWidth / aspectRatio);
  const displayX = Math.floor(bounds.x);
  const displayY = Math.floor(bounds.y);
  if (initY === 0) {
    initY = displayY;
  }

  if (getOS() === OS.Mac) {
    if (existingWindow) {
      nwr.destroyWindow(displayId);
      nwr.destroyIOSurface(displayId);
    }
    const surface = osn.NodeRevoStream.OBS_content_createIOSurface(displayId);
    nwr.createWindow(displayId, window.getNativeWindowHandle());
    nwr.connectIOSurface(displayId, surface);
    nwr.moveWindow(
      displayId,
      displayX * scaleFactor,
      (initY - displayY + initY) * scaleFactor
    );
    existingWindow = true;
  } else {
    osn.NodeRevoStream.OBS_content_moveDisplay(
      displayId,
      displayX * scaleFactor,
      displayY * scaleFactor
    );
  }
  
  const resized = () => {
    osn.NodeObs.OBS_content_resizeDisplay(displayId, bounds.width, bounds.height + 20);
    osn.NodeObs.OBS_content_setPaddingSize(displayId, 1);
  };
  // window.on("close", () => {
    //   osn.NodeObs.OBS_content_destroyDisplay(displayId);
    //   window = undefined;
    // });
    window.on("resize", resized);
    resized();
    return { height: bounds.height };
    
  // return resizePreview(window, bounds);
}

function resizePreview(window, bounds) {
  let { aspectRatio, scaleFactor } = displayInfo();
  if (getOS() === OS.Mac) {
    scaleFactor = 1;
  }
  const displayWidth = Math.floor(bounds.width);
  const displayHeight = Math.round(displayWidth / aspectRatio);
  const displayX = Math.floor(bounds.x);
  const displayY = Math.floor(bounds.y);
  if (initY === 0) {
    initY = displayY;
  }
  osn.NodeRevoStream.OBS_content_resizeDisplay(
    displayId,
    displayWidth * scaleFactor,
    displayHeight * scaleFactor
  );

  if (getOS() === OS.Mac) {
    if (existingWindow) {
      nwr.destroyWindow(displayId);
      nwr.destroyIOSurface(displayId);
    }
    const surface = osn.NodeRevoStream.OBS_content_createIOSurface(displayId);
    nwr.createWindow(displayId, window.getNativeWindowHandle());
    nwr.connectIOSurface(displayId, surface);
    nwr.moveWindow(
      displayId,
      displayX * scaleFactor,
      (initY - displayY + initY) * scaleFactor
    );
    existingWindow = true;
  } else {
    osn.NodeRevoStream.OBS_content_moveDisplay(
      displayId,
      displayX * scaleFactor,
      displayY * scaleFactor
    );
  }

  return { height: displayHeight };
}

function playTransition(name){
  const scene1 = osn.SceneFactory.create('Scene 1');
  const scene2 = osn.SceneFactory.create('Scene 2');
  console.debug(osn.InputFactory.fromName('Text Source').settings)
  // TxtSource.save();
  TxtSource.update( {
    text: "Changed me!",
    size: 120,
    color1: 4294967295,
    color2: 3694967295,
  });
  console.debug(osn.InputFactory.types())
  source1 = osn.InputFactory.create('color_source_v3', 'Color Source 1', { color: 0xFF0000 }); // Red color source
  source2 = osn.InputFactory.create('color_source_v3', 'Color Source 2', { color: 0x0000FF });
  const scene1_item = scene1.add(source1);
  const scene2_item = scene2.add(source2);
  // console.debug(scene2_item)
  const fadeTransition = osn.TransitionFactory.create('fade_transition', 'fade1', {
    duration: 500
  });

  // Set the transition duration (in milliseconds)
  // fadeTransition.settings = {
  //     duration: 1000 // 1 second fade
  // };
  // console.debug(osn.Global)
  fadeTransition.set(scene1)
  osn.Global.setOutputSource(0, fadeTransition);
  fadeTransition.start(600, scene1)
  // osn.Global.setCurrentScene(scene1); // Set the initial scene
  // osn.Global.setCurrentTransition(fadeTransition); // Set the fade transition
  // osn.Global.setCurrentScene(scene2);
  // setTimeout(() => {
  //   // osn.Global.setCurrentScene(scene1); // Trigger the transition back to Scene 1
  // }, 2000);
  // console.debug(osn.NodeRevoStream.Transition)
//   const transitionTypes = osn.TransitionFactory.types();
// console.log('Available Transition Types:', transitionTypes);

// // Step 2: Display details for each transition type
// transitionTypes.forEach((type) => {
//     const transition = osn.TransitionFactory.create(type, `Transition - ${type}`);
//     console.log(`Transition Type: ${type}`);
//     console.log('Transition Settings:', transition.settings);
//     transition.release(); // Release the transition to free resources
// });
  // return 'Transition played';
  // osn.NodeRevoStream.OBS_service_playTransition(name);
}

async function start() {
  if (!RevoStreamInitialized) initialize();

  let signalInfo;

  console.debug("Starting recording...");
  osn.NodeRevoStream.OBS_service_startRecording();

  console.debug("Started?");
  signalInfo = await getNextSignalInfo();

  if (signalInfo.signal === "Stop") {
    throw Error(signalInfo.error);
  }

  console.debug(
    "Started signalInfo.type:",
    signalInfo.type,
    '(expected: "recording")'
  );
  console.debug(
    "Started signalInfo.signal:",
    signalInfo.signal,
    '(expected: "start")'
  );
  console.debug("Started!");
}

async function stop() {
  let signalInfo;

  console.debug("Stopping recording...");
  osn.NodeRevoStream.OBS_service_stopRecording();
  console.debug("Stopped?");

  signalInfo = await getNextSignalInfo();

  console.debug(
    "On stop signalInfo.type:",
    signalInfo.type,
    '(expected: "recording")'
  );
  console.debug(
    "On stop signalInfo.signal:",
    signalInfo.signal,
    '(expected: "stopping")'
  );

  signalInfo = await getNextSignalInfo();

  console.debug(
    "After stop signalInfo.type:",
    signalInfo.type,
    '(expected: "recording")'
  );
  console.debug(
    "After stop signalInfo.signal:",
    signalInfo.signal,
    '(expected: "stop")'
  );

  console.debug("Stopped!");
}

function shutdown() {
  if (!RevoStreamInitialized) {
    console.debug("RevoStream is already shut down!");
    return false;
  }

  console.debug("Shutting down RevoStream...");

  try {
    osn.NodeObs.OBS_service_removeCallback();
    osn.NodeObs.IPC.disconnect();
    RevoStreamInitialized = false;
  } catch (e) {
    throw Error("Exception when shutting down RevoStream process" + e);
  }

  console.debug("RevoStream shutdown successfully");

  return true;
}

function setSetting(category, parameter, value) {
    let oldValue;
  
    // Getting settings container
    const settings = osn.NodeRevoStream.OBS_settings_getSettings(category).data;
  
    if (!settings) {
      console.error(`Settings for category ${category} are undefined`);
      return;
    }
  
    settings.forEach((subCategory) => {
      subCategory.parameters.forEach((param) => {
        if (param.name === parameter) {
          oldValue = param.currentValue;
          param.currentValue = value;
        }
      });
    });
  
    // Saving updated settings container
    if (value != oldValue) {
      osn.NodeRevoStream.OBS_settings_saveSettings(category, settings);
    }
  }

function getAvailableValues(category, subcategory, parameter) {
  const categorySettings = osn.NodeRevoStream.OBS_settings_getSettings(category).data;
  if (!categorySettings) {
    console.warn(`There is no category ${category} in RevoStream settings`);
    return [];
  }

  const subcategorySettings = categorySettings.find(
    (sub) => sub.nameSubCategory === subcategory
  );
  if (!subcategorySettings) {
    console.warn(
      `There is no subcategory ${subcategory} for RevoStream settings category ${category}`
    );
    return [];
  }

  const parameterSettings = subcategorySettings.parameters.find(
    (param) => param.name === parameter
  );
  if (!parameterSettings) {
    console.warn(
      `There is no parameter ${parameter} for RevoStream settings category ${category}.${subcategory}`
    );
    return [];
  }

  return parameterSettings.values.map((value) => Object.values(value)[0]);
}

const signals = new Subject();

function getNextSignalInfo() {
  return new Promise((resolve, reject) => {
    signals.pipe(first()).subscribe((signalInfo) => resolve(signalInfo));
    setTimeout(() => reject("Output signal timeout"), 30000);
  });
}

function busySleep(sleepDuration) {
  var now = new Date().getTime();
  while (new Date().getTime() < now + sleepDuration) {
    /* do nothing */
  }
}

module.exports.initialize = initialize;
module.exports.start = start;
module.exports.isVirtualCamPluginInstalled = isVirtualCamPluginInstalled;
module.exports.installVirtualCamPlugin = installVirtualCamPlugin;
module.exports.uninstallVirtualCamPlugin = uninstallVirtualCamPlugin;
module.exports.startVirtualCam = startVirtualCam;
module.exports.stopVirtualCam = stopVirtualCam;
module.exports.stop = stop;
module.exports.shutdown = shutdown;
module.exports.setupPreview = setupPreview;
module.exports.resizePreview = resizePreview;
module.exports.playTransition = playTransition;
