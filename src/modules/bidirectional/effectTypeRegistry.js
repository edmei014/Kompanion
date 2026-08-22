/**
 * Kemper Effect Type Registry.
 *
 * Filled primarily by active discovery (write type ID → read name).
 * Also accepts live observations. Persists across restarts.
 */

const STORAGE_KEY = "kompanion.effect-type-registry";

/** @typedef {"confirmed" | "unused" | "unknown" | "seeded"} EffectTypeStatus */

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   status: EffectTypeStatus,
 *   confirmed: boolean,
 *   firstSeen: number | null,
 *   occurrences: number
 * }} EffectTypeEntry
 */

/** @type {Map<number, EffectTypeEntry>} */
const registry = new Map();

/** @type {Set<() => void>} */
const listeners = new Set();

let persistTimer = null;

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeName(value) {
  return String(value || "").trim();
}

/**
 * @param {unknown} id
 * @returns {number | null}
 */
function normalizeId(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  const truncated = Math.trunc(n);
  if (truncated < 0) return null;
  return truncated;
}

/**
 * @param {unknown} status
 * @returns {EffectTypeStatus}
 */
function normalizeStatus(status) {
  if (
    status === "confirmed" ||
    status === "unused" ||
    status === "unknown" ||
    status === "seeded"
  ) {
    return status;
  }
  return "unknown";
}

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn("[Effect Type Registry] listener failed:", error);
    }
  }
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persist();
  }, 200);
}

/**
 * @param {Partial<EffectTypeEntry> & { id: number }} entry
 * @returns {EffectTypeEntry}
 */
function normalizeEntry(entry) {
  const status = normalizeStatus(entry.status);
  const name = normalizeName(entry.name) || statusLabel(status);
  return {
    id: entry.id,
    name,
    status,
    confirmed: status === "confirmed" || entry.confirmed === true,
    firstSeen:
      typeof entry.firstSeen === "number" ? entry.firstSeen : null,
    occurrences:
      typeof entry.occurrences === "number" && entry.occurrences >= 0
        ? entry.occurrences
        : 0
  };
}

/**
 * @param {EffectTypeStatus} status
 * @returns {string}
 */
function statusLabel(status) {
  switch (status) {
    case "unused":
      return "Unused";
    case "unknown":
      return "Unknown";
    case "seeded":
      return "Seeded";
    default:
      return "";
  }
}

export function persist() {
  try {
    const payload = {
      version: 2,
      updatedAt: Date.now(),
      effects: listEffectTypes({ sort: "id" })
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}

export function loadEffectTypeRegistry() {
  registry.clear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const effects = Array.isArray(parsed?.effects) ? parsed.effects : [];
    for (const entry of effects) {
      const id = normalizeId(entry?.id);
      if (id == null) continue;
      const name = normalizeName(entry?.name);
      const status = normalizeStatus(
        entry?.status ?? (entry?.confirmed ? "confirmed" : name ? "seeded" : "unknown")
      );
      if (!name && status === "seeded") continue;
      registry.set(
        id,
        normalizeEntry({
          id,
          name,
          status,
          confirmed: entry?.confirmed,
          firstSeen: entry?.firstSeen,
          occurrences: entry?.occurrences
        })
      );
    }
  } catch {
    registry.clear();
  }
}

/**
 * Soft-seed names from a static map until discovery confirms them.
 * @param {Record<number, string>} seedMap
 */
export function seedEffectTypeNames(seedMap) {
  if (!seedMap || typeof seedMap !== "object") return;
  let changed = false;
  for (const [key, value] of Object.entries(seedMap)) {
    const id = normalizeId(key);
    const name = normalizeName(value);
    if (id == null || !name) continue;
    const existing = registry.get(id);
    if (!existing) {
      registry.set(
        id,
        normalizeEntry({
          id,
          name,
          status: "seeded",
          confirmed: false,
          firstSeen: null,
          occurrences: 0
        })
      );
      changed = true;
    } else if (existing.status === "unknown" || existing.status === "unused") {
      // Keep discovery results authoritative over seeds.
      continue;
    } else if (!existing.name) {
      existing.name = name;
      changed = true;
    }
  }
  if (changed) {
    schedulePersist();
    notify();
  }
}

/**
 * Record one discovery scan result (authoritative for that ID).
 * @param {number} effectId
 * @param {string} effectName
 * @param {EffectTypeStatus} status
 * @returns {EffectTypeEntry | null}
 */
export function recordDiscoveredEffect(effectId, effectName, status) {
  const id = normalizeId(effectId);
  if (id == null) return null;

  const normalizedStatus = normalizeStatus(status);
  const name =
    normalizeName(effectName) || statusLabel(normalizedStatus) || "Unknown";
  const now = Date.now();
  const existing = registry.get(id);
  const next = normalizeEntry({
    id,
    name,
    status: normalizedStatus,
    confirmed: normalizedStatus === "confirmed",
    firstSeen: existing?.firstSeen ?? now,
    occurrences: (existing?.occurrences ?? 0) + 1
  });
  registry.set(id, next);
  schedulePersist();
  notify();
  return next;
}

/**
 * Observe a live effect type integer together with its decoded name.
 * @param {number} effectId
 * @param {string} effectName
 * @returns {EffectTypeEntry | null}
 */
export function observeEffectType(effectId, effectName) {
  const id = normalizeId(effectId);
  const name = normalizeName(effectName);
  if (id == null || !name) return null;

  const now = Date.now();
  const existing = registry.get(id);
  if (!existing) {
    const created = normalizeEntry({
      id,
      name,
      status: "confirmed",
      confirmed: true,
      firstSeen: now,
      occurrences: 1
    });
    registry.set(id, created);
    schedulePersist();
    notify();
    return created;
  }

  // Do not overwrite discovery "unused/unknown" with a weak live guess unless
  // the live name is clearly valid and different from placeholder labels.
  if (
    (existing.status === "unused" || existing.status === "unknown") &&
    (name === "Unused" || name === "Unknown")
  ) {
    existing.occurrences += 1;
    schedulePersist();
    notify();
    return existing;
  }

  existing.name = name;
  existing.status = "confirmed";
  existing.confirmed = true;
  existing.occurrences += 1;
  if (existing.firstSeen == null) existing.firstSeen = now;
  schedulePersist();
  notify();
  return existing;
}

/**
 * @param {number} effectId
 * @returns {EffectTypeEntry | null}
 */
export function lookupEffectType(effectId) {
  const id = normalizeId(effectId);
  if (id == null) return null;
  return registry.get(id) ?? null;
}

/**
 * @param {number} effectId
 * @returns {string}
 */
export function getEffectTypeName(effectId) {
  const entry = lookupEffectType(effectId);
  if (!entry) return "";
  if (entry.status === "unused" || entry.status === "unknown") return "";
  return entry.name || "";
}

/**
 * @param {{ sort?: "name" | "id", confirmedOnly?: boolean }} [options]
 * @returns {EffectTypeEntry[]}
 */
export function listEffectTypes(options = {}) {
  const sort = options.sort || "id";
  let rows = [...registry.values()];
  if (options.confirmedOnly) {
    rows = rows.filter((row) => row.confirmed || row.status === "confirmed");
  }
  rows.sort((left, right) => {
    if (sort === "name") {
      const byName = left.name.localeCompare(right.name, undefined, {
        sensitivity: "base"
      });
      if (byName !== 0) return byName;
    }
    return left.id - right.id;
  });
  return rows;
}

/**
 * @returns {string}
 */
export function exportEffectTypeRegistryJson() {
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      effects: listEffectTypes({ sort: "id" }).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        confirmed: row.confirmed,
        firstSeen: row.firstSeen,
        occurrences: row.occurrences
      }))
    },
    null,
    2
  );
}

/**
 * @param {BlobPart} json
 * @param {string} [filename]
 */
export function downloadEffectTypeRegistryJson(json, filename) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = filename || `kemper-effect-types-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Classify a rendered/decoded name from the Kemper.
 * @param {number} effectId
 * @param {string} rawName
 * @returns {{ status: EffectTypeStatus, name: string }}
 */
export function classifyDiscoveredName(effectId, rawName) {
  const id = normalizeId(effectId) ?? -1;
  const name = normalizeName(rawName);

  if (id === 0) {
    return {
      status: "confirmed",
      name: name || "Empty"
    };
  }

  if (!name) {
    return { status: "unused", name: "Unused" };
  }

  const lowered = name.toLowerCase();
  if (
    lowered === "no response" ||
    lowered === "no_response" ||
    lowered === "timeout"
  ) {
    return { status: "unknown", name: "No Response" };
  }

  if (
    lowered === "unused" ||
    lowered === "unknown" ||
    lowered === "invalid" ||
    lowered === "none" ||
    lowered === "—" ||
    lowered === "-"
  ) {
    return {
      status: lowered === "unknown" ? "unknown" : "unused",
      name: lowered === "unknown" ? "Unknown" : "Unused"
    };
  }

  // Pure numeric echo is not a useful effect label.
  if (/^\d+$/.test(name)) {
    return { status: "unknown", name: "Unknown" };
  }

  return { status: "confirmed", name };
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeEffectTypeRegistry(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

loadEffectTypeRegistry();
