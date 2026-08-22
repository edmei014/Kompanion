/**
 * Live parameter state for the Kemper Live Inspector.
 * Stores current values, change log, and learn-mode snapshots.
 */

import {
  ensureParameter,
  formatParameterIdHex,
  lookupParameter
} from "./parameterRegistry.js";
import { applyScaleFunction } from "./parameterScales.js";
import { PARAMETER_TYPE } from "./parameterTypes.js";

const MAX_CHANGE_LOG = 400;
const RECENT_MS = 2500;

/**
 * @typedef {{
 *   id: number,
 *   idHex: string,
 *   name: string,
 *   category: string,
 *   type: string,
 *   known: boolean,
 *   unit: string,
 *   rawValue: number | null,
 *   ascii: string | null,
 *   scaledValue: string | number | boolean | null,
 *   scaledDisplay: string,
 *   compareKey: string,
 *   updatedAt: number,
 *   status: "Live" | "Updated" | "Unknown"
 * }} ParameterState
 *
 * @typedef {{
 *   id: number,
 *   idHex: string,
 *   name: string,
 *   oldValue: string,
 *   newValue: string,
 *   oldRaw: string,
 *   newRaw: string,
 *   at: number
 * }} ParameterChange
 */

/**
 * @param {import("./decodeSysEx.js").DecodedSysEx} decoded
 * @returns {string}
 */
function inferType(decoded) {
  if (decoded.hasReadableAscii && decoded.ascii) return PARAMETER_TYPE.STRING;
  return PARAMETER_TYPE.INTEGER;
}

/**
 * @param {string | number | boolean | null} left
 * @param {string | number | boolean | null} right
 * @returns {boolean}
 */
function valuesEqual(left, right) {
  return Object.is(left, right);
}

/**
 * @param {number | null} raw
 * @param {string | null} ascii
 * @returns {string}
 */
function formatRaw(raw, ascii) {
  if (ascii != null && ascii !== "") return ascii;
  if (raw == null) return "—";
  return String(raw);
}

export class ParameterStateStore {
  constructor() {
    /** @type {Map<number, ParameterState>} */
    this.current = new Map();
    /** @type {ParameterChange[]} */
    this.changeLog = [];
  }

  clear() {
    this.current.clear();
    this.changeLog = [];
  }

  clearChangeLog() {
    this.changeLog = [];
  }

  /**
   * @param {import("./decodeSysEx.js").DecodedSysEx} decoded
   */
  applyDecoded(decoded) {
    if (!decoded?.ok || decoded.parameterId == null) {
      return { changed: false, initial: false, entry: null, state: null };
    }

    if (decoded.functionCode === 0x7e) {
      return { changed: false, initial: false, entry: null, state: null };
    }

    const id = decoded.parameterId & 0xffff;
    const ascii =
      decoded.hasReadableAscii && decoded.ascii != null ? decoded.ascii : null;
    const rawValue = decoded.value;

    if (rawValue == null && ascii == null) {
      return { changed: false, initial: false, entry: null, state: null };
    }

    const definition = ensureParameter(id, {
      type: inferType(decoded),
      ascii: Boolean(ascii)
    });

    const scale = applyScaleFunction(definition.scaleFunction, {
      raw: rawValue,
      ascii,
      enumValues: definition.enumValues
    });

    // Compare key prefers scaled value, falls back to raw/ascii identity.
    const compareKey =
      scale.value != null
        ? `s:${String(scale.value)}`
        : ascii != null
          ? `a:${ascii}`
          : `r:${String(rawValue)}`;

    const previous = this.current.get(id);
    const now = Date.now();
    const scaledDisplay =
      scale.display === "—"
        ? "—"
        : definition.unit
          ? `${scale.display} ${definition.unit}`.trim()
          : scale.display;

    /** @type {ParameterState} */
    const nextState = {
      id,
      idHex: formatParameterIdHex(id),
      name: definition.name,
      category: definition.category,
      type: definition.type,
      known: definition.known,
      unit: definition.unit,
      rawValue,
      ascii,
      scaledValue: scale.value,
      scaledDisplay,
      compareKey,
      updatedAt: now,
      status: definition.known ? "Live" : "Unknown"
    };

    if (previous && valuesEqual(previous.compareKey, nextState.compareKey)) {
      previous.updatedAt = now;
      previous.rawValue = nextState.rawValue;
      previous.ascii = nextState.ascii;
      previous.scaledDisplay = nextState.scaledDisplay;
      previous.scaledValue = nextState.scaledValue;
      if (previous.status !== "Unknown") previous.status = "Live";
      return {
        changed: false,
        initial: false,
        entry: null,
        state: previous
      };
    }

    this.current.set(id, nextState);

    if (!previous) {
      return {
        changed: false,
        initial: true,
        entry: null,
        state: nextState
      };
    }

    nextState.status = definition.known ? "Updated" : "Unknown";

    /** @type {ParameterChange} */
    const entry = {
      id,
      idHex: nextState.idHex,
      name: nextState.name,
      oldValue: previous.scaledDisplay === "—"
        ? formatRaw(previous.rawValue, previous.ascii)
        : previous.scaledDisplay,
      newValue: nextState.scaledDisplay === "—"
        ? formatRaw(nextState.rawValue, nextState.ascii)
        : nextState.scaledDisplay,
      oldRaw: formatRaw(previous.rawValue, previous.ascii),
      newRaw: formatRaw(nextState.rawValue, nextState.ascii),
      at: now
    };

    this.changeLog.unshift(entry);
    if (this.changeLog.length > MAX_CHANGE_LOG) {
      this.changeLog.length = MAX_CHANGE_LOG;
    }

    return {
      changed: true,
      initial: false,
      entry,
      state: nextState
    };
  }

  /**
   * Refresh status badges (Updated → Live after a short window).
   */
  refreshStatuses() {
    const now = Date.now();
    this.current.forEach((state) => {
      if (state.status === "Updated" && now - state.updatedAt > RECENT_MS) {
        state.status = state.known ? "Live" : "Unknown";
      }
    });
  }

  /**
   * Snapshot for Learn Mode comparisons.
   *
   * @returns {Map<number, { compareKey: string, scaledDisplay: string, rawDisplay: string, name: string, idHex: string }>}
   */
  createSnapshot() {
    /** @type {Map<number, { compareKey: string, scaledDisplay: string, rawDisplay: string, name: string, idHex: string }>} */
    const snapshot = new Map();
    this.current.forEach((state, id) => {
      snapshot.set(id, {
        compareKey: state.compareKey,
        scaledDisplay:
          state.scaledDisplay === "—"
            ? formatRaw(state.rawValue, state.ascii)
            : state.scaledDisplay,
        rawDisplay: formatRaw(state.rawValue, state.ascii),
        name: state.name,
        idHex: state.idHex
      });
    });
    return snapshot;
  }

  /**
   * @param {Map<number, { compareKey: string, scaledDisplay: string, rawDisplay: string, name: string, idHex: string }>} snapshot
   */
  diffAgainstSnapshot(snapshot) {
    /** @type {Array<{ id: number, idHex: string, name: string, oldValue: string, newValue: string, oldRaw: string, newRaw: string }>} */
    const changes = [];

    this.current.forEach((state, id) => {
      const before = snapshot.get(id);
      if (!before) {
        changes.push({
          id,
          idHex: state.idHex,
          name: state.name,
          oldValue: "—",
          newValue:
            state.scaledDisplay === "—"
              ? formatRaw(state.rawValue, state.ascii)
              : state.scaledDisplay,
          oldRaw: "—",
          newRaw: formatRaw(state.rawValue, state.ascii)
        });
        return;
      }

      if (before.compareKey === state.compareKey) return;

      changes.push({
        id,
        idHex: state.idHex,
        name: state.name,
        oldValue: before.scaledDisplay,
        newValue:
          state.scaledDisplay === "—"
            ? formatRaw(state.rawValue, state.ascii)
            : state.scaledDisplay,
        oldRaw: before.rawDisplay,
        newRaw: formatRaw(state.rawValue, state.ascii)
      });
    });

    changes.sort((left, right) => left.name.localeCompare(right.name));
    return changes;
  }

  /**
   * @returns {ParameterState[]}
   */
  listCurrent() {
    this.refreshStatuses();
    return [...this.current.values()].sort((left, right) => {
      if (left.known !== right.known) return left.known ? -1 : 1;
      return (
        left.category.localeCompare(right.category) ||
        left.name.localeCompare(right.name) ||
        left.id - right.id
      );
    });
  }

  /**
   * @param {Iterable<number>} ids
   * @returns {ParameterState[]}
   */
  listWatched(ids) {
    this.refreshStatuses();
    const list = [];
    for (const id of ids) {
      const state = this.current.get(id & 0xffff);
      if (state) list.push(state);
      else {
        const definition = lookupParameter(id);
        if (!definition) continue;
        list.push({
          id: definition.id,
          idHex: formatParameterIdHex(definition.id),
          name: definition.name,
          category: definition.category,
          type: definition.type,
          known: definition.known,
          unit: definition.unit,
          rawValue: null,
          ascii: null,
          scaledValue: null,
          scaledDisplay: "—",
          compareKey: "",
          updatedAt: 0,
          status: definition.known ? "Live" : "Unknown"
        });
      }
    }
    return list.sort((left, right) => left.name.localeCompare(right.name));
  }

  /**
   * @returns {ParameterChange[]}
   */
  listChanges() {
    return [...this.changeLog];
  }
}
