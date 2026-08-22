/**
 * Parameter Census — systematically probe the Kemper parameter ID space.
 *
 * One-time research tool: Read every ID in [start, end], store responders only.
 * Supports pause / resume across long multi-hour runs.
 */

import { buildSingleParameterRequest } from "./decoder/protocolMessages.js";
import { formatParameterIdHex } from "./decoder/parameterRegistry.js";
import {
  getCensusJob,
  getCensusStatistics,
  persistParameterCensus,
  updateCensusJob,
  upsertCensusParameter
} from "./parameterCensusRegistry.js";

const DEFAULT_START = 0x0000;
const DEFAULT_END = 0x7f7f;
const DEFAULT_DELAY_MS = 5;
const DEFAULT_TIMEOUT_MS = 80;

/**
 * @typedef {"boolean" | "continuous" | "enum" | "string" | "binary" | "unknown_binary"} CensusValueType
 */

export class ParameterCensus {
  /**
   * @param {{
   *   discovery: import("./BidirectionalDiscovery.js").BidirectionalDiscovery,
   *   onChange?: () => void
   * }} options
   */
  constructor(options) {
    this.discovery = options.discovery;
    this.onChange = options.onChange ?? null;

    /** @type {boolean} */
    this.running = false;
    /** @type {boolean} */
    this.pauseRequested = false;

    /** @type {null | {
     *   id: number,
     *   resolve: (payload: {
     *     decoded: import("./decoder/decodeSysEx.js").DecodedSysEx | null,
     *     state: import("./decoder/parameterState.js").ParameterState | null
     *   } | null) => void
     * }} */
    this.waitHandle = null;

    /** @type {Set<number>} */
    this.explicitReadIds = new Set();

    /** @type {ReturnType<typeof setTimeout> | null} */
    this.notifyTimer = null;
  }

  /**
   * @param {{
   *   result: { state: import("./decoder/parameterState.js").ParameterState | null },
   *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
   * }} event
   */
  onTraffic(event) {
    if (!this.waitHandle) return;
    const decoded = event?.decoded;
    const state = event?.result?.state ?? null;
    const id = decoded?.parameterId ?? state?.id;
    if (id == null || (id & 0xffff) !== this.waitHandle.id) return;

    // Accept any response for this ID (numeric, string, or undecoded payload).
    if (
      state == null &&
      decoded?.value == null &&
      !decoded?.ascii &&
      decoded?.ok !== true
    ) {
      return;
    }

    const { resolve } = this.waitHandle;
    this.waitHandle = null;
    resolve({ decoded: decoded ?? null, state });
  }

  /**
   * @param {number} id
   * @returns {boolean}
   */
  isExplicitReadOutstanding(id) {
    return this.explicitReadIds.has(id & 0xffff);
  }

  isRunning() {
    return this.running;
  }

  getSnapshot() {
    const job = getCensusJob();
    const stats = getCensusStatistics();
    const total = Math.max(0, job.endId - job.startId + 1);
    const remaining = Math.max(0, job.endId - job.nextId + 1);
    return {
      running: this.running,
      job,
      stats,
      total,
      remaining,
      currentIdHex: formatParameterIdHex(job.nextId),
      progressPercent:
        total > 0 ? Math.min(100, (job.idsTested / total) * 100) : 0
    };
  }

  /**
   * Configure range / timing (only when not running).
   * @param {{
   *   startId?: number,
   *   endId?: number,
   *   delayMs?: number,
   *   timeoutMs?: number,
   *   resetProgress?: boolean
   * }} config
   */
  configure(config = {}) {
    if (this.running) return getCensusJob();

    const startId = clampId(
      config.startId ?? getCensusJob().startId ?? DEFAULT_START
    );
    const endId = clampId(config.endId ?? getCensusJob().endId ?? DEFAULT_END);
    const lo = Math.min(startId, endId);
    const hi = Math.max(startId, endId);
    const delayMs = clampDelay(config.delayMs ?? getCensusJob().delayMs);
    const timeoutMs = clampTimeout(
      config.timeoutMs ?? getCensusJob().timeoutMs
    );

    const reset = Boolean(config.resetProgress);
    const prev = getCensusJob();

    return updateCensusJob({
      startId: lo,
      endId: hi,
      delayMs,
      timeoutMs,
      nextId: reset
        ? firstValidId(lo, hi)
        : clampIdInRange(prev.nextId, lo, hi),
      idsTested: reset ? 0 : prev.idsTested,
      status: reset ? "idle" : prev.status === "completed" ? "idle" : prev.status,
      startedAt: reset ? null : prev.startedAt
    });
  }

  /**
   * Start or resume from the saved next ID.
   */
  async start() {
    if (this.running) return;
    if (!this.discovery?.output && !this.discovery?.externalSend) {
      this.notify();
      return;
    }

    const job = getCensusJob();
    let nextId = firstValidId(Math.max(job.nextId, job.startId), job.endId);
    if (nextId == null) {
      updateCensusJob({ status: "completed", nextId: job.endId });
      this.notify();
      return;
    }

    this.running = true;
    this.pauseRequested = false;
    updateCensusJob({
      status: "running",
      nextId,
      startedAt: job.startedAt || new Date().toISOString()
    });
    this.notify();

    try {
      while (!this.pauseRequested) {
        const current = getCensusJob();
        const id = firstValidId(current.nextId, current.endId);
        if (id == null) {
          updateCensusJob({
            status: "completed",
            nextId: current.endId
          });
          break;
        }

        await this.probeId(id, current.timeoutMs);

        const after = nextValidId(id + 1, current.endId);
        updateCensusJob({
          idsTested: current.idsTested + 1,
          nextId: after == null ? current.endId : after,
          status: after == null ? "completed" : "running"
        });

        this.scheduleNotify();

        if (after == null) break;
        if (this.pauseRequested) break;

        await delay(current.delayMs);
      }
    } finally {
      this.running = false;
      this.explicitReadIds.clear();
      if (this.pauseRequested && getCensusJob().status !== "completed") {
        updateCensusJob({ status: "paused" });
      }
      persistParameterCensus();
      this.notify();
    }
  }

  pause() {
    if (!this.running) return;
    this.pauseRequested = true;
    if (this.waitHandle) {
      const { resolve } = this.waitHandle;
      this.waitHandle = null;
      resolve(null);
    }
  }

  /**
   * Resume is an alias for start() — continues from nextId.
   */
  async resume() {
    return this.start();
  }

  /**
   * @param {number} id
   * @param {number} timeoutMs
   */
  async probeId(id, timeoutMs) {
    this.explicitReadIds.add(id & 0xffff);
    try {
      const bytes = buildSingleParameterRequest(id);
      const sent = this.discovery.sendResearchSysEx(bytes);
      if (!sent) return;

      const response = await this.waitForResponse(id, timeoutMs);
      if (!response) return;

      const classified = classifyCensusResponse(response.decoded, response.state);
      if (!classified) return;

      upsertCensusParameter({
        idNum: id,
        type: classified.type,
        rawValue: classified.rawValue,
        ascii: classified.ascii,
        dataLength: classified.dataLength,
        supportsPush: null,
        supportsWrite: null
      });
    } finally {
      window.setTimeout(() => {
        this.explicitReadIds.delete(id & 0xffff);
      }, 30);
    }
  }

  /**
   * @param {number} id
   * @param {number} timeoutMs
   * @returns {Promise<{
   *   decoded: import("./decoder/decodeSysEx.js").DecodedSysEx | null,
   *   state: import("./decoder/parameterState.js").ParameterState | null
   * } | null>}
   */
  waitForResponse(id, timeoutMs) {
    return new Promise((resolve) => {
      const normalized = id & 0xffff;
      if (this.waitHandle) {
        this.waitHandle.resolve(null);
        this.waitHandle = null;
      }
      const timer = window.setTimeout(() => {
        if (this.waitHandle?.id === normalized) {
          this.waitHandle = null;
          resolve(null);
        }
      }, timeoutMs);
      this.waitHandle = {
        id: normalized,
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value);
        }
      };
    });
  }

  scheduleNotify() {
    if (this.notifyTimer != null) return;
    this.notifyTimer = window.setTimeout(() => {
      this.notifyTimer = null;
      this.onChange?.();
    }, 200);
  }

  notify() {
    if (this.notifyTimer != null) {
      window.clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
    }
    this.onChange?.();
  }
}

/**
 * @param {import("./decoder/decodeSysEx.js").DecodedSysEx | null} decoded
 * @param {import("./decoder/parameterState.js").ParameterState | null} state
 * @returns {{
 *   type: CensusValueType,
 *   rawValue: number | null,
 *   ascii: string | null,
 *   dataLength: number | null
 * } | null}
 */
export function classifyCensusResponse(decoded, state) {
  const ascii =
    (state?.ascii && state.ascii) ||
    (decoded?.hasReadableAscii && decoded.ascii) ||
    null;
  const rawValue =
    state?.rawValue != null
      ? state.rawValue
      : decoded?.value != null
        ? decoded.value
        : null;

  const dataLength =
    decoded?.payloadLength != null
      ? decoded.payloadLength
      : ascii
        ? ascii.length
        : rawValue != null
          ? 2
          : null;

  if (ascii) {
    return {
      type: "string",
      rawValue,
      ascii: String(ascii),
      dataLength
    };
  }

  if (rawValue == null) {
    // Response referenced this ID but carried no numeric/string payload.
    if (decoded?.ok && decoded?.parameterId != null) {
      return {
        type: "unknown_binary",
        rawValue: null,
        ascii: null,
        dataLength
      };
    }
    return null;
  }

  if (rawValue === 0 || rawValue === 1) {
    return { type: "boolean", rawValue, ascii: null, dataLength };
  }

  // Small discrete integers are typically mode / type selectors.
  if (rawValue >= 2 && rawValue <= 127) {
    return { type: "enum", rawValue, ascii: null, dataLength };
  }

  if (rawValue >= 0 && rawValue <= 16383) {
    return { type: "continuous", rawValue, ascii: null, dataLength };
  }

  return { type: "binary", rawValue, ascii: null, dataLength };
}

/**
 * Kemper address bytes are 7-bit; skip IDs that cannot be encoded uniquely.
 * @param {number} id
 * @returns {boolean}
 */
export function isValidCensusId(id) {
  const n = id & 0xffff;
  return (n & 0x8080) === 0;
}

/**
 * @param {number} start
 * @param {number} end
 * @returns {number | null}
 */
function firstValidId(start, end) {
  for (let id = clampId(start); id <= end; id += 1) {
    if (isValidCensusId(id)) return id;
  }
  return null;
}

/**
 * @param {number} start
 * @param {number} end
 * @returns {number | null}
 */
function nextValidId(start, end) {
  return firstValidId(start, end);
}

/**
 * @param {number} id
 * @returns {number}
 */
function clampId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(0xffff, Math.trunc(n)));
}

/**
 * @param {number} id
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
function clampIdInRange(id, lo, hi) {
  const n = clampId(id);
  if (n < lo) return firstValidId(lo, hi) ?? lo;
  if (n > hi) return hi;
  return firstValidId(n, hi) ?? n;
}

/**
 * @param {number} ms
 * @returns {number}
 */
function clampDelay(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return DEFAULT_DELAY_MS;
  return Math.max(0, Math.min(2000, Math.trunc(n)));
}

/**
 * @param {number} ms
 * @returns {number}
 */
function clampTimeout(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return DEFAULT_TIMEOUT_MS;
  return Math.max(20, Math.min(2000, Math.trunc(n)));
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
