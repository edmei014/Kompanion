/**
 * Active Effect Type Discovery — event-driven research tool.
 *
 * Strict pipeline (never pipelined):
 *   Write type ID → wait for Kemper bidirectional update → store name → next ID
 */

import {
  classifyDiscoveredName,
  downloadEffectTypeRegistryJson,
  exportEffectTypeRegistryJson,
  persist,
  recordDiscoveredEffect
} from "./effectTypeRegistry.js";
import { EFFECT_TYPE_PARAMETERS } from "./controlBindings.js";
import { parameterService } from "./ParameterService.js";

const DEFAULT_RESPONSE_TIMEOUT_MS = 1000;
const DEFAULT_MAX_ID = 250;

/**
 * @typedef {{
 *   ensureMidi: () => Promise<unknown>,
 *   setParameterEchoEnabled?: (enabled: boolean) => void,
 *   subscribeParameters: (
 *     listener: (event: {
 *       result: { state: import("./decoder/parameterState.js").ParameterState | null },
 *       decoded: import("./decoder/decodeSysEx.js").DecodedSysEx
 *     }) => void
 *   ) => () => void,
 *   readEffectTypeName: (
 *     slotKey: string,
 *     typeId: number,
 *     timeoutMs: number
 *   ) => Promise<string | null>,
 *   onProgress?: (progress: {
 *     currentId: number,
 *     maxId: number,
 *     entry: import("./effectTypeRegistry.js").EffectTypeEntry | null,
 *     phase?: string,
 *     running: boolean
 *   }) => void,
 *   onComplete?: (summary: {
 *     scanned: number,
 *     confirmed: number,
 *     unused: number,
 *     unknown: number
 *   }) => void
 * }} DiscoveryDeps
 */

export class EffectTypeDiscovery {
  /**
   * @param {DiscoveryDeps} deps
   */
  constructor(deps) {
    this.deps = deps;
    this.running = false;
    this.abortRequested = false;
    this.slotKey = "stompA";
    this.responseTimeoutMs = DEFAULT_RESPONSE_TIMEOUT_MS;
    this.maxId = DEFAULT_MAX_ID;
    this.currentId = -1;
    /** @type {null | (() => void)} */
    this.cancelWait = null;
  }

  /**
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }

  /**
   * @param {string} slotKey
   */
  setSlotKey(slotKey) {
    if (this.running) return;
    if (EFFECT_TYPE_PARAMETERS[slotKey] != null) {
      this.slotKey = slotKey;
    }
  }

  /**
   * Maximum time to wait for a Kemper response after each write.
   * @param {number} timeoutMs
   */
  setResponseTimeoutMs(timeoutMs) {
    const n = Number(timeoutMs);
    if (!Number.isFinite(n)) return;
    this.responseTimeoutMs = Math.max(200, Math.min(5000, Math.round(n)));
  }

  /** @deprecated Use setResponseTimeoutMs */
  setDelayMs(delayMs) {
    this.setResponseTimeoutMs(delayMs);
  }

  requestStop() {
    this.abortRequested = true;
    this.cancelWait?.();
  }

  async start() {
    if (this.running) return;
    const typeParamId = EFFECT_TYPE_PARAMETERS[this.slotKey];
    if (typeParamId == null) {
      throw new Error(`No type parameter for slot "${this.slotKey}"`);
    }
    if (typeof this.deps.subscribeParameters !== "function") {
      throw new Error("Effect Type Discovery requires subscribeParameters");
    }

    this.running = true;
    this.abortRequested = false;
    this.currentId = -1;

    let confirmed = 0;
    let unused = 0;
    let unknown = 0;
    let scanned = 0;

    try {
      await this.deps.ensureMidi();
      // Ensure Kemper echoes MIDI-written type changes during the scan.
      this.deps.setParameterEchoEnabled?.(true);

      for (let id = 0; id <= this.maxId; id += 1) {
        if (this.abortRequested) break;
        this.currentId = id;

        this.deps.onProgress?.({
          currentId: id,
          maxId: this.maxId,
          entry: null,
          phase: "write",
          running: true
        });

        // Exactly one outstanding write.
        const writeResult = await parameterService.setParameter(typeParamId, id);
        if (!writeResult.ok) {
          const entry = recordDiscoveredEffect(id, "No Response", "unknown");
          unknown += 1;
          scanned += 1;
          this.deps.onProgress?.({
            currentId: id,
            maxId: this.maxId,
            entry,
            phase: "no-response",
            running: true
          });
          continue;
        }

        this.deps.onProgress?.({
          currentId: id,
          maxId: this.maxId,
          entry: null,
          phase: "waiting",
          running: true
        });

        // Wait for Kemper bidirectional echo of THIS type id (event-driven).
        const echo = await this.waitForTypeEcho(
          typeParamId,
          id,
          this.responseTimeoutMs
        );

        if (this.abortRequested) break;

        if (!echo) {
          const entry = recordDiscoveredEffect(id, "No Response", "unknown");
          unknown += 1;
          scanned += 1;
          this.deps.onProgress?.({
            currentId: id,
            maxId: this.maxId,
            entry,
            phase: "no-response",
            running: true
          });
          continue;
        }

        // Echo confirmed for the correct ID — resolve decoded effect name.
        let rendered = echo.ascii || "";
        if (!rendered) {
          try {
            const nameResult = await this.deps.readEffectTypeName(
              this.slotKey,
              id,
              this.responseTimeoutMs
            );
            // null => request timed out / no string frame
            if (nameResult === null) {
              const entry = recordDiscoveredEffect(id, "No Response", "unknown");
              unknown += 1;
              scanned += 1;
              this.deps.onProgress?.({
                currentId: id,
                maxId: this.maxId,
                entry,
                phase: "no-response",
                running: true
              });
              continue;
            }
            rendered = nameResult;
          } catch {
            rendered = "";
          }
        }

        if (this.abortRequested) break;

        const classified = classifyDiscoveredName(id, rendered);
        const entry = recordDiscoveredEffect(
          id,
          classified.name,
          classified.status
        );

        if (classified.status === "confirmed") confirmed += 1;
        else if (classified.status === "unused") unused += 1;
        else unknown += 1;
        scanned += 1;

        this.deps.onProgress?.({
          currentId: id,
          maxId: this.maxId,
          entry,
          phase: "stored",
          running: true
        });
      }

      persist();

      const summary = { scanned, confirmed, unused, unknown };
      this.deps.onComplete?.(summary);

      downloadEffectTypeRegistryJson(
        exportEffectTypeRegistryJson(),
        `kemper-effect-types-discovery-${Date.now()}.json`
      );
    } finally {
      this.cancelWait?.();
      this.cancelWait = null;
      this.deps.setParameterEchoEnabled?.(false);
      this.running = false;
      this.abortRequested = false;
      this.deps.onProgress?.({
        currentId: this.currentId,
        maxId: this.maxId,
        entry: null,
        phase: "idle",
        running: false
      });
    }
  }

  /**
   * Wait until bidirectional traffic reports typeParamId = expectedId.
   * @param {number} typeParamId
   * @param {number} expectedId
   * @param {number} timeoutMs
   * @returns {Promise<{
   *   rawValue: number | null,
   *   ascii: string | null,
   *   state: import("./decoder/parameterState.js").ParameterState
   * } | null>}
   */
  waitForTypeEcho(typeParamId, expectedId, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        unsubscribe();
        this.cancelWait = null;
        resolve(value);
      };

      const timer = window.setTimeout(() => {
        finish(null);
      }, timeoutMs);

      const unsubscribe = this.deps.subscribeParameters((event) => {
        if (this.abortRequested) {
          finish(null);
          return;
        }

        const state = event?.result?.state;
        const decoded = event?.decoded;
        if (!state || state.id !== typeParamId) return;
        if (state.rawValue !== expectedId) return;

        const ascii =
          (decoded?.hasReadableAscii && decoded.ascii) ||
          (state.ascii != null && state.ascii !== "" ? state.ascii : null);

        finish({
          rawValue: state.rawValue,
          ascii,
          state
        });
      });

      this.cancelWait = () => finish(null);
    });
  }
}
