/**
 * Kemper Live Inspector
 *
 * Continuous bidirectional observer focused on device state:
 * Current Parameters · Watch List · Learn Mode · Change Log
 *
 * Packet recording / session capture has been removed.
 */

import {
  decodeKemperSysEx,
  ParameterStateStore
} from "./decoder/index.js";

const KEMPER_MANF = Object.freeze([0xf0, 0x00, 0x20, 0x33]);
const KEMPER_PRODUCT = 0x02;
const KEMPER_DEVICE_OMNI = 0x7f;
const KEMPER_INSTANCE = 0x00;

const FUNCTION_SYS_COMMUNICATION = 0x7e;
const PARAM_BEACON = 0x40;
const PARAM_ACTIVE_SENSING = 0x7f;

const BEACON_SET = 2;
const BEACON_LEASE = 0x7f;
const FLAG_INIT = 0x01;
const FLAG_SYSEX = 0x02;
/** When set, Kemper echoes parameters even if they were changed via MIDI IN. */
const FLAG_ECHO = 0x04;

const LEASE_REFRESH_MS = 500;
const RENDER_THROTTLE_MS = 100;
const LEARN_DURATION_MS = 5_000;
const WATCH_STORAGE_KEY = "kemper-live-inspector-watch";
let midiDebugBeaconLogged = 0;

/**
 * @param {number[]} bytes
 * @returns {string}
 */
export function formatMidiHex(bytes) {
  return bytes
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

/**
 * @param {{ init?: number, echo?: boolean }} [options]
 * @returns {number}
 */
function buildFlags(options = {}) {
  const init = options.init ? 1 : 0;
  const echo = options.echo ? 1 : 0;
  return (init ? FLAG_INIT : 0) | FLAG_SYSEX | (echo ? FLAG_ECHO : 0);
}

/**
 * @param {{ init?: number, echo?: boolean }} [options]
 * @returns {number[]}
 */
export function buildBeaconMessage(options = {}) {
  const init = options.init ? 1 : 0;
  const echo = Boolean(options.echo);
  return [
    ...KEMPER_MANF,
    KEMPER_PRODUCT,
    KEMPER_DEVICE_OMNI,
    FUNCTION_SYS_COMMUNICATION,
    KEMPER_INSTANCE,
    PARAM_BEACON,
    BEACON_SET,
    buildFlags({ init, echo }),
    BEACON_LEASE,
    0xf7
  ];
}

/**
 * @param {Uint8Array | number[]} data
 * @returns {number[] | null}
 */
function extractSysExFrame(data) {
  const bytes = Array.from(data);
  const start = bytes.indexOf(0xf0);
  const end = bytes.lastIndexOf(0xf7);
  if (start < 0 || end < 0 || end <= start) return null;
  return bytes.slice(start, end + 1);
}

/**
 * @param {number[]} frame
 * @returns {boolean}
 */
function isKemperSysEx(frame) {
  return (
    frame.length >= 7 &&
    frame[0] === 0xf0 &&
    frame[1] === 0x00 &&
    frame[2] === 0x20 &&
    frame[3] === 0x33
  );
}

/**
 * @param {number[]} frame
 * @returns {boolean}
 */
export function isActiveSensingFrame(frame) {
  return (
    isKemperSysEx(frame) &&
    frame.length >= 10 &&
    frame[6] === FUNCTION_SYS_COMMUNICATION &&
    frame[7] === KEMPER_INSTANCE &&
    frame[8] === PARAM_ACTIVE_SENSING
  );
}

/**
 * @param {number[]} frame
 * @returns {{ kind: string, sensingCounter?: number }}
 */
export function classifySysExFrame(frame) {
  if (!isKemperSysEx(frame)) return { kind: "unknown" };
  if (
    frame[6] === FUNCTION_SYS_COMMUNICATION &&
    frame[7] === KEMPER_INSTANCE &&
    frame[8] === PARAM_BEACON
  ) {
    return { kind: "beacon" };
  }
  if (isActiveSensingFrame(frame)) {
    return { kind: "sensing", sensingCounter: frame[9] ?? 0 };
  }
  return { kind: "sysex" };
}

/**
 * @returns {Set<number>}
 */
function loadWatchList() {
  try {
    const raw = localStorage.getItem(WATCH_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((id) => Number(id) & 0xffff).filter(Number.isFinite));
  } catch {
    return new Set();
  }
}

/**
 * @param {Set<number>} watchSet
 */
function saveWatchList(watchSet) {
  try {
    localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify([...watchSet]));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * @param {number} timestamp
 * @returns {string}
 */
function formatClock(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    return "—";
  }
}

/**
 * @param {number} parameterId
 * @returns {boolean}
 */
function isEffectSlotParameterId(parameterId) {
  const page = (parameterId >> 8) & 0x7f;
  const offset = parameterId & 0x7f;
  return page >= 0x32 && page <= 0x3d && (offset === 0x00 || offset === 0x03);
}

/**
 * @param {import("./decoder/decodeSysEx.js").DecodedSysEx} decoded
 * @param {ReturnType<ParameterStateStore["applyDecoded"]>} result
 * @param {number} page
 * @param {number} offset
 */
function logEffectRxDecode(decoded, result, page, offset) {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem("kompanion.effect-sync-debug") !== "1") return;

  console.log("[Effect Sync] RX → Decode", {
    parameterId: decoded.parameterIdHex,
    page: `0x${page.toString(16)}`,
    offset: `0x${offset.toString(16)}`,
    kind: offset === 0x03 ? "onOff" : "type",
    raw: decoded.value,
    functionCode: decoded.functionCode,
    stateId: result?.state?.id ?? null,
    scaled: result?.state?.scaledDisplay ?? result?.state?.scaledValue ?? null,
    changed: result?.changed,
    initial: result?.initial
  });
}

export class BidirectionalDiscovery {
  /**
   * @param {{
   *   rootElement?: HTMLElement | null,
   *   send?: (bytes: number[]) => void
   * }} [options]
   */
  constructor(options = {}) {
    this.rootElement = options.rootElement ?? null;
    this.externalSend = options.send ?? null;

    /** @type {MIDIInput | null} */
    this.input = null;
    /** @type {MIDIOutput | null} */
    this.output = null;

    this.active = false;
    this.initFlag = 1;
    /** When true, beacon requests Kemper MIDI-IN parameter echo (write → push sync). */
    this.echoEnabled = true;
    this.beaconSent = false;
    this.leaseActive = false;
    this.bidirectionalActive = false;
    this.packetsReceived = 0;
    this.lastSensingCounter = null;
    /** @type {number} */
    this.lastActivityAt = 0;
    /** @type {number} */
    this.lastParameterAt = 0;

    this.parameterState = new ParameterStateStore();
    /** @type {Set<(event: {
     *   result: ReturnType<ParameterStateStore["applyDecoded"]>,
     *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
     * }) => void>} */
    this.parameterListeners = new Set();
    /** @type {Set<number>} */
    this.watchedIds = loadWatchList();

    /** @type {import("./ProtocolResearchLab.js").ProtocolResearchLab | null} */
    this.researchLab = null;

    /** @type {false | "listening"} */
    this.learnMode = false;
    /** @type {Map<number, any> | null} */
    this.learnSnapshot = null;
    /** @type {Array<any>} */
    this.learnResults = [];
    /** @type {boolean} */
    this.learnFinished = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.learnTimer = null;

    /** @type {ReturnType<typeof setInterval> | null} */
    this.leaseTimer = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.renderTimer = null;
    this.renderQueued = false;

    this.boundOnMidiMessage = (event) => this.handleMidiMessage(event);
    this.boundRootClick = (event) => this.handleRootClick(event);

    this.bindDom();
    this.bindControls();
    this.renderAll();
  }

  bindDom() {
    const root = this.rootElement;
    if (!root) return;

    this.statusBeaconEl = root.querySelector("[data-bidi-status='beacon']");
    this.statusLeaseEl = root.querySelector("[data-bidi-status='lease']");
    this.statusModeEl = root.querySelector("[data-bidi-status='mode']");
    this.sensingEl = root.querySelector("[data-bidi-sensing]");
    this.paramCountEl = root.querySelector("[data-bidi-param-count]");
    this.learnButton = root.querySelector("[data-bidi-action='learn']");
    this.resetStateButton = root.querySelector("[data-bidi-action='clear-state']");
    this.clearLogButton = root.querySelector("[data-bidi-action='clear-changelog']");
    this.learnPanelEl = root.querySelector("[data-bidi-learn-panel]");
    this.learnPromptEl = root.querySelector("[data-bidi-learn-prompt]");
    this.learnResultsEl = root.querySelector("[data-bidi-learn-results]");
    this.currentParamsBodyEl = root.querySelector("[data-bidi-current-params]");
    this.watchedBodyEl = root.querySelector("[data-bidi-watched-params]");
    this.changeLogBodyEl = root.querySelector("[data-bidi-change-log]");
  }

  bindControls() {
    const root = this.rootElement;
    if (!root) return;

    root.addEventListener("click", this.boundRootClick);

    this.learnButton?.addEventListener("click", () => {
      if (this.learnMode) this.stopLearnMode();
      else this.startLearnMode();
    });

    this.resetStateButton?.addEventListener("click", () => {
      this.parameterState.clear();
      this.learnResults = [];
      this.learnFinished = false;
      this.researchLab?.clearSelection?.();
      this.queueRender();
    });

    this.clearLogButton?.addEventListener("click", () => {
      this.parameterState.clearChangeLog();
      this.queueRender();
    });
  }

  /**
   * @param {MouseEvent} event
   */
  handleRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const watchButton = target.closest("[data-bidi-watch]");
    if (watchButton instanceof HTMLElement) {
      const id = Number(watchButton.dataset.bidiWatch);
      if (Number.isFinite(id)) {
        this.toggleWatch(id);
      }
    }
  }

  /**
   * @param {number} id
   */
  toggleWatch(id) {
    const normalized = id & 0xffff;
    if (this.watchedIds.has(normalized)) this.watchedIds.delete(normalized);
    else this.watchedIds.add(normalized);
    saveWatchList(this.watchedIds);
    this.queueRender();
  }

  /**
   * Subscribe to decoded parameter state updates (push + any applied SysEx).
   * Used by the live stage UI for hybrid sync — Live Inspector remains independent.
   *
   * @param {(event: {
   *   result: ReturnType<ParameterStateStore["applyDecoded"]>,
   *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
   * }) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.parameterListeners.add(listener);
    return () => {
      this.parameterListeners.delete(listener);
    };
  }

  /**
   * Attach the isolated Protocol Research Lab (write tests only).
   * @param {import("./ProtocolResearchLab.js").ProtocolResearchLab | null} lab
   */
  attachResearchLab(lab) {
    this.researchLab = lab;
    this.queueRender();
  }

  /**
   * Research-only SysEx send path. Never used by Live Companion production controls.
   * @param {number[]} bytes
   * @returns {boolean}
   */
  sendResearchSysEx(bytes) {
    if (!Array.isArray(bytes) || !bytes.length) return false;
    try {
      if (this.externalSend) {
        this.externalSend(bytes);
        return true;
      }
      if (!this.output) return false;
      this.output.send(bytes);
      return true;
    } catch (error) {
      console.warn(
        "[Protocol Research Lab] SysEx send failed:",
        error?.message || error
      );
      return false;
    }
  }

  /**
   * @returns {boolean}
   */
  isBidirectionalModeActive() {
    return Boolean(this.active && this.bidirectionalActive && this.leaseActive);
  }

  /**
   * @param {number} [maxAgeMs]
   * @returns {boolean}
   */
  isReceivingTraffic(maxAgeMs = 5000) {
    if (!this.lastActivityAt) return false;
    return Date.now() - this.lastActivityAt <= maxAgeMs;
  }

  /**
   * @param {number} id
   * @returns {import("./decoder/parameterState.js").ParameterState | null}
   */
  getParameter(id) {
    return this.parameterState.current.get(id & 0xffff) ?? null;
  }

  /**
   * @param {ReturnType<ParameterStateStore["applyDecoded"]>} result
   * @param {import("./decoder/decodeSysEx.js").DecodedSysEx} decoded
   */
  notifyParameterListeners(result, decoded) {
    if (!this.parameterListeners.size) return;
    for (const listener of this.parameterListeners) {
      try {
        listener({ result, decoded });
      } catch (error) {
        console.warn("[Live Companion] Bidirectional parameter listener failed:", error);
      }
    }
  }

  /**
   * @param {MIDIInput} input
   * @param {MIDIOutput} output
   */
  start(input, output) {
    if (this.active && this.input === input && this.output === output) {
      return;
    }

    this.stopTransport();

    this.input = input;
    this.output = output;
    this.active = true;
    this.initFlag = 1;
    this.beaconSent = false;
    this.leaseActive = false;
    this.bidirectionalActive = false;
    this.packetsReceived = 0;
    this.lastSensingCounter = null;
    this.lastActivityAt = 0;
    this.lastParameterAt = 0;
    this.parameterState.clear();
    this.learnResults = [];
    this.learnFinished = false;
    this.cancelLearnTimer();
    this.learnMode = false;
    this.learnSnapshot = null;
    this.researchLab?.clearSelection?.();

    this.input.addEventListener("midimessage", this.boundOnMidiMessage);
    console.log("[MIDI DEBUG] discovery start", {
      listener: "midimessage registered",
      input: input?.name ?? input?.id ?? null,
      output: output?.name ?? output?.id ?? null
    });
    this.sendBeacon({ reason: "start" });
    this.leaseTimer = window.setInterval(() => {
      this.sendBeacon({ reason: "lease-refresh" });
    }, LEASE_REFRESH_MS);

    this.queueRender();
  }

  stop() {
    this.stopTransport();
    this.cancelLearnTimer();
    this.active = false;
    this.leaseActive = false;
    this.bidirectionalActive = false;
    this.lastActivityAt = 0;
    this.lastParameterAt = 0;
    this.learnMode = false;
    this.learnSnapshot = null;
    this.queueRender();
  }

  stopTransport() {
    if (this.leaseTimer != null) {
      window.clearInterval(this.leaseTimer);
      this.leaseTimer = null;
    }
    if (this.input) {
      this.input.removeEventListener("midimessage", this.boundOnMidiMessage);
    }
    this.input = null;
    this.output = null;
  }

  /**
   * @param {{ reason?: string }} [options]
   */
  sendBeacon(options = {}) {
    if (!this.output && !this.externalSend) return;
    const init = this.initFlag ? 1 : 0;
    const bytes = buildBeaconMessage({
      init,
      echo: this.echoEnabled
    });

    try {
      if (this.externalSend) this.externalSend(bytes);
      else this.output.send(bytes);
      this.beaconSent = true;
    } catch {
      this.beaconSent = false;
    }

    if (options.reason !== "lease-refresh" || midiDebugBeaconLogged < 3) {
      if (options.reason === "lease-refresh") midiDebugBeaconLogged += 1;
      console.log("[MIDI DEBUG] beacon sent", {
        reason: options.reason || "unspecified",
        ok: this.beaconSent,
        init,
        hex: bytes
          .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
          .join(" ")
      });
    }

    void options;
    this.queueRender();
  }

  /**
   * Toggle Kemper MIDI-IN parameter echo (FLAG_ECHO). Used by Effect Type Discovery.
   * @param {boolean} enabled
   */
  setParameterEchoEnabled(enabled) {
    this.echoEnabled = Boolean(enabled);
    if (this.active) {
      this.sendBeacon({ reason: enabled ? "echo-on" : "echo-off" });
    }
  }

  /**
   * @param {MIDIMessageEvent} event
   */
  handleMidiMessage(event) {
    if (!this.active) return;

    const frame = extractSysExFrame(event.data);
    if (!frame) return;

    this.packetsReceived += 1;
    this.lastActivityAt = Date.now();

    if (isActiveSensingFrame(frame)) {
      this.lastSensingCounter = frame[9] ?? 0;
      this.leaseActive = true;
      this.bidirectionalActive = true;
      this.onValidResponse();
      this.queueRender();
      return;
    }

    if (!isKemperSysEx(frame)) return;

    this.bidirectionalActive = true;
    this.onValidResponse();

    const decoded = decodeKemperSysEx(frame);
    const result = this.parameterState.applyDecoded(decoded);

    // TEMP debug — Gain receive / decode path (0x0A04)
    if (decoded?.parameterId === 0x0a04) {
      const scaled =
        result?.state?.scaledDisplay ??
        result?.state?.scaledValue ??
        null;
      console.log("[Gain Debug] RX Gain", {
        raw: decoded.value,
        decoded: scaled,
        functionCode: decoded.functionCode,
        parameterIdHex: decoded.parameterIdHex,
        applyChanged: result?.changed,
        applyInitial: result?.initial,
        hasState: Boolean(result?.state),
        willNotifyListeners: Boolean(result?.state)
      });
    }

    if (decoded?.parameterId != null && isEffectSlotParameterId(decoded.parameterId)) {
      const page = (decoded.parameterId >> 8) & 0x7f;
      const offset = decoded.parameterId & 0x7f;
      logEffectRxDecode(decoded, result, page, offset);
    }

    // Notify on any addressed parameter response (even without a full state
    // entry) so research tools like Parameter Census can observe responders.
    if (decoded.parameterId != null) {
      if (result.state) this.lastParameterAt = Date.now();
      this.notifyParameterListeners(result, decoded);
    }
    this.queueRender();
  }

  onValidResponse() {
    if (!this.initFlag) return;
    this.initFlag = 0;
    this.sendBeacon({ reason: "init-clear" });
  }

  startLearnMode() {
    this.learnSnapshot = this.parameterState.createSnapshot();
    this.learnResults = [];
    this.learnFinished = false;
    this.learnMode = "listening";
    this.cancelLearnTimer();
    this.learnTimer = window.setTimeout(() => {
      this.stopLearnMode();
    }, LEARN_DURATION_MS);
    this.queueRender();
  }

  stopLearnMode() {
    this.cancelLearnTimer();
    if (this.learnMode && this.learnSnapshot) {
      this.learnResults = this.parameterState.diffAgainstSnapshot(
        this.learnSnapshot
      );
      this.learnFinished = true;
    }
    this.learnMode = false;
    this.learnSnapshot = null;
    this.queueRender();
  }

  cancelLearnTimer() {
    if (this.learnTimer != null) {
      window.clearTimeout(this.learnTimer);
      this.learnTimer = null;
    }
  }

  queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    this.renderTimer = window.setTimeout(() => {
      this.renderQueued = false;
      this.renderTimer = null;
      this.renderAll();
    }, RENDER_THROTTLE_MS);
  }

  renderAll() {
    this.renderStatus();
    this.renderLearn();
    this.renderCurrentParameters();
    this.renderWatched();
    this.renderChangeLog();
  }

  renderStatus() {
    const mark = (el, ok, labelOk, labelPending) => {
      if (!el) return;
      el.dataset.state = ok ? "ok" : "pending";
      el.textContent = ok ? `✔ ${labelOk}` : `○ ${labelPending}`;
    };

    mark(this.statusBeaconEl, this.beaconSent, "Beacon Sent", "Beacon Pending");
    mark(this.statusLeaseEl, this.leaseActive, "Lease Active", "Lease Waiting");
    mark(
      this.statusModeEl,
      this.bidirectionalActive,
      "Bidirectional Mode Active",
      "Bidirectional Mode Idle"
    );

    if (this.sensingEl) {
      this.sensingEl.textContent =
        this.lastSensingCounter == null ? "—" : String(this.lastSensingCounter);
    }

    if (this.paramCountEl) {
      this.paramCountEl.textContent = String(
        this.parameterState.listCurrent().length
      );
    }

    if (this.learnButton) {
      this.learnButton.textContent = this.learnMode
        ? "Stop Learn"
        : "Learn Mode";
      this.learnButton.dataset.state = this.learnMode ? "active" : "idle";
    }

    if (this.rootElement) {
      this.rootElement.dataset.active = this.active ? "true" : "false";
      this.rootElement.dataset.learn = this.learnMode ? "true" : "false";
      this.rootElement.dataset.init = String(this.initFlag);
    }
  }

  renderLearn() {
    if (!this.learnPanelEl) return;

    const learning = Boolean(this.learnMode);
    const hasResults = this.learnResults.length > 0;
    const showPanel = learning || this.learnFinished;
    this.learnPanelEl.hidden = !showPanel;

    if (this.learnPromptEl) {
      this.learnPromptEl.hidden = !learning;
      this.learnPromptEl.textContent = learning
        ? "Move exactly one control on the Kemper…"
        : "";
    }

    if (!this.learnResultsEl) return;

    if (learning) {
      this.learnResultsEl.innerHTML =
        `<p class="bidirectional-learn-waiting">Listening for changes (auto-stops in 5s)…</p>`;
      return;
    }

    if (!this.learnFinished) {
      this.learnResultsEl.innerHTML = "";
      return;
    }

    if (!hasResults) {
      this.learnResultsEl.innerHTML =
        `<p class="bidirectional-learn-waiting">No changes detected.</p>`;
      return;
    }

    this.learnResultsEl.innerHTML = `
      <h4 class="bidirectional-learn-title">Changed Parameters</h4>
      <ul class="bidirectional-learn-list">
        ${this.learnResults
          .map(
            (row) => `<li>
              <strong>${escapeHtml(row.name)}</strong>
              <span class="bidirectional-param-id">${escapeHtml(row.idHex)}</span>
              <div class="bidirectional-learn-change">
                <span>Raw: ${escapeHtml(row.oldRaw)} → ${escapeHtml(row.newRaw)}</span>
                <span>${escapeHtml(row.oldValue)} → ${escapeHtml(row.newValue)}</span>
              </div>
            </li>`
          )
          .join("")}
      </ul>`;
  }

  /**
   * @param {import("./decoder/parameterState.js").ParameterState} row
   * @param {{ showWatch?: boolean }} [options]
   */
  renderParameterRow(row, options = {}) {
    const watched = this.watchedIds.has(row.id);
    const watchLabel = watched ? "★" : "☆";
    const watchTitle = watched ? "Remove from Watch List" : "Add to Watch List";
    const selectedForResearch = this.researchLab?.getSelectedId?.() === row.id;
    const researchTitle = selectedForResearch
      ? "Selected in Protocol Research Lab"
      : "Select for Protocol Research Lab";
    const rawDisplay =
      row.ascii != null && row.ascii !== ""
        ? escapeHtml(row.ascii)
        : row.rawValue == null
          ? "—"
          : escapeHtml(String(row.rawValue));

    const watchCell = options.showWatch !== false
      ? `<button
           type="button"
           class="bidirectional-watch-toggle ${watched ? "is-watched" : ""}"
           data-bidi-watch="${row.id}"
           title="${watchTitle}"
           aria-pressed="${watched ? "true" : "false"}"
         >${watchLabel}</button>`
      : "";

    const researchCell =
      options.showResearch !== false
        ? `<button
             type="button"
             class="bidirectional-research-select ${selectedForResearch ? "is-selected" : ""}"
             data-bidi-research="${row.id}"
             title="${researchTitle}"
             aria-pressed="${selectedForResearch ? "true" : "false"}"
           >Lab</button>`
        : "";

    return `<tr data-status="${escapeHtml(row.status)}" ${selectedForResearch ? 'data-research-selected="true"' : ""}>
      <td class="bidirectional-col-watch">${watchCell}</td>
      <td class="bidirectional-col-research">${researchCell}</td>
      <td>
        <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
        <div class="bidirectional-param-meta">
          <code class="bidirectional-param-id">ID: ${escapeHtml(row.idHex)}</code>
          <span class="bidirectional-param-category">${escapeHtml(row.category)}</span>
        </div>
      </td>
      <td>${escapeHtml(row.type)}</td>
      <td class="bidirectional-param-raw">${rawDisplay}</td>
      <td class="bidirectional-param-value">${escapeHtml(row.scaledDisplay)}</td>
      <td class="bidirectional-param-time">${formatClock(row.updatedAt)}</td>
      <td><span class="bidirectional-status-pill" data-status="${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td>
    </tr>`;
  }

  renderCurrentParameters() {
    if (!this.currentParamsBodyEl) return;
    const rows = this.parameterState.listCurrent();
    if (!rows.length) {
      this.currentParamsBodyEl.innerHTML = `<tr class="bidirectional-analyzer-empty-row"><td colspan="8">Waiting for parameter traffic…</td></tr>`;
      return;
    }
    this.currentParamsBodyEl.innerHTML = rows
      .map((row) => this.renderParameterRow(row))
      .join("");
  }

  renderWatched() {
    if (!this.watchedBodyEl) return;
    const rows = this.parameterState.listWatched(this.watchedIds);
    if (!this.watchedIds.size) {
      this.watchedBodyEl.innerHTML = `<tr class="bidirectional-analyzer-empty-row"><td colspan="8">Pin parameters with ☆ to watch them here.</td></tr>`;
      return;
    }
    if (!rows.length) {
      this.watchedBodyEl.innerHTML = `<tr class="bidirectional-analyzer-empty-row"><td colspan="8">Watched IDs are pinned — values appear when traffic arrives.</td></tr>`;
      return;
    }
    this.watchedBodyEl.innerHTML = rows
      .map((row) => this.renderParameterRow(row))
      .join("");
  }

  renderChangeLog() {
    if (!this.changeLogBodyEl) return;
    const rows = this.parameterState.listChanges();
    if (!rows.length) {
      this.changeLogBodyEl.innerHTML = `<tr class="bidirectional-analyzer-empty-row"><td colspan="3">No value changes yet.</td></tr>`;
      return;
    }

    this.changeLogBodyEl.innerHTML = rows
      .map(
        (row) => `<tr>
          <td class="bidirectional-param-time">${formatClock(row.at)}</td>
          <td>
            <div class="bidirectional-param-name">${escapeHtml(row.name)}</div>
            <code class="bidirectional-param-id">${escapeHtml(row.idHex)}</code>
          </td>
          <td class="bidirectional-change-values">
            <span class="bidirectional-change-old">${escapeHtml(row.oldValue)}</span>
            <span class="bidirectional-change-arrow">→</span>
            <span class="bidirectional-change-new">${escapeHtml(row.newValue)}</span>
          </td>
        </tr>`
      )
      .join("");
  }
}

/**
 * @param {HTMLElement | null} [rootElement]
 * @returns {BidirectionalDiscovery}
 */
export function initializeBidirectionalDiscovery(rootElement) {
  return new BidirectionalDiscovery({
    rootElement:
      rootElement ?? document.querySelector("#bidirectionalMonitor")
  });
}
