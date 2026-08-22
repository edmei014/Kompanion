/**
 * Persistent Protocol Explorer history + learned enum maps.
 */

import { formatParameterIdHex } from "./decoder/parameterRegistry.js";

const STORAGE_KEY = "kompanion.protocol-explorer-history";
const MAX_SESSIONS = 40;
const MAX_STEPS_PER_SESSION = 200;

/**
 * @typedef {{
 *   at: number,
 *   action: string,
 *   raw: number | null,
 *   decoded: string,
 *   label: string
 * }} ExplorerStep
 *
 * @typedef {{
 *   id: string,
 *   idNum: number,
 *   name: string,
 *   originalRaw: number | null,
 *   startedAt: number,
 *   updatedAt: number,
 *   steps: ExplorerStep[],
 *   enums: Record<string, string>
 * }} ExplorerSession
 */

/** @type {Map<number, ExplorerSession>} */
const sessions = new Map();

/** @type {Set<() => void>} */
const listeners = new Set();

let persistTimer = null;

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn("[Protocol Explorer] listener failed:", error);
    }
  }
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistExplorerHistory();
  }, 200);
}

export function persistExplorerHistory() {
  try {
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      sessions: listExplorerSessions()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadExplorerHistory() {
  sessions.clear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
    for (const row of rows) {
      const idNum = Number(row?.idNum);
      if (!Number.isFinite(idNum)) continue;
      sessions.set(idNum & 0xffff, {
        id: formatParameterIdHex(idNum),
        idNum: idNum & 0xffff,
        name: String(row.name || formatParameterIdHex(idNum)),
        originalRaw:
          row.originalRaw == null || !Number.isFinite(Number(row.originalRaw))
            ? null
            : Number(row.originalRaw),
        startedAt: Number(row.startedAt) || Date.now(),
        updatedAt: Number(row.updatedAt) || Date.now(),
        steps: Array.isArray(row.steps) ? row.steps.slice(0, MAX_STEPS_PER_SESSION) : [],
        enums:
          row.enums && typeof row.enums === "object" ? { ...row.enums } : {}
      });
    }
  } catch {
    sessions.clear();
  }
}

/**
 * @returns {ExplorerSession[]}
 */
export function listExplorerSessions() {
  return [...sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * @param {number} idNum
 * @returns {ExplorerSession | null}
 */
export function getExplorerSession(idNum) {
  return sessions.get(idNum & 0xffff) ?? null;
}

/**
 * @param {number} idNum
 * @param {{ name?: string, originalRaw?: number | null }} meta
 * @returns {ExplorerSession}
 */
export function beginExplorerSession(idNum, meta = {}) {
  const id = idNum & 0xffff;
  const existing = sessions.get(id);
  const now = Date.now();
  if (existing) {
    existing.name = meta.name || existing.name;
    if (meta.originalRaw != null) {
      existing.originalRaw = meta.originalRaw;
    }
    existing.updatedAt = now;
    touchSessionOrder(id, existing);
    schedulePersist();
    notify();
    return existing;
  }

  /** @type {ExplorerSession} */
  const created = {
    id: formatParameterIdHex(id),
    idNum: id,
    name: meta.name || formatParameterIdHex(id),
    originalRaw: meta.originalRaw ?? null,
    startedAt: now,
    updatedAt: now,
    steps: [],
    enums: {}
  };
  sessions.set(id, created);
  pruneSessions();
  schedulePersist();
  notify();
  return created;
}

/**
 * @param {number} idNum
 * @param {ExplorerStep} step
 * @returns {ExplorerSession | null}
 */
export function appendExplorerStep(idNum, step) {
  const session = sessions.get(idNum & 0xffff);
  if (!session) return null;
  session.steps.push({
    at: step.at || Date.now(),
    action: String(step.action || ""),
    raw: step.raw == null ? null : Number(step.raw),
    decoded: String(step.decoded || ""),
    label: String(step.label || "")
  });
  if (session.steps.length > MAX_STEPS_PER_SESSION) {
    session.steps = session.steps.slice(-MAX_STEPS_PER_SESSION);
  }
  session.updatedAt = Date.now();
  if (step.raw != null && step.label) {
    session.enums[String(step.raw)] = step.label;
  }
  schedulePersist();
  notify();
  return session;
}

/**
 * @param {number} idNum
 * @param {number} raw
 * @param {string} label
 */
export function learnExplorerEnum(idNum, raw, label) {
  const session = sessions.get(idNum & 0xffff);
  const text = String(label || "").trim();
  if (!session || !text || raw == null || !Number.isFinite(Number(raw))) return;
  session.enums[String(Math.trunc(raw))] = text;
  session.updatedAt = Date.now();
  schedulePersist();
  notify();
}

/**
 * @param {number} idNum
 * @returns {Array<{ value: number, label: string }>}
 */
export function listExplorerEnums(idNum) {
  const session = sessions.get(idNum & 0xffff);
  if (!session) return [];
  return Object.entries(session.enums)
    .map(([value, label]) => ({
      value: Number(value),
      label: String(label)
    }))
    .filter((row) => Number.isFinite(row.value) && row.label)
    .sort((a, b) => a.value - b.value);
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeExplorerHistory(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {number} id
 * @param {ExplorerSession} session
 */
function touchSessionOrder(id, session) {
  sessions.delete(id);
  sessions.set(id, session);
}

function pruneSessions() {
  if (sessions.size <= MAX_SESSIONS) return;
  const ordered = listExplorerSessions();
  for (let i = MAX_SESSIONS; i < ordered.length; i += 1) {
    sessions.delete(ordered[i].idNum);
  }
}

loadExplorerHistory();
