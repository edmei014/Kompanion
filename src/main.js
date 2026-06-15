import "./styles.css";
import { effectImageMap } from "./effectImageMap.js";
import { ampProfiles } from "./ampImageMap.js";
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
  ampName: [0x00, 0x10],
  ampManufacturer: [0x00, 0x15],
  ampModel: [0x00, 0x18],
  ampYearOfProduction: [0x00, 0x1b],
  cabinetName: [0x00, 0x20],
  cabinetManufacturer: [0x00, 0x25],
  cabinetModel: [0x00, 0x2a]
};
const NUMERIC_PARAMS = {
  gain: [0x0a, 0x04]
};
const EFFECT_MODULES = [
  { key: "stompA", label: "Stomp A", page: 0x32, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompB", label: "Stomp B", page: 0x33, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompC", label: "Stomp C", page: 0x34, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompD", label: "Stomp D", page: 0x35, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "stompX", label: "Stomp X", page: 0x38, onOff: 0x03, type: 0x00, group: "stomp" },
  { key: "mod", label: "MOD", page: 0x3a, onOff: 0x03, type: 0x00, group: "mod" },
  { key: "delay", label: "Delay", page: 0x3c, onOff: 0x03, type: 0x00, group: "delay" },
  { key: "reverb", label: "Reverb", page: 0x3d, onOff: 0x03, type: 0x00, group: "reverb" }
];
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
const YEAR_PATTERNS = [
  [/1959|plexi/i, "1959"],
  [/jtm\s?45/i, "1962"],
  [/ac30/i, "1959"],
  [/ac15/i, "1958"],
  [/bassman/i, "1952"],
  [/twin/i, "1952"],
  [/deluxe/i, "1948"],
  [/jcm\s?800/i, "1981"],
  [/jcm\s?900/i, "1990"],
  [/jvm/i, "2007"],
  [/dual rectifier|rectifier/i, "1992"],
  [/mark\s?iic/i, "1983"],
  [/slo/i, "1987"],
  [/5150/i, "1992"],
  [/6505/i, "2005"],
  [/vh4/i, "1994"],
  [/rockerverb/i, "2004"],
  [/jc-?120/i, "1975"]
];

const inputPort = document.querySelector("#inputPort");
const outputPort = document.querySelector("#outputPort");
const rigName = document.querySelector("#rigName");
const ampManufacturer = document.querySelector("#ampManufacturer");
const ampModel = document.querySelector("#ampModel");
const productionYear = document.querySelector("#productionYear");
const cabinetManufacturer = document.querySelector("#cabinetManufacturer");
const cabinetModel = document.querySelector("#cabinetModel");
const cabinetConfiguration = document.querySelector("#cabinetConfiguration");
const gainValue = document.querySelector("#gainValue");
const gainMeterFill = document.querySelector("#gainMeterFill");
const effectsList = document.querySelector("#effectsList");
const errorStatus = document.querySelector("#errorStatus");
const liveStatus = document.querySelector("#liveStatus");
const ampImageContainer = document.querySelector("#ampImageContainer");
const cabinetImageContainer = document.querySelector("#cabinetImageContainer");
const ampZoomOverlay = document.querySelector("#ampZoomOverlay");
const ampZoomImage = document.querySelector("#ampZoomImage");
let midiAccess;
let isRefreshingLiveData = false;
let isCheckingRigName = false;
let currentRigName = "";
let monitorTimer;
let lastCompleteRig = null;
let passiveMidiDebugInput = null;
const passiveMidiDebugLastMessages = new Map();
let passiveMidiDebugMessageCount = 0;


function setStatus(message, tone = "neutral") {
  if (!errorStatus) return;

  errorStatus.textContent = tone === "error" ? message : "";
  errorStatus.dataset.visible = tone === "error" ? "true" : "false";
}

function setLiveStatus(state) {
  if (!liveStatus) return;

  liveStatus.dataset.state = state;
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
    option.textContent.toLowerCase().includes("profiler")
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

function logPassiveMidiDebugMessage(event) {
  const bytes = Array.from(event.data || []);
  const type = getMidiDebugType(bytes);
  const signature = getMidiDebugSignature(bytes);
  const previousBytes = passiveMidiDebugLastMessages.get(signature) || null;
  const changedIndexes = getMidiDebugChangedBytes(bytes, previousBytes);
  const changedText = formatMidiDebugChangedBytes(bytes, changedIndexes);
  const timestamp = formatMidiDebugTimestamp();

  passiveMidiDebugMessageCount += 1;
  passiveMidiDebugLastMessages.set(signature, bytes);

  console.groupCollapsed(
    `[Kemper MIDI Debug #${passiveMidiDebugMessageCount}] ${timestamp} | ${type} | ${bytes.length} Bytes`
  );
  console.log("Timestamp:", timestamp);
  console.log("Typ:", type);
  console.log("Laenge:", bytes.length);
  console.log("Hex:", formatMidiHexDump(bytes));
  console.log("Signatur:", signature || "-");
  console.log("Geaenderte Bytes gegen letzte gleiche Signatur:", changedText);
  console.log("Quelle:", event.currentTarget?.name || event.currentTarget?.id || "unbekannt");
  console.groupEnd();
}

function startPassiveMidiDebug(input) {
  if (!input || passiveMidiDebugInput === input) return;

  if (passiveMidiDebugInput) {
    passiveMidiDebugInput.removeEventListener("midimessage", logPassiveMidiDebugMessage);
  }

  passiveMidiDebugInput = input;
  passiveMidiDebugLastMessages.clear();
  passiveMidiDebugMessageCount = 0;
  //input.addEventListener("midimessage", logPassiveMidiDebugMessage);
  //console.info(
  //  `[Kemper MIDI Debug] Passiver Listener aktiv auf: ${input.name || input.id || "unbekannter Eingang"}`
  //);
}

async function loadPorts() {
  setStatus("MIDI-Ports werden geladen...");

  try {
    if (!("requestMIDIAccess" in navigator)) {
      throw new Error("Web MIDI API ist in dieser WebView nicht verfuegbar.");
    }

    midiAccess = await navigator.requestMIDIAccess({ sysex: true });
    fillSelect(inputPort, [...midiAccess.inputs.values()], "Kein Eingang gefunden");
    fillSelect(outputPort, [...midiAccess.outputs.values()], "Kein Ausgang gefunden");
    preferProfilerPort(inputPort);
    preferProfilerPort(outputPort);
    midiAccess.onstatechange = () => {
      fillSelect(inputPort, [...midiAccess.inputs.values()], "Kein Eingang gefunden");
      fillSelect(outputPort, [...midiAccess.outputs.values()], "Kein Ausgang gefunden");
      preferProfilerPort(inputPort);
      preferProfilerPort(outputPort);
    };
    setStatus("MIDI-Ports geladen.", "ok");
    await refreshLiveData();
  } catch (error) {
    setStatus(String(error), "error");
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

function getAmpSearchText(...values) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function deriveManufacturer(ampName, modelName) {
  const searchText = getAmpSearchText(ampName, modelName);
  const match = MANUFACTURER_PATTERNS.find(([needle]) => searchText.includes(needle));
  return match ? match[1] : "Unknown";
}

function deriveProductionYear(ampName, modelName) {
  const searchText = getAmpSearchText(ampName, modelName);
  const match = YEAR_PATTERNS.find(([pattern]) => pattern.test(searchText));
  return match ? match[1] : "Unknown";
}

function getAmpImage(manufacturer, model, ampName) {
  const search = `
    ${ampName || ""}
    ${manufacturer || ""}
    ${model || ""}
  `
    .trim()
    .toLowerCase();

  let bestMatch = null;
  let bestLength = 0;

  for (const profile of ampProfiles) {
    for (const alias of profile.aliases) {
      const normalizedAlias = alias.toLowerCase();

      if (
        search.includes(normalizedAlias) &&
        normalizedAlias.length > bestLength
      ) {
        bestMatch = profile.image;
        bestLength = normalizedAlias.length;
      }
    }
  }

  return bestMatch || "";
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
    liveAmpName,
    liveAmpManufacturer,
    liveAmpModel,
    liveAmpYear,
    liveCabinetName,
    liveCabinetManufacturer,
    liveCabinetModel,
    liveGainValue
  ] =
    await Promise.all([
      requestStringTag(STRING_TAGS.ampName),
      requestStringTag(STRING_TAGS.ampManufacturer),
      requestStringTag(STRING_TAGS.ampModel),
      requestStringTag(STRING_TAGS.ampYearOfProduction),
      requestStringTag(STRING_TAGS.cabinetName),
      requestStringTag(STRING_TAGS.cabinetManufacturer),
      requestStringTag(STRING_TAGS.cabinetModel),
      requestNumericParam(NUMERIC_PARAMS.gain)
    ]);
  const effects = await Promise.all(
  EFFECT_MODULES.map(module => requestEffectModule(module))
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

  return {
    rigName: currentRigName,
    ampName: liveAmpName,
    ampModel: liveAmpModel || liveAmpName,
    manufacturer: liveAmpManufacturer || deriveManufacturer(liveAmpName, liveAmpModel),
    productionYear: liveAmpYear || deriveProductionYear(liveAmpName, liveAmpModel),
    cabinetManufacturer: resolvedCabinetManufacturer,
    cabinetModel: removeCabinetConfiguration(resolvedCabinetModel, cabinetConfiguration),
    cabinetConfiguration,
    cabinetImage,
    gain: formatGain(liveGainValue),
    gainRaw: liveGainValue,
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
      image.src = `/images/effects/${effect.image}`;
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
}

function renderEffects(effects) {
  effects.forEach((effect) => {
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

function renderGain(value, rawValue) {
  gainValue.textContent = value ? `${value} / 10` : "-";

  const numericValue = Number(value);

  const percent = Number.isFinite(numericValue)
    ? Math.max(0, Math.min(100, numericValue * 10))
    : rawValue
      ? Math.max(0, Math.min(100, (rawValue / 16383) * 100))
      : 0;

  const segmentCount = 12;
  const activeSegments = Math.round((percent / 100) * segmentCount);

  gainMeterFill.innerHTML = Array.from({ length: segmentCount }, (_, index) => {
    const level = index + 1;
    const tone = level <= 5 ? "low" : level <= 9 ? "mid" : "high";
    const isActive = level <= activeSegments;

    return `<i data-tone="${tone}" data-active="${isActive}"></i>`;
  }).join("");
}

function startRigMonitor() {
  if (monitorTimer) return;

  monitorTimer = window.setInterval(async () => {
    if (isRefreshingLiveData || isCheckingRigName || !midiAccess) return;

    isCheckingRigName = true;

    try {
      // Rigwechsel prüfen
      console.time("requestCurrentRigName");
const nextRigName = await requestCurrentRigName();
console.timeEnd("requestCurrentRigName");

      if (
        nextRigName &&
        currentRigName &&
        nextRigName !== currentRigName
      ) {
		  console.log("RIG CHANGE DETECTED", performance.now());
        await refreshLiveData();
      } else {
        // Nur Effekte aktualisieren
        const effects = await requestEffectsData();
        renderEffects(effects);
      }
    } catch {
      // silent
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
  setLiveStatus("loading");
  setStatus("Kemper wird abgefragt...");

  try {
    const liveData = await requestLiveKemperData();
	console.log(liveData);
    currentRigName = liveData.rigName || currentRigName;
    rigName.textContent = liveData.rigName || "-";
    ampManufacturer.textContent = liveData.manufacturer || "-";
    ampModel.textContent = liveData.ampModel || "-";
	const ampImage = getAmpImage(
	  liveData.manufacturer,
	  liveData.ampModel,
	  liveData.ampName
	);

	ampImageContainer.innerHTML = ampImage
	  ? `<img src="/images/amps/${ampImage}" class="amp-image" />`
	  : "";
    productionYear.textContent =
	liveData.productionYear &&
	liveData.productionYear !== "Unknown"
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
    renderEffects(liveData.effects);
	console.timeEnd("refreshLiveData");
    setLiveStatus("ready");
    setStatus("Live-Daten geladen.", "ok");
    startRigMonitor();
  } catch (error) {
    setLiveStatus("idle");
    setStatus(String(error), "error");
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

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ampZoomOverlay?.dataset.open === "true") {
    closeAmpZoom();
  }
});

loadPorts();
