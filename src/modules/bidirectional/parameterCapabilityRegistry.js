/**
 * Persistent Kemper parameter capability registry.
 * Accumulates Read / Write / Push support discovered by the Research Lab.
 */

import { formatParameterIdHex } from "./decoder/parameterRegistry.js";

const STORAGE_KEY = "kompanion.parameter-capability-registry";

/**
 * @typedef {boolean | null} CapabilityFlag
 *
 * @typedef {{
 *   id: string,
 *   idNum: number,
 *   name: string,
 *   supportsRead: CapabilityFlag,
 *   supportsWrite: CapabilityFlag,
 *   supportsPush: CapabilityFlag,
 *   scale: string,
 *   firstSeen: string | null,
 *   lastProbed: string | null,
 *   notes: string
 * }} ParameterCapability
 */

/** @type {Map<number, ParameterCapability>} */
const registry = new Map();

/** @type {Set<() => void>} */
const listeners = new Set();

let persistTimer = null;

/**
 * @param {number} id
 * @returns {number}
 */
function normalizeId(id) {
  return id & 0xffff;
}

/**
 * @param {Partial<ParameterCapability> & { idNum: number }} partial
 * @returns {ParameterCapability}
 */
function normalizeEntry(partial) {
  const idNum = normalizeId(partial.idNum);
  return {
    id: formatParameterIdHex(idNum),
    idNum,
    name: String(partial.name || formatParameterIdHex(idNum)),
    supportsRead:
      partial.supportsRead === true || partial.supportsRead === false
        ? partial.supportsRead
        : null,
    supportsWrite:
      partial.supportsWrite === true || partial.supportsWrite === false
        ? partial.supportsWrite
        : null,
    supportsPush:
      partial.supportsPush === true || partial.supportsPush === false
        ? partial.supportsPush
        : null,
    scale: String(partial.scale || "unknown"),
    firstSeen: partial.firstSeen ?? null,
    lastProbed: partial.lastProbed ?? null,
    notes: String(partial.notes || "")
  };
}

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn("[Capability Registry] listener failed:", error);
    }
  }
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistParameterCapabilities();
  }, 200);
}

export function persistParameterCapabilities() {
  try {
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      parameters: listParameterCapabilities()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}

export function loadParameterCapabilities() {
  registry.clear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed?.parameters) ? parsed.parameters : [];
    for (const row of rows) {
      const idNum = Number(row?.idNum ?? parseInt(String(row?.id || ""), 16));
      if (!Number.isFinite(idNum)) continue;
      registry.set(normalizeId(idNum), normalizeEntry({ ...row, idNum }));
    }
  } catch {
    registry.clear();
  }
}

/**
 * @param {number} idNum
 * @param {Partial<ParameterCapability>} patch
 * @returns {ParameterCapability}
 */
export function upsertParameterCapability(idNum, patch = {}) {
  const id = normalizeId(idNum);
  const existing = registry.get(id);
  const now = new Date().toISOString();
  const next = normalizeEntry({
    idNum: id,
    name: patch.name ?? existing?.name ?? formatParameterIdHex(id),
    supportsRead:
      patch.supportsRead !== undefined
        ? patch.supportsRead
        : (existing?.supportsRead ?? null),
    supportsWrite:
      patch.supportsWrite !== undefined
        ? patch.supportsWrite
        : (existing?.supportsWrite ?? null),
    supportsPush:
      patch.supportsPush !== undefined
        ? patch.supportsPush
        : (existing?.supportsPush ?? null),
    scale: patch.scale ?? existing?.scale ?? "unknown",
    firstSeen: existing?.firstSeen ?? patch.firstSeen ?? now,
    lastProbed:
      patch.lastProbed !== undefined
        ? patch.lastProbed
        : (existing?.lastProbed ?? null),
    notes: patch.notes ?? existing?.notes ?? ""
  });
  registry.set(id, next);
  schedulePersist();
  notify();
  return next;
}

/**
 * Mark unsolicited traffic as push-capable.
 * @param {number} idNum
 * @param {{ name?: string, scale?: string }} [meta]
 */
export function markParameterPushObserved(idNum, meta = {}) {
  const existing = lookupParameterCapability(idNum);
  return upsertParameterCapability(idNum, {
    name: meta.name || existing?.name,
    scale: meta.scale || existing?.scale,
    supportsPush: true,
    firstSeen: existing?.firstSeen ?? new Date().toISOString()
  });
}

/**
 * @param {number} idNum
 * @returns {ParameterCapability | null}
 */
export function lookupParameterCapability(idNum) {
  return registry.get(normalizeId(idNum)) ?? null;
}

/**
 * @returns {ParameterCapability[]}
 */
export function listParameterCapabilities() {
  return [...registry.values()].sort((left, right) => left.idNum - right.idNum);
}

/**
 * @returns {string}
 */
export function exportParameterCapabilitiesJson() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      parameters: listParameterCapabilities()
    },
    null,
    2
  );
}

/**
 * @param {string} [filename]
 */
export function downloadParameterCapabilitiesJson(filename) {
  const json = exportParameterCapabilitiesJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = filename || `kemper-parameter-capabilities-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeParameterCapabilities(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

loadParameterCapabilities();
