/**
 * Automatic parameter capability discovery for the Protocol Research Lab.
 *
 * For each parameter under test:
 *   Read  → Supports Read
 *   Write (same value) + re-read → Supports Write (device left unmodified)
 *   Push is observed separately from unsolicited traffic
 */

import {
  buildSingleParameterChange,
  buildSingleParameterRequest
} from "./decoder/protocolMessages.js";
import { lookupParameter } from "./decoder/parameterRegistry.js";
import { PARAMETER_TYPE } from "./decoder/parameterTypes.js";
import {
  upsertParameterCapability
} from "./parameterCapabilityRegistry.js";

const DEFAULT_TIMEOUT_MS = 1500;
const INTER_STEP_MS = 40;

/**
 * @typedef {{
 *   discovery: import("./BidirectionalDiscovery.js").BidirectionalDiscovery,
 *   timeoutMs?: number,
 *   onProgress?: (progress: {
 *     id: number,
 *     idHex: string,
 *     name: string,
 *     phase: string,
 *     running: boolean
 *   }) => void
 * }} ScannerOptions
 */

export class CapabilityScanner {
  /**
   * @param {ScannerOptions} options
   */
  constructor(options) {
    this.discovery = options.discovery;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onProgress = options.onProgress ?? null;
    this.running = false;
    this.abortRequested = false;

    /** @type {Set<number>} */
    this.explicitReadIds = new Set();
    /** @type {null | {
     *   id: number,
     *   resolve: (value: import("./decoder/parameterState.js").ParameterState | null) => void
     * }} */
    this.waitHandle = null;
  }

  /**
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }

  requestStop() {
    this.abortRequested = true;
    if (this.waitHandle) {
      const { resolve } = this.waitHandle;
      this.waitHandle = null;
      resolve(null);
    }
  }

  /**
   * Called by Research Lab for every decoded parameter update.
   * @param {import("./decoder/parameterState.js").ParameterState} state
   */
  onParameterState(state) {
    if (!this.waitHandle) return;
    if (state.id !== this.waitHandle.id) return;
    if (state.rawValue == null && (state.ascii == null || state.ascii === "")) {
      return;
    }
    const { resolve } = this.waitHandle;
    this.waitHandle = null;
    resolve(state);
  }

  /**
   * @param {number} parameterId
   * @returns {Promise<{
   *   id: number,
   *   idHex: string,
   *   name: string,
   *   supportsRead: boolean,
   *   supportsWrite: boolean | null,
   *   supportsPush: boolean | null
   * } | null>}
   */
  async scanParameter(parameterId) {
    if (this.running) return null;
    this.running = true;
    this.abortRequested = false;

    const id = parameterId & 0xffff;
    const definition = lookupParameter(id);
    const existing = this.discovery.getParameter(id);
    const name = existing?.name || definition?.name || `0x${id.toString(16)}`;
    const idHex = existing?.idHex || `0x${id.toString(16).toUpperCase().padStart(4, "0")}`;
    const scale = definition?.scaleFunction || "unknown";
    const isString = (existing?.type || definition?.type) === PARAMETER_TYPE.STRING;

    try {
      this.emitProgress(id, idHex, name, "read");

      const supportsRead = isString
        ? false
        : await this.testRead(id);

      if (this.abortRequested) return null;

      let supportsWrite = null;
      if (!isString && supportsRead) {
        this.emitProgress(id, idHex, name, "write");
        supportsWrite = await this.testWriteSameValue(id);
      } else if (!isString && !supportsRead) {
        // Cannot safely verify write without a successful read baseline.
        supportsWrite = false;
      }

      if (this.abortRequested) return null;

      const entry = upsertParameterCapability(id, {
        name,
        scale,
        supportsRead,
        supportsWrite,
        lastProbed: new Date().toISOString(),
        notes: isString ? "String parameters not probed by numeric capability scanner" : ""
      });

      this.emitProgress(id, idHex, name, "done");

      return {
        id,
        idHex: entry.id,
        name: entry.name,
        supportsRead: Boolean(entry.supportsRead),
        supportsWrite:
          entry.supportsWrite === null ? null : Boolean(entry.supportsWrite),
        supportsPush:
          entry.supportsPush === null ? null : Boolean(entry.supportsPush)
      };
    } finally {
      this.running = false;
      this.abortRequested = false;
      this.explicitReadIds.clear();
      this.emitProgress(id, idHex, name, "idle");
    }
  }

  /**
   * Scan many parameter IDs sequentially (never pipelined).
   * @param {number[]} parameterIds
   */
  async scanMany(parameterIds) {
    const results = [];
    this.abortRequested = false;
    for (const id of parameterIds) {
      if (this.abortRequested) break;
      const result = await this.scanParameter(id);
      if (result) results.push(result);
    }
    return results;
  }

  /**
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async testRead(id) {
    this.explicitReadIds.add(id);
    try {
      const bytes = buildSingleParameterRequest(id);
      const sent = this.discovery.sendResearchSysEx(bytes);
      if (!sent) return false;

      const state = await this.waitForParameter(id, this.timeoutMs);
      return Boolean(state && (state.rawValue != null || state.ascii));
    } finally {
      // Keep id marked briefly so immediate echo isn't counted as push.
      window.setTimeout(() => {
        this.explicitReadIds.delete(id);
      }, 50);
    }
  }

  /**
   * Write the same raw value currently on the device, then read again.
   * Leaves the device unmodified (same value written back).
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async testWriteSameValue(id) {
    const baseline = this.discovery.getParameter(id);
    const originalRaw = baseline?.rawValue;
    if (originalRaw == null || !Number.isFinite(originalRaw)) {
      return false;
    }

    const writeBytes = buildSingleParameterChange(id, originalRaw);
    const writeSent = this.discovery.sendResearchSysEx(writeBytes);
    if (!writeSent) return false;

    await delay(INTER_STEP_MS);

    // Confirm via a fresh read (also restores confidence without changing value).
    this.explicitReadIds.add(id);
    try {
      const readBytes = buildSingleParameterRequest(id);
      const readSent = this.discovery.sendResearchSysEx(readBytes);
      if (!readSent) return false;

      const state = await this.waitForParameter(id, this.timeoutMs);
      if (!state || state.rawValue == null) return false;

      // Same-value write succeeded if we can round-trip the value.
      const ok = state.rawValue === originalRaw;

      // Safety restore (no-op if already same).
      if (state.rawValue !== originalRaw) {
        this.discovery.sendResearchSysEx(
          buildSingleParameterChange(id, originalRaw)
        );
        await this.waitForParameter(id, this.timeoutMs);
      }

      return ok;
    } finally {
      window.setTimeout(() => {
        this.explicitReadIds.delete(id);
      }, 50);
    }
  }

  /**
   * True when an update should be treated as unsolicited push evidence.
   * @param {number} id
   * @returns {boolean}
   */
  isExplicitReadOutstanding(id) {
    return this.explicitReadIds.has(id & 0xffff);
  }

  /**
   * @param {number} id
   * @param {number} timeoutMs
   * @returns {Promise<import("./decoder/parameterState.js").ParameterState | null>}
   */
  waitForParameter(id, timeoutMs) {
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

  /**
   * @param {number} id
   * @param {string} idHex
   * @param {string} name
   * @param {string} phase
   */
  emitProgress(id, idHex, name, phase) {
    this.onProgress?.({
      id,
      idHex,
      name,
      phase,
      running: phase !== "idle" && phase !== "done"
    });
  }
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
