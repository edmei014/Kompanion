/**
 * Protocol Research Lab — Extended Parameter Capture (Function 0x05 / 0x06 / 0x07).
 *
 * Passive observation only. No writes, no parameter mapping, no Beacon changes.
 * Shows full 5-byte addresses; never truncates to a 2-byte ID.
 */

import { decodeKemperSysEx } from "./decoder/decodeSysEx.js";
import { describeFunctionCode } from "./decoder/functionCodes.js";
import {
  formatByteHex,
  formatExtendedAddressHex,
  isExtendedFunction
} from "./decoder/decodeExtended.js";

const MAX_ROWS = 400;

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
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3
    });
  } catch {
    return new Date(timestamp).toISOString();
  }
}

/**
 * @param {Uint8Array | number[]} data
 * @returns {number[] | null}
 */
function extractKemperFrame(data) {
  const bytes = Array.from(data);
  const start = bytes.indexOf(0xf0);
  const end = bytes.lastIndexOf(0xf7);
  if (start < 0 || end <= start) return null;
  const frame = bytes.slice(start, end + 1);
  if (frame[1] !== 0x00 || frame[2] !== 0x20 || frame[3] !== 0x33) return null;
  return frame;
}

/**
 * @param {Record<string, unknown>} row
 */
function looksLikeTargetAddress(row) {
  const value = Number(row.addressValue);
  return Number.isFinite(value) && value >= 0x3fff;
}

export class ExtendedParameterCapture {
  /**
   * @param {{
   *   rootElement?: HTMLElement | null,
   *   discovery?: import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null,
   *   ensureMidi?: () => Promise<unknown>
   * }} [options]
   */
  constructor(options = {}) {
    this.rootElement =
      options.rootElement ??
      document.querySelector("[data-extended-parameter-capture]");
    this.discovery = options.discovery ?? null;
    this.ensureMidi = options.ensureMidi ?? (async () => {});

    this.capturing = false;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.elapsedTimer = null;
    this.captureStartedAt = 0;

    /** @type {Array<Record<string, unknown>>} */
    this.extendedFrames = [];
    /** @type {Record<string, number>} */
    this.functionCounts = Object.create(null);
    this.totalKemperFrames = 0;
    this.summaryText = "";

    /** @type {((event: MIDIMessageEvent) => void) | null} */
    this.boundOnMessage = null;
    /** @type {MIDIInput | null} */
    this.captureInput = null;

    this.bindDom();
    this.bindControls();
    this.render();
  }

  bindDom() {
    const root = this.rootElement;
    if (!root) return;

    this.startButton = root.querySelector("[data-ext-capture-start]");
    this.stopButton = root.querySelector("[data-ext-capture-stop]");
    this.clearButton = root.querySelector("[data-ext-capture-clear]");
    this.progressEl = root.querySelector("[data-ext-capture-progress]");
    this.summaryEl = root.querySelector("[data-ext-capture-summary]");
    this.feedEl = root.querySelector("[data-ext-capture-feed]");
    this.statsEl = root.querySelector("[data-ext-capture-stats]");
  }

  bindControls() {
    this.startButton?.addEventListener("click", () => {
      void this.startCapture();
    });
    this.stopButton?.addEventListener("click", () => {
      this.stopCapture();
    });
    this.clearButton?.addEventListener("click", () => {
      this.clearResults();
    });
  }

  setCapturing(active) {
    this.capturing = active;
    if (this.startButton) this.startButton.disabled = active;
    if (this.stopButton) this.stopButton.disabled = !active;
    if (this.clearButton) this.clearButton.disabled = active;
  }

  setProgress(text) {
    if (this.progressEl) this.progressEl.textContent = text;
  }

  clearResults() {
    if (this.capturing) return;
    this.extendedFrames = [];
    this.functionCounts = Object.create(null);
    this.totalKemperFrames = 0;
    this.summaryText = "";
    this.render();
  }

  async startCapture() {
    if (this.capturing) return;

    await this.ensureMidi();

    const input = this.discovery?.input ?? null;
    if (!input) {
      this.summaryText =
        "MIDI input not available — connect Kemper MIDI, then start capture.";
      this.render();
      return;
    }

    this.extendedFrames = [];
    this.functionCounts = Object.create(null);
    this.totalKemperFrames = 0;
    this.summaryText = "";
    this.captureStartedAt = Date.now();
    this.captureInput = input;
    this.setCapturing(true);

    this.boundOnMessage = (event) => {
      this.handleIncomingMessage(event);
    };
    input.addEventListener("midimessage", this.boundOnMessage);

    this.elapsedTimer = window.setInterval(() => {
      if (!this.capturing) return;
      const elapsedSec = Math.floor((Date.now() - this.captureStartedAt) / 1000);
      this.setProgress(
        `Capturing… ${elapsedSec}s · ${this.totalKemperFrames} Kemper SysEx · ${this.extendedFrames.length} extended (fn 5/6/7) — change Performance/Slot on Kemper, then Stop.`
      );
    }, 250);

    this.setProgress(
      "Capturing… switch Performance or Slot on the Kemper, then Stop."
    );
    this.render();
  }

  stopCapture() {
    if (!this.capturing) return;

    if (this.captureInput && this.boundOnMessage) {
      this.captureInput.removeEventListener("midimessage", this.boundOnMessage);
    }
    this.boundOnMessage = null;
    this.captureInput = null;

    if (this.elapsedTimer != null) {
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    this.capturing = false;
    this.setCapturing(false);
    this.summaryText = this.buildSummary();
    this.setProgress("Capture stopped — review Function 5/6/7 traffic below.");
    this.render();
  }

  /**
   * @param {MIDIMessageEvent} event
   */
  handleIncomingMessage(event) {
    const frame = extractKemperFrame(event.data);
    if (!frame) return;

    this.totalKemperFrames += 1;
    const functionCode = frame[6] & 0xff;
    const fnKey = `0x${functionCode.toString(16).toUpperCase().padStart(2, "0")}`;
    this.functionCounts[fnKey] = (this.functionCounts[fnKey] || 0) + 1;

    if (!isExtendedFunction(functionCode)) {
      this.renderStats();
      return;
    }

    const timestamp = Date.now();
    const decoded = decodeKemperSysEx(frame);
    const fn = describeFunctionCode(functionCode);
    const numericValues = Array.isArray(decoded.numericValues)
      ? decoded.numericValues
      : [];

    const row = {
      timestamp,
      rawHex: formatHex(frame),
      frameLength: frame.length,
      functionCode,
      functionDisplay: fn.display,
      addressBytesHex: decoded.addressBytes?.length
        ? formatByteHex(decoded.addressBytes)
        : "—",
      addressHex: decoded.addressHex || "—",
      addressValue: decoded.addressValue,
      payloadHex: decoded.payloadHex || "—",
      payloadLength: decoded.payloadLength ?? 0,
      decodedString:
        decoded.hasReadableAscii && decoded.ascii ? decoded.ascii : "",
      numericValuesHex: numericValues.length
        ? numericValues.map((value) => formatExtendedAddressHex(value)).join(", ")
        : "",
      twoByteMisreadHex: decoded.twoByteMisreadHex || "—",
      isHighAddress: looksLikeTargetAddress(decoded)
    };

    this.extendedFrames.push(row);
    if (this.extendedFrames.length > MAX_ROWS) {
      this.extendedFrames.shift();
    }

    this.renderLiveFeed();
    this.renderStats();
  }

  buildSummary() {
    const counts = Object.entries(this.functionCounts)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([code, count]) => `${code}×${count}`)
      .join(", ");

    const high = this.extendedFrames.filter((row) => row.isHighAddress).length;
    const byFn = { "0x05": 0, "0x06": 0, "0x07": 0 };
    for (const row of this.extendedFrames) {
      const key = `0x${Number(row.functionCode).toString(16).toUpperCase().padStart(2, "0")}`;
      if (key in byFn) byFn[key] += 1;
    }

    const lines = [
      `Captured ${this.totalKemperFrames} Kemper SysEx frame${this.totalKemperFrames === 1 ? "" : "s"}.`,
      `Extended messages: 0x05=${byFn["0x05"]}, 0x06=${byFn["0x06"]}, 0x07=${byFn["0x07"]}.`,
      high
        ? `${high} extended address${high === 1 ? "" : "es"} decoded as ≥ $00003FFF.`
        : "No extended address decoded as ≥ $00003FFF in this capture."
    ];

    if (counts) {
      lines.push(`All functions seen: ${counts}.`);
    }

    if (!this.extendedFrames.length) {
      lines.push(
        "No Function 0x05 / 0x06 / 0x07 frames arrived. If strings still appear elsewhere, they may be using Function 0x03 with a 2-byte ID."
      );
    }

    return lines.join(" ");
  }

  renderStats() {
    if (!this.statsEl) return;
    const counts = Object.entries(this.functionCounts)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([code, count]) => `${code}:${count}`);
    this.statsEl.textContent = counts.length
      ? `Functions seen: ${counts.join("  ")}`
      : this.capturing
        ? "Waiting for Kemper SysEx…"
        : "No SysEx counted yet.";
  }

  renderLiveFeed() {
    if (!this.feedEl) return;

    if (!this.extendedFrames.length) {
      this.feedEl.innerHTML = `<p class="research-lab-muted">${escapeHtml(
        this.capturing
          ? "Waiting for Function 0x05 / 0x06 / 0x07…"
          : "No extended messages captured yet."
      )}</p>`;
      return;
    }

    this.feedEl.innerHTML = this.extendedFrames
      .map((row, index) => this.renderCard(row, index + 1))
      .join("");
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {number} index
   */
  renderCard(row, index) {
    const highlight = row.isHighAddress ? "yes" : "no";
    const numericRow = row.numericValuesHex
      ? `<div class="perf-read-result-wide"><dt>Numeric payload (32-bit, not mapped)</dt><dd><code>${escapeHtml(String(row.numericValuesHex))}</code></dd></div>`
      : "";

    return `
      <article class="perf-read-result perf-capture-frame" data-watch="${highlight}">
        <header class="perf-read-result-header">
          <h5 class="perf-read-result-title">#${index} · ${escapeHtml(String(row.functionDisplay))}</h5>
          <span class="perf-read-result-badge">${escapeHtml(formatTimestamp(row.timestamp))}</span>
        </header>
        <dl class="perf-read-result-grid">
          <div class="perf-read-result-wide"><dt>Raw SysEx</dt><dd><code class="perf-read-hex">${escapeHtml(String(row.rawHex || ""))}</code></dd></div>
          <div><dt>Function</dt><dd>${escapeHtml(String(row.functionDisplay || "—"))}</dd></div>
          <div><dt>Timestamp</dt><dd>${escapeHtml(formatTimestamp(row.timestamp))}</dd></div>
          <div class="perf-read-result-wide"><dt>Full address (5 bytes)</dt><dd><code>${escapeHtml(String(row.addressBytesHex))}</code></dd></div>
          <div><dt>Address value</dt><dd><code>${escapeHtml(String(row.addressHex))}</code></dd></div>
          <div><dt>2-byte misread (old decoder)</dt><dd><code>${escapeHtml(String(row.twoByteMisreadHex))}</code></dd></div>
          <div class="perf-read-result-wide"><dt>Payload</dt><dd><code class="perf-read-hex">${escapeHtml(String(row.payloadHex || "—"))}</code></dd></div>
          <div><dt>Payload length</dt><dd>${escapeHtml(String(row.payloadLength ?? "—"))}</dd></div>
          <div><dt>Decoded string</dt><dd>${escapeHtml(String(row.decodedString || "—"))}</dd></div>
          ${numericRow}
          <div><dt>Frame length</dt><dd>${escapeHtml(String(row.frameLength ?? "—"))}</dd></div>
        </dl>
      </article>
    `;
  }

  render() {
    if (this.summaryEl) {
      this.summaryEl.textContent = this.summaryText || "";
      this.summaryEl.hidden = !this.summaryText;
    }
    this.renderLiveFeed();
    this.renderStats();
    this.setCapturing(this.capturing);
  }
}

/**
 * @param {{
 *   rootElement?: HTMLElement | null,
 *   discovery?: import("./BidirectionalDiscovery.js").BidirectionalDiscovery | null,
 *   ensureMidi?: () => Promise<unknown>
 * }} [options]
 */
export function initializeExtendedParameterCapture(options = {}) {
  return new ExtendedParameterCapture(options);
}
