import "./styles.css";
import "./styles/gearLibraryTheme.css";
import "./styles/gearLibraryDesignPreviews.css";
import "./styles/presentationMode.css";
import { invoke } from "@tauri-apps/api/core";
import { effectImageMap } from "./effectImageMap.js";
import {
  getAmpDetailView,
  getAmpImage,
  getCabinetDetailView,
  resolveAmpRecordFromTextSources,
  resolveCabinetRecordFromTextSources
} from "./library/index.js";
import {
  initializeGearLibrary,
  registerViewChangeHandler
} from "./gearLibrary.js";
import { initializeAudioTools } from "./modules/audioTools/AudioToolsView.js";
import { initializeBidirectionalDiscovery } from "./modules/bidirectional/BidirectionalDiscovery.js";
import { initializeProtocolResearchLab } from "./modules/bidirectional/ProtocolResearchLab.js";
import { initializeEffectTypesPanel } from "./modules/bidirectional/EffectTypesPanel.js";
import { initializePerformanceTrafficCapture } from "./modules/bidirectional/PerformanceTrafficCapture.js";
import { initializeExtendedParameterCapture } from "./modules/bidirectional/ExtendedParameterCapture.js";
import { initializeRawMidiTrace } from "./modules/bidirectional/RawMidiTrace.js";
import { isBooleanOn } from "./modules/bidirectional/decoder/parameterScales.js";
import { parameterService } from "./modules/bidirectional/ParameterService.js";
import { CONTROL_PARAMETERS } from "./modules/bidirectional/controlBindings.js";
import {
  getEffectTypeName,
  observeEffectType,
  seedEffectTypeNames
} from "./modules/bidirectional/effectTypeRegistry.js";
import { openAmpDetailsOverlay } from "./modules/ampDetails/AmpDetailsOverlay.js";
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

/** @param {number} page @param {number} offset */
function kemperParamId(page, offset) {
  return ((page & 0x7f) << 8) | (offset & 0x7f);
}

const LIVE_PUSH_PARAM = Object.freeze({
  rigName: kemperParamId(0x00, 0x01),
  tempoBpm: kemperParamId(0x04, 0x00),
  gain: kemperParamId(0x0a, 0x04)
});

const EFFECT_ON_OFF_BY_PARAM_ID = new Map(
  EFFECT_MODULES.map((module) => [kemperParamId(module.page, module.onOff), module])
);
const EFFECT_TYPE_BY_PARAM_ID = new Map(
  EFFECT_MODULES.map((module) => [kemperParamId(module.page, module.type), module])
);

/** Push sync is preferred once bidirectional lease + traffic are healthy. */
const PUSH_TRAFFIC_MAX_AGE_MS = 5000;
const PUSH_CONFIRM_WINDOW_MS = 800;
const RIG_CHANGE_REFRESH_DEBOUNCE_MS = 180;
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
const EFFECT_PUSH_CONFIRM_MS = 1200;
/** @type {Map<string, number>} Last Kemper on/off push timestamp per effect slot. */
const lastEffectOnOffPushAt = new Map();
/**
 * Pending effect writes awaiting Kemper push confirmation.
 * @type {Map<string, {
 *   expectedActive: boolean,
 *   expectedRaw: number,
 *   sentAt: number,
 *   parameterIdHex: string,
 *   resolve: (result: { status: string, kemperActive?: boolean, kemperRaw?: number | null }) => void,
 *   timer: ReturnType<typeof setTimeout>
 * }>}
 */
const pendingEffectWriteConfirmations = new Map();
const PERFORMANCE_LIBRARY_STORAGE_KEY = "kemper-performance-library";
const PERFORMANCE_LIBRARY_META_KEY = "_meta";
const CONTROL_CHANGES = {
  tapTempo: 30,
  tuner: 31,
  morph: 80
};
const TAP_TEMPO_BPM_MIN = 40;
const TAP_TEMPO_BPM_MAX = 300;
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

// Bootstrap the learning registry with known names; live traffic grows it further.
seedEffectTypeNames(EFFECT_TYPE_NAMES);

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
const ampDetailsPower = document.querySelector("#ampDetailsPower");
const ampDetailsPowerRow = document.querySelector("#ampDetailsPowerRow");
const ampDetailsTubeConfiguration = document.querySelector(
  "#ampDetailsTubeConfiguration"
);
const ampDetailsTubeRow = document.querySelector("#ampDetailsTubeRow");
const rigAuthor = document.querySelector("#rigAuthor");
const ampDetailsOriginalRigName = document.querySelector("#ampDetailsOriginalRigName");
const ampDetailsOriginalAmpName = document.querySelector("#ampDetailsOriginalAmpName");
const productionYear = document.querySelector("#productionYear");
const cabinetSection = document.querySelector(".cabinet-section");
const cabinetComboLabel = document.querySelector("#cabinetComboLabel");
const cabinetRecognizedGroup = document.querySelector("[data-cabinet-recognized]");
const cabinetRecognizedList = document.querySelector("[data-cabinet-recognized-list]");
const cabinetReportedGroup = document.querySelector("[data-cabinet-reported]");
const cabinetReportedList = document.querySelector("[data-cabinet-reported-list]");
const gainScale = document.querySelector("#gainScale");
const gainScaleValue = document.querySelector("#gainScaleValue");
const gainScaleFill = document.querySelector("#gainScaleFill");
const gainScaleMarker = document.querySelector("#gainScaleMarker");
const gainScaleTicks = document.querySelector("#gainScaleTicks");
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
const bootLoadingOverlay = document.querySelector("#bootLoadingOverlay");
const noMidiOverlay = document.querySelector("#noMidiOverlay");
const noMidiReconnectButton = document.querySelector("#noMidiReconnectButton");
const livePage = document.querySelector("#livePage");
let midiAccess;
let isRefreshingLiveData = false;
let isCheckingRigName = false;
let currentRigName = "";
/** @type {string | null} Gear Library amp id for the currently loaded live amp */
let currentLiveAmpId = null;
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

/** @type {number} */
let lastTempoPushAt = 0;
/** @type {number} */
let lastGainPushAt = 0;
let effectTypeDiscoveryRunning = false;
let gainInteractionActive = false;
let gainDragPointerId = null;
/** @type {number | null} */
let gainLocalRawValue = null;
/** @type {number | null} */
let pendingGainWriteRaw = null;
/** @type {number | null} */
let gainWriteTimer = null;
const GAIN_WRITE_INTERVAL_MS = 40;
/** @type {ReturnType<typeof setTimeout> | null} */
let rigChangeRefreshTimer = null;
/** @type {Set<string>} */
const effectTypeEnrichInFlight = new Set();

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

  if (state === CONNECTION_STATE.NO_MIDI) {
    console.log("[MIDI DEBUG] setting NO_MIDI", {
      from: connectionState,
      initialBootComplete,
      reconnectInProgress,
      isRefreshingLiveData
    });
  }

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

function canUseBidirectionalPushSync() {
  return (
    bidirectionalDiscovery.isBidirectionalModeActive() &&
    bidirectionalDiscovery.isReceivingTraffic(PUSH_TRAFFIC_MAX_AGE_MS)
  );
}

function wasPushedRecently(timestamp, windowMs = PUSH_CONFIRM_WINDOW_MS) {
  return Boolean(timestamp) && Date.now() - timestamp <= windowMs;
}

async function refreshTempoOnly({ force = false } = {}) {
  if (
    !isConnectionOperational() ||
    isSettingTempo ||
    performanceLibraryScanInProgress ||
    isLoadingPerformanceSlot
  ) {
    return;
  }

  if (!force && canUseBidirectionalPushSync() && wasPushedRecently(lastTempoPushAt)) {
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
    await refreshTempoOnly({ force: !wasPushedRecently(lastTempoPushAt) });
  } catch (error) {
    console.warn("[Live Companion] Manual tap tempo failed:", error.message || error);
  }
}

async function setTempoBpm(bpm) {
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

  try {
    // Ensure MIDI ports / bidirectional lease are active before SysEx write.
    await getMidiPorts();
    const tempoControl = parameterService.get(CONTROL_PARAMETERS.tempo.key);
    if (!tempoControl) {
      throw new Error("Tempo parameter binding missing");
    }
    const result = await tempoControl.writeScaled(validatedBpm);

    if (!result.ok) {
      throw new Error(result.error || "Tempo SysEx write failed");
    }

    // Optimistic UI; Kemper push remains source of truth.
    renderCurrentTempo(result.rawValue);

    await delay(350);
    await refreshTempoOnly({ force: !wasPushedRecently(lastTempoPushAt) });
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
  await setTempoBpm(tempoBpmInput?.value);
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
const GAIN_SCALE_MAX = 10;
const GAIN_SCALE_TICK_COUNT = 101;

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

  if (performanceExplorerSearch) {
    performanceExplorerSearch.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  if (performanceExplorerContent) {
    performanceExplorerContent.hidden = !expanded;
  }

  if (expanded) {
    renderPerformanceExplorer();
  }
}

function isPerformanceExplorerEventTarget(target) {
  if (!(target instanceof Node)) return false;
  return Boolean(
    performanceExplorerSection?.contains(target) ||
    performanceExplorerContent?.contains(target)
  );
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
      performanceExplorerExpanded = false;
      if (performanceExplorerSearch) {
        performanceExplorerSearch.setAttribute("aria-expanded", "false");
      }
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
    if (performanceBrowserLabel) performanceBrowserLabel.hidden = true;
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
    performanceBrowserLabel.hidden = performanceLibraryScanInProgress;
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
  if (performanceBrowserLabel) performanceBrowserLabel.hidden = true;
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

function updateLiveAmpDetailAffordance() {
  if (!ampImageContainer) return;
  const hasDetail = Boolean(currentLiveAmpId);
  ampImageContainer.dataset.hasAmpDetail = hasDetail ? "true" : "false";
  ampImageContainer.setAttribute(
    "aria-label",
    hasDetail ? "Open amplifier details" : "Amplifier image"
  );
  ampImageContainer.tabIndex = hasDetail ? 0 : -1;
  ampImageContainer.setAttribute("role", hasDetail ? "button" : "presentation");
}

function openLiveAmpDetailsOverlay() {
  if (!currentLiveAmpId) return false;
  return openAmpDetailsOverlay(currentLiveAmpId, { source: "live" });
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
  fillSelect(inputPort, [...midiAccess.inputs.values()], "No MIDI input found");
  fillSelect(outputPort, [...midiAccess.outputs.values()], "No MIDI output found");
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
  bidirectionalDiscovery.stop();
  consecutiveMonitorFailures = 0;
  currentLiveAmpId = null;
  updateLiveAmpDetailAffordance();
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
      console.log("[MIDI DEBUG] connection watcher firing", {
        connectionState,
        hasSelectablePorts: hasSelectablePorts(),
        reconnectInProgress,
        isRefreshingLiveData
      });
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
    console.log("[MIDI DEBUG] ports found", {
      inputs: [...midiAccess.inputs.values()].map((port) => ({
        id: port.id,
        name: port.name,
        state: port.state,
        connection: port.connection
      })),
      outputs: [...midiAccess.outputs.values()].map((port) => ({
        id: port.id,
        name: port.name,
        state: port.state,
        connection: port.connection
      }))
    });
    refreshPortSelects();
    midiAccess.onstatechange = () => {
      refreshPortSelects();
      handlePortChange();
    };
    ensureConnectionWatcher();
    await attemptConnection();
  } catch (error) {
    console.log("[MIDI DEBUG] refreshLiveData failed", {
      source: "loadPorts",
      error: String(error?.message || error)
    });
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
  const frame = getKemperFrame(data);
  if (!frame) return "";

  const isKnownKemperShape =
    frame[4] === 0x00 &&
    frame[5] === 0x00 &&
    frame[6] === 0x03 &&
    frame[7] === 0x00 &&
    frame[8] === STRING_TAGS.rigName[0] &&
    frame[9] === STRING_TAGS.rigName[1];

  if (!isKnownKemperShape) return "";

  const name = parseAsciiString(frame, 10);
  console.log("[MIDI DEBUG] rig name response received", {
    name: name || "(empty)",
    hex: midiDebugHex(frame)
  });
  return name;
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

/**
 * Like parseRenderedStringResponse, but returns null for non-matching frames
 * so empty names ("") can be distinguished from "not this message".
 * @returns {{ name: string } | null}
 */
function parseRenderedStringResponseMatch(data, address, value) {
  const frame = getKemperFrame(data);
  if (!frame) return null;

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

  if (!isKnownKemperShape) return null;
  return { name: parseAsciiString(frame, 12) };
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

function midiDebugHex(data) {
  return Array.from(data || [])
    .map((byte) => (byte & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

let midiDebugRxInput = null;
let midiDebugRxCount = 0;
const MIDI_DEBUG_RX_LIMIT = 80;
/** @type {MIDIInput | null} */
let midiRawDirectInput = null;

function logMidiDebugRx(event) {
  if (midiDebugRxCount >= MIDI_DEBUG_RX_LIMIT) {
    if (midiDebugRxCount === MIDI_DEBUG_RX_LIMIT) {
      midiDebugRxCount += 1;
      console.log("[MIDI DEBUG] RX raw SysEx further logs suppressed");
    }
    return;
  }
  midiDebugRxCount += 1;
  const bytes = Array.from(event.data || []);
  const functionByte =
    bytes[0] === 0xf0 && bytes.length > 6
      ? `0x${(bytes[6] & 0xff).toString(16).toUpperCase().padStart(2, "0")}`
      : null;
  console.log("[MIDI DEBUG] RX raw SysEx", {
    n: midiDebugRxCount,
    length: bytes.length,
    function: functionByte,
    hex: midiDebugHex(bytes)
  });
}

function attachMidiDebugRx(input) {
  if (!input || midiDebugRxInput === input) return;
  if (midiDebugRxInput) {
    midiDebugRxInput.removeEventListener("midimessage", logMidiDebugRx);
  }
  midiDebugRxInput = input;
  midiDebugRxCount = 0;
  input.addEventListener("midimessage", logMidiDebugRx);
}

async function getMidiPorts() {
  if (!midiAccess) {
    midiAccess = await navigator.requestMIDIAccess({ sysex: true });
    console.log("[MIDI DEBUG] ports found", {
      inputs: [...midiAccess.inputs.values()].map((port) => ({
        id: port.id,
        name: port.name,
        state: port.state,
        connection: port.connection
      })),
      outputs: [...midiAccess.outputs.values()].map((port) => ({
        id: port.id,
        name: port.name,
        state: port.state,
        connection: port.connection
      }))
    });
  }

  const input = midiAccess.inputs.get(inputPort.value);
  const output = midiAccess.outputs.get(outputPort.value);

  console.log("[MIDI DEBUG] input selected", {
    selectValue: inputPort.value,
    id: input?.id ?? null,
    name: input?.name ?? null,
    state: input?.state ?? null,
    connection: input?.connection ?? null
  });
  console.log("[MIDI DEBUG] output selected", {
    selectValue: outputPort.value,
    id: output?.id ?? null,
    name: output?.name ?? null,
    state: output?.state ?? null,
    connection: output?.connection ?? null
  });

  if (!input) throw new Error("Please select a MIDI input.");
  if (!output) throw new Error("Please select a MIDI output.");

  await input.open();
  if (midiRawDirectInput !== input) {
    midiRawDirectInput = input;
    input.addEventListener("midimessage", (event) => {
      console.log("[MIDI RAW DIRECT]", Array.from(event.data));
    });
  }
  console.log("[MIDI DEBUG] input opened", {
    id: input.id,
    name: input.name,
    state: input.state,
    connection: input.connection
  });
  await output.open();
  console.log("[MIDI DEBUG] output ready", {
    id: output.id,
    name: output.name,
    state: output.state,
    connection: output.connection
  });
  attachMidiDebugRx(input);
  startPassiveMidiDebug(input);
  const alreadyStarted =
    bidirectionalDiscovery.active &&
    bidirectionalDiscovery.input === input &&
    bidirectionalDiscovery.output === output;
  bidirectionalDiscovery.start(input, output);
  console.log("[MIDI DEBUG] discovery start", {
    skippedAlreadyActive: alreadyStarted,
    active: bidirectionalDiscovery.active,
    input: bidirectionalDiscovery.input?.name ?? null,
    output: bidirectionalDiscovery.output?.name ?? null
  });

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
      if (request === CURRENT_RIG_NAME_REQUEST) {
        console.log("[MIDI DEBUG] requestCurrentRigName sent", midiDebugHex(request));
      }
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

  if (!value) {
    console.log("[MIDI DEBUG] requestCurrentRigName got no value");
    throw new Error("Keine Kemper SysEx-Antwort empfangen.");
  }
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

/**
 * Discovery helper: wait for rendered-string response.
 * @returns {Promise<string | null>} name, "" if empty, null if timed out
 */
async function requestRenderedStringForDiscovery(address, value, timeoutMs = 1000) {
  if (value === null || value === undefined) return null;

  const matched = await requestSysex({
    request: makeRenderedStringRequest(address, value),
    parse: (data) => parseRenderedStringResponseMatch(data, address, value),
    timeoutMs
  });

  if (!matched || typeof matched !== "object") return null;
  return typeof matched.name === "string" ? matched.name : "";
}

function formatGain(value) {
  if (value === null || value === undefined) return "";
  const decoded = parameterService.get(CONTROL_PARAMETERS.gain.key)?.decode(value);
  if (decoded?.display && decoded.display !== "—") return decoded.display;
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
  void module;
  if (typeName) return typeName;

  if (!typeValue || typeValue === 0) {
    return "";
  }

  return getEffectTypeName(typeValue) || EFFECT_TYPE_NAMES[typeValue] || "";
}

function getModuleEffectImage(typeName, module) {
  const mappedImage = getEffectImage(typeName, module.group);
  if (mappedImage) return mappedImage;

  return MODULE_FALLBACK_EFFECTS[module.group]?.image || "";
}

function isEffectActive(effect) {
  if (effect?.activeValue != null) return isBooleanOn(effect.activeValue);
  return Boolean(effect?.active);
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

function isEffectSyncDebugEnabled() {
  try {
    return localStorage.getItem("kompanion.effect-sync-debug") === "1";
  } catch {
    return false;
  }
}

function logEffectSyncVerbose(stage, effectKey, details = {}) {
  if (!isEffectSyncDebugEnabled()) return;
  const module = getEffectModuleByKey(effectKey);
  console.log(`[Effect Sync] ${stage}`, {
    effectKey,
    slot: module?.label ?? effectKey,
    ...details
  });
}

function logEffectSyncFailure(effectKey, reason, chain = {}) {
  const module = getEffectModuleByKey(effectKey);
  console.warn("[Effect Sync] Failure — full chain", {
    stage: reason,
    effectKey,
    slot: module?.label ?? effectKey,
    parameterId: module ? formatEffectParamIdHex(kemperParamId(module.page, module.onOff)) : null,
    pushSyncHealthy: canUseBidirectionalPushSync(),
    echoEnabled: bidirectionalDiscovery?.echoEnabled ?? null,
    ...chain
  });
}

function formatEffectParamIdHex(id) {
  return `0x${(id & 0xffff).toString(16).padStart(4, "0")}`;
}

function logEffectOnOffRaw(source, module, raw) {
  const parameterId = module
    ? formatEffectParamIdHex(kemperParamId(module.page, module.onOff))
    : null;
  console.log(`[Effect Sync] ${module?.label ?? "?"} ${source} on/off`, {
    parameterId,
    raw,
    on: isBooleanOn(raw)
  });
}

function clearEffectWriteConfirmation(effectKey, resolveStatus = null) {
  const pending = pendingEffectWriteConfirmations.get(effectKey);
  if (!pending) return;
  window.clearTimeout(pending.timer);
  pendingEffectWriteConfirmations.delete(effectKey);
  if (resolveStatus) {
    pending.resolve({ status: resolveStatus });
  }
}

/**
 * @param {string} effectKey
 * @param {boolean} expectedActive
 * @param {number} expectedRaw
 * @param {string} parameterIdHex
 */
function registerEffectWriteConfirmation(effectKey, expectedActive, expectedRaw, parameterIdHex) {
  clearEffectWriteConfirmation(effectKey);

  return new Promise((resolve) => {
    const sentAt = Date.now();
    const timer = window.setTimeout(() => {
      if (!pendingEffectWriteConfirmations.has(effectKey)) return;
      pendingEffectWriteConfirmations.delete(effectKey);
      logEffectSyncFailure(effectKey, "timeout — no Kemper push after write", {
        expectedActive,
        expectedRaw,
        parameterIdHex,
        raw: null,
        sentAt,
        waitedMs: EFFECT_PUSH_CONFIRM_MS,
        chain: "Write sent → (no RX) → Decode → Mapping → Slot → UI"
      });
      if (effectKey === "delay" || effectKey === "reverb") {
        console.warn("[Effect Sync] Delay/Reverb did not update after write", {
          effectKey,
          parameterId: parameterIdHex,
          raw: null,
          expectedActive,
          expectedRaw
        });
      }
      resolve({ status: "timeout" });
    }, EFFECT_PUSH_CONFIRM_MS);

    pendingEffectWriteConfirmations.set(effectKey, {
      expectedActive,
      expectedRaw,
      sentAt,
      parameterIdHex,
      resolve,
      timer
    });

    logEffectSyncVerbose("Write registered — awaiting Kemper push", effectKey, {
      expectedActive,
      expectedRaw,
      parameterIdHex
    });
  });
}

/**
 * @param {typeof EFFECT_MODULES[number]} module
 * @param {number} activeValue
 * @param {number | null | undefined} kemperRaw
 */
function settleEffectWriteConfirmation(module, activeValue, kemperRaw) {
  const pending = pendingEffectWriteConfirmations.get(module.key);
  if (!pending) return false;

  window.clearTimeout(pending.timer);
  pendingEffectWriteConfirmations.delete(module.key);

  const raw = kemperRaw == null ? null : Number(kemperRaw);
  const kemperActive = isBooleanOn(raw ?? activeValue);
  const confirmed = kemperActive === pending.expectedActive;

  if (confirmed) {
    logEffectSyncVerbose("Kemper confirmed write", module.key, {
      kemperRaw: raw,
      kemperActive,
      latencyMs: Date.now() - pending.sentAt
    });
    pending.resolve({ status: "confirmed", kemperActive, kemperRaw: raw });
    return true;
  }

  logEffectSyncFailure(module.key, "mismatch — Kemper value differs from write", {
    expectedActive: pending.expectedActive,
    expectedRaw: pending.expectedRaw,
    kemperActive,
    kemperRaw: raw,
    parameterIdHex: pending.parameterIdHex,
    latencyMs: Date.now() - pending.sentAt,
    chain: "Write sent → RX → Decode → Mapping (mismatch) → Kemper wins → UI"
  });
  if (module.key === "delay" || module.key === "reverb") {
    console.warn("[Effect Sync] Delay/Reverb write mismatch", {
      slot: module.label,
      parameterId: pending.parameterIdHex,
      raw,
      on: kemperActive,
      expectedActive: pending.expectedActive
    });
  }
  pending.resolve({ status: "mismatch", kemperActive, kemperRaw: raw });
  return true;
}

function canToggleEffects() {
  return (
    connectionState === CONNECTION_STATE.CONNECTED &&
    !performanceLibraryScanInProgress &&
    !isLoadingPerformanceSlot &&
    !isRefreshingLiveData &&
    !isTogglingEffect &&
    !effectTypeDiscoveryRunning
  );
}

async function toggleEffectModule(effectKey) {
  if (!canToggleEffects()) return;

  const module = getEffectModuleByKey(effectKey);
  const knownEffect = lastKnownEffectsByKey[effectKey];
  const control = parameterService.get(effectKey);

  if (!module || !knownEffect?.typeName || !control) return;

  const isCurrentlyActive = isEffectActive(knownEffect);
  const expectedActive = !isCurrentlyActive;
  const expectedRaw = expectedActive ? 1 : 0;
  const parameterIdHex = control.parameterIdHex;

  isTogglingEffect = true;
  setEffectItemBusy(effectKey, true);

  const confirmationPromise = registerEffectWriteConfirmation(
    effectKey,
    expectedActive,
    expectedRaw,
    parameterIdHex
  );

  try {
    await getMidiPorts();

    logEffectSyncVerbose("Write sending", effectKey, {
      expectedActive,
      expectedRaw,
      parameterIdHex
    });

    const result = await control.writeScaled(expectedActive);

    if (!result.ok) {
      clearEffectWriteConfirmation(effectKey, "write-failed");
      throw new Error(result.error || `Toggle ${module.label} failed`);
    }

    const pending = pendingEffectWriteConfirmations.get(effectKey);
    if (pending) {
      pending.expectedRaw = result.rawValue;
    }

    logEffectSyncVerbose("Write sent — waiting for Kemper push", effectKey, {
      expectedActive,
      expectedRaw: result.rawValue,
      parameterIdHex
    });

    const confirmation = await confirmationPromise;

    if (confirmation.status === "timeout") {
      // UI unchanged — Kemper remains source of truth; no poll fallback.
      console.warn(
        `[Live Companion] Effect toggle unconfirmed for ${module.label} — no Kemper push received.`
      );
    } else if (confirmation.status === "mismatch") {
      console.warn(
        `[Live Companion] Effect toggle rejected by Kemper for ${module.label}.`
      );
    }
  } catch (error) {
    clearEffectWriteConfirmation(effectKey, "write-failed");
    logEffectSyncFailure(effectKey, "write failed", {
      message: error?.message || String(error),
      chain: "Write → (failed) → UI unchanged"
    });
    console.warn("[Live Companion] Effect toggle failed:", error.message || error);
  } finally {
    isTogglingEffect = false;
    setEffectItemBusy(effectKey, false);
  }
}

function getAmpSearchText(...values) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function normalizeGearName(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Display-only combo detection: identical Amp Name and Cabinet Name.
 * Does not mutate amp or cabinet source data.
 * @param {unknown} ampName
 * @param {unknown} cabinetName
 * @returns {boolean}
 */
function isComboAmpByIdenticalNames(ampName, cabinetName) {
  const amp = normalizeGearName(ampName);
  const cabinet = normalizeGearName(cabinetName);
  return Boolean(amp) && amp === cabinet;
}

function isPresentCabinetValue(value) {
  return Boolean(String(value ?? "").trim());
}

function valuesMatchIgnoreCase(left, right) {
  const a = normalizeGearName(left);
  const b = normalizeGearName(right);
  return Boolean(a) && a === b;
}

function isRedundantCabinetValue(value, ampName) {
  return !isPresentCabinetValue(value) || valuesMatchIgnoreCase(value, ampName);
}

/**
 * @param {{
 *   manufacturer?: unknown,
 *   model?: unknown,
 *   variant?: unknown
 * }} fields
 * @returns {{ label: string, value: string }[]}
 */
function buildRecognizedCabinetRows(fields) {
  /** @type {{ label: string, value: string }[]} */
  const rows = [];
  const manufacturer = String(fields.manufacturer ?? "").trim();
  const model = String(fields.model ?? "").trim();
  const variant = String(fields.variant ?? "").trim();

  if (manufacturer) rows.push({ label: "Manufacturer", value: manufacturer });
  if (model) rows.push({ label: "Model", value: model });
  if (variant) rows.push({ label: "Configuration", value: variant });

  return rows;
}

/**
 * Recognized Cabinet is Gear Library / image-map display data only.
 * Kemper rig cabinet strings are never used as recognized manufacturer/model.
 *
 * @param {{
 *   libraryView?: {
 *     manufacturer?: string,
 *     model?: string,
 *     variant?: string,
 *     imageSrc?: string | null,
 *     recognizedRows?: { label: string, value: string }[]
 *   } | null,
 *   mapEntry?: {
 *     image?: string,
 *     manufacturer?: string,
 *     model?: string,
 *     variant?: string
 *   } | null
 * }} input
 */
function buildRecognizedCabinetView(input) {
  const libraryView = input.libraryView || null;
  const mapEntry = input.mapEntry || null;
  const mapImageSrc = mapEntry?.image ? `/images/cabinets/${mapEntry.image}` : null;
  const mapVariant = String(mapEntry?.variant ?? "").trim();

  if (libraryView) {
    const recognizedRows = [...(libraryView.recognizedRows || [])];
    const hasConfigurationRow = recognizedRows.some((row) =>
      valuesMatchIgnoreCase(row.label, "Configuration")
    );
    if (mapVariant && !hasConfigurationRow) {
      recognizedRows.push({ label: "Configuration", value: mapVariant });
    }

    return {
      manufacturer: libraryView.manufacturer || "",
      model: libraryView.model || "",
      imageSrc: libraryView.imageSrc || mapImageSrc,
      recognizedRows
    };
  }

  const manufacturer = String(mapEntry?.manufacturer ?? "").trim();
  const model = String(mapEntry?.model ?? "").trim();
  const recognizedRows = buildRecognizedCabinetRows({
    manufacturer,
    model,
    variant: mapVariant
  });

  if (!recognizedRows.length && !mapImageSrc) {
    return null;
  }

  return {
    manufacturer,
    model,
    imageSrc: mapImageSrc,
    recognizedRows
  };
}

/**
 * @param {HTMLElement | null} listEl
 * @param {{ label: string, value: string }[]} rows
 */
function fillCabinetDetailList(listEl, rows) {
  if (!listEl) return;
  listEl.replaceChildren();

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "cabinet-details-row";

    const dt = document.createElement("dt");
    dt.textContent = row.label;

    const dd = document.createElement("dd");
    dd.textContent = row.value;
    dd.title = row.value;

    item.append(dt, dd);
    listEl.append(item);
  }
}

/**
 * @param {unknown} name
 * @returns {{ label: string, value: string }[]}
 */
function buildReportedCabinetRows(name) {
  /** @type {{ label: string, value: string }[]} */
  const rows = [];
  const nameText = String(name ?? "").trim();
  if (nameText) {
    rows.push({ label: "Name", value: nameText });
  }
  return rows;
}

/**
 * Cabinet panel display only. Source cabinet fields stay populated.
 * @param {{
 *   originalAmpName?: string,
 *   originalCabinetName?: string,
 *   cabinetName?: string,
 *   recognizedCabinet?: {
 *     recognizedRows?: { label: string, value: string }[],
 *     imageSrc?: string | null,
 *     manufacturer?: string,
 *     model?: string
 *   } | null
 * }} liveData
 */
function renderCabinetSection(liveData) {
  const ampName = liveData.originalAmpName || "";
  const cabinetName = liveData.originalCabinetName || liveData.cabinetName || "";
  const isCombo = isComboAmpByIdenticalNames(ampName, cabinetName);
  const recognized = liveData.recognizedCabinet || null;

  let recognizedRows = (recognized?.recognizedRows || []).filter((row) =>
    isPresentCabinetValue(row.value)
  );
  let reportedRows = buildReportedCabinetRows(liveData.cabinetName);

  if (isCombo) {
    recognizedRows = recognizedRows.filter(
      (row) => !isRedundantCabinetValue(row.value, ampName)
    );
    reportedRows = reportedRows.filter(
      (row) => !isRedundantCabinetValue(row.value, ampName)
    );
  }

  const showRecognized = recognizedRows.length > 0;
  const showReported = reportedRows.length > 0;
  const showImage = Boolean(recognized?.imageSrc);

  if (cabinetSection) {
    cabinetSection.dataset.combo = isCombo ? "true" : "false";
  }

  if (cabinetComboLabel) {
    cabinetComboLabel.hidden = !isCombo;
  }

  if (cabinetRecognizedGroup) {
    cabinetRecognizedGroup.hidden = !showRecognized;
  }
  fillCabinetDetailList(cabinetRecognizedList, showRecognized ? recognizedRows : []);

  if (cabinetReportedGroup) {
    cabinetReportedGroup.hidden = !showReported;
  }
  fillCabinetDetailList(cabinetReportedList, showReported ? reportedRows : []);

  if (!cabinetImageContainer) return;

  if (!showImage) {
    cabinetImageContainer.innerHTML = "";
    cabinetImageContainer.hidden = true;
    return;
  }

  cabinetImageContainer.hidden = false;
  const image = document.createElement("img");
  image.src = recognized.imageSrc;
  image.className = "cabinet-image";
  image.alt =
    [recognized.manufacturer, recognized.model].filter(Boolean).join(" ") || "Cabinet";
  cabinetImageContainer.replaceChildren(image);
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

function matchCabinetImageMapEntry(manufacturer, model, configuration = "") {
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

  return bestMatch;
}

function getCabinetImage(manufacturer, model, configuration = "") {
  return matchCabinetImageMapEntry(manufacturer, model, configuration)?.image || "";
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
  const kemperActive = isBooleanOn(activeValue);
  logEffectOnOffRaw("refresh", module, activeValue);

  return {
    ...module,
    active: kemperActive,
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

  const resolvedCabinet = resolveCabinetRecordFromTextSources(
    liveCabinetName,
    liveCabinetManufacturer,
    liveCabinetModel
  );
  const libraryCabinetView = resolvedCabinet?.id
    ? getCabinetDetailView(resolvedCabinet.id)
    : null;
  const mapEntry = matchCabinetImageMapEntry(
    liveCabinetManufacturer,
    liveCabinetModel || liveCabinetName,
    liveCabinetName
  );
  const recognizedCabinet = buildRecognizedCabinetView({
    libraryView: libraryCabinetView,
    mapEntry
  });

  const libraryYear = formatLibraryAmpYear(resolvedAmp?.introduced);
  const libraryDetail = resolvedAmp?.id ? getAmpDetailView(resolvedAmp.id) : null;
  const libraryPower = libraryDetail?.power || "";
  const libraryTubeConfiguration = libraryDetail?.valveConfiguration?.length
    ? libraryDetail.valveConfiguration
        .map(({ label, value }) => `${label}: ${value}`)
        .join("\n")
    : "";

  return {
    rigName: currentRigName,
    rigAuthor: liveRigAuthor || "",
    ampId: resolvedAmp?.id ?? null,
    ampName: liveAmpName,
    manufacturer: resolvedAmp?.manufacturer ?? "",
    ampModel: resolvedAmp?.model ?? "",
    libraryYear,
    libraryPower,
    libraryTubeConfiguration,
    productionYear: libraryYear || liveAmpYear || "",
    originalRigName: currentRigName || "",
    originalAmpName: liveAmpName || "",
    originalCabinetName: liveCabinetName || "",
    ampImageSrc: resolvedAmp ? getAmpImage(resolvedAmp.id) : null,
    cabinetName: String(liveCabinetName || "").trim(),
    cabinetManufacturer: String(liveCabinetManufacturer || "").trim(),
    cabinetModel: String(liveCabinetModel || "").trim(),
    recognizedCabinet,
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
    logEffectSyncVerbose("UI update", effect.key, { source: "refresh", active: effect.active });

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

function gainRawToScaleValue(rawValue) {
  const formatted = formatGain(rawValue);
  const numericValue = Number(formatted);

  if (Number.isFinite(numericValue)) {
    return Math.max(0, Math.min(GAIN_SCALE_MAX, numericValue));
  }

  if (rawValue === null || rawValue === undefined) return null;
  return Math.max(0, Math.min(GAIN_SCALE_MAX, rawValue / 1638.3));
}

function ensureGainScaleTicks() {
  if (!gainScaleTicks || gainScaleTicks.childElementCount === GAIN_SCALE_TICK_COUNT) {
    return;
  }

  gainScaleTicks.innerHTML = Array.from({ length: GAIN_SCALE_TICK_COUNT }, (_, index) => {
    const isMajor = index % 10 === 0;
    const isMid = !isMajor && index % 5 === 0;
    const tickClass = isMajor
      ? "gain-scale-tick is-major"
      : isMid
        ? "gain-scale-tick is-mid"
        : "gain-scale-tick";
    return `<i class="${tickClass}"></i>`;
  }).join("");
}

function applyGainDisplay(rawValue, formattedValue = "") {
  if (!gainScale || !gainScaleFill || !gainScaleMarker || !gainScaleValue) {
    console.log("[Gain Debug] Slider Updated skipped — DOM nodes missing");
    return;
  }

  ensureGainScaleTicks();

  const scaleValue =
    formattedValue !== "" && Number.isFinite(Number(formattedValue))
      ? Math.max(0, Math.min(GAIN_SCALE_MAX, Number(formattedValue)))
      : gainRawToScaleValue(rawValue);

  if (scaleValue === null || !Number.isFinite(scaleValue)) {
    gainLocalRawValue = null;
    gainScale.dataset.hasValue = "false";
    gainScaleValue.textContent = "—";
    gainScaleFill.style.width = "0%";
    gainScaleMarker.style.left = "0%";
    gainScale.setAttribute("aria-valuenow", "0");
    gainScale.setAttribute("aria-valuetext", "unavailable");
    console.log("[Gain Debug] Slider Updated", {
      raw: rawValue,
      decoded: null,
      display: "—",
      percent: 0,
      source: gainScale.dataset.source || "unknown"
    });
    return;
  }

  const display = scaleValue.toFixed(1);
  const percent = (scaleValue / GAIN_SCALE_MAX) * 100;
  const raw =
    rawValue != null && Number.isFinite(Number(rawValue))
      ? Math.max(0, Math.min(16383, Math.round(Number(rawValue))))
      : Math.round(scaleValue * 1638.3);

  gainLocalRawValue = raw;
  gainScale.dataset.hasValue = "true";
  gainScaleValue.textContent = display;
  gainScaleFill.style.width = `${percent}%`;
  /* Keep green→amber→orange mapped to the full 0–10 track, not the fill width */
  gainScaleFill.style.backgroundSize =
    percent > 0 ? `${(100 / percent) * 100}% 100%` : "100% 100%";
  gainScaleFill.style.backgroundPosition = "left center";
  gainScaleMarker.style.left = `${percent}%`;
  gainScale.setAttribute("aria-valuenow", display);
  gainScale.setAttribute("aria-valuetext", `${display} of ${GAIN_SCALE_MAX}`);

  // TEMP debug — slider DOM write
  console.log("[Gain Debug] Slider Updated", {
    raw,
    decoded: display,
    percent: Number(percent.toFixed(2)),
    source: gainScale.dataset.source || "unknown",
    dragging: gainScale.dataset.dragging || "false"
  });
}

function canControlGain() {
  return (
    isConnectionOperational() &&
    !performanceLibraryScanInProgress &&
    !isLoadingPerformanceSlot &&
    !effectTypeDiscoveryRunning
  );
}

/**
 * @param {number} clientX
 * @returns {number | null}
 */
function pointerToGainScaleValue(clientX) {
  const track = document.querySelector("#gainScaleTrack") || gainScale?.querySelector(".gain-scale-track");
  if (!track) return null;
  const rect = track.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(GAIN_SCALE_MAX, ratio * GAIN_SCALE_MAX));
}

/**
 * @param {number} scaleValue 0–10
 * @param {{ send?: boolean }} [options]
 */
function setGainFromScaleValue(scaleValue, options = {}) {
  const send = options.send !== false;
  const clamped = Math.max(0, Math.min(GAIN_SCALE_MAX, scaleValue));
  const raw = Math.max(0, Math.min(16383, Math.round(clamped * 1638.3)));
  if (gainScale) gainScale.dataset.source = "local";
  applyGainDisplay(raw, clamped.toFixed(1));
  if (send) queueGainParameterWrite(raw);
}

/**
 * @param {number} rawValue
 */
function queueGainParameterWrite(rawValue) {
  pendingGainWriteRaw = Math.max(0, Math.min(16383, Math.round(rawValue)));
  if (gainWriteTimer != null) return;

  const flush = async () => {
    gainWriteTimer = null;
    const raw = pendingGainWriteRaw;
    pendingGainWriteRaw = null;
    if (raw == null || !canControlGain()) return;

    try {
      await getMidiPorts();
      const result = await parameterService.setParameter(
        CONTROL_PARAMETERS.gain.parameterId,
        raw
      );
      if (result.ok) {
        // Suppress echo race briefly; Kemper push remains authoritative afterward.
        lastGainPushAt = Date.now();
      }
    } catch (error) {
      console.warn("[Live Companion] Gain write failed:", error?.message || error);
    }

    if (pendingGainWriteRaw != null) {
      gainWriteTimer = window.setTimeout(flush, GAIN_WRITE_INTERVAL_MS);
    }
  };

  gainWriteTimer = window.setTimeout(flush, 0);
}

function endGainPointerInteraction() {
  if (!gainScale) return;
  gainInteractionActive = false;
  gainDragPointerId = null;
  gainScale.dataset.dragging = "false";
}

/**
 * Wire click/drag/keyboard Gain control → SysEx parameter writes.
 */
function bindGainScaleControl() {
  if (!gainScale) return;

  const track =
    document.querySelector("#gainScaleTrack") ||
    gainScale.querySelector(".gain-scale-track");
  if (!track) return;

  gainScale.dataset.interactive = "true";

  const applyFromClientX = (clientX) => {
    const scaleValue = pointerToGainScaleValue(clientX);
    if (scaleValue == null) return;
    setGainFromScaleValue(scaleValue, { send: true });
  };

  track.addEventListener("pointerdown", (event) => {
    if (!canControlGain()) return;
    if (event.button != null && event.button !== 0) return;

    gainInteractionActive = true;
    gainDragPointerId = event.pointerId;
    gainScale.dataset.dragging = "true";
    track.setPointerCapture?.(event.pointerId);
    applyFromClientX(event.clientX);
    event.preventDefault();
  });

  track.addEventListener("pointermove", (event) => {
    if (!gainInteractionActive || event.pointerId !== gainDragPointerId) return;
    applyFromClientX(event.clientX);
    event.preventDefault();
  });

  const release = (event) => {
    if (event.pointerId != null && event.pointerId !== gainDragPointerId) return;
    endGainPointerInteraction();
  };

  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);
  track.addEventListener("lostpointercapture", () => {
    endGainPointerInteraction();
  });

  gainScale.addEventListener("keydown", (event) => {
    if (!canControlGain()) return;
    const current =
      gainRawToScaleValue(gainLocalRawValue) ??
      Number(gainScale.getAttribute("aria-valuenow"));
    if (!Number.isFinite(current)) return;

    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next += 0.1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= 0.1;
    else if (event.key === "PageUp") next += 1;
    else if (event.key === "PageDown") next -= 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = GAIN_SCALE_MAX;
    else return;

    event.preventDefault();
    gainInteractionActive = true;
    setGainFromScaleValue(next, { send: true });
    window.setTimeout(() => {
      gainInteractionActive = false;
    }, PUSH_CONFIRM_WINDOW_MS);
  });
}

async function refreshGainAfterMorph() {
  await delay(MORPH_GAIN_READ_DELAY_MS);

  if (!isConnectionOperational()) return;

  if (canUseBidirectionalPushSync() && wasPushedRecently(lastGainPushAt, MORPH_GAIN_READ_DELAY_MS + 250)) {
    return;
  }

  try {
    const rawValue = await requestNumericParam(NUMERIC_PARAMS.gain);
    if (rawValue === null || rawValue === undefined) return;
    renderGain(formatGain(rawValue), rawValue);
  } catch {
    // Morph gain test read failed silently.
  }
}

/**
 * Apply one effect slot update from bidirectional push (Kemper wins).
 * @param {typeof EFFECT_MODULES[number]} module
 * @param {{ active?: boolean, activeValue?: number, typeValue?: number, typeName?: string }} patch
 * @param {"push" | "refresh" | "enrich"} [source]
 */
function upsertEffectFromPush(module, patch, source = "push") {
  const previous = lastKnownEffectsByKey[module.key] || {
    ...module,
    active: false,
    activeValue: 0,
    typeValue: 0,
    typeName: "",
    image: ""
  };

  const typeValue =
    patch.typeValue !== undefined ? patch.typeValue : previous.typeValue;
  const typeName =
    patch.typeName !== undefined
      ? patch.typeName
      : getEffectName("", typeValue, module) || previous.typeName;

  if (
    !effectTypeDiscoveryRunning &&
    patch.typeValue !== undefined &&
    typeValue &&
    typeName
  ) {
    observeEffectType(typeValue, typeName);
  }

  const next = {
    ...previous,
    ...module,
    active: patch.active !== undefined ? patch.active : previous.active,
    activeValue:
      patch.activeValue !== undefined ? patch.activeValue : previous.activeValue,
    typeValue,
    typeName,
    image: getModuleEffectImage(typeName, module)
  };

  const stateChanged =
    previous.active !== next.active ||
    previous.activeValue !== next.activeValue ||
    previous.typeValue !== next.typeValue ||
    previous.typeName !== next.typeName;

  lastKnownEffectsByKey[module.key] = next;

  logEffectSyncVerbose("UI update", module.key, {
    source,
    active: next.active,
    activeValue: next.activeValue,
    typeValue: next.typeValue,
    typeName: next.typeName,
    stateChanged
  });

  if (!effectsList) return;

  if (module.key === "stompA") {
    ensureEffectChainHeading("pre", "PRE AMP");
  }
  if (module.key === "stompX") {
    ensureEffectChainHeading("post", "POST AMP");
  }

  let item = effectsList.querySelector(`li[data-key="${module.key}"]`);
  if (!item) {
    item = createEffectItem(next);
    effectsList.append(item);
  }
  updateEffectItem(item, next);
}

/**
 * One-shot rendered-string lookup when push delivers an unknown effect type id.
 * @param {typeof EFFECT_MODULES[number]} module
 * @param {number} typeValue
 */
async function enrichEffectTypeNameFromDevice(module, typeValue) {
  const enrichKey = `${module.key}:${typeValue}`;
  if (effectTypeEnrichInFlight.has(enrichKey)) return;
  effectTypeEnrichInFlight.add(enrichKey);

  try {
    const rendered = await requestRenderedString(
      [module.page, module.type],
      typeValue
    );
    const typeName = getEffectName(rendered, typeValue, module);
    if (!typeName) return;

    const current = lastKnownEffectsByKey[module.key];
    if (!current || current.typeValue !== typeValue) return;
    upsertEffectFromPush(module, { typeValue, typeName }, "enrich");
  } catch {
    // silent — keep numeric/empty label until next refresh
  } finally {
    effectTypeEnrichInFlight.delete(enrichKey);
  }
}

/**
 * @param {string | null | undefined} ascii
 */
function scheduleRigChangeRefreshFromPush(ascii) {
  const nextName = String(ascii || "").trim();
  if (!nextName || nextName === currentRigName) return;
  if (performanceLibraryScanInProgress || isLoadingPerformanceSlot) return;

  currentRigName = nextName;
  if (rigName) {
    rigName.textContent = nextName;
    rigName.title = nextName;
  }

  if (rigChangeRefreshTimer != null) {
    window.clearTimeout(rigChangeRefreshTimer);
  }

  rigChangeRefreshTimer = window.setTimeout(() => {
    rigChangeRefreshTimer = null;
    if (
      isRefreshingLiveData ||
      isLoadingPerformanceSlot ||
      performanceLibraryScanInProgress ||
      !isConnectionOperational()
    ) {
      return;
    }
    console.log("RIG CHANGE DETECTED (push)", performance.now());
    void refreshLiveData();
  }, RIG_CHANGE_REFRESH_DEBOUNCE_MS);
}

/**
 * Bridge bidirectional ParameterStateStore → live stage UI.
 * Outgoing controls are unchanged; Kemper push is preferred source of truth.
 * @param {{ result: { changed: boolean, initial: boolean, state: any } }} event
 */
function handleBidirectionalLivePush(event) {
  const result = event?.result;
  const state = result?.state;
  if (!state || performanceLibraryScanInProgress || isLoadingPerformanceSlot) {
    // TEMP debug — Gain UI dispatch blocked before id check
    if (event?.decoded?.parameterId === LIVE_PUSH_PARAM.gain || state?.id === LIVE_PUSH_PARAM.gain) {
      console.log("[Gain Debug] UI Gain Update (blocked early)", {
        hasState: Boolean(state),
        performanceLibraryScanInProgress,
        isLoadingPerformanceSlot,
        raw: state?.rawValue ?? event?.decoded?.value ?? null
      });
    }
    return;
  }

  const id = state.id;

  if (id === LIVE_PUSH_PARAM.tempoBpm) {
    lastTempoPushAt = Date.now();
    if (state.rawValue != null) {
      renderCurrentTempo(state.rawValue);
    }
    return;
  }

  if (id === LIVE_PUSH_PARAM.gain) {
    lastGainPushAt = Date.now();
    // TEMP debug — UI received a Gain update from bidirectional dispatch
    console.log("[Gain Debug] UI Gain Update", {
      raw: state.rawValue,
      decoded: state.scaledDisplay ?? state.scaledValue ?? null,
      changed: result?.changed,
      initial: result?.initial,
      gainInteractionActive,
      willSync: !gainInteractionActive && state.rawValue != null
    });
    // Local drag temporarily owns the knob; otherwise Kemper is source of truth.
    if (gainInteractionActive) {
      console.log("[Gain Debug] UI Gain Update skipped — local interaction active");
      return;
    }
    if (state.rawValue != null) {
      syncGainFromDevice(state.rawValue);
    } else {
      console.log("[Gain Debug] UI Gain Update skipped — rawValue is null");
    }
    return;
  }

  if (id === LIVE_PUSH_PARAM.rigName) {
    if (result.changed) {
      scheduleRigChangeRefreshFromPush(state.ascii);
    } else if (result.initial && state.ascii && !currentRigName) {
      currentRigName = String(state.ascii).trim();
      if (rigName && currentRigName) {
        rigName.textContent = currentRigName;
        rigName.title = currentRigName;
      }
    }
    return;
  }

  const onOffModule = EFFECT_ON_OFF_BY_PARAM_ID.get(id);
  if (onOffModule) {
    lastEffectOnOffPushAt.set(onOffModule.key, Date.now());
    const kemperActive = isBooleanOn(state.rawValue);
    const activeValue = kemperActive ? 1 : 0;

    logEffectOnOffRaw("push", onOffModule, state.rawValue);
    logEffectSyncVerbose("Push → Slot mapping (on/off)", onOffModule.key, {
      parameterId: formatEffectParamIdHex(id),
      raw: state.rawValue,
      scaled: state.scaledValue,
      activeValue,
      on: kemperActive,
      changed: result?.changed,
      initial: result?.initial
    });

    if (
      (onOffModule.key === "delay" || onOffModule.key === "reverb") &&
      state.rawValue == null
    ) {
      console.warn("[Effect Sync] Delay/Reverb push without raw value", {
        slot: onOffModule.label,
        parameterId: formatEffectParamIdHex(id),
        raw: state.rawValue,
        scaled: state.scaledValue
      });
    }

    settleEffectWriteConfirmation(onOffModule, activeValue, state.rawValue);
    upsertEffectFromPush(onOffModule, {
      active: kemperActive,
      activeValue
    });
    return;
  }

  const typeModule = EFFECT_TYPE_BY_PARAM_ID.get(id);
  if (typeModule && state.rawValue != null) {
    const typeValue = state.rawValue;
    const typeName = getEffectName("", typeValue, typeModule);

    logEffectSyncVerbose("Push → Slot mapping (type)", typeModule.key, {
      parameterId: formatEffectParamIdHex(id),
      typeValue,
      typeName: typeName || null,
      changed: result?.changed,
      initial: result?.initial
    });

    upsertEffectFromPush(typeModule, { typeValue, typeName });
    if (!typeName && typeValue) {
      void enrichEffectTypeNameFromDevice(typeModule, typeValue);
    }
  }
}

function renderGain(value, rawValue) {
  if (!gainScale) return;

  const hasFormattedValue = value !== null && value !== undefined && value !== "";
  const hasRawValue = rawValue !== null && rawValue !== undefined;

  if (!hasFormattedValue && !hasRawValue) {
    applyGainDisplay(null, "");
    return;
  }

  const formatted = hasFormattedValue ? String(value) : formatGain(rawValue);
  const raw = hasRawValue ? rawValue : Math.round(Number(value) * 1638.3);
  applyGainDisplay(raw, formatted);
}

/**
 * Apply a Kemper-reported Gain value to the slider (animated, no user action).
 * @param {number} rawValue
 */
function syncGainFromDevice(rawValue) {
  if (!gainScale || rawValue == null || !Number.isFinite(Number(rawValue))) {
    console.log("[Gain Debug] Slider Updated skipped — invalid sync input", {
      hasGainScale: Boolean(gainScale),
      rawValue
    });
    return;
  }

  // Ensure remote updates always animate (even right after a local drag).
  gainScale.dataset.dragging = "false";
  gainScale.dataset.source = "device";

  const raw = Math.max(0, Math.min(16383, Math.round(Number(rawValue))));
  // Skip redundant paints only when already showing the same raw value.
  if (gainLocalRawValue === raw && gainScale.dataset.hasValue === "true") {
    console.log("[Gain Debug] Slider Updated skipped — same raw already shown", {
      raw,
      decoded: formatGain(raw)
    });
    return;
  }

  renderGain(formatGain(raw), raw);
}

function startRigMonitor() {
  if (monitorTimer) return;

  monitorTimer = window.setInterval(async () => {
    if (
      performanceLibraryScanInProgress ||
      isLoadingPerformanceSlot ||
      isRefreshingLiveData ||
      isCheckingRigName ||
      isTogglingEffect ||
      !midiAccess
    ) {
      return;
    }

    // Hybrid path: when Kemper push + lease are healthy, skip steady-state
    // effects/tempo/rig-name polling. Connection health uses sensing traffic.
    if (canUseBidirectionalPushSync()) {
      consecutiveMonitorFailures = 0;
      if (connectionState !== CONNECTION_STATE.CONNECTED) {
        setConnectionState(CONNECTION_STATE.CONNECTED);
      }
      return;
    }

    isCheckingRigName = true;

    try {
      // Legacy / fallback poll when bidirectional push is not healthy.
      console.time("requestCurrentRigName");
      const nextRigName = await requestCurrentRigName();
      console.timeEnd("requestCurrentRigName");

      consecutiveMonitorFailures = 0;
      setConnectionState(CONNECTION_STATE.CONNECTED);

      if (nextRigName && currentRigName && nextRigName !== currentRigName) {
        console.log("RIG CHANGE DETECTED", performance.now());
        await refreshLiveData();
      } else {
        const effects = await requestEffectsData();
        renderEffects(effects);
        await refreshTempoOnly({ force: true });
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

    if (ampDetailsPower) {
      const power = liveData.libraryPower || "";
      if (ampDetailsPowerRow) {
        ampDetailsPowerRow.hidden = !power;
      }
      ampDetailsPower.textContent = power || "-";
      ampDetailsPower.title = power;
    }

    if (ampDetailsTubeConfiguration) {
      const tubes = liveData.libraryTubeConfiguration || "";
      if (ampDetailsTubeRow) {
        ampDetailsTubeRow.hidden = !tubes;
      }
      ampDetailsTubeConfiguration.textContent = tubes || "-";
      ampDetailsTubeConfiguration.title = tubes.replaceAll("\n", " · ");
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

    currentLiveAmpId = liveData.ampId ?? null;
    ampImageContainer.innerHTML = "";
    if (liveData.ampImageSrc) {
      const ampImage = document.createElement("img");
      ampImage.src = liveData.ampImageSrc;
      ampImage.className = "amp-image";
      ampImage.alt = liveData.ampModel || liveData.manufacturer || "Amplifier";
      ampImageContainer.append(ampImage);
    }
    updateLiveAmpDetailAffordance();

    productionYear.textContent =
      liveData.productionYear && liveData.productionYear !== "Unknown"
        ? `Amp Year ${liveData.productionYear}`
        : "";
    renderCabinetSection(liveData);
    renderGain(liveData.gain, liveData.gainRaw);
    renderCurrentTempo(liveData.tempoBpmRaw);
    renderEffects(liveData.effects);
	console.timeEnd("refreshLiveData");
    consecutiveMonitorFailures = 0;
    setConnectionState(CONNECTION_STATE.CONNECTED);
    startRigMonitor();
  } catch (error) {
    console.log("[MIDI DEBUG] refreshLiveData failed", {
      error: String(error?.message || error)
    });
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
    openLiveAmpDetailsOverlay();
  });
  ampImageContainer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openLiveAmpDetailsOverlay();
  });
}

if (createLibraryButton) {
  createLibraryButton.addEventListener("click", createPerformanceLibrary);
}

if (performanceExplorerSearch) {
  performanceExplorerSearch.addEventListener("focus", () => {
    setPerformanceExplorerExpanded(true);
  });
  performanceExplorerSearch.addEventListener("input", () => {
    if (!performanceExplorerExpanded) {
      setPerformanceExplorerExpanded(true);
      return;
    }
    renderPerformanceExplorer();
  });
  performanceExplorerSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setPerformanceExplorerExpanded(false);
    performanceExplorerSearch.blur();
  });
}

document.addEventListener("pointerdown", (event) => {
  if (!performanceExplorerExpanded) return;
  if (isPerformanceExplorerEventTarget(event.target)) return;
  setPerformanceExplorerExpanded(false);
});

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

if (noMidiReconnectButton) {
  noMidiReconnectButton.addEventListener("click", handleNoMidiReconnect);
}

const bidirectionalDiscovery = initializeBidirectionalDiscovery();
bidirectionalDiscovery.subscribe(handleBidirectionalLivePush);
// Research-only write harness inside MIDI Analyzer — isolated from production controls.
initializeProtocolResearchLab({
  discovery: bidirectionalDiscovery,
  resolveLabel: async (parameterId, rawValue) => {
    const module = EFFECT_TYPE_BY_PARAM_ID.get(parameterId & 0xffff);
    if (!module) return "";
    const known = getEffectTypeName(rawValue);
    if (known) return known;
    const name = await requestRenderedStringForDiscovery(
      [module.page, module.type],
      rawValue,
      1000
    );
    return name || "";
  }
});
initializeEffectTypesPanel({
  ensureMidi: () => getMidiPorts(),
  subscribeParameters: (listener) => bidirectionalDiscovery.subscribe(listener),
  setParameterEchoEnabled: (enabled) => {
    bidirectionalDiscovery.setParameterEchoEnabled(enabled);
  },
  readEffectTypeName: async (slotKey, typeId, timeoutMs = 1000) => {
    const module = getEffectModuleByKey(slotKey);
    if (!module) return null;
    return requestRenderedStringForDiscovery(
      [module.page, module.type],
      typeId,
      timeoutMs
    );
  },
  readCurrentEffectType: async (slotKey) => {
    const module = getEffectModuleByKey(slotKey);
    if (!module) return null;
    const value = await requestNumericParam([module.page, module.type]);
    return value == null ? null : Number(value);
  },
  onDiscoveryRunningChange: (running) => {
    effectTypeDiscoveryRunning = running;
  }
});

initializePerformanceTrafficCapture({
  discovery: bidirectionalDiscovery,
  ensureMidi: () => getMidiPorts()
});
initializeExtendedParameterCapture({
  discovery: bidirectionalDiscovery,
  ensureMidi: () => getMidiPorts()
});
initializeRawMidiTrace({
  discovery: bidirectionalDiscovery,
  ensureMidi: () => getMidiPorts()
});

parameterService.setOutputProvider(async () => {
  const { output } = await getMidiPorts();
  return output;
});

bindGainScaleControl();

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
ensureGainScaleTicks();
applyGainDisplay(null, "");
bootApplication();
