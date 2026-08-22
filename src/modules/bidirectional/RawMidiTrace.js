/**
 * Temporary RAW MIDI TRACE — earliest receive point after Web MIDI input.
 *
 * Does not change Beacon, Gain, Effect Sync, Performance Library, or mapping.
 * Attaches its own midimessage listener; it does not alter other handlers.
 */

import { decodeKemperSysEx } from "./decoder/decodeSysEx.js";
import { describeFunctionCode } from "./decoder/functionCodes.js";
import {
  formatByteHex,
  formatExtendedAddressHex,
  isExtendedFunction,
  unpackKemperUint32
} from "./decoder/decodeExtended.js";

const MAX_ROWS = 800;
const KEMPER_MANF = [0xf0, 0x00, 0x20, 0x33];
const WATCH_ADDR_MIN = 0x4000;
const WATCH_ADDR_MAX = 0x4015;

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
 * @param {number[] | Uint8Array} bytes
 * @returns {string}
 */
function formatHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

/**
 * @param {number} timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  try {
    return `${date.toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}.${ms}`;
  } catch {
    return `${date.toISOString()}`;
  }
}

/**
 * @param {number} byte
 * @returns {string}
 */
function formatByte(byte) {
  if (!Number.isFinite(byte)) return "—";
  return (byte & 0xff).toString(16).toUpperCase().padStart(2, "0");
}

/**
 * @param {number} value
 * @returns {boolean}
 */
function isWatchAddress(value) {
  return Number.isFinite(value) && value >= WATCH_ADDR_MIN && value <= WATCH_ADDR_MAX;
}

/**
 * Layout probe only — does not assume Function 5/6/7.
 *
 * @param {number[] | null} frame
 */
function analyzeRawLayout(frame) {
  const indexedBytes = [];
  for (let index = 7; index <= 12; index += 1) {
    const present = Array.isArray(frame) && index < frame.length - 1;
    const value = present ? frame[index] & 0xff : null;
    indexedBytes.push({
      index,
      hex: present ? formatByte(value) : "—",
      dec: present ? String(value) : "—"
    });
  }

  let candidate8to12 = null;
  if (Array.isArray(frame) && frame.length >= 14) {
    const addressBytes = frame.slice(8, 13);
    const value = unpackKemperUint32(addressBytes, 0);
    candidate8to12 = {
      startIndex: 8,
      endIndex: 12,
      bytesHex: formatByteHex(addressBytes),
      value,
      valueHex: value != null ? formatExtendedAddressHex(value) : "—",
      valueDec: value != null ? String(value) : "—",
      payloadHex: formatByteHex(frame.slice(13, frame.length - 1)) || "—",
      inWatchRange: isWatchAddress(value)
    };
  }

  /** @type {Array<Record<string, unknown>>} */
  const watchHits = [];
  if (Array.isArray(frame) && frame.length >= 6) {
    const lastData = frame.length - 1;
    for (let startIndex = 0; startIndex <= lastData - 5; startIndex += 1) {
      const addressBytes = frame.slice(startIndex, startIndex + 5);
      const value = unpackKemperUint32(addressBytes, 0);
      if (!isWatchAddress(value)) continue;
      watchHits.push({
        startIndex,
        endIndex: startIndex + 4,
        bytesHex: formatByteHex(addressBytes),
        value,
        valueHex: formatExtendedAddressHex(value),
        valueDec: String(value),
        payloadHex: formatByteHex(frame.slice(startIndex + 5, frame.length - 1)) || "—"
      });
    }
  }

  return { indexedBytes, candidate8to12, watchHits };
}

/**
 * Reproduce BidirectionalDiscovery + Extended Capture filters without changing them.
 *
 * @param {number[]} bytes
 * @returns {{
 *   isSysex: boolean,
 *   dropped: boolean,
 *   dropReason: string | null,
 *   functionCode: number | null,
 *   functionDisplay: string | null,
 *   frame: number[] | null,
 *   frameLength: number | null,
 *   steps: string[],
 *   highlight: boolean
 * }}
 */
function annotateReceivePath(bytes) {
  /** @type {string[]} */
  const steps = [];
  const base = {
    isSysex: false,
    dropped: false,
    dropReason: null,
    functionCode: null,
    functionDisplay: null,
    frame: null,
    frameLength: null,
    steps,
    highlight: false
  };

  if (!bytes.length) {
    steps.push("DROPPED");
    steps.push("reason: empty MIDI event");
    return { ...base, dropped: true, dropReason: "empty MIDI event" };
  }

  const start = bytes.indexOf(0xf0);
  const end = bytes.lastIndexOf(0xf7);

  if (start < 0) {
    steps.push("not SysEx — SysEx receive path ignores this event");
    return {
      ...base,
      dropped: true,
      dropReason: `not SysEx (status 0x${(bytes[0] & 0xff).toString(16).toUpperCase().padStart(2, "0")})`
    };
  }

  steps.push("RAW RX");
  base.isSysex = true;

  if (end < 0 || end <= start) {
    steps.push("DROPPED");
    steps.push("reason: incomplete SysEx (missing F7)");
    return {
      ...base,
      dropped: true,
      dropReason: "incomplete SysEx (missing F7)",
      frame: bytes.slice(start),
      frameLength: bytes.length - start
    };
  }

  const frame = bytes.slice(start, end + 1);
  base.frame = frame;
  base.frameLength = frame.length;
  steps.push("accepted: F0…F7 frame extracted (no max-length filter)");

  if (
    frame.length < 7 ||
    frame[1] !== KEMPER_MANF[1] ||
    frame[2] !== KEMPER_MANF[2] ||
    frame[3] !== KEMPER_MANF[3]
  ) {
    steps.push("DROPPED");
    steps.push("reason: manufacturer filter (not F0 00 20 33)");
    return {
      ...base,
      dropped: true,
      dropReason: "manufacturer filter (not F0 00 20 33)"
    };
  }

  steps.push("accepted by manufacturer filter (F0 00 20 33)");

  if (frame.length >= 6) {
    const product = frame[4] & 0xff;
    const device = frame[5] & 0xff;
    steps.push(
      `no product/device filter (product 0x${product.toString(16).toUpperCase().padStart(2, "0")}, device 0x${device.toString(16).toUpperCase().padStart(2, "0")})`
    );
  }

  if (frame.length < 8) {
    steps.push("DROPPED");
    steps.push("reason: unsupported message length (< 8, no function byte)");
    return {
      ...base,
      dropped: true,
      dropReason: "unsupported message length (< 8)"
    };
  }

  const functionCode = frame[6] & 0xff;
  const fn = describeFunctionCode(functionCode);
  base.functionCode = functionCode;
  base.functionDisplay = fn.display;
  steps.push("no function-code whitelist in BidirectionalDiscovery — unknown functions are not dropped there");

  const isSensing =
    functionCode === 0x7e &&
    frame.length >= 10 &&
    (frame[7] & 0xff) === 0x00 &&
    (frame[8] & 0xff) === 0x7f;

  if (isSensing) {
    steps.push("BidirectionalDiscovery: handled as Active Sensing — not passed to parameter decoder");
    steps.push("Extended Parameter Capture: skipped (not function 0x05 / 0x06 / 0x07)");
    return base;
  }

  steps.push("passed to decoder");
  const decoded = decodeKemperSysEx(frame);

  if (isExtendedFunction(functionCode)) {
    base.highlight = true;
    steps.push(
      `decoder: extended 5-byte address ${decoded.addressHex || "—"} (parameterId left null, not truncated)`
    );
    if (decoded.ascii && decoded.hasReadableAscii) {
      steps.push(`decoder string: ${decoded.ascii}`);
    }
    steps.push("BidirectionalDiscovery: NOT forwarded to live parameter listeners (no 2-byte parameterId)");
    steps.push("Extended Parameter Capture: accepted if that capture is running");
    return base;
  }

  if (decoded.parameterId != null) {
    steps.push(`decoder produced parameter ${decoded.parameterIdHex}`);
    if (decoded.ascii && decoded.hasReadableAscii) {
      steps.push(`decoder string: ${decoded.ascii}`);
    }
    steps.push("BidirectionalDiscovery: forwarded to parameter listeners");
  } else {
    steps.push("decoder produced no 2-byte parameterId");
    steps.push("BidirectionalDiscovery: not forwarded to live parameter listeners");
  }

  steps.push("Extended Parameter Capture: skipped (not function 0x05 / 0x06 / 0x07)");
  return base;
}

function logTraceToConsole(row) {
  const lines = [
    "RAW RX",
    row.rawHex || "(no frame)",
    `Length: ${row.frameLength ?? row.rawLength ?? "—"}`,
    `Function: ${row.functionByteHex || row.functionDisplay || "—"}`,
    `Timestamp: ${row.timestampLabel}`
  ];
  if (Array.isArray(row.indexedBytes) && row.indexedBytes.length) {
    lines.push(
      "Bytes 7–12: " +
        row.indexedBytes
          .map((item) => `[${item.index}]=${item.hex}`)
          .join(" ")
    );
  }
  if (row.candidate8to12) {
    lines.push(
      `Possible address bytes 8–12: ${row.candidate8to12.bytesHex} → ${row.candidate8to12.valueHex} (${row.candidate8to12.valueDec})`
    );
    lines.push(`Payload after byte 12: ${row.candidate8to12.payloadHex}`);
  }
  if (Array.isArray(row.watchHits) && row.watchHits.length) {
    for (const hit of row.watchHits) {
      lines.push(
        `Possible $4000+ at bytes ${hit.startIndex}–${hit.endIndex}: ${hit.bytesHex} → ${hit.valueHex} (${hit.valueDec})`
      );
    }
  }
  for (const step of row.steps) {
    lines.push(`→ ${step}`);
  }
  if (row.hasPossible4000) {
    console.info(`[RAW MIDI TRACE] $4000+\n${lines.join("\n")}`);
  } else if (row.dropped && row.isSysex) {
    console.warn(`[RAW MIDI TRACE] DROPPED\n${lines.join("\n")}`);
  } else {
    console.log(`[RAW MIDI TRACE]\n${lines.join("\n")}`);
  }
}

export class RawMidiTrace {
  /**
   * @param {{
   *   rootElement?: HTMLElement | null,
   *   discovery?: import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null,
   *   ensureMidi?: () => Promise<unknown>
   * }} [options]
   */
  constructor(options = {}) {
    this.rootElement =
      options.rootElement ?? document.querySelector("[data-raw-midi-trace]");
    this.discovery = options.discovery ?? null;
    this.ensureMidi = options.ensureMidi ?? (async () => {});

    this.tracing = false;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.elapsedTimer = null;
    this.startedAt = 0;

    /** @type {Array<Record<string, unknown>>} */
    this.rows = [];
    this.totalEvents = 0;
    this.sysexCount = 0;
    this.droppedSysexCount = 0;
    this.extendedCount = 0;
    this.possible4000Count = 0;
    /** @type {Record<string, number>} */
    this.functionCounts = Object.create(null);
    this.summaryText = "";
    /** @type {"all" | "4000" | "05" | "06" | "07"} */
    this.filter = "all";

    /** @type {((event: MIDIMessageEvent) => void) | null} */
    this.boundOnMessage = null;
    /** @type {MIDIInput | null} */
    this.input = null;

    this.bindDom();
    this.bindControls();
    this.render();
  }

  bindDom() {
    const root = this.rootElement;
    if (!root) return;
    this.startButton = root.querySelector("[data-raw-trace-start]");
    this.stopButton = root.querySelector("[data-raw-trace-stop]");
    this.clearButton = root.querySelector("[data-raw-trace-clear]");
    this.progressEl = root.querySelector("[data-raw-trace-progress]");
    this.summaryEl = root.querySelector("[data-raw-trace-summary]");
    this.statsEl = root.querySelector("[data-raw-trace-stats]");
    this.feedEl = root.querySelector("[data-raw-trace-feed]");
    this.filterRoot = root.querySelector("[data-raw-trace-filters]");
  }

  bindControls() {
    this.startButton?.addEventListener("click", () => {
      void this.startTrace();
    });
    this.stopButton?.addEventListener("click", () => {
      this.stopTrace();
    });
    this.clearButton?.addEventListener("click", () => {
      this.clearResults();
    });
    this.filterRoot?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-raw-trace-filter]");
      if (!button) return;
      this.filter = button.getAttribute("data-raw-trace-filter") || "all";
      this.syncFilterButtons();
      this.renderFeed();
    });
  }

  setTracing(active) {
    this.tracing = active;
    if (this.startButton) this.startButton.disabled = active;
    if (this.stopButton) this.stopButton.disabled = !active;
    if (this.clearButton) this.clearButton.disabled = active;
  }

  setProgress(text) {
    if (this.progressEl) this.progressEl.textContent = text;
  }

  clearResults() {
    if (this.tracing) return;
    this.rows = [];
    this.totalEvents = 0;
    this.sysexCount = 0;
    this.droppedSysexCount = 0;
    this.extendedCount = 0;
    this.possible4000Count = 0;
    this.functionCounts = Object.create(null);
    this.summaryText = "";
    this.render();
  }

  async startTrace() {
    if (this.tracing) return;
    await this.ensureMidi();
    const input = this.discovery?.input ?? null;
    if (!input) {
      this.summaryText =
        "MIDI input not available — connect Kemper MIDI, then start the trace.";
      this.render();
      return;
    }

    this.rows = [];
    this.totalEvents = 0;
    this.sysexCount = 0;
    this.droppedSysexCount = 0;
    this.extendedCount = 0;
    this.possible4000Count = 0;
    this.functionCounts = Object.create(null);
    this.summaryText = "";
    this.startedAt = Date.now();
    this.input = input;
    this.setTracing(true);

    this.boundOnMessage = (event) => this.handleIncomingMessage(event);
    input.addEventListener("midimessage", this.boundOnMessage);

    this.elapsedTimer = window.setInterval(() => {
      if (!this.tracing) return;
      const elapsedSec = Math.floor((Date.now() - this.startedAt) / 1000);
      this.setProgress(
        `Tracing… ${elapsedSec}s · ${this.sysexCount} SysEx · ${this.possible4000Count} possible $4000+ · fn 5/6/7: ${this.extendedCount} — change Performance/Slot, then Stop.`
      );
    }, 250);

    this.setProgress(
      "Tracing raw MIDI… change Performance or Slot on the Kemper, then Stop."
    );
    this.render();
  }

  stopTrace() {
    if (!this.tracing) return;
    if (this.input && this.boundOnMessage) {
      this.input.removeEventListener("midimessage", this.boundOnMessage);
    }
    this.boundOnMessage = null;
    this.input = null;
    if (this.elapsedTimer != null) {
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.tracing = false;
    this.setTracing(false);
    this.summaryText = this.buildSummary();
    this.setProgress("Trace stopped — review every SysEx and filter reason below.");
    this.render();
  }

  /**
   * @param {MIDIMessageEvent} event
   */
  handleIncomingMessage(event) {
    const bytes = Array.from(event.data || []);
    this.totalEvents += 1;
    const annotated = annotateReceivePath(bytes);
    if (!annotated.isSysex) return;

    const layout = analyzeRawLayout(annotated.frame);
    const hasPossible4000 = layout.watchHits.length > 0;
    const functionCode = annotated.functionCode;

    this.sysexCount += 1;
    if (annotated.dropped) this.droppedSysexCount += 1;
    if (functionCode === 0x05 || functionCode === 0x06 || functionCode === 0x07) {
      this.extendedCount += 1;
    }
    if (hasPossible4000) this.possible4000Count += 1;
    if (annotated.functionDisplay) {
      const key = annotated.functionDisplay;
      this.functionCounts[key] = (this.functionCounts[key] || 0) + 1;
    }

    const timestamp = Date.now();
    const row = {
      timestamp,
      timestampLabel: formatTimestamp(timestamp),
      rawHex: annotated.frame ? formatHex(annotated.frame) : formatHex(bytes),
      rawLength: bytes.length,
      frameLength: annotated.frameLength,
      functionCode,
      functionByteHex:
        functionCode != null
          ? `0x${functionCode.toString(16).toUpperCase().padStart(2, "0")}`
          : "—",
      functionDisplay: annotated.functionDisplay,
      dropped: annotated.dropped,
      dropReason: annotated.dropReason,
      highlight: hasPossible4000,
      hasPossible4000,
      isSysex: annotated.isSysex,
      steps: annotated.steps,
      indexedBytes: layout.indexedBytes,
      candidate8to12: layout.candidate8to12,
      watchHits: layout.watchHits
    };

    this.rows.push(row);
    if (this.rows.length > MAX_ROWS) this.rows.shift();

    logTraceToConsole(row);
    this.renderLive();
  }

  buildSummary() {
    const fnCounts = Object.entries(this.functionCounts)
      .sort((left, right) => right[1] - left[1])
      .map(([label, count]) => `${label}×${count}`)
      .join(", ");

    return [
      `MIDI events: ${this.totalEvents}. SysEx: ${this.sysexCount}. Dropped SysEx: ${this.droppedSysexCount}. Function 0x05/0x06/0x07: ${this.extendedCount}. Possible $4000–$4015 in raw bytes: ${this.possible4000Count}.`,
      fnCounts ? `Functions: ${fnCounts}.` : "No SysEx functions counted.",
      this.possible4000Count
        ? "At least one raw 5-byte window unpacked to $00004000–$00004015."
        : "No 5-byte window in the raw frames unpacked to $00004000–$00004015."
    ].join(" ");
  }

  /**
   * @param {Record<string, unknown>} row
   * @returns {boolean}
   */
  matchesFilter(row) {
    if (this.filter === "4000") return Boolean(row.hasPossible4000);
    if (this.filter === "05") return row.functionCode === 0x05;
    if (this.filter === "06") return row.functionCode === 0x06;
    if (this.filter === "07") return row.functionCode === 0x07;
    return true;
  }

  syncFilterButtons() {
    if (!this.filterRoot) return;
    this.filterRoot.querySelectorAll("[data-raw-trace-filter]").forEach((button) => {
      const active = button.getAttribute("data-raw-trace-filter") === this.filter;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  renderLive() {
    this.renderStats();
    this.renderFeed();
    this.syncFilterButtons();
  }

  renderStats() {
    if (!this.statsEl) return;
    const fnCounts = Object.entries(this.functionCounts)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, count]) => `${label}:${count}`);
    this.statsEl.textContent = fnCounts.length
      ? `SysEx ${this.sysexCount} · $4000+ ${this.possible4000Count} · fn 5/6/7 ${this.extendedCount} · dropped ${this.droppedSysexCount} · ${fnCounts.join("  ")}`
      : this.tracing
        ? "Waiting for SysEx…"
        : "No SysEx yet.";
  }

  renderFeed() {
    if (!this.feedEl) return;
    const visible = this.rows.filter((row) => this.matchesFilter(row));
    if (!this.rows.length) {
      this.feedEl.innerHTML = `<p class="research-lab-muted">${escapeHtml(
        this.tracing ? "Waiting for SysEx…" : "No SysEx captured yet."
      )}</p>`;
      return;
    }
    if (!visible.length) {
      this.feedEl.innerHTML = `<p class="research-lab-muted">${escapeHtml(
        "No messages match this filter."
      )}</p>`;
      return;
    }

    this.feedEl.innerHTML = visible
      .map((row) => this.renderCard(row, this.rows.indexOf(row) + 1))
      .join("");
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {number} index
   */
  renderCard(row, index) {
    const watch = row.hasPossible4000 ? "yes" : "no";
    const status = row.dropped ? "timeout" : row.hasPossible4000 ? "ok" : "";
    const steps = Array.isArray(row.steps)
      ? row.steps.map((step) => `<li>${escapeHtml(String(step))}</li>`).join("")
      : "";
    const indexed = Array.isArray(row.indexedBytes)
      ? row.indexedBytes
          .map(
            (item) =>
              `<div><dt>Byte ${escapeHtml(String(item.index))}</dt><dd><code>${escapeHtml(
                String(item.hex)
              )}</code> <span class="raw-midi-trace-dec">${escapeHtml(
                String(item.dec)
              )}</span></dd></div>`
          )
          .join("")
      : "";
    const candidate = row.candidate8to12
      ? `<div class="perf-read-result-wide"><dt>Possible 5-byte address (bytes 8–12)</dt><dd><code>${escapeHtml(
          String(row.candidate8to12.bytesHex)
        )}</code> → ${escapeHtml(String(row.candidate8to12.valueHex))} (${escapeHtml(
          String(row.candidate8to12.valueDec)
        )})</dd></div>
         <div class="perf-read-result-wide"><dt>Payload after byte 12</dt><dd><code class="perf-read-hex">${escapeHtml(
           String(row.candidate8to12.payloadHex)
         )}</code></dd></div>`
      : `<div class="perf-read-result-wide"><dt>Possible 5-byte address (bytes 8–12)</dt><dd>—</dd></div>`;
    const hits = Array.isArray(row.watchHits) && row.watchHits.length
      ? row.watchHits
          .map(
            (hit) =>
              `<div class="perf-read-result-wide"><dt>Possible $4000+ at bytes ${escapeHtml(
                String(hit.startIndex)
              )}–${escapeHtml(String(hit.endIndex))}</dt><dd><code>${escapeHtml(
                String(hit.bytesHex)
              )}</code> → ${escapeHtml(String(hit.valueHex))} (${escapeHtml(
                String(hit.valueDec)
              )})<br />Payload after this window: <code class="perf-read-hex">${escapeHtml(
                String(hit.payloadHex)
              )}</code></dd></div>`
          )
          .join("")
      : "";

    return `
      <article class="perf-read-result perf-capture-frame" data-watch="${watch}" data-status="${status}">
        <header class="perf-read-result-header">
          <h5 class="perf-read-result-title">#${index} · ${escapeHtml(
            String(row.functionByteHex || row.functionDisplay || "SysEx")
          )}</h5>
          <span class="perf-read-result-badge">${escapeHtml(String(row.timestampLabel))}</span>
        </header>
        <dl class="perf-read-result-grid">
          <div class="perf-read-result-wide"><dt>RX RAW</dt><dd><code class="perf-read-hex">${escapeHtml(
            String(row.rawHex || "")
          )}</code></dd></div>
          <div><dt>Length</dt><dd>${escapeHtml(String(row.frameLength ?? row.rawLength ?? "—"))}</dd></div>
          <div><dt>Function byte</dt><dd><code>${escapeHtml(
            String(row.functionByteHex || "—")
          )}</code> ${escapeHtml(String(row.functionDisplay || ""))}</dd></div>
          <div><dt>Timestamp</dt><dd>${escapeHtml(String(row.timestampLabel))}</dd></div>
          ${indexed}
          ${candidate}
          ${hits}
          <div class="perf-read-result-wide"><dt>Path</dt><dd>
            <ol class="raw-midi-trace-steps">${steps}</ol>
          </dd></div>
        </dl>
      </article>
    `;
  }

  render() {
    if (this.summaryEl) {
      this.summaryEl.textContent = this.summaryText || "";
      this.summaryEl.hidden = !this.summaryText;
    }
    this.renderLive();
    this.setTracing(this.tracing);
  }
}

/**
 * @param {{
 *   rootElement?: HTMLElement | null,
 *   discovery?: import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null,
 *   ensureMidi?: () => Promise<unknown>
 * }} [options]
 */
export function initializeRawMidiTrace(options = {}) {
  return new RawMidiTrace(options);
}
