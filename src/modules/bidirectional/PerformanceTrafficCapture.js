/**
 * Protocol Research Lab — passive Performance SysEx traffic capture.
 * Read-only observation. No parameter requests, no writes, no Performance Library.
 *
 * Hits are Function 0x07 frames whose 5-byte extended address is $4000–$4015.
 * 2-byte IDs from Function 0x01 are not treated as matches.
 */

import { decodeKemperSysEx } from "./decoder/decodeSysEx.js";
import { describeFunctionCode } from "./decoder/functionCodes.js";

/** Extended string IDs to group after a Function 0x07 capture. */
export const PERFORMANCE_TRAFFIC_WATCH_IDS = Object.freeze([
  0x4000,
  0x4001,
  0x4002,
  0x4003,
  0x4004,
  0x4005,
  0x4010,
  0x4011,
  0x4012,
  0x4013,
  0x4014,
  0x4015
]);

const WATCH_ID_SET = new Set(PERFORMANCE_TRAFFIC_WATCH_IDS);
const SLOT_BURST_IDS = [0x4000, 0x4001, 0x4002, 0x4003, 0x4004];
const BURST_WINDOW_MS = 800;
const FUNCTION_EXTENDED_STRING = 0x07;

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
 * @param {number} id
 * @returns {string}
 */
function formatExtendedId(id) {
  return `$${id.toString(16).toUpperCase().padStart(4, "0")}`;
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
 * Genuine Function 0x07 hit with a 5-byte address in the watch set.
 *
 * @param {number[]} frame
 * @param {import("./decoder/decodeSysEx.js").DecodedSysEx} decoded
 * @returns {number | null}
 */
function extractFn07WatchId(frame, decoded) {
  if ((frame[6] & 0xff) !== FUNCTION_EXTENDED_STRING) return null;
  if (decoded?.addressEncoding !== "extended32") return null;
  const id = decoded.addressValue;
  if (!Number.isFinite(id) || !WATCH_ID_SET.has(id)) return null;
  return id;
}

/**
 * @param {Array<{ extendedId: number | null, timestamp: number }>} matched
 */
function detectSlotBurst(matched) {
  const slotHits = matched
    .filter((row) => row.extendedId != null && SLOT_BURST_IDS.includes(row.extendedId))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (slotHits.length < 5) return null;

  for (let start = 0; start <= slotHits.length - 5; start += 1) {
    const window = slotHits.slice(start, start + 5);
    const span = window[4].timestamp - window[0].timestamp;
    const ids = new Set(window.map((row) => row.extendedId));
    if (span <= BURST_WINDOW_MS && SLOT_BURST_IDS.every((id) => ids.has(id))) {
      return {
        startAt: window[0].timestamp,
        endAt: window[4].timestamp,
        spanMs: span
      };
    }
  }

  return null;
}

/**
 * @param {Array<Record<string, unknown>>} matched
 * @param {number} totalFrames
 */
function buildAnalysisSummary(matched, totalFrames) {
  const seenIds = new Set(
    matched.map((row) => row.extendedId).filter((id) => id != null)
  );
  const missing = PERFORMANCE_TRAFFIC_WATCH_IDS.filter((id) => !seenIds.has(id));
  const burst = detectSlotBurst(matched);

  /** @type {string[]} */
  const lines = [
    `Captured ${totalFrames} Kemper SysEx frame${totalFrames === 1 ? "" : "s"}.`,
    matched.length
      ? `${matched.length} Function 0x07 string${matched.length === 1 ? "" : "s"} with 5-byte address $4000–$4015.`
      : "No Function 0x07 frames with 5-byte address $4000–$4015."
  ];

  if (seenIds.size) {
    lines.push(
      `Seen: ${PERFORMANCE_TRAFFIC_WATCH_IDS.filter((id) => seenIds.has(id))
        .map((id) => formatExtendedId(id))
        .join(", ")}.`
    );
  }

  if (missing.length) {
    lines.push(`Not seen: ${missing.map((id) => formatExtendedId(id)).join(", ")}.`);
  }

  if (burst) {
    lines.push(
      `$4000–$4004 all arrived within ${burst.spanMs} ms (${formatTimestamp(burst.startAt)} → ${formatTimestamp(burst.endAt)}).`
    );
  }

  return lines.join(" ");
}

export class PerformanceTrafficCapture {
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
      document.querySelector("[data-performance-traffic-capture]");
    this.discovery = options.discovery ?? null;
    this.ensureMidi = options.ensureMidi ?? (async () => {});

    this.capturing = false;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.elapsedTimer = null;
    this.captureStartedAt = 0;

    /** @type {Array<Record<string, unknown>>} */
    this.allFrames = [];
    /** @type {Array<Record<string, unknown>>} */
    this.matchedFrames = [];
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

    this.startButton = root.querySelector("[data-perf-capture-start]");
    this.stopButton = root.querySelector("[data-perf-capture-stop]");
    this.clearButton = root.querySelector("[data-perf-capture-clear]");
    this.progressEl = root.querySelector("[data-perf-capture-progress]");
    this.summaryEl = root.querySelector("[data-perf-capture-summary]");
    this.allFeedEl = root.querySelector("[data-perf-capture-all]");
    this.matchedFeedEl = root.querySelector("[data-perf-capture-matched]");
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
    this.allFrames = [];
    this.matchedFrames = [];
    this.summaryText = "";
    this.render();
  }

  async startCapture() {
    if (this.capturing) return;

    await this.ensureMidi();

    const input = this.discovery?.input ?? null;
    if (!input) {
      this.summaryText =
        "MIDI input not available — open MIDI Analyzer and connect Kemper input.";
      this.render();
      return;
    }

    this.allFrames = [];
    this.matchedFrames = [];
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
        `Capturing… ${elapsedSec}s · ${this.allFrames.length} SysEx · ${this.matchedFrames.length} Function 0x07 $4000–$4015 — switch Performance/Slots, then Stop.`
      );
    }, 250);

    this.setProgress(
      "Capturing… switch Performance and Slots on the Kemper, then Stop."
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
    this.summaryText = buildAnalysisSummary(this.matchedFrames, this.allFrames.length);
    this.setProgress("Capture stopped — Function 0x07 strings are grouped by extended ID.");
    this.render();
  }

  /**
   * @param {MIDIMessageEvent} event
   */
  handleIncomingMessage(event) {
    const frame = extractKemperFrame(event.data);
    if (!frame) return;

    const timestamp = Date.now();
    const decoded = decodeKemperSysEx(frame);
    const functionCode = frame[6] & 0xff;
    const fn = describeFunctionCode(functionCode);
    const extendedId = extractFn07WatchId(frame, decoded);
    const isWatchId = extendedId != null;

    const row = {
      timestamp,
      rawHex: formatHex(frame),
      frameLength: frame.length,
      functionCode,
      functionLabel: fn.label,
      functionDisplay: fn.display,
      extendedId,
      extendedIdHex: extendedId != null ? formatExtendedId(extendedId) : "—",
      decodedString:
        isWatchId && decoded.hasReadableAscii && decoded.ascii ? decoded.ascii : "",
      payloadHex: decoded.payloadHex || "—",
      decodeSummary: decoded.summaryLines?.join(" · ") || "",
      isWatchId
    };

    this.allFrames.push(row);
    if (isWatchId) {
      this.matchedFrames.push(row);
    }

    this.renderLiveFeeds();
  }

  renderLiveFeeds() {
    if (this.allFeedEl) {
      this.allFeedEl.innerHTML = this.renderFrameList(this.allFrames, {
        emptyText: this.capturing
          ? "Waiting for SysEx traffic…"
          : "No SysEx captured yet."
      });
    }

    if (this.matchedFeedEl) {
      this.matchedFeedEl.innerHTML = this.renderGroupedHits({
        emptyText: this.capturing
          ? "No Function 0x07 · $4000–$4015 strings yet."
          : "No Function 0x07 strings with 5-byte address $4000–$4015 in this capture."
      });
    }
  }

  /**
   * @param {{ emptyText: string }} options
   */
  renderGroupedHits(options) {
    const groups = PERFORMANCE_TRAFFIC_WATCH_IDS.map((id) => {
      const hits = this.matchedFrames.filter((row) => row.extendedId === id);
      return { id, idHex: formatExtendedId(id), hits };
    });

    const anyHits = groups.some((group) => group.hits.length);
    if (!anyHits) {
      return `<p class="research-lab-muted">${escapeHtml(options.emptyText)}</p>`;
    }

    return groups
      .map((group) => {
        const latest = group.hits.length ? group.hits[group.hits.length - 1] : null;
        const hitCards = group.hits.length
          ? group.hits
              .map((row, index) => this.renderHitCard(row, index + 1))
              .join("")
          : `<p class="research-lab-muted">Not seen</p>`;

        return `
          <section class="perf-capture-id-group" data-seen="${group.hits.length ? "yes" : "no"}">
            <header class="perf-capture-id-group-header">
              <h5 class="perf-capture-id-group-title">${escapeHtml(group.idHex)}</h5>
              <span class="perf-read-result-badge">${
                group.hits.length
                  ? `${group.hits.length}×${latest?.decodedString ? ` · ${escapeHtml(String(latest.decodedString))}` : ""}`
                  : "not seen"
              }</span>
            </header>
            ${hitCards}
          </section>
        `;
      })
      .join("");
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {number} index
   */
  renderHitCard(row, index) {
    return `
      <article class="perf-read-result perf-capture-frame" data-watch="yes">
        <header class="perf-read-result-header">
          <h5 class="perf-read-result-title">#${index} · ${escapeHtml(String(row.extendedIdHex))}</h5>
          <span class="perf-read-result-badge">${escapeHtml(formatTimestamp(row.timestamp))}</span>
        </header>
        <dl class="perf-read-result-grid">
          <div><dt>Extended ID</dt><dd><code>${escapeHtml(String(row.extendedIdHex))}</code></dd></div>
          <div><dt>Timestamp</dt><dd>${escapeHtml(formatTimestamp(row.timestamp))}</dd></div>
          <div class="perf-read-result-wide"><dt>String</dt><dd>${escapeHtml(String(row.decodedString || "—"))}</dd></div>
          <div class="perf-read-result-wide"><dt>Raw Message</dt><dd><code class="perf-read-hex">${escapeHtml(String(row.rawHex || ""))}</code></dd></div>
        </dl>
      </article>
    `;
  }

  /**
   * @param {Array<Record<string, unknown>>} rows
   * @param {{ emptyText: string }} options
   */
  renderFrameList(rows, options) {
    if (!rows.length) {
      return `<p class="research-lab-muted">${escapeHtml(options.emptyText)}</p>`;
    }

    return rows
      .map((row, index) => this.renderFrameCard(row, index + 1))
      .join("");
  }

  /**
   * @param {Record<string, unknown>} row
   * @param {number} index
   */
  renderFrameCard(row, index) {
    const title = row.isWatchId
      ? String(row.extendedIdHex)
      : row.functionDisplay || "SysEx";

    return `
      <article class="perf-read-result perf-capture-frame" data-watch="${row.isWatchId ? "yes" : "no"}">
        <header class="perf-read-result-header">
          <h5 class="perf-read-result-title">#${index} · ${escapeHtml(title)}</h5>
          <span class="perf-read-result-badge">${escapeHtml(formatTimestamp(row.timestamp))}</span>
        </header>
        <dl class="perf-read-result-grid">
          <div class="perf-read-result-wide"><dt>Raw SysEx</dt><dd><code class="perf-read-hex">${escapeHtml(row.rawHex || "")}</code></dd></div>
          <div><dt>Function</dt><dd>${escapeHtml(row.functionDisplay || row.functionLabel || "—")}</dd></div>
          <div><dt>Extended ID</dt><dd><code>${escapeHtml(row.extendedIdHex || "—")}</code></dd></div>
          <div><dt>String</dt><dd>${escapeHtml(row.decodedString || "—")}</dd></div>
          <div><dt>Timestamp</dt><dd>${escapeHtml(formatTimestamp(row.timestamp))}</dd></div>
        </dl>
      </article>
    `;
  }

  render() {
    if (this.summaryEl) {
      this.summaryEl.textContent = this.summaryText || "";
      this.summaryEl.hidden = !this.summaryText;
    }

    this.renderLiveFeeds();
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
export function initializePerformanceTrafficCapture(options = {}) {
  return new PerformanceTrafficCapture(options);
}
