/**
 * Interactive Protocol Explorer — one parameter at a time.
 *
 * Write → automatic read-back → display / log / enum learning.
 * Captures original value and restores after exploration.
 */

import {
  buildSingleParameterChange,
  buildSingleParameterRequest,
  clampRaw14
} from "./decoder/protocolMessages.js";
import { lookupParameter } from "./decoder/parameterRegistry.js";
import { applyScaleFunction } from "./decoder/parameterScales.js";
import { EFFECT_TYPE_PARAMETERS } from "./controlBindings.js";
import { lookupParameterCapability } from "./parameterCapabilityRegistry.js";
import {
  appendExplorerStep,
  beginExplorerSession,
  getExplorerSession,
  learnExplorerEnum,
  listExplorerEnums
} from "./protocolExplorerStore.js";
import { observeEffectType } from "./effectTypeRegistry.js";

const RESPONSE_TIMEOUT_MS = 1500;
const EFFECT_TYPE_ID_SET = new Set(Object.values(EFFECT_TYPE_PARAMETERS));

/**
 * @typedef {{
 *   discovery: import("./BidirectionalDiscovery.js").BidirectionalDiscovery,
 *   resolveLabel?: (parameterId: number, rawValue: number) => Promise<string>,
 *   onChange?: () => void
 * }} ExplorerOptions
 */

export class ProtocolExplorer {
  /**
   * @param {ExplorerOptions} options
   */
  constructor(options) {
    this.discovery = options.discovery;
    this.resolveLabel = options.resolveLabel ?? null;
    this.onChange = options.onChange ?? null;

    /** @type {number | null} */
    this.activeId = null;
    /** @type {number | null} */
    this.originalRaw = null;
    /** @type {number | null} */
    this.currentRaw = null;
    /** @type {string} */
    this.currentDecoded = "—";
    /** @type {string} */
    this.currentLabel = "";
    /** @type {boolean} */
    this.busy = false;
    /** @type {string} */
    this.status = "idle";

    /** @type {null | {
     *   id: number,
     *   resolve: (state: import("./decoder/parameterState.js").ParameterState | null) => void
     * }} */
    this.waitHandle = null;
  }

  /**
   * @param {import("./decoder/parameterState.js").ParameterState} state
   */
  onParameterState(state) {
    if (!this.waitHandle) return;
    if (state.id !== this.waitHandle.id) return;
    if (state.rawValue == null) return;
    const { resolve } = this.waitHandle;
    this.waitHandle = null;
    resolve(state);
  }

  /**
   * Begin exploring a parameter — captures original value via read when possible.
   * @param {number} parameterId
   */
  async begin(parameterId) {
    if (this.busy) return;
    const id = parameterId & 0xffff;

    // Already exploring this parameter — keep the original restore baseline.
    if (this.activeId === id) {
      this.status = "ready";
      this.notify();
      return;
    }

    // Restore previous session parameter before switching.
    if (this.activeId != null) {
      await this.restoreOriginal({ silent: true });
    }

    this.busy = true;
    this.activeId = id;
    this.status = "starting";
    this.notify();

    try {
      const existing = this.discovery.getParameter(id);
      const definition = lookupParameter(id);
      const name = existing?.name || definition?.name || `0x${id.toString(16)}`;

      // Prefer a fresh read as the restore baseline.
      const readState = await this.readRaw(id);
      const original =
        readState?.rawValue ??
        existing?.rawValue ??
        null;

      this.originalRaw = original;
      this.currentRaw = original;
      this.currentDecoded = this.decodeRaw(id, original);
      this.currentLabel = "";

      beginExplorerSession(id, {
        name,
        originalRaw: original
      });

      if (original != null) {
        const label = await this.maybeResolveLabel(id, original);
        this.currentLabel = label;
        if (label) {
          learnExplorerEnum(id, original, label);
          this.maybeObserveEffectType(id, original, label);
        }
        appendExplorerStep(id, {
          at: Date.now(),
          action: "begin",
          raw: original,
          decoded: this.currentDecoded,
          label
        });
      }

      this.status = "ready";
    } catch (error) {
      console.warn("[Protocol Explorer] begin failed:", error);
      this.status = "error";
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  /**
   * @returns {boolean}
   */
  isBusy() {
    return this.busy;
  }

  /**
   * @returns {number | null}
   */
  getActiveId() {
    return this.activeId;
  }

  getSnapshot() {
    const id = this.activeId;
    const session = id == null ? null : getExplorerSession(id);
    const capability = id == null ? null : lookupParameterCapability(id);
    const definition = id == null ? null : lookupParameter(id);
    const state = id == null ? null : this.discovery.getParameter(id);
    const enums = id == null ? [] : listExplorerEnums(id);

    return {
      id,
      idHex: session?.id || (id == null ? "—" : `0x${id.toString(16).toUpperCase().padStart(4, "0")}`),
      name: session?.name || state?.name || definition?.name || "—",
      raw: this.currentRaw,
      decoded: this.currentDecoded,
      label: this.currentLabel,
      originalRaw: this.originalRaw,
      supportsRead: capability?.supportsRead ?? null,
      supportsWrite: capability?.supportsWrite ?? null,
      supportsPush: capability?.supportsPush ?? null,
      isEffectType: id != null && EFFECT_TYPE_ID_SET.has(id),
      isContinuous: id != null && !EFFECT_TYPE_ID_SET.has(id),
      enums,
      steps: session?.steps ? [...session.steps].reverse() : [],
      status: this.status,
      busy: this.busy
    };
  }

  async read() {
    return this.runAction("read", async () => {
      if (this.activeId == null) return;
      const state = await this.readRaw(this.activeId);
      if (!state || state.rawValue == null) {
        this.status = "no_response";
        return;
      }
      await this.applyObserved(this.activeId, state.rawValue, "read");
      this.status = "ready";
    });
  }

  async refresh() {
    return this.read();
  }

  /**
   * @param {number} delta
   */
  async step(delta) {
    return this.runAction(`step:${delta > 0 ? "+" : ""}${delta}`, async () => {
      if (this.activeId == null) return;
      const base =
        this.currentRaw ??
        this.discovery.getParameter(this.activeId)?.rawValue ??
        null;
      if (base == null) {
        const state = await this.readRaw(this.activeId);
        if (!state || state.rawValue == null) {
          this.status = "no_response";
          return;
        }
        this.currentRaw = state.rawValue;
      }

      const next = clampRaw14((this.currentRaw ?? 0) + delta);
      const wrote = this.discovery.sendResearchSysEx(
        buildSingleParameterChange(this.activeId, next)
      );
      if (!wrote) {
        this.status = "error";
        return;
      }

      // Prefer echo; fall back to explicit read.
      let state = await this.waitForParameter(this.activeId, 700);
      if (!state || state.rawValue == null) {
        state = await this.readRaw(this.activeId);
      }
      if (!state || state.rawValue == null) {
        this.status = "no_response";
        return;
      }

      await this.applyObserved(
        this.activeId,
        state.rawValue,
        delta > 0 ? `+${delta}` : `${delta}`
      );
      this.status = "ready";
    });
  }

  async restoreOriginal(options = {}) {
    const silent = Boolean(options.silent);
    return this.runAction("restore", async () => {
      if (this.activeId == null || this.originalRaw == null) {
        this.status = "ready";
        return;
      }

      if (this.currentRaw === this.originalRaw) {
        this.status = silent ? "ready" : "restored";
        return;
      }

      const wrote = this.discovery.sendResearchSysEx(
        buildSingleParameterChange(this.activeId, this.originalRaw)
      );
      if (!wrote) {
        this.status = "error";
        return;
      }

      let state = await this.waitForParameter(this.activeId, 700);
      if (!state || state.rawValue == null) {
        state = await this.readRaw(this.activeId);
      }
      if (state?.rawValue != null) {
        await this.applyObserved(this.activeId, state.rawValue, "restore");
      } else {
        this.currentRaw = this.originalRaw;
        this.currentDecoded = this.decodeRaw(this.activeId, this.originalRaw);
      }
      this.status = silent ? "ready" : "restored";
    });
  }

  /**
   * Restore original value and clear the active exploration target.
   */
  async end() {
    const deadline = Date.now() + 4000;
    while (this.busy && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }

    if (this.activeId != null) {
      await this.restoreOriginal({ silent: true });
    }
    this.activeId = null;
    this.originalRaw = null;
    this.currentRaw = null;
    this.currentDecoded = "—";
    this.currentLabel = "";
    this.status = "idle";
    this.notify();
  }

  /**
   * @param {number} id
   * @returns {boolean}
   */
  isWaitingFor(id) {
    return this.waitHandle?.id === (id & 0xffff);
  }

  /**
   * @param {string} action
   * @param {() => Promise<void>} fn
   */
  async runAction(action, fn) {
    if (this.busy || this.activeId == null) return;
    this.busy = true;
    this.status = action;
    this.notify();
    try {
      await fn();
    } catch (error) {
      console.warn("[Protocol Explorer] action failed:", error);
      this.status = "error";
    } finally {
      this.busy = false;
      this.notify();
    }
  }

  /**
   * @param {number} id
   * @param {number} raw
   * @param {string} action
   */
  async applyObserved(id, raw, action) {
    this.currentRaw = raw;
    this.currentDecoded = this.decodeRaw(id, raw);
    const label = await this.maybeResolveLabel(id, raw);
    this.currentLabel = label;
    if (label) {
      learnExplorerEnum(id, raw, label);
      this.maybeObserveEffectType(id, raw, label);
    }
    appendExplorerStep(id, {
      at: Date.now(),
      action,
      raw,
      decoded: this.currentDecoded,
      label
    });
  }

  /**
   * @param {number} id
   * @returns {Promise<import("./decoder/parameterState.js").ParameterState | null>}
   */
  async readRaw(id) {
    const sent = this.discovery.sendResearchSysEx(buildSingleParameterRequest(id));
    if (!sent) return null;
    return this.waitForParameter(id, RESPONSE_TIMEOUT_MS);
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
   * @param {number | null} raw
   * @returns {string}
   */
  decodeRaw(id, raw) {
    if (raw == null) return "—";
    const definition = lookupParameter(id);
    const scaled = applyScaleFunction(definition?.scaleFunction, {
      raw,
      enumValues: definition?.enumValues
    });
    if (scaled.display && scaled.display !== "—") return scaled.display;
    return String(raw);
  }

  /**
   * @param {number} id
   * @param {number} raw
   * @returns {Promise<string>}
   */
  async maybeResolveLabel(id, raw) {
    if (!this.resolveLabel) return "";
    if (!EFFECT_TYPE_ID_SET.has(id) && !this.shouldTryLabel(id)) {
      // Still try for unknown params with small integer ranges / known enums.
      const existing = listExplorerEnums(id);
      if (!existing.length && raw > 400) return "";
    }
    try {
      const label = await this.resolveLabel(id, raw);
      return String(label || "").trim();
    } catch {
      return "";
    }
  }

  /**
   * @param {number} id
   * @returns {boolean}
   */
  shouldTryLabel(id) {
    return EFFECT_TYPE_ID_SET.has(id);
  }

  /**
   * @param {number} id
   * @param {number} raw
   * @param {string} label
   */
  maybeObserveEffectType(id, raw, label) {
    if (!EFFECT_TYPE_ID_SET.has(id) || !label) return;
    observeEffectType(raw, label);
  }

  notify() {
    this.onChange?.();
  }
}
