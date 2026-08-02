import "./styles.css";
import "./styles/gearLibraryDesignPreviews.css";
import { invoke } from "@tauri-apps/api/core";
import { effectImageMap } from "./effectImageMap.js";
import {
  getAmpImage,
  resolveAmpRecordFromTextSources
} from "./library/index.js";
import {
  initializeGearLibrary,
  registerViewChangeHandler
} from "./gearLibrary.js";
import { initializeAudioTools } from "./modules/audioTools/AudioToolsView.js";
import {
  cabinetImageMap,
  CAB_BRAND_ALIASES
} from "./cabinetImageMap";

const CURRENT_RIG_NAME_REQUEST = [
  0xf0, 0x00, 0x20, 0x33, 0x02, 0x7f, 0x43, 0x00, 0x00, 0x01, 0xf7
];
const SYSEX_HEADER = [0xf0, 0x00, 0x20, 0x33];
const KEMPER_REQUEST_PREFIX = [0xf0, 0x00, 0x20, 0x33, 0x02, 0x7f];
const STRING_TAGS = {
  rigName: [0x00, 0x01],
  rigAuthor: [0x00, 0x02],
  ampName: [0x00, 0x10],
  ampManufacturer: [0x00, 0x15],
  ampModel: [0x00, 0x18],
  ampYearOfProduction: [0x00, 0x1b],
  cabinetName: [0x00, 0x20],
  cabinetManufacturer: [0x00, 0x25],
  cabinetModel: [0x00, 0x2a]
};
const NUMERIC_PARAMS = {
  gain: [0x0a, 0x04],
  tempoBpm: [0x04, 0x00]
};
const EFFECT_MODULES = [
  { key: "stompA", label: "Stomp A", cc: 17, page: 0x32, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompB", label: "Stomp B", cc: 18, page: 0x33, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompC", label: "Stomp C", cc: 19, page: 0x34, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompD", label: "Stomp D", cc: 20, page: 0x35, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompX", label: "Stomp X", cc: 22, page: 0x38, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "mod", label: "MOD", cc: 24, page: 0x3a, onOff: 0x03, type: 0x00, group: "mod" },
  { key: "delay", label: "Delay", cc: 26, page: 0x3c, onOff: 0x03, type: 0x00, group: "delay" },
  { key: "reverb", label: "Reverb", cc: 28, page: 0x3d, onOff: 0x03, type: 0x00, group: "reverb" }
];
const SLOT_SELECTORS = [
  { key: "slot1", label: "Slot 1", cc: 50, value: 1 },
  { key: "slot2", label: "Slot 2", cc: 51, value: 1 },
  { key: "slot3", label: "Slot 3", cc: 52, value: 1 },
  { key: "slot4", label: "Slot 4", cc: 53, value: 1 },
  { key: "slot5", label: "Slot 5", cc: 54, value: 1 }
];
const MIDI_CHANNEL = 1;
const STATUS_CONTROL_CHANGE = 0xb0 + (MIDI_CHANNEL - 1);
const LIBRARY_SCAN_PERFORMANCE_COUNT = 125;
const SLOT_SETTLE_MS = 500;
const PERFORMANCE_ADVANCE_MS = 500;
const PERFORMANCE_SELECT_SETTLE_MS = 700;
const EFFECT_TOGGLE_SETTLE_MS = 350;
const PERFORMANCE_LIBRARY_STORAGE_KEY = "kemper-performance-library";
const PERFORMANCE_LIBRARY_META_KEY = "_meta";
const CONTROL_CHANGES = {
  tapTempo: 30,
  tuner: 31,
  morph: 80
};
const TAP_TEMPO_BPM_MIN = 40;
const TAP_TEMPO_BPM_MAX = 300;
const TAP_TEMPO_TAP_COUNT = 4;
const EFFECT_TYPE_NAMES = {
  1: "Wah Wah",
  2: "Wah Low Pass",
  3: "Wah High Pass",
  4: "Wah Vowel Filter",
  6: "Wah Phaser",
  7: "Wah Flanger",
  8: "Wah Rate Reducer",
  9: "Wah Ring Modulator",
  10: "Wah Freq Shifter",
  11: "Pedal Pitch",
  12: "Formant Wah",
  17: "Bit Shaper",
  18: "Recti Shaper",
  19: "Soft Shaper",
  20: "Hard Shaper",
  21: "Wave Shaper",
  32: "Kemper Drive",
  33: "Green Scream",
  34: "Plus DS",
  35: "One DS",
  36: "Muffin",
  37: "Mouse",
  38: "Fuzz DS",
  39: "Metal DS",
  42: "Full OC",
  49: "Compressor",
  57: "Gate 2:1",
  58: "Gate 4:1",
  65: "Vintage Chorus",
  66: "Hyper Chorus",
  67: "Air Chorus",
  68: "Vibrato",
  69: "Rotary Speaker",
  70: "Tremolo",
  71: "Micro Pitch",
  81: "Phaser",
  82: "Phaser Vibe",
  83: "Phaser Oneway",
  89: "Flanger",
  91: "Flanger Oneway",
  97: "Graphic EQ",
  98: "Studio EQ",
  99: "Metal EQ",
  100: "Acoustic Simulator",
  101: "Stereo Widener",
  113: "Treble Booster",
  114: "Lead Booster",
  115: "Pure Booster",
  116: "Wah Pedal Booster",
  121: "Loop Mono",
  122: "Loop Stereo",
  123: "Loop Distortion",
  129: "Transpose",
  130: "Chromatic Pitch",
  131: "Harmonic Pitch",
  132: "Analog Octaver",
  138: "Dual Harmonic",
  139: "Dual Crystal",
  140: "Dual Loop Pitch",
  145: "Legacy Delay",
  146: "Single Delay",
  147: "Dual Delay",
  148: "Two Tap Delay",
  149: "Serial TwoTap Delay",
  150: "Crystal Delay",
  151: "Loop Pitch Delay",
  152: "Freq Shifter Delay",
  161: "Rhythm Delay",
  162: "Melody Chromatic",
  163: "Melody Harmonic",
  164: "Quad Delay",
  165: "Quad Chromatic",
  166: "Quad Harmonic",
  177: "Legacy Reverb",
  178: "Natural Reverb",
  179: "Easy Reverb",
  180: "Echo Reverb",
  181: "Cirrus Reverb",
  182: "Formant Reverb",
  183: "Ionosphere Reverb",
  193: "Spring Reverb"
};
const EFFECT_IMAGE_ALIASES = {
  "Kemper Drive": "kemper_drive.png",
  "Kemper Fuzz": "fuzz_face.png",
  "Fuzz DS": "fuzz_face.png",
  "Graphic Equalizer": "eq.png",
  "Graphic EQ": "eq.png",
  "Studio Equalizer": "eq.png",
  "Studio EQ": "eq.png",
  "Metal Equalizer": "eq.png",
  "Metal EQ": "eq.png",
  "Gate 2:1": "noise_gate.png",
  "Gate 4:1": "noise_gate.png",
  "Tube Bias Tremolo": "tremolo.png",
  "Phaser Vibe": "phaser_vibe.png",
  "Vibe Phaser": "phaser_vibe.png",
  "Vibrato": "vibrato.png",
  "Two Tap Delay": "single_delay.png",
  "Serial TwoTap Delay": "single_delay.png",
  "Legacy Delay": "tape_delay.png",
  "Dual Crystal": "micro_pitch+crytal_delay.png",
  "Dual Harmonic": "whammy.png",
  "Loop Pitch Delay": "whammy.png",
  "Freq Shifter Delay": "transpose.png",
  "Easy Reverb": "reverb.png",
  "Echo Reverb": "reverb.png",
  "Cirrus Reverb": "reverb.png",
  "Formant Reverb": "reverb.png",
  "Ionosphere Reverb": "shimmer_reverb.png",
  "Spring Reverb": "reverb.png"
};
const MODULE_FALLBACK_EFFECTS = {
  reverb: {
    name: "Reverb",
    image: "reverb.png"
  },
  delay: {
    name: "Delay",
    image: "single_delay.png"
  }
};
const MANUFACTURER_PATTERNS = [
  ["marshall", "Marshall"],
  ["jcm", "Marshall"],
  ["plexi", "Marshall"],
  ["jtm", "Marshall"],
  ["jvm", "Marshall"],
  ["mesa", "Mesa"],
  ["boogie", "Mesa"],
  ["rectifier", "Mesa"],
  ["mark iic", "Mesa"],
  ["fender", "Fender"],
  ["twin", "Fender"],
  ["deluxe", "Fender"],
  ["bassman", "Fender"],
  ["vox", "Vox"],
  ["ac30", "Vox"],
  ["ac15", "Vox"],
  ["orange", "Orange"],
  ["rockerverb", "Orange"],
  ["engl", "ENGL"],
  ["diezel", "Diezel"],
  ["vh4", "Diezel"],
  ["soldano", "Soldano"],
  ["slo", "Soldano"],
  ["5150", "Peavey"],
  ["6505", "Peavey"],
  ["bogner", "Bogner"],
  ["friedman", "Friedman"],
  ["bad cat", "Bad Cat"],
  ["hiwatt", "Hiwatt"],
  ["matchless", "Matchless"],
  ["dumble", "Dumble"],
  ["roland", "Roland"],
  ["jc-120", "Roland"]
];

const inputPort = document.querySelector("#inputPort");
const outputPort = document.querySelector("#outputPort");
const rigName = document.querySelector("#rigName");
const ampManufacturer = document.querySelector("#ampManufacturer");
const ampModel = document.querySelector("#ampModel");
const ampDetailsManufacturer = document.querySelector("#ampDetailsManufacturer");
const ampDetailsModel = document.querySelector("#ampDetailsModel");
const ampDetailsYear = document.querySelector("#ampDetailsYear");
const ampDetailsYearRow = document.querySelector("#ampDetailsYearRow");
const rigAuthor = document.querySelector("#rigAuthor");
const ampDetailsOriginalRigName = document.querySelector("#ampDetailsOriginalRigName");
const ampDetailsOriginalAmpName = document.querySelector("#ampDetailsOriginalAmpName");
const productionYear = document.querySelector("#productionYear");
const cabinetManufacturer = document.querySelector("#cabinetManufacturer");
const cabinetModel = document.querySelector("#cabinetModel");
const cabinetConfiguration = document.querySelector("#cabinetConfiguration");
const gainMeterFill = document.querySelector("#gainMeterFill");
const tunerToggleButton = document.querySelector("#tunerToggleButton");
const morphActionButton = document.querySelector("#morphActionButton");
const tempoBpmInput = document.querySelector("#tempoBpmInput");
const tempoBpmStepButtons = document.querySelectorAll(".tempo-bpm-step");
const tempoSetButton = document.querySelector("#tempoSetButton");
const tempoTapButton = document.querySelector("#tempoTapButton");
const tempoCurrentValue = document.querySelector("#tempoCurrentValue");
const tempoPanelToggle = document.querySelector("#tempoPanelToggle");
const tempoPanelControls = document.querySelector("#tempoPanelControls");
const tempoPanel = document.querySelector(".tempo-status");
const effectsList = document.querySelector("#effectsList");
const performanceSection = document.querySelector("#performanceSection");
const performanceEmptyState = document.querySelector("#performanceEmptyState");
const performanceBrowserControls = document.querySelector("#performanceBrowserControls");
const performancePrevFastButton = document.querySelector("#performancePrevFastButton");
const performancePrevButton = document.querySelector("#performancePrevButton");
const performanceNextButton = document.querySelector("#performanceNextButton");
const performanceNextFastButton = document.querySelector("#performanceNextFastButton");
const performanceBrowserLabel = document.querySelector("#performanceBrowserLabel");
const performanceScanPanel = document.querySelector("#performanceScanPanel");
const performanceScanStatus = document.querySelector("#performanceScanStatus");
const performanceProgress = document.querySelector("#performanceProgress");
const performanceProgressFill = document.querySelector("#performanceProgressFill");
const performanceSlotGrid = document.querySelector("#performanceSlotGrid");
const performanceExplorerSection = document.querySelector("#performanceExplorerSection");
const performanceExplorerToggle = document.querySelector("#performanceExplorerToggle");
const performanceBrowserPanel = document.querySelector("#performanceBrowserPanel");
const performanceExplorerContent = document.querySelector("#performanceExplorerContent");
const performanceExplorerSearch = document.querySelector("#performanceExplorerSearch");
const performanceExplorerEmpty = document.querySelector("#performanceExplorerEmpty");
const performanceExplorerList = document.querySelector("#performanceExplorerList");
const createLibraryButton = document.querySelector("#createLibraryButton");
const libraryConfirmDialog = document.querySelector("#libraryConfirmDialog");
const cancelLibraryScanButton = document.querySelector("#cancelLibraryScanButton");
const startLibraryScanButton = document.querySelector("#startLibraryScanButton");
const errorStatus = document.querySelector("#errorStatus");
const liveStatus = document.querySelector("#liveStatus");
const midiMonitorButton = document.querySelector("#midiMonitorButton");
const ampImageContainer = document.querySelector("#ampImageContainer");
const cabinetImageContainer = document.querySelector("#cabinetImageContainer");
const ampZoomOverlay = document.querySelector("#ampZoomOverlay");
const ampZoomImage = document.querySelector("#ampZoomImage");
const bootLoadingOverlay = document.querySelector("#bootLoadingOverlay");
const noMidiOverlay = document.querySelector("#noMidiOverlay");
const noMidiReconnectButton = document.querySelector("#noMidiReconnectButton");
const livePage = document.querySelector("#livePage");
let midiAccess;
let isRefreshingLiveData = false;
let isCheckingRigName = false;
let currentRigName = "";
let monitorTimer;
let passiveMidiDebugInput = null;
const passiveMidiDebugLastMessages = new Map();
let passiveMidiDebugMessageCount = 0;
let midiMonitorEnabled = false;

const CONNECTION_STATE = {
  BOOT_LOADING: "boot_loading",
  REFRESHING: "refreshing",
  NO_MIDI: "no_midi",
  CONNECTED: "connected"
};

function isConnectionOperational() {
  return (
    connectionState === CONNECTION_STATE.CONNECTED ||
    connectionState === CONNECTION_STATE.REFRESHING
  );
}
const liveStatusLabel = document.querySelector("#liveStatusLabel");
let connectionState = null;
let reconnectInProgress = false;
let connectionWatcher = null;
let consecutiveMonitorFailures = 0;
let performanceLibraryDocument = {};
let performanceLibraryScanInProgress = false;
let selectedPerformanceIndex = null;
let performanceExplorerExpanded = false;
let isLoadingPerformanceSlot = false;
let isTogglingEffect = false;
let isTogglingTuner = false;
let isTriggeringMorph = false;
let isSettingTempo = false;
let tempoPanelExpanded = false;
let tunerActive = false;
let lastKnownEffectsByKey = {};
const MONITOR_FAILURE_LIMIT = 2;
const RECONNECT_INTERVAL_MS = 2000;
let initialBootComplete = false;
let bootPresentationComplete = false;

function updateConnectionPresentation(state) {
  const isBootLoading = state === CONNECTION_STATE.BOOT_LOADING;
  const showBootOverlay = !bootPresentationComplete || isBootLoading;
  const isNoMidi = state === CONNECTION_STATE.NO_MIDI;
  const isLiveView = document.body.dataset.appView === "live";
  const isAppVisible =
    bootPresentationComplete &&
    isLiveView &&
    (state === CONNECTION_STATE.CONNECTED || state === CONNECTION_STATE.REFRESHING);

  if (bootLoadingOverlay) {
    bootLoadingOverlay.dataset.visible = showBootOverlay ? "true" : "false";
    bootLoadingOverlay.setAttribute("aria-hidden", showBootOverlay ? "false" : "true");
    bootLoadingOverlay.setAttribute("aria-busy", showBootOverlay ? "true" : "false");
  }

  if (noMidiOverlay) {
    noMidiOverlay.dataset.visible =
      isNoMidi && bootPresentationComplete && isLiveView ? "true" : "false";
    noMidiOverlay.setAttribute(
      "aria-hidden",
      isNoMidi && bootPresentationComplete && isLiveView ? "false" : "true"
    );
  }

  if (noMidiReconnectButton) {
    noMidiReconnectButton.disabled =
      showBootOverlay || reconnectInProgress || isRefreshingLiveData;
  }

  document.body.dataset.boot = showBootOverlay ? "loading" : "ready";
  document.body.dataset.connection = state ?? CONNECTION_STATE.BOOT_LOADING;

  if (livePage) {
    const showLivePage =
      bootPresentationComplete &&
      isLiveView &&
      (state === CONNECTION_STATE.CONNECTED ||
        state === CONNECTION_STATE.REFRESHING ||
        state === CONNECTION_STATE.NO_MIDI);
    livePage.setAttribute("aria-hidden", showLivePage ? "false" : "true");
  }
}

function completeInitialBoot() {
  if (initialBootComplete) return;

  initialBootComplete = true;
}

async function finishBootPresentation() {
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

  bootPresentationComplete = true;
  updateConnectionPresentation(connectionState);
}

async function bootApplication() {
  setConnectionState(CONNECTION_STATE.BOOT_LOADING);

  try {
    await Promise.all([initializePerformanceLibrary(), loadPorts()]);
  } finally {
    if (
      !initialBootComplete &&
      (connectionState === CONNECTION_STATE.CONNECTED ||
        connectionState === CONNECTION_STATE.NO_MIDI)
    ) {
      completeInitialBoot();
    }

    await finishBootPresentation();
  }
}

function hasSelectablePorts() {
  return Boolean(midiAccess && inputPort.value && outputPort.value);
}

function setStatus(message, tone = "neutral") {
  if (!errorStatus) return;

  errorStatus.textContent = tone === "error" ? message : "";
  errorStatus.dataset.visible = tone === "error" ? "true" : "false";
}

function setConnectionState(state) {
  if (connectionState === state) return;

  connectionState = state;

  if (liveStatus) {
    liveStatus.dataset.state = state;
  }

  if (liveStatusLabel) {
    liveStatusLabel.textContent =
      state === CONNECTION_STATE.CONNECTED
        ? "CONNECTED"
        : state === CONNECTION_STATE.REFRESHING
          ? "REFRESHING"
          : state === CONNECTION_STATE.BOOT_LOADING
            ? "LOADING"
            : "NO MIDI";
  }

  updateConnectionPresentation(state);

  if (state !== CONNECTION_STATE.NO_MIDI) {
    setStatus("");
  }

  updateControlSectionControls();

  if (
    hasPerformanceLibrary(performanceLibraryDocument) &&
    state !== CONNECTION_STATE.REFRESHING
  ) {
    renderPerformanceBrowser();
  }
}

function updateControlSectionControls() {
  updateTunerControls();
  updateMorphControls();
  updateTempoControls();
}

function parseTempoBpmInput(value) {
  const parsed = Number(String(value ?? "").trim());

  if (!Number.isFinite(parsed)) return null;

  const rounded = Math.round(parsed);
  if (rounded < TAP_TEMPO_BPM_MIN || rounded > TAP_TEMPO_BPM_MAX) return null;

  return rounded;
}

function setTempoInputState(state = "idle") {
  if (!tempoBpmInput) return;

  tempoBpmInput.dataset.state = state;
}

function updateTempoControls() {
  const blocked =
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot ||
    isSettingTempo;

  if (tempoBpmInput) tempoBpmInput.disabled = blocked;
  tempoBpmStepButtons.forEach((button) => {
    button.disabled = blocked;
  });
  if (tempoSetButton) tempoSetButton.disabled = blocked;
  if (tempoTapButton) tempoTapButton.disabled = blocked || isSettingTempo;
}

function setTempoPanelExpanded(expanded) {
  tempoPanelExpanded = expanded;

  if (tempoPanel) {
    tempoPanel.dataset.expanded = expanded ? "true" : "false";
  }

  if (tempoPanelToggle) {
    tempoPanelToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  if (tempoPanelControls) {
    tempoPanelControls.hidden = !expanded;
  }
}

function renderCurrentTempo(rawValue) {
  if (!tempoCurrentValue) return;

  if (rawValue === null || rawValue === undefined) {
    tempoCurrentValue.textContent = "-";
    tempoCurrentValue.dataset.state = "unknown";
    return;
  }

  tempoCurrentValue.textContent = `${Math.round(rawValue / 64)} BPM`;
  tempoCurrentValue.dataset.state = "ok";
}

function adjustTempoBpmInput(delta) {
  if (!tempoBpmInput || tempoBpmInput.disabled) return;

  const parsed = parseTempoBpmInput(tempoBpmInput.value);
  const base = parsed ?? 120;
  const next = Math.min(TAP_TEMPO_BPM_MAX, Math.max(TAP_TEMPO_BPM_MIN, base + delta));

  tempoBpmInput.value = String(next);

  if (tempoBpmInput.dataset.state === "error") {
    setTempoInputState("idle");
    setStatus("");
  }
}

async function refreshTempoOnly() {
  if (
    !isConnectionOperational() ||
    isSettingTempo ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot
  ) {
    return;
  }

  try {
    const tempoRaw = await requestNumericParam(NUMERIC_PARAMS.tempoBpm);
    renderCurrentTempo(tempoRaw);
  } catch {
    // silent
  }
}

async function sendManualTapTempo() {
  if (
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot ||
    isSettingTempo
  ) {
    return;
  }

  try {
    const { output } = await getMidiPorts();
    sendMidiSafe(output, makeTapTempoCommand(), "Manual Tap Tempo");
    await delay(350);
    await refreshTempoOnly();
  } catch (error) {
    console.warn("[Live Companion] Manual tap tempo failed:", error.message || error);
  }
}

async function setTempoViaTapSequence(bpm) {
  if (
    isSettingTempo ||
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot
  ) {
    return;
  }

  const validatedBpm = parseTempoBpmInput(bpm);
  if (validatedBpm === null) {
    setTempoInputState("error");
    setStatus(`Bitte einen BPM-Wert zwischen ${TAP_TEMPO_BPM_MIN} und ${TAP_TEMPO_BPM_MAX} eingeben.`, "error");
    return;
  }

  setTempoInputState("idle");
  setStatus("");

  isSettingTempo = true;
  updateControlSectionControls();

  if (tempoSetButton) {
    tempoSetButton.dataset.state = "sending";
    tempoSetButton.textContent = "Sending…";
  }

  const intervalMs = Math.round(60000 / validatedBpm);

  try {
    const { output } = await getMidiPorts();

    for (let tapIndex = 0; tapIndex < TAP_TEMPO_TAP_COUNT; tapIndex += 1) {
      sendMidiSafe(
        output,
        makeTapTempoCommand(),
        `Tap Tempo ${tapIndex + 1}/${TAP_TEMPO_TAP_COUNT} @ ${validatedBpm} BPM`
      );

      if (tapIndex < TAP_TEMPO_TAP_COUNT - 1) {
        await delay(intervalMs);
      }
    }

    await delay(350);
    await refreshTempoOnly();
  } catch (error) {
    console.warn("[Live Companion] Tempo set failed:", error.message || error);
    setStatus("Tempo konnte nicht gesetzt werden.", "error");
  } finally {
    isSettingTempo = false;

    if (tempoSetButton) {
      tempoSetButton.dataset.state = "idle";
      tempoSetButton.textContent = "Set";
    }

    updateControlSectionControls();
  }
}

async function handleTempoSetRequest() {
  await setTempoViaTapSequence(tempoBpmInput?.value);
}

function setTunerMode(isActive) {
  tunerActive = Boolean(isActive);

  if (!tunerToggleButton) return;

  tunerToggleButton.dataset.state = tunerActive ? "on" : "off";
  tunerToggleButton.setAttribute("aria-pressed", tunerActive ? "true" : "false");
  tunerToggleButton.setAttribute("aria-label", tunerActive ? "Tuner schließen" : "Tuner öffnen");
}

function updateTunerControls() {
  if (!tunerToggleButton) return;

  tunerToggleButton.disabled =
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot ||
    isTogglingTuner;
}

const MORPH_PRESS_MS = 80;
const MORPH_FLASH_MS = 360;
const MORPH_GAIN_READ_DELAY_MS = 500;
const GAIN_METER_SEGMENT_COUNT = 12;

function updateMorphControls() {
  if (!morphActionButton) return;

  morphActionButton.disabled =
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot ||
    isTriggeringMorph;
}

async function triggerMorphAction() {
  if (
    isTriggeringMorph ||
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot
  ) {
    return;
  }

  isTriggeringMorph = true;
  morphActionButton?.classList.add("is-flashing");
  updateControlSectionControls();

  try {
    const { output } = await getMidiPorts();
    const pressed = sendMidiSafe(output, makeMorphPressCommand(), "Morph Press");

    if (pressed) {
      await delay(MORPH_PRESS_MS);
      sendMidiSafe(output, makeMorphReleaseCommand(), "Morph Release");
      await refreshGainAfterMorph();
    }
  } catch (error) {
    console.warn("[Live Companion] Morph action failed:", error.message || error);
  } finally {
    window.setTimeout(() => {
      morphActionButton?.classList.remove("is-flashing");
      isTriggeringMorph = false;
      updateControlSectionControls();
    }, MORPH_FLASH_MS);
  }
}

async function toggleTuner() {
  if (
    isTogglingTuner ||
    !isConnectionOperational() ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot
  ) {
    return;
  }

  const wasActive = tunerActive;
  const nextActive = !wasActive;

  isTogglingTuner = true;
  setTunerMode(nextActive);
  updateControlSectionControls();

  try {
    const { output } = await getMidiPorts();
    const sent = sendMidiSafe(
      output,
      makeTunerToggleCommand(wasActive),
      wasActive ? "Close Tuner" : "Open Tuner"
    );

    if (!sent) {
      setTunerMode(wasActive);
    }
  } catch (error) {
    setTunerMode(wasActive);
    console.warn("[Live Companion] Tuner toggle failed:", error.message || error);
  } finally {
    isTogglingTuner = false;
    updateControlSectionControls();
  }
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function makeControlChange(controller, value) {
  return [STATUS_CONTROL_CHANGE, controller & 0x7f, value & 0x7f];
}

function makeSlotSelectCommand(slot) {
  return makeControlChange(slot.cc, slot.value);
}

function makePerformanceSelectCommand(performanceIndex) {
  return makeControlChange(47, performanceIndex & 0x7f);
}

function makeRigNextCommand() {
  return makeControlChange(48, 0);
}

function makeEffectToggleCommand(module, isActive) {
  return makeControlChange(module.cc, isActive ? 0 : 1);
}

function makeOpenTunerCommand() {
  return makeControlChange(CONTROL_CHANGES.tuner, 1);
}

function makeCloseTunerCommand() {
  return makeControlChange(CONTROL_CHANGES.tuner, 0);
}

function makeTunerToggleCommand(isActive) {
  return isActive ? makeCloseTunerCommand() : makeOpenTunerCommand();
}

function makeMorphPressCommand() {
  return makeControlChange(CONTROL_CHANGES.morph, 1);
}

function makeMorphReleaseCommand() {
  return makeControlChange(CONTROL_CHANGES.morph, 0);
}

function makeTapTempoCommand() {
  return makeControlChange(CONTROL_CHANGES.tapTempo, 0);
}

function sendMidi(output, bytes) {
  output.send(bytes);
}

function sendMidiSafe(output, bytes, label) {
  try {
    sendMidi(output, bytes);
    return true;
  } catch (error) {
    console.warn(`[Live Companion] MIDI send failed for ${label}:`, error.message || error);
    return false;
  }
}

async function resetToFirstPerformance(output, contextLabel) {
  console.info(`[Live Companion] ${contextLabel}: selecting Performance 1 Slot 1.`);
  sendMidiSafe(output, makePerformanceSelectCommand(0), `${contextLabel} Performance 1 preselect`);
  await delay(PERFORMANCE_SELECT_SETTLE_MS);
  sendMidiSafe(output, makeSlotSelectCommand(SLOT_SELECTORS[0]), `${contextLabel} Slot 1 load`);
  await delay(SLOT_SETTLE_MS);
}

async function invokeTauri(command, args = {}) {
  try {
    return await invoke(command, args);
  } catch (error) {
    console.warn(`[Live Companion] Tauri invoke ${command} unavailable:`, error.message || error);
    return null;
  }
}

function createEmptyLibraryDocument(originalRigNameAtStart = "") {
  return {
    [PERFORMANCE_LIBRARY_META_KEY]: {
      version: 1,
      scanStartedAt: new Date().toISOString(),
      lastSavedAt: null,
      originalRigNameAtStart,
      completedPerformances: 0,
      scanInProgress: true,
      scanComplete: false
    }
  };
}

function getPerformanceEntries(document = {}) {
  return Object.fromEntries(
    Object.entries(document || {}).filter(([key]) => /^\d+$/.test(key))
  );
}

function countSavedPerformances(document = {}) {
  return Object.keys(getPerformanceEntries(document)).length;
}

function hasPerformanceLibrary(document = {}) {
  return countSavedPerformances(document) > 0;
}

async function loadPerformanceLibraryDocument() {
  const fromTauri = await invokeTauri("load_performance_library");

  if (typeof fromTauri === "string") {
    try {
      return JSON.parse(fromTauri || "{}");
    } catch (error) {
      console.warn("[Live Companion] Invalid performance library JSON on disk:", error.message || error);
    }
  }

  try {
    const raw = window.localStorage.getItem(PERFORMANCE_LIBRARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function savePerformanceLibraryDocument(document) {
  document[PERFORMANCE_LIBRARY_META_KEY] = {
    ...document[PERFORMANCE_LIBRARY_META_KEY],
    lastSavedAt: new Date().toISOString()
  };

  const serialized = JSON.stringify(document, null, 2);
  const fromTauri = await invokeTauri("save_performance_library", { contents: serialized });

  if (fromTauri === null) {
    window.localStorage.setItem(PERFORMANCE_LIBRARY_STORAGE_KEY, serialized);
  }

  return document;
}

function setPerformanceProgress({ savedCount = 0, totalPerformances = LIBRARY_SCAN_PERFORMANCE_COUNT } = {}) {
  const percent = totalPerformances
    ? Math.max(0, Math.min(100, (savedCount / totalPerformances) * 100))
    : 0;

  if (performanceProgressFill) {
    performanceProgressFill.style.width = `${percent}%`;
  }
}

function setPerformanceScanPanelVisible(visible) {
  if (performanceScanPanel) {
    performanceScanPanel.hidden = !visible;
  }

  if (performanceScanStatus) {
    performanceScanStatus.hidden = !visible;
    performanceScanStatus.setAttribute("aria-hidden", visible ? "false" : "true");
  }

  if (!visible) {
    setPerformanceProgress({ savedCount: 0 });
  }
}

function setPerformanceScanStatus(message, state = "loading") {
  if (!performanceScanStatus) return;

  performanceScanStatus.textContent = message;
  performanceScanStatus.dataset.state = state;
}

function getPerformanceIndexList(document = performanceLibraryDocument) {
  return Object.keys(getPerformanceEntries(document)).sort(
    (left, right) => Number(left) - Number(right)
  );
}

function normalizeExplorerQuery(query) {
  return String(query || "").trim().toLowerCase();
}

function performanceMatchesExplorerQuery(performanceIndex, slots, query) {
  if (!query) return true;

  if (String(performanceIndex).includes(query)) return true;

  const performanceLabel = `performance ${performanceIndex}`;
  if (performanceLabel.includes(query)) return true;

  return SLOT_SELECTORS.some((slot, index) => {
    const slotIndex = index + 1;
    const rigName = String(slots[String(slotIndex)] || "").toLowerCase();
    const slotLabel = `slot ${slotIndex}`;

    return rigName.includes(query) || slotLabel.includes(query);
  });
}

function createExplorerMark(text) {
  const mark = document.createElement("mark");
  mark.className = "performance-explorer-mark";
  mark.textContent = text;
  return mark;
}

function appendExplorerHighlightedText(container, text, query) {
  const normalizedText = String(text || "");
  container.textContent = "";

  if (!query) {
    container.textContent = normalizedText;
    return;
  }

  const lowerText = normalizedText.toLowerCase();
  const matchIndex = lowerText.indexOf(query);

  if (matchIndex === -1) {
    container.textContent = normalizedText;
    return;
  }

  container.append(
    document.createTextNode(normalizedText.slice(0, matchIndex)),
    createExplorerMark(normalizedText.slice(matchIndex, matchIndex + query.length)),
    document.createTextNode(normalizedText.slice(matchIndex + query.length))
  );
}

function setPerformanceExplorerExpanded(expanded) {
  performanceExplorerExpanded = expanded;

  if (performanceExplorerToggle) {
    performanceExplorerToggle.setAttribute("aria-expanded", expanded ? "true" : "false");

    const icon = performanceExplorerToggle.querySelector(".performance-explorer-toggle-icon");
    if (icon) {
      icon.textContent = expanded ? "▼" : "▶";
    }
  }

  if (performanceExplorerContent) {
    performanceExplorerContent.hidden = !expanded;
  }

  if (expanded) {
    renderPerformanceExplorer();
  }
}

function updatePerformanceSectionLayout() {
  const hasLibrary = hasPerformanceLibrary(performanceLibraryDocument);

  if (performanceBrowserPanel) {
    performanceBrowserPanel.hidden = !hasLibrary || performanceLibraryScanInProgress;
  }

  if (performanceExplorerSection) {
    const showExplorerSection = hasLibrary && !performanceLibraryScanInProgress;
    performanceExplorerSection.hidden = !showExplorerSection;

    if (!showExplorerSection && performanceExplorerContent) {
      performanceExplorerContent.hidden = true;
      return;
    }
  }

  if (performanceExplorerContent) {
    performanceExplorerContent.hidden = !performanceExplorerExpanded;
  }

  if (hasLibrary && performanceExplorerExpanded && !performanceLibraryScanInProgress) {
    renderPerformanceExplorer();
  }
}

function setPerformanceExplorerSlotState(performanceIndex, slotIndex, state) {
  if (!performanceExplorerList) return;

  const targetPerformance = performanceIndex !== null ? String(performanceIndex) : null;
  const targetSlot = slotIndex !== null ? String(slotIndex) : null;

  performanceExplorerList.querySelectorAll(".performance-explorer-slot").forEach((chip) => {
    const isTarget =
      targetPerformance !== null &&
      targetSlot !== null &&
      chip.dataset.performanceIndex === targetPerformance &&
      chip.dataset.slotIndex === targetSlot;

    if (state === "loading") {
      chip.disabled = true;
      chip.dataset.state = isTarget ? "loading" : "disabled";
      return;
    }

    if (state === "success" && isTarget) {
      chip.dataset.state = "success";
      chip.disabled = true;
      return;
    }

    chip.disabled =
      performanceLibraryScanInProgress ||
      isLoadingPerformanceSlot ||
      !isConnectionOperational();
    chip.dataset.state = "idle";
  });
}

function renderPerformanceExplorer() {
  if (!performanceExplorerList) return;

  const query = normalizeExplorerQuery(performanceExplorerSearch?.value || "");
  performanceExplorerList.innerHTML = "";

  if (!hasPerformanceLibrary(performanceLibraryDocument)) {
    if (performanceExplorerEmpty) performanceExplorerEmpty.hidden = true;
    return;
  }

  const entries = getPerformanceEntries(performanceLibraryDocument);
  const indexes = getPerformanceIndexList();
  let visibleCount = 0;

  indexes.forEach((performanceIndex) => {
    const slots = entries[performanceIndex] || {};

    if (!performanceMatchesExplorerQuery(performanceIndex, slots, query)) return;

    visibleCount += 1;

    const row = document.createElement("div");
    row.className = "performance-explorer-row";
    row.dataset.performanceIndex = performanceIndex;
    row.setAttribute("role", "listitem");

    if (String(selectedPerformanceIndex) === String(performanceIndex)) {
      row.dataset.selected = "true";
    }

    const label = document.createElement("div");
    label.className = "performance-explorer-row-label";
    appendExplorerHighlightedText(label, performanceIndex, query);

    const slotsWrap = document.createElement("div");
    slotsWrap.className = "performance-explorer-slots";

    SLOT_SELECTORS.forEach((slot, index) => {
      const slotIndex = index + 1;
      const rigName = slots[String(slotIndex)] || "Keine Antwort";
      const chip = document.createElement("button");
      const name = document.createElement("span");

      chip.type = "button";
      chip.className = "performance-explorer-slot";
      chip.dataset.performanceIndex = performanceIndex;
      chip.dataset.slotIndex = String(slotIndex);
      chip.dataset.state = "idle";
      chip.disabled =
        !isConnectionOperational() ||
        performanceLibraryScanInProgress ||
        isLoadingPerformanceSlot;

      const rigMatches = Boolean(query) && rigName.toLowerCase().includes(query);
      const slotMatches = Boolean(query) && `slot ${slotIndex}`.includes(query);

      if (rigMatches || slotMatches) {
        chip.dataset.match = "true";
      }

      name.className = "performance-explorer-slot-name";
      appendExplorerHighlightedText(name, rigName, query);
      chip.append(name);
      chip.setAttribute("aria-label", `Performance ${performanceIndex}, Slot ${slotIndex}: ${rigName}`);
      slotsWrap.append(chip);
    });

    row.append(label, slotsWrap);
    performanceExplorerList.append(row);
  });

  if (performanceExplorerEmpty) {
    performanceExplorerEmpty.hidden = visibleCount > 0 || !query;
  }
}

async function selectExplorerPerformanceSlot(performanceIndex, slotIndex) {
  selectedPerformanceIndex = String(performanceIndex);
  renderPerformanceBrowser();
  await loadBrowserPerformanceSlot(performanceIndex, slotIndex);
  renderPerformanceExplorer();
}

function getSelectedPerformanceData() {
  const entries = getPerformanceEntries(performanceLibraryDocument);
  const indexes = getPerformanceIndexList();

  if (indexes.length === 0) return null;

  const performanceIndex =
    selectedPerformanceIndex && entries[String(selectedPerformanceIndex)]
      ? String(selectedPerformanceIndex)
      : indexes[0];

  return {
    performanceIndex,
    slots: entries[performanceIndex] || {},
    libraryCount: indexes.length
  };
}

function selectPerformanceByOffset(offset) {
  const indexes = getPerformanceIndexList();
  if (indexes.length === 0 || isLoadingPerformanceSlot || offset === 0) return;

  const currentIndex = getSelectedPerformanceData()?.performanceIndex || indexes[0];
  const currentPosition = indexes.indexOf(String(currentIndex));
  const nextPosition = Math.max(0, Math.min(indexes.length - 1, currentPosition + offset));

  if (nextPosition === currentPosition) return;

  selectedPerformanceIndex = indexes[nextPosition];
  renderPerformanceBrowser();
}

function selectAdjacentPerformance(direction) {
  selectPerformanceByOffset(direction);
}

function updatePerformanceNavButtons() {
  const indexes = getPerformanceIndexList();
  const blocked = performanceLibraryScanInProgress || isLoadingPerformanceSlot;
  const navButtons = [
    performancePrevFastButton,
    performancePrevButton,
    performanceNextButton,
    performanceNextFastButton
  ];

  if (indexes.length === 0) {
    navButtons.forEach((button) => {
      if (button) button.disabled = true;
    });
    return;
  }

  const selected = getSelectedPerformanceData();
  const currentPosition = indexes.indexOf(String(selected?.performanceIndex ?? indexes[0]));
  const atFirst = currentPosition <= 0;
  const atLast = currentPosition >= indexes.length - 1;

  if (performancePrevFastButton) performancePrevFastButton.disabled = blocked || atFirst;
  if (performancePrevButton) performancePrevButton.disabled = blocked || atFirst;
  if (performanceNextButton) performanceNextButton.disabled = blocked || atLast;
  if (performanceNextFastButton) performanceNextFastButton.disabled = blocked || atLast;
}

function setPerformanceSlotCardsState(activeSlotIndex, state) {
  if (!performanceSlotGrid) return;

  performanceSlotGrid.querySelectorAll(".performance-slot-card").forEach((card) => {
    const slotIndex = Number(card.dataset.slotIndex);
    const isTarget = activeSlotIndex !== null && slotIndex === activeSlotIndex;
    const isLoading = state === "loading";

    card.disabled =
      isLoading ||
      performanceLibraryScanInProgress ||
      !isConnectionOperational();

    if (isTarget) {
      card.dataset.state = state;
      return;
    }

    card.dataset.state = isLoading ? "disabled" : "idle";
  });
}

async function waitForRigName(expectedRigName, { timeoutMs = 8000, pollMs = 250 } = {}) {
  const expected = String(expectedRigName || "").trim();
  if (!expected) return false;

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const rigName = await requestCurrentRigName();
      if (String(rigName || "").trim() === expected) {
        return true;
      }
    } catch {
      // continue polling
    }

    await delay(pollMs);
  }

  return false;
}

async function waitForRigChangeFrom(previousRigName, { timeoutMs = 8000, pollMs = 250 } = {}) {
  const previous = String(previousRigName || "").trim();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const rigName = await requestCurrentRigName();
      const normalized = String(rigName || "").trim();
      if (normalized && normalized !== previous) {
        return true;
      }
    } catch {
      // continue polling
    }

    await delay(pollMs);
  }

  return false;
}

async function loadBrowserPerformanceSlot(performanceIndex, slotIndex) {
  if (isLoadingPerformanceSlot || performanceLibraryScanInProgress) return;

  const slot = SLOT_SELECTORS[slotIndex - 1];
  if (!slot) return;

  selectedPerformanceIndex = String(performanceIndex);

  const entries = getPerformanceEntries(performanceLibraryDocument);
  const expectedRigName = entries[String(performanceIndex)]?.[String(slotIndex)] || "";
  const performanceNumber = Number(performanceIndex);

  if (!Number.isFinite(performanceNumber) || performanceNumber < 1) return;

  isLoadingPerformanceSlot = true;
  stopRigMonitor();
  updateControlSectionControls();
  setPerformanceSlotCardsState(slotIndex, "loading");
  setPerformanceExplorerSlotState(performanceIndex, slotIndex, "loading");

  if (performancePrevButton) performancePrevButton.disabled = true;
  if (performanceNextButton) performanceNextButton.disabled = true;
  if (performancePrevFastButton) performancePrevFastButton.disabled = true;
  if (performanceNextFastButton) performanceNextFastButton.disabled = true;

  try {
    const { output } = await getMidiPorts();

    sendMidiSafe(
      output,
      makePerformanceSelectCommand(performanceNumber - 1),
      `Browser Performance ${performanceNumber} preselect`
    );
    await delay(PERFORMANCE_SELECT_SETTLE_MS);

    sendMidiSafe(
      output,
      makeSlotSelectCommand(slot),
      `Browser Performance ${performanceNumber} Slot ${slotIndex}`
    );
    await delay(SLOT_SETTLE_MS);

    const rigChanged = expectedRigName
      ? await waitForRigName(expectedRigName)
      : await waitForRigChangeFrom(currentRigName);

    await refreshLiveData();

    if (rigChanged) {
      setPerformanceSlotCardsState(slotIndex, "success");
      setPerformanceExplorerSlotState(performanceIndex, slotIndex, "success");
      window.setTimeout(() => {
        setPerformanceSlotCardsState(null, "idle");
        setPerformanceExplorerSlotState(null, null, "idle");
      }, 700);
    } else {
      setPerformanceSlotCardsState(null, "idle");
      setPerformanceExplorerSlotState(null, null, "idle");
    }
  } catch (error) {
    console.warn("[Live Companion] Performance slot load failed:", error.message || error);
    setPerformanceSlotCardsState(null, "idle");
    setPerformanceExplorerSlotState(null, null, "idle");
  } finally {
    isLoadingPerformanceSlot = false;
    updatePerformanceNavButtons();
    updateControlSectionControls();

    if (connectionState === CONNECTION_STATE.CONNECTED) {
      startRigMonitor();
    }
  }
}

function renderPerformanceBrowser() {
  if (!performanceSection || !performanceSlotGrid) return;

  performanceSection.hidden = false;
  performanceSlotGrid.innerHTML = "";

  if (!hasPerformanceLibrary(performanceLibraryDocument)) {
    selectedPerformanceIndex = null;
    if (performanceEmptyState) performanceEmptyState.hidden = false;
    if (performanceBrowserControls) performanceBrowserControls.hidden = true;
    if (createLibraryButton) {
      createLibraryButton.hidden = false;
      createLibraryButton.disabled = performanceLibraryScanInProgress;
    }
    if (!performanceLibraryScanInProgress) {
      setPerformanceScanPanelVisible(false);
    }
    updatePerformanceSectionLayout();
    return;
  }

  const selected = getSelectedPerformanceData();
  selectedPerformanceIndex = selected.performanceIndex;

  if (performanceEmptyState) performanceEmptyState.hidden = true;
  if (performanceBrowserControls) {
    performanceBrowserControls.hidden = performanceLibraryScanInProgress;
  }
  if (performanceBrowserLabel) {
    performanceBrowserLabel.textContent = `Performance ${selected.performanceIndex}`;
  }
  updatePerformanceNavButtons();
  if (createLibraryButton) {
    createLibraryButton.hidden = false;
    createLibraryButton.disabled = performanceLibraryScanInProgress;
  }
  if (!performanceLibraryScanInProgress) {
    setPerformanceScanPanelVisible(false);
    if (performanceSlotGrid) performanceSlotGrid.hidden = false;
  }

  SLOT_SELECTORS.forEach((slot, index) => {
    const slotIndex = index + 1;
    const card = document.createElement("button");
    const label = document.createElement("span");
    const name = document.createElement("strong");
    const rig = selected.slots[String(slotIndex)] || "Keine Antwort";

    card.type = "button";
    card.className = "performance-slot-card";
    card.dataset.slotIndex = String(slotIndex);
    card.dataset.performanceIndex = selected.performanceIndex;
    card.dataset.state = "idle";
    card.disabled =
      !isConnectionOperational() ||
      performanceLibraryScanInProgress ||
      isLoadingPerformanceSlot;
    card.setAttribute("aria-label", `Slot ${slotIndex}: ${rig}`);
    label.textContent = `Slot ${slotIndex}`;
    name.textContent = rig;
    card.append(label, name);
    performanceSlotGrid.append(card);
  });

  updatePerformanceSectionLayout();
}

async function initializePerformanceLibrary() {
  performanceLibraryDocument = await loadPerformanceLibraryDocument();
  renderPerformanceBrowser();
}

function setLibraryConfirmDialogOpen(isOpen) {
  if (!libraryConfirmDialog) return;

  libraryConfirmDialog.dataset.open = isOpen ? "true" : "false";
  libraryConfirmDialog.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function confirmPerformanceLibraryRebuild() {
  if (!libraryConfirmDialog || !cancelLibraryScanButton || !startLibraryScanButton) {
    return Promise.resolve(window.confirm(
      "The current position on the Kemper will be changed during the scan.\n\nThe scan may take several minutes.\n\nDo you want to continue?"
    ));
  }

  setLibraryConfirmDialogOpen(true);
  startLibraryScanButton.focus();

  return new Promise((resolve) => {
    function cleanup(result) {
      cancelLibraryScanButton.removeEventListener("click", onCancel);
      startLibraryScanButton.removeEventListener("click", onStart);
      libraryConfirmDialog.removeEventListener("click", onBackdropClick);
      window.removeEventListener("keydown", onKeyDown);
      setLibraryConfirmDialogOpen(false);
      resolve(result);
    }

    function onCancel() {
      cleanup(false);
    }

    function onStart() {
      cleanup(true);
    }

    function onBackdropClick(event) {
      if (event.target === libraryConfirmDialog) {
        cleanup(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        cleanup(false);
      }
    }

    cancelLibraryScanButton.addEventListener("click", onCancel);
    startLibraryScanButton.addEventListener("click", onStart);
    libraryConfirmDialog.addEventListener("click", onBackdropClick);
    window.addEventListener("keydown", onKeyDown);
  });
}

async function readRigNameSafe(contextLabel) {
  try {
    const value = await requestCurrentRigName();
    const normalized = (value || "").trim();

    if (!normalized) {
      console.warn(`[Live Companion] Timeout or empty rig name while reading ${contextLabel}.`);
      return "";
    }

    return normalized;
  } catch (error) {
    console.warn(`[Live Companion] Rig name read failed for ${contextLabel}:`, error.message || error);
    return "";
  }
}

async function scanPerformanceLibrary({ onProgress } = {}) {
  const { output } = await getMidiPorts();
  await resetToFirstPerformance(output, "Library scan start");
  const originalRigName = await readRigNameSafe("scan start");
  let library = createEmptyLibraryDocument(originalRigName);

  await savePerformanceLibraryDocument(library);
  onProgress?.({
    performanceIndex: 1,
    slotIndex: 0,
    savedCount: 0,
    totalPerformances: LIBRARY_SCAN_PERFORMANCE_COUNT,
    phase: "started"
  });

  try {
    for (let performanceIndex = 1; performanceIndex <= LIBRARY_SCAN_PERFORMANCE_COUNT; performanceIndex += 1) {
      console.info(`[Live Companion] Scanning Performance ${performanceIndex}/${LIBRARY_SCAN_PERFORMANCE_COUNT}.`);
      const performanceData = {};

      for (let slotIndex = 1; slotIndex <= SLOT_SELECTORS.length; slotIndex += 1) {
        const slot = SLOT_SELECTORS[slotIndex - 1];

        onProgress?.({
          performanceIndex,
          slotIndex,
          savedCount: performanceIndex - 1,
          totalPerformances: LIBRARY_SCAN_PERFORMANCE_COUNT,
          phase: "slot"
        });

        sendMidiSafe(output, makeSlotSelectCommand(slot), `Performance ${performanceIndex} Slot ${slotIndex}`);
        await delay(SLOT_SETTLE_MS);

        performanceData[String(slotIndex)] = await readRigNameSafe(
          `Performance ${performanceIndex} Slot ${slotIndex}`
        );
      }

      library[String(performanceIndex)] = performanceData;
      library[PERFORMANCE_LIBRARY_META_KEY].completedPerformances = performanceIndex;
      library[PERFORMANCE_LIBRARY_META_KEY].scanInProgress = performanceIndex < LIBRARY_SCAN_PERFORMANCE_COUNT;
      library[PERFORMANCE_LIBRARY_META_KEY].scanComplete = false;
      await savePerformanceLibraryDocument(library);

      onProgress?.({
        performanceIndex,
        slotIndex: SLOT_SELECTORS.length,
        savedCount: performanceIndex,
        totalPerformances: LIBRARY_SCAN_PERFORMANCE_COUNT,
        phase: "performance-saved"
      });

      if (performanceIndex < LIBRARY_SCAN_PERFORMANCE_COUNT) {
        sendMidiSafe(output, makeRigNextCommand(), `Advance after Performance ${performanceIndex}`);
        await delay(PERFORMANCE_ADVANCE_MS);
      }
    }

    library[PERFORMANCE_LIBRARY_META_KEY].scanInProgress = false;
    library[PERFORMANCE_LIBRARY_META_KEY].scanComplete = true;
    await savePerformanceLibraryDocument(library);

    onProgress?.({
      performanceIndex: LIBRARY_SCAN_PERFORMANCE_COUNT,
      slotIndex: SLOT_SELECTORS.length,
      savedCount: LIBRARY_SCAN_PERFORMANCE_COUNT,
      totalPerformances: LIBRARY_SCAN_PERFORMANCE_COUNT,
      phase: "complete"
    });
  } finally {
    await resetToFirstPerformance(output, "Library scan end");
  }

  return library;
}

function renderLibraryScanProgress({
  performanceIndex = 1,
  slotIndex = 0,
  savedCount = 0,
  totalPerformances = LIBRARY_SCAN_PERFORMANCE_COUNT,
  phase = "idle"
} = {}) {
  if (phase === "complete") {
    setPerformanceScanPanelVisible(false);
    updatePerformanceSectionLayout();
    return;
  }

  setPerformanceScanPanelVisible(true);
  if (performanceBrowserControls) performanceBrowserControls.hidden = true;
  if (performanceSlotGrid) performanceSlotGrid.hidden = true;

  if (phase === "performance-saved") {
    setPerformanceScanStatus(
      `Scanning Performance ${performanceIndex} / ${totalPerformances} · ${savedCount} gespeichert`,
      "loading"
    );
  } else {
    setPerformanceScanStatus(
      `Scanning Performance ${performanceIndex} / ${totalPerformances}, Slot ${slotIndex || 1}`,
      "loading"
    );
  }

  setPerformanceProgress({ savedCount, totalPerformances });
  updatePerformanceSectionLayout();
}

async function createPerformanceLibrary() {
  if (performanceLibraryScanInProgress) return;

  const shouldStartScan = await confirmPerformanceLibraryRebuild();
  if (!shouldStartScan) return;

  performanceLibraryScanInProgress = true;
  stopRigMonitor();

  if (createLibraryButton) {
    createLibraryButton.disabled = true;
    createLibraryButton.textContent = "Scanning Performance Library...";
  }

  setPerformanceProgress({ savedCount: 0 });
  setPerformanceScanPanelVisible(true);
  setPerformanceScanStatus("Scanning Performance Library...", "loading");
  if (performanceSlotGrid) performanceSlotGrid.hidden = true;

  try {
    performanceLibraryDocument = await scanPerformanceLibrary({
      onProgress: renderLibraryScanProgress
    });
    performanceLibraryDocument = await loadPerformanceLibraryDocument();
    selectedPerformanceIndex = "1";
    if (performanceSlotGrid) performanceSlotGrid.hidden = false;
    renderPerformanceBrowser();
    await refreshLiveData();
  } catch (error) {
    performanceLibraryDocument = await loadPerformanceLibraryDocument();
    if (performanceSlotGrid) performanceSlotGrid.hidden = false;
    renderPerformanceBrowser();
    setPerformanceScanPanelVisible(false);
    setStatus(`Library-Scan fehlgeschlagen: ${error.message || error}`, "error");
  } finally {
    performanceLibraryScanInProgress = false;
    setPerformanceScanPanelVisible(false);

    if (createLibraryButton) {
      createLibraryButton.disabled = false;
      createLibraryButton.textContent = "Rebuild Performance Library";
    }

    renderPerformanceBrowser();

    if (connectionState === CONNECTION_STATE.CONNECTED) {
      startRigMonitor();
    }
  }
}

function openAmpZoom(image) {
  if (!ampZoomOverlay || !ampZoomImage || !image?.src) return;

  ampZoomImage.src = image.src;
  ampZoomImage.alt = image.alt || "Amp";
  ampZoomOverlay.dataset.open = "true";
  ampZoomOverlay.setAttribute("aria-hidden", "false");
}

function closeAmpZoom() {
  if (!ampZoomOverlay) return;

  ampZoomOverlay.dataset.open = "false";
  ampZoomOverlay.setAttribute("aria-hidden", "true");
}

function fillSelect(select, ports, emptyText) {
  select.innerHTML = "";

  if (ports.length === 0) {
    const option = document.createElement("option");
    option.textContent = emptyText;
    option.value = "";
    select.append(option);
    return;
  }

  ports.forEach((port) => {
    const option = document.createElement("option");
    option.textContent = port.name || port.id;
    option.value = port.id;
    select.append(option);
  });
}

function preferProfilerPort(select) {
  const profilerOption = [...select.options].find((option) =>
    option.textContent.toLowerCase().includes("profiler") ||
    option.textContent.toLowerCase().includes("kemper")
  );

  if (profilerOption) {
    select.value = profilerOption.value;
  }
}

function formatMidiDebugTimestamp() {
  const now = new Date();
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

  return `${now.toLocaleTimeString("de-DE", { hour12: false })}.${milliseconds}`;
}

function formatMidiHex(byte) {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

function formatMidiHexDump(bytes) {
  return bytes.map(formatMidiHex).join(" ");
}

function getMidiDebugType(bytes) {
  if (bytes.length === 0) return "Empty";
  if (bytes[0] === 0xf0) return "SysEx";

  const status = bytes[0];
  const messageType = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  if (status === 0xf8) return "MIDI Clock";
  if (status === 0xfa) return "Start";
  if (status === 0xfb) return "Continue";
  if (status === 0xfc) return "Stop";
  if (status === 0xfe) return "Active Sensing";
  if (status === 0xff) return "System Reset";

  if (messageType === 0x80) return `Note Off ch ${channel}`;
  if (messageType === 0x90) return `Note On ch ${channel}`;
  if (messageType === 0xa0) return `Poly Pressure ch ${channel}`;
  if (messageType === 0xb0) return `Control Change ch ${channel}`;
  if (messageType === 0xc0) return `Program Change ch ${channel}`;
  if (messageType === 0xd0) return `Channel Pressure ch ${channel}`;
  if (messageType === 0xe0) return `Pitch Bend ch ${channel}`;

  return `MIDI 0x${formatMidiHex(status)}`;
}

function getMidiDebugSignature(bytes) {
  if (bytes[0] === 0xf0 && bytes.length >= 10) {
    return bytes.slice(0, 10).map(formatMidiHex).join(" ");
  }

  return bytes.slice(0, Math.min(2, bytes.length)).map(formatMidiHex).join(" ");
}

function getMidiDebugChangedBytes(bytes, previousBytes) {
  if (!previousBytes) return [];

  const changed = [];
  const maxLength = Math.max(bytes.length, previousBytes.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (bytes[index] !== previousBytes[index]) {
      changed.push(index);
    }
  }

  return changed;
}

function formatMidiDebugChangedBytes(bytes, changedIndexes) {
  if (changedIndexes.length === 0) return "keine";

  return changedIndexes
    .map((index) => `${index}: ${bytes[index] === undefined ? "--" : formatMidiHex(bytes[index])}`)
    .join(", ");
}

function getKemperPositionControlChange(bytes) {
  if (!bytes || bytes.length < 3) return null;

  const status = bytes[0];
  const messageType = status & 0xf0;
  if (messageType !== 0xb0) return null;

  const controller = bytes[1];
  const value = bytes[2];
  const channel = (status & 0x0f) + 1;

  if (controller < 47 || controller > 54) return null;

  const labels = {
    47: `Performance ${value + 1}`,
    48: value === 0 ? "Performance Up step/stop" : "Performance Up scroll",
    49: value === 0 ? "Performance Down step/stop" : "Performance Down scroll",
    50: "Slot 1",
    51: "Slot 2",
    52: "Slot 3",
    53: "Slot 4",
    54: "Slot 5"
  };

  return {
    channel,
    controller,
    value,
    label: labels[controller]
  };
}

function logKemperPositionFeedback(details, bytes, source, timestamp) {
  console.group(
    `[Kemper MIDI Monitor] POSITION FEEDBACK ${timestamp} | CC${details.controller} value ${details.value} | ${details.label}`
  );
  console.log("Controller:", `CC${details.controller}`);
  console.log("Value:", details.value);
  console.log("Channel:", details.channel);
  console.log("Meaning:", details.label);
  console.log("Hex:", formatMidiHexDump(bytes));
  console.log("Source:", source);
  console.groupEnd();
}

function logPassiveMidiDebugMessage(event) {
  const bytes = Array.from(event.data || []);
  const type = getMidiDebugType(bytes);
  const signature = getMidiDebugSignature(bytes);
  const previousBytes = passiveMidiDebugLastMessages.get(signature) || null;
  const changedIndexes = getMidiDebugChangedBytes(bytes, previousBytes);
  const changedText = formatMidiDebugChangedBytes(bytes, changedIndexes);
  const timestamp = formatMidiDebugTimestamp();
  const source = event.currentTarget?.name || event.currentTarget?.id || "unbekannt";
  const positionFeedback = getKemperPositionControlChange(bytes);

  passiveMidiDebugMessageCount += 1;
  passiveMidiDebugLastMessages.set(signature, bytes);

  console.groupCollapsed(
    `[Kemper MIDI Monitor #${passiveMidiDebugMessageCount}] ${timestamp} | ${type} | ${bytes.length} Bytes`
  );
  console.log("Timestamp:", timestamp);
  console.log("Typ:", type);
  console.log("Laenge:", bytes.length);
  console.log("Hex:", formatMidiHexDump(bytes));
  console.log("Signatur:", signature || "-");
  console.log("Geaenderte Bytes gegen letzte gleiche Signatur:", changedText);
  console.log("Quelle:", source);
  if (positionFeedback) {
    console.log("Kemper Position Feedback:", `CC${positionFeedback.controller}`, positionFeedback);
  }
  console.groupEnd();

  if (positionFeedback) {
    logKemperPositionFeedback(positionFeedback, bytes, source, timestamp);
  }
}

function startPassiveMidiDebug(input) {
  if (!input || passiveMidiDebugInput === input) return;

  if (passiveMidiDebugInput) {
    passiveMidiDebugInput.removeEventListener("midimessage", logPassiveMidiDebugMessage);
  }

  passiveMidiDebugInput = input;
  passiveMidiDebugLastMessages.clear();
  passiveMidiDebugMessageCount = 0;
  if (midiMonitorEnabled) {
    input.addEventListener("midimessage", logPassiveMidiDebugMessage);
    console.info(
      `[Kemper MIDI Monitor] Aktiv auf: ${input.name || input.id || "unbekannter Eingang"}`
    );
  }
}

function setMidiMonitorEnabled(enabled) {
  midiMonitorEnabled = Boolean(enabled);

  if (midiMonitorButton) {
    midiMonitorButton.dataset.active = midiMonitorEnabled ? "true" : "false";
    midiMonitorButton.textContent = midiMonitorEnabled ? "Monitor On" : "MIDI Monitor";
  }

  if (!passiveMidiDebugInput) {
    console.info("[Kemper MIDI Monitor] Noch kein MIDI-Eingang geoeffnet. Monitor wird beim naechsten Verbindungsaufbau aktiviert.");
    return;
  }

  passiveMidiDebugInput.removeEventListener("midimessage", logPassiveMidiDebugMessage);

  if (midiMonitorEnabled) {
    passiveMidiDebugLastMessages.clear();
    passiveMidiDebugMessageCount = 0;
    passiveMidiDebugInput.addEventListener("midimessage", logPassiveMidiDebugMessage);
    console.info(
      `[Kemper MIDI Monitor] Aktiv auf: ${passiveMidiDebugInput.name || passiveMidiDebugInput.id || "unbekannter Eingang"}`
    );
  } else {
    console.info("[Kemper MIDI Monitor] Deaktiviert.");
  }
}

function refreshPortSelects() {
  fillSelect(inputPort, [...midiAccess.inputs.values()], "Kein Eingang gefunden");
  fillSelect(outputPort, [...midiAccess.outputs.values()], "Kein Ausgang gefunden");
  preferProfilerPort(inputPort);
  preferProfilerPort(outputPort);
}

function stopRigMonitor() {
  if (!monitorTimer) return;

  window.clearInterval(monitorTimer);
  monitorTimer = null;
}

function handleDisconnected() {
  stopRigMonitor();
  consecutiveMonitorFailures = 0;
  setConnectionState(CONNECTION_STATE.NO_MIDI);
}

async function attemptConnection() {
  if (reconnectInProgress || isRefreshingLiveData) return;

  if (!hasSelectablePorts()) {
    handleDisconnected();
    return;
  }

  reconnectInProgress = true;

  try {
    await refreshLiveData();
  } finally {
    reconnectInProgress = false;
  }
}

function handlePortChange() {
  if (hasSelectablePorts()) {
    if (!isConnectionOperational()) {
      attemptConnection();
    }
  } else {
    handleDisconnected();
  }
}

function ensureConnectionWatcher() {
  if (connectionWatcher) return;

  connectionWatcher = window.setInterval(() => {
    if (
      !isConnectionOperational() &&
      hasSelectablePorts() &&
      !reconnectInProgress &&
      !isRefreshingLiveData
    ) {
      attemptConnection();
    }
  }, RECONNECT_INTERVAL_MS);
}

async function handleNoMidiReconnect() {
  if (reconnectInProgress || isRefreshingLiveData) return;

  await loadPorts();
}

async function loadPorts() {
  setConnectionState(CONNECTION_STATE.BOOT_LOADING);

  try {
    if (!("requestMIDIAccess" in navigator)) {
      throw new Error("Web MIDI API ist in dieser WebView nicht verfuegbar.");
    }

    midiAccess = await navigator.requestMIDIAccess({ sysex: true });
    refreshPortSelects();
    midiAccess.onstatechange = () => {
      refreshPortSelects();
      handlePortChange();
    };
    ensureConnectionWatcher();
    await attemptConnection();
  } catch (error) {
    setStatus(String(error), "error");
    setConnectionState(CONNECTION_STATE.NO_MIDI);
  }
}

function getKemperFrame(data) {
  const bytes = Array.from(data);
  const start = bytes.indexOf(0xf0);
  const end = bytes.lastIndexOf(0xf7);

  if (start < 0 || end < 0 || end <= start) return null;

  const frame = bytes.slice(start, end + 1);
  const isKemperFrame = SYSEX_HEADER.every((byte, index) => frame[index] === byte);

  return isKemperFrame ? frame : null;
}

function parseAsciiString(frame, startIndex) {
  const chars = [];
  for (let index = startIndex; index < frame.length - 1; index += 1) {
    const byte = frame[index];
    if (byte === 0x00) break;
    if (byte >= 0x20 && byte <= 0x7e) chars.push(byte);
  }

  return String.fromCharCode(...chars).trim();
}

function parseStringResponse(data, address) {
  const frame = getKemperFrame(data);
  if (!frame) return "";

  const isKnownKemperShape =
    frame[4] === 0x00 &&
    frame[5] === 0x00 &&
    frame[6] === 0x03 &&
    frame[7] === 0x00 &&
    frame[8] === address[0] &&
    frame[9] === address[1];

  if (!isKnownKemperShape) return "";

  return parseAsciiString(frame, 10);
}

function parseCurrentRigName(data) {
  return parseStringResponse(data, STRING_TAGS.rigName);
}

function parseNumericResponse(data, address) {
  const frame = getKemperFrame(data);
  if (!frame) return null;

  const isKnownKemperShape =
    frame[4] === 0x00 &&
    frame[5] === 0x00 &&
    frame[6] === 0x01 &&
    frame[7] === 0x00 &&
    frame[8] === address[0] &&
    frame[9] === address[1];

  if (!isKnownKemperShape) return null;

  return (frame[10] << 7) + frame[11];
}

function parseRenderedStringResponse(data, address, value) {
  const frame = getKemperFrame(data);
  if (!frame) return "";

  const valueMsb = (value >> 7) & 0x7f;
  const valueLsb = value & 0x7f;
  const isKnownKemperShape =
    frame[4] === 0x00 &&
    frame[5] === 0x00 &&
    frame[6] === 0x3c &&
    frame[7] === 0x00 &&
    frame[8] === address[0] &&
    frame[9] === address[1] &&
    frame[10] === valueMsb &&
    frame[11] === valueLsb;

  if (!isKnownKemperShape) return "";

  return parseAsciiString(frame, 12);
}

function makeStringRequest(address) {
  return [...KEMPER_REQUEST_PREFIX, 0x43, 0x00, address[0], address[1], 0xf7];
}

function makeNumericRequest(address) {
  return [...KEMPER_REQUEST_PREFIX, 0x41, 0x00, address[0], address[1], 0xf7];
}

function makeRenderedStringRequest(address, value) {
  return [
    ...KEMPER_REQUEST_PREFIX,
    0x7c,
    0x00,
    address[0],
    address[1],
    (value >> 7) & 0x7f,
    value & 0x7f,
    0xf7
  ];
}

async function getMidiPorts() {
  if (!midiAccess) {
    midiAccess = await navigator.requestMIDIAccess({ sysex: true });
  }

  const input = midiAccess.inputs.get(inputPort.value);
  const output = midiAccess.outputs.get(outputPort.value);

  if (!input) throw new Error("Bitte einen MIDI-Eingang auswaehlen.");
  if (!output) throw new Error("Bitte einen MIDI-Ausgang auswaehlen.");

  await input.open();
  await output.open();
  startPassiveMidiDebug(input);

  return { input, output };
}

async function requestSysex({ request, parse, timeoutMs = 1200 }) {
  const { input, output } = await getMidiPorts();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      input.removeEventListener("midimessage", onMessage);
      resolve(null);
    }, timeoutMs);

    function onMessage(event) {
      const value = parse(event.data);
      if (value === "" || value === null || value === undefined) return;

      window.clearTimeout(timeout);
      input.removeEventListener("midimessage", onMessage);
      resolve(value);
    }

    input.addEventListener("midimessage", onMessage);
    try {
      output.send(request);
    } catch (error) {
      window.clearTimeout(timeout);
      input.removeEventListener("midimessage", onMessage);
      reject(error);
    }
  });
}

async function requestCurrentRigName() {
  const value = await requestSysex({
    request: CURRENT_RIG_NAME_REQUEST,
    parse: parseCurrentRigName,
    timeoutMs: 5000
  });

  if (!value) throw new Error("Keine Kemper SysEx-Antwort empfangen.");
  return value;
}

async function requestStringTag(address) {
  return (
    (await requestSysex({
      request: makeStringRequest(address),
      parse: (data) => parseStringResponse(data, address)
    })) || ""
  );
}

async function requestNumericParam(address) {
  return await requestSysex({
    request: makeNumericRequest(address),
    parse: (data) => parseNumericResponse(data, address)
  });
}

async function requestRenderedString(address, value) {
  if (value === null || value === undefined) return "";

  return (
    (await requestSysex({
      request: makeRenderedStringRequest(address, value),
      parse: (data) => parseRenderedStringResponse(data, address, value),
      timeoutMs: 600
    })) || ""
  );
}

function formatGain(value) {
  if (value === null || value === undefined) return "";
  return (value / 1638.3).toFixed(1);
}

function normalizeEffectName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEffectImage(effectName, moduleGroup = "") {
  const normalizedEffectName = normalizeEffectName(effectName);
  if (!normalizedEffectName) return "";

  if (moduleGroup === "reverb" && normalizedEffectName.includes("wah")) {
    return "";
  }

  const aliasMatch = Object.entries(EFFECT_IMAGE_ALIASES).find(
    ([name]) => normalizeEffectName(name) === normalizedEffectName
  );
  if (aliasMatch) return aliasMatch[1];

  const exactMatch = Object.entries(effectImageMap).find(
    ([name]) => normalizeEffectName(name) === normalizedEffectName
  );

  if (exactMatch) return exactMatch[1];
  return "";
}

function getEffectName(typeName, typeValue, module) {
  if (typeName) return typeName;

  if (!typeValue || typeValue === 0) {
    return "";
  }

  return EFFECT_TYPE_NAMES[typeValue] || "";
}

function getModuleEffectImage(typeName, module) {
  const mappedImage = getEffectImage(typeName, module.group);
  if (mappedImage) return mappedImage;

  return MODULE_FALLBACK_EFFECTS[module.group]?.image || "";
}

function isEffectActive(effect) {
  return effect.active;
}

function getEffectModuleByKey(effectKey) {
  return EFFECT_MODULES.find((module) => module.key === effectKey);
}

function setEffectItemBusy(effectKey, busy) {
  const item = effectsList?.querySelector(`li[data-key="${effectKey}"]`);
  if (!item) return;

  item.dataset.busy = busy ? "true" : "false";
  item.setAttribute("aria-busy", busy ? "true" : "false");
}

function canToggleEffects() {
  return (
    connectionState === CONNECTION_STATE.CONNECTED &&
    !performanceLibraryScanInProgress &&
    !isLoadingPerformanceSlot &&
    !isRefreshingLiveData &&
    !isTogglingEffect
  );
}

async function toggleEffectModule(effectKey) {
  if (!canToggleEffects()) return;

  const module = getEffectModuleByKey(effectKey);
  const knownEffect = lastKnownEffectsByKey[effectKey];

  if (!module || !knownEffect?.typeName) return;

  const isCurrentlyActive = isEffectActive(knownEffect);

  isTogglingEffect = true;
  setEffectItemBusy(effectKey, true);

  try {
    const { output } = await getMidiPorts();
    sendMidiSafe(
      output,
      makeEffectToggleCommand(module, isCurrentlyActive),
      `Toggle ${module.label}`
    );

    const optimisticEffect = {
      ...knownEffect,
      active: !isCurrentlyActive,
      activeValue: isCurrentlyActive ? 0 : 1
    };
    lastKnownEffectsByKey[effectKey] = optimisticEffect;

    const item = effectsList?.querySelector(`li[data-key="${effectKey}"]`);
    if (item) {
      updateEffectItem(item, optimisticEffect);
    }

    await delay(EFFECT_TOGGLE_SETTLE_MS);

    const effects = await requestEffectsData();
    renderEffects(effects);
  } catch (error) {
    console.warn("[Live Companion] Effect toggle failed:", error.message || error);
  } finally {
    isTogglingEffect = false;
    setEffectItemBusy(effectKey, false);
  }
}

function getAmpSearchText(...values) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function deriveManufacturer(ampName, modelName) {
  const searchText = getAmpSearchText(ampName, modelName);
  const match = MANUFACTURER_PATTERNS.find(([needle]) => searchText.includes(needle));
  return match ? match[1] : "Unknown";
}

function formatLibraryAmpYear(introduced) {
  if (introduced === undefined || introduced === null || introduced === "") return "";
  const match = String(introduced).match(/\d{4}/);
  return match ? match[0] : String(introduced).trim();
}

/**
 * Resolves Kemper amp/rig strings to the canonical Gear Library AmpRecord.
 * Amp name and rig name are scored independently; best alias wins.
 * Creator names are lookup input only — never for display.
 */
function resolveLiveAmpRecord(
  liveRigName,
  liveAmpName,
  liveAmpManufacturer,
  liveAmpModel
) {
  return resolveAmpRecordFromTextSources(
    liveAmpName,
    liveRigName,
    liveAmpManufacturer,
    liveAmpModel
  );
}

function normalizeCabinetSearch(text) {
  let result = text.toLowerCase();

  Object.entries(CAB_BRAND_ALIASES).forEach(([brand, aliases]) => {
    aliases.forEach(alias => {
      result = result.replaceAll(alias.toLowerCase(), brand);
    });
  });

  return result;
}

function getCabinetEntryConfiguration(entry) {
  return getCabinetConfiguration(
    entry.configuration,
    entry.image,
    ...(entry.aliases || [])
  );
}

function getCabinetImage(manufacturer, model, configuration = "") {
  const normalizedConfiguration = getCabinetConfiguration(configuration);
  const search = normalizeCabinetSearch(
    `${manufacturer} ${model} ${normalizedConfiguration}`.trim()
  );
  let bestMatch = null;
  let bestScore = -Infinity;

  for (const entry of cabinetImageMap) {
    const entryConfiguration = getCabinetEntryConfiguration(entry);

    for (const alias of entry.aliases) {
      const normalizedAlias = normalizeCabinetSearch(alias);

      if (!search.includes(normalizedAlias)) continue;

      let score = normalizedAlias.length;

      if (normalizedConfiguration && entryConfiguration === normalizedConfiguration) {
        score += 1000;
      } else if (normalizedConfiguration && entryConfiguration) {
        score -= 1000;
      }

      if (score > bestScore) {
        bestMatch = entry;
        bestScore = score;
      }
    }
  }

  return bestMatch ? bestMatch.image : "";
}

function getCabinetConfiguration(...values) {
  const searchText = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const explicitMatch = searchText.match(/(?:^|[^0-9])([1-9])\s*x\s*(1[0-9]|[8-9])(?:$|[^0-9])/);

  if (explicitMatch) {
    return `${explicitMatch[1]}x${explicitMatch[2]}`;
  }

  const compactMatch = searchText.match(/(?:^|[^0-9])([1-9])(1[0-9]|[8-9])(?:$|[^0-9])/);

  if (compactMatch) {
    return `${compactMatch[1]}x${compactMatch[2]}`;
  }

  return "";
}

function removeCabinetConfiguration(model, configuration) {
  if (!model || !configuration) return model || "";

  const [speakers, size] = configuration.split("x");
  const explicitPattern = new RegExp(`(^|[^0-9])${speakers}\\s*x\\s*${size}($|[^0-9])`, "gi");
  const compactPattern = new RegExp(`(^|[^a-z0-9])${speakers}${size}($|[^a-z0-9])`, "gi");

  return model
    .replace(explicitPattern, "$1$2")
    .replace(compactPattern, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function requestEffectModule(module) {
  const onOffAddress = [module.page, module.onOff];
  const typeAddress = [module.page, module.type];

  const [activeValue, typeValue] = await Promise.all([
    requestNumericParam(onOffAddress),
    requestNumericParam(typeAddress)
  ]);

  const renderedTypeName = await requestRenderedString(typeAddress, typeValue);

  const typeName = getEffectName(renderedTypeName, typeValue, module);

  return {
    ...module,
    active: activeValue === 1,
    activeValue,
    typeValue,
    typeName,
    image: getModuleEffectImage(typeName, module)
  };
}

async function requestEffectsData() {
  return await Promise.all(
    EFFECT_MODULES.map(module => requestEffectModule(module))
  );
}

async function requestLiveKemperData() {
  const currentRigName = await requestCurrentRigName();
  const [
    liveRigAuthor,
    liveAmpName,
    liveAmpManufacturer,
    liveAmpModel,
    liveAmpYear,
    liveCabinetName,
    liveCabinetManufacturer,
    liveCabinetModel,
    liveGainValue,
    liveTempoValue
  ] =
    await Promise.all([
      requestStringTag(STRING_TAGS.rigAuthor),
      requestStringTag(STRING_TAGS.ampName),
      requestStringTag(STRING_TAGS.ampManufacturer),
      requestStringTag(STRING_TAGS.ampModel),
      requestStringTag(STRING_TAGS.ampYearOfProduction),
      requestStringTag(STRING_TAGS.cabinetName),
      requestStringTag(STRING_TAGS.cabinetManufacturer),
      requestStringTag(STRING_TAGS.cabinetModel),
      requestNumericParam(NUMERIC_PARAMS.gain),
      requestNumericParam(NUMERIC_PARAMS.tempoBpm)
    ]);
  const effects = await Promise.all(
  EFFECT_MODULES.map(module => requestEffectModule(module))
);

  const resolvedAmp = resolveLiveAmpRecord(
    currentRigName,
    liveAmpName,
    liveAmpManufacturer,
    liveAmpModel
  );

  const resolvedCabinetManufacturer =
    liveCabinetManufacturer || deriveManufacturer(liveCabinetName, liveCabinetModel);
  const resolvedCabinetModel = liveCabinetModel || liveCabinetName;
  const cabinetConfigurationFromData = getCabinetConfiguration(
    liveCabinetManufacturer,
    liveCabinetModel,
    liveCabinetName
  );
  const cabinetImage = getCabinetImage(
    resolvedCabinetManufacturer,
    resolvedCabinetModel,
    cabinetConfigurationFromData
  );
  const cabinetConfiguration = cabinetConfigurationFromData || getCabinetConfiguration(cabinetImage);

  const libraryYear = formatLibraryAmpYear(resolvedAmp?.introduced);

  return {
    rigName: currentRigName,
    rigAuthor: liveRigAuthor || "",
    ampId: resolvedAmp?.id ?? null,
    ampName: liveAmpName,
    manufacturer: resolvedAmp?.manufacturer ?? "",
    ampModel: resolvedAmp?.model ?? "",
    libraryYear,
    productionYear: libraryYear || liveAmpYear || "",
    originalRigName: currentRigName || "",
    originalAmpName: liveAmpName || "",
    ampImageSrc: resolvedAmp ? getAmpImage(resolvedAmp.id) : null,
    cabinetManufacturer: resolvedCabinetManufacturer,
    cabinetModel: removeCabinetConfiguration(resolvedCabinetModel, cabinetConfiguration),
    cabinetConfiguration,
    cabinetImage,
    gain: formatGain(liveGainValue),
    gainRaw: liveGainValue,
    tempoBpmRaw: liveTempoValue,
    effects
  };
}

function createEffectItem(effect) {
  const item = document.createElement("li");
  item.dataset.key = effect.key;

  const image = document.createElement("img");
  image.hidden = true;

  const led = document.createElement("i");
  led.className = "effect-led";
  led.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  const name = document.createElement("strong");

  item.append(image, led, label, name);
  return item;
}

function createEffectChainHeading(key, title) {
  const item = document.createElement("li");
  const label = document.createElement("span");

  item.className = "effect-chain-heading";
  item.dataset.chainHeading = key;
  label.textContent = title;
  item.append(label);

  return item;
}

function ensureEffectChainHeading(key, title) {
  let item = effectsList.querySelector(`li[data-chain-heading="${key}"]`);

  if (!item) {
    item = createEffectChainHeading(key, title);
    effectsList.append(item);
  }

  return item;
}

function updateEffectItem(item, effect) {
  const hasEffect = Boolean(effect.typeName);
  const state = hasEffect ? (isEffectActive(effect) ? "on" : "off") : "empty";
  const displayName = effect.typeName || "";
  const image = item.querySelector("img");
  const label = item.querySelector("span");
  const name = item.querySelector("strong");
  const isClickable = hasEffect && canToggleEffects();

  if (item.dataset.state !== state) {
    item.dataset.state = state;
  }

  if (item.dataset.effectName !== displayName) {
    item.dataset.effectName = displayName;
    name.textContent = displayName;
  }

  if (item.dataset.effectLabel !== effect.label) {
    item.dataset.effectLabel = effect.label;
    label.textContent = effect.label;
  }

  if (item.dataset.effectImage !== (effect.image || "")) {
    item.dataset.effectImage = effect.image || "";

    if (effect.image) {
      image.src = `./images/effects/${effect.image}`;
      image.alt = displayName;
      image.hidden = false;
    } else {
      image.removeAttribute("src");
      image.alt = "";
      image.hidden = true;
    }
  } else if (image.alt !== displayName) {
    image.alt = displayName;
  }

  item.tabIndex = isClickable ? 0 : -1;
  item.setAttribute("role", hasEffect ? "button" : "presentation");
  item.setAttribute("aria-pressed", hasEffect && state === "on" ? "true" : "false");
  item.setAttribute("aria-disabled", hasEffect && !canToggleEffects() ? "true" : "false");
  item.setAttribute(
    "aria-label",
    hasEffect
      ? `${effect.label}: ${displayName}, ${state === "on" ? "ein" : "aus"}`
      : effect.label
  );
}

function renderEffects(effects) {
  effects.forEach((effect) => {
    lastKnownEffectsByKey[effect.key] = effect;

    if (effect.key === "stompA") {
      ensureEffectChainHeading("pre", "PRE AMP");
    }

    if (effect.key === "stompX") {
      ensureEffectChainHeading("post", "POST AMP");
    }

    let item = effectsList.querySelector(`li[data-key="${effect.key}"]`);

    if (!item) {
      item = createEffectItem(effect);
      effectsList.append(item);
    }

    updateEffectItem(item, effect);
  });
}

function gainRawToPercent(rawValue) {
  const formatted = formatGain(rawValue);
  const numericValue = Number(formatted);

  if (Number.isFinite(numericValue)) {
    return Math.max(0, Math.min(100, numericValue * 10));
  }

  return Math.max(0, Math.min(100, (rawValue / 16383) * 100));
}

function ensureGainMeterSegments() {
  if (!gainMeterFill || gainMeterFill.children.length === GAIN_METER_SEGMENT_COUNT) return;

  gainMeterFill.innerHTML = Array.from({ length: GAIN_METER_SEGMENT_COUNT }, (_, index) => {
    const level = index + 1;
    const tone = level <= 5 ? "low" : level <= 9 ? "mid" : "high";

    return `<i data-tone="${tone}" data-level="${level}" data-active="false"></i>`;
  }).join("");
}

function applyGainDisplay(rawValue) {
  if (!gainMeterFill) return;

  ensureGainMeterSegments();

  const activeSegments = Math.round((gainRawToPercent(rawValue) / 100) * GAIN_METER_SEGMENT_COUNT);

  gainMeterFill.querySelectorAll("i").forEach((segment) => {
    const level = Number(segment.dataset.level);
    segment.dataset.active = level <= activeSegments ? "true" : "false";
  });
}

async function refreshGainAfterMorph() {
  await delay(MORPH_GAIN_READ_DELAY_MS);

  if (!isConnectionOperational()) return;

  try {
    const rawValue = await requestNumericParam(NUMERIC_PARAMS.gain);
    if (rawValue === null || rawValue === undefined) return;
    renderGain(formatGain(rawValue), rawValue);
  } catch {
    // Morph gain test read failed silently.
  }
}

function renderGain(value, rawValue) {
  if (!gainMeterFill) return;

  const hasFormattedValue = value !== null && value !== undefined && value !== "";
  const hasRawValue = rawValue !== null && rawValue !== undefined;

  if (!hasFormattedValue && !hasRawValue) {
    ensureGainMeterSegments();
    gainMeterFill.querySelectorAll("i").forEach((segment) => {
      segment.dataset.active = "false";
    });
    return;
  }

  const raw = hasRawValue ? rawValue : Math.round(Number(value) * 1638.3);
  applyGainDisplay(raw);
}

function startRigMonitor() {
  if (monitorTimer) return;

  monitorTimer = window.setInterval(async () => {
    if (performanceLibraryScanInProgress || isLoadingPerformanceSlot || isRefreshingLiveData || isCheckingRigName || isTogglingEffect || !midiAccess) return;

    isCheckingRigName = true;

    try {
      // Rigwechsel prüfen
      console.time("requestCurrentRigName");
const nextRigName = await requestCurrentRigName();
console.timeEnd("requestCurrentRigName");

      consecutiveMonitorFailures = 0;
      setConnectionState(CONNECTION_STATE.CONNECTED);

      if (
        nextRigName &&
        currentRigName &&
        nextRigName !== currentRigName
      ) {
		  console.log("RIG CHANGE DETECTED", performance.now());
        await refreshLiveData();
      } else {
        const effects = await requestEffectsData();
        renderEffects(effects);
        await refreshTempoOnly();
      }
    } catch {
      consecutiveMonitorFailures += 1;

      if (consecutiveMonitorFailures >= MONITOR_FAILURE_LIMIT) {
        handleDisconnected();
      }
    } finally {
      isCheckingRigName = false;
    }
  }, 250);
}

async function refreshLiveData() {
	console.log("REFRESH START", performance.now());
	console.time("refreshLiveData");
  if (isRefreshingLiveData) return;

  isRefreshingLiveData = true;

  if (initialBootComplete) {
    setConnectionState(CONNECTION_STATE.REFRESHING);
  }

  try {
    const liveData = await requestLiveKemperData();
	console.log(liveData);
    currentRigName = liveData.rigName || currentRigName;
    rigName.textContent = liveData.rigName || "-";
    ampManufacturer.textContent = liveData.manufacturer || "-";
    ampModel.textContent = liveData.ampModel || "-";
    ampModel.title = liveData.ampModel || "";

    if (ampDetailsManufacturer) {
      ampDetailsManufacturer.textContent = liveData.manufacturer || "-";
      ampDetailsManufacturer.title = liveData.manufacturer || "";
    }

    if (ampDetailsModel) {
      ampDetailsModel.textContent = liveData.ampModel || "-";
      ampDetailsModel.title = liveData.ampModel || "";
    }

    if (ampDetailsYear) {
      const year = liveData.libraryYear || "";
      if (ampDetailsYearRow) {
        ampDetailsYearRow.hidden = !year;
      }
      ampDetailsYear.textContent = year || "-";
      ampDetailsYear.title = year;
    }

    if (rigAuthor) {
      rigAuthor.textContent = liveData.rigAuthor || "-";
      rigAuthor.title = liveData.rigAuthor || "";
    }

    if (ampDetailsOriginalRigName) {
      ampDetailsOriginalRigName.textContent = liveData.originalRigName || "-";
      ampDetailsOriginalRigName.title = liveData.originalRigName || "";
    }

    if (ampDetailsOriginalAmpName) {
      ampDetailsOriginalAmpName.textContent = liveData.originalAmpName || "-";
      ampDetailsOriginalAmpName.title = liveData.originalAmpName || "";
    }

    ampImageContainer.innerHTML = liveData.ampImageSrc
      ? `<img src="${liveData.ampImageSrc}" class="amp-image" />`
      : "";

    productionYear.textContent =
      liveData.productionYear && liveData.productionYear !== "Unknown"
        ? `Amp Year ${liveData.productionYear}`
        : "";
    cabinetManufacturer.textContent = liveData.cabinetManufacturer || "-";
    cabinetModel.textContent = liveData.cabinetModel || "-";
    cabinetConfiguration.textContent = liveData.cabinetConfiguration || "-";

    if (cabinetImageContainer) {
      cabinetImageContainer.innerHTML = liveData.cabinetImage
        ? `<img src="/images/cabinets/${liveData.cabinetImage}" class="cabinet-image" />`
        : "";
    }
    renderGain(liveData.gain, liveData.gainRaw);
    renderCurrentTempo(liveData.tempoBpmRaw);
    renderEffects(liveData.effects);
	console.timeEnd("refreshLiveData");
    consecutiveMonitorFailures = 0;
    setConnectionState(CONNECTION_STATE.CONNECTED);
    startRigMonitor();
  } catch (error) {
    setConnectionState(CONNECTION_STATE.NO_MIDI);
  } finally {
    isRefreshingLiveData = false;
  }
}

async function refreshEffectsOnly() {
  try {
    const effects = await requestEffectsData();
    renderEffects(effects);
  } catch {
    // silent
  }
}

if (ampImageContainer) {
  ampImageContainer.addEventListener("click", () => {
    const image = ampImageContainer.querySelector(".amp-image");
    openAmpZoom(image);
  });
}

if (ampZoomOverlay) {
  ampZoomOverlay.addEventListener("click", (event) => {
    if (event.target === ampZoomOverlay) {
      closeAmpZoom();
    }
  });
}

if (createLibraryButton) {
  createLibraryButton.addEventListener("click", createPerformanceLibrary);
}

if (performanceExplorerToggle) {
  performanceExplorerToggle.addEventListener("click", () => {
    setPerformanceExplorerExpanded(!performanceExplorerExpanded);
  });
}

if (performanceExplorerSearch) {
  performanceExplorerSearch.addEventListener("input", () => {
    if (!performanceExplorerExpanded) return;
    renderPerformanceExplorer();
  });
}

if (performanceExplorerList) {
  performanceExplorerList.addEventListener("click", (event) => {
    const chip = event.target.closest(".performance-explorer-slot");
    if (!chip || chip.disabled) return;

    const performanceIndex = chip.dataset.performanceIndex;
    const slotIndex = Number(chip.dataset.slotIndex);
    if (!performanceIndex || !slotIndex) return;

    selectExplorerPerformanceSlot(performanceIndex, slotIndex);
  });
}

if (performancePrevFastButton) {
  performancePrevFastButton.addEventListener("click", () => selectPerformanceByOffset(-10));
}

if (performancePrevButton) {
  performancePrevButton.addEventListener("click", () => selectAdjacentPerformance(-1));
}

if (performanceNextButton) {
  performanceNextButton.addEventListener("click", () => selectAdjacentPerformance(1));
}

if (performanceNextFastButton) {
  performanceNextFastButton.addEventListener("click", () => selectPerformanceByOffset(10));
}

if (performanceSlotGrid) {
  performanceSlotGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".performance-slot-card");
    if (!card || card.disabled) return;

    const performanceIndex = card.dataset.performanceIndex;
    const slotIndex = Number(card.dataset.slotIndex);
    if (!performanceIndex || !slotIndex) return;

    loadBrowserPerformanceSlot(performanceIndex, slotIndex);
  });
}

if (effectsList) {
  effectsList.addEventListener("click", (event) => {
    const item = event.target.closest("li[data-key]");
    if (!item || item.dataset.state === "empty" || item.dataset.busy === "true") return;

    toggleEffectModule(item.dataset.key);
  });

  effectsList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const item = event.target.closest("li[data-key]");
    if (!item || item.dataset.state === "empty" || item.dataset.busy === "true") return;

    event.preventDefault();
    toggleEffectModule(item.dataset.key);
  });
}

if (midiMonitorButton) {
  midiMonitorButton.addEventListener("click", () => {
    setMidiMonitorEnabled(!midiMonitorEnabled);
  });
}

if (tunerToggleButton) {
  tunerToggleButton.addEventListener("click", toggleTuner);
}

if (morphActionButton) {
  morphActionButton.addEventListener("click", triggerMorphAction);
}

if (tempoPanelToggle) {
  tempoPanelToggle.addEventListener("click", () => {
    setTempoPanelExpanded(!tempoPanelExpanded);
  });
}

if (tempoSetButton) {
  tempoSetButton.addEventListener("click", handleTempoSetRequest);
}

if (tempoTapButton) {
  tempoTapButton.addEventListener("click", sendManualTapTempo);
}

if (tempoBpmInput) {
  tempoBpmInput.addEventListener("input", () => {
    if (tempoBpmInput.dataset.state === "error") {
      setTempoInputState("idle");
      setStatus("");
    }
  });

  tempoBpmInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleTempoSetRequest();
    }
  });
}

tempoBpmStepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    adjustTempoBpmInput(Number(button.dataset.step));
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ampZoomOverlay?.dataset.open === "true") {
    closeAmpZoom();
  }
});

if (noMidiReconnectButton) {
  noMidiReconnectButton.addEventListener("click", handleNoMidiReconnect);
}

const audioToolsView = initializeAudioTools();

registerViewChangeHandler((view) => {
  updateConnectionPresentation(connectionState);

  if (view === "audio") {
    audioToolsView.show();
  } else {
    audioToolsView.hide();
  }
});

initializeGearLibrary();
bootApplication();
