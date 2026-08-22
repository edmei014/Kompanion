/**
 * Persistent Learning Wizard results — verified function → parameter assignments.
 */

import { formatParameterIdHex } from "./decoder/parameterRegistry.js";

const STORAGE_KEY = "kompanion.learned-parameters";
const MAX_SESSIONS = 80;

/**
 * @typedef {{
 *   id: string,
 *   idNum: number,
 *   name: string,
 *   verified: boolean,
 *   method: string,
 *   supportsRead: boolean | null,
 *   supportsWrite: boolean | null,
 *   supportsPush: boolean | null,
 *   confidence: number,
 *   assignedAt: string,
 *   notes: string
 * }} LearnedParameter
 *
 * @typedef {{
 *   id: string,
 *   functionName: string,
 *   parameterId: string | null,
 *   parameterIdNum: number | null,
 *   verified: boolean,
 *   supportsRead: boolean | null,
 *   supportsWrite: boolean | null,
 *   supportsPush: boolean | null,
 *   changedCount: number,
 *   status: "completed" | "rejected" | "aborted",
 *   startedAt: string,
 *   finishedAt: string
 * }} LearningSession
 */

/** @type {Map<number, LearnedParameter>} */
const assignments = new Map();

/** @type {LearningSession[]} */
let sessions = [];

/** @type {Set<() => void>} */
const listeners = new Set();

let persistTimer = null;

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn("[Learned Parameters] listener failed:", error);
    }
  }
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistLearnedParameters();
  }, 200);
}

export function persistLearnedParameters() {
  try {
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      assignments: listLearnedParameters(),
      sessions: listLearningSessions()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadLearnedParameters() {
  assignments.clear();
  sessions = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed?.assignments) ? parsed.assignments : [];
    for (const row of rows) {
      const idNum = Number(row?.idNum ?? parseInt(String(row?.id || ""), 16));
      if (!Number.isFinite(idNum)) continue;
      assignments.set(idNum & 0xffff, normalizeAssignment({ ...row, idNum }));
    }
    sessions = Array.isArray(parsed?.sessions)
      ? parsed.sessions.map(normalizeSession).filter(Boolean)
      : [];
  } catch {
    assignments.clear();
    sessions = [];
  }
}

/**
 * @param {Partial<LearnedParameter> & { idNum: number }} row
 * @returns {LearnedParameter}
 */
function normalizeAssignment(row) {
  const idNum = row.idNum & 0xffff;
  return {
    id: formatParameterIdHex(idNum),
    idNum,
    name: String(row.name || formatParameterIdHex(idNum)),
    verified: Boolean(row.verified),
    method: String(row.method || "Learning Wizard"),
    supportsRead:
      row.supportsRead === true || row.supportsRead === false
        ? row.supportsRead
        : null,
    supportsWrite:
      row.supportsWrite === true || row.supportsWrite === false
        ? row.supportsWrite
        : null,
    supportsPush:
      row.supportsPush === true || row.supportsPush === false
        ? row.supportsPush
        : null,
    confidence: Number.isFinite(Number(row.confidence))
      ? Number(row.confidence)
      : 1,
    assignedAt: String(row.assignedAt || new Date().toISOString()),
    notes: String(row.notes || "")
  };
}

/**
 * @param {Partial<LearningSession>} row
 * @returns {LearningSession | null}
 */
function normalizeSession(row) {
  if (!row || typeof row !== "object") return null;
  return {
    id: String(row.id || `session-${Date.now()}`),
    functionName: String(row.functionName || "Unknown"),
    parameterId: row.parameterId == null ? null : String(row.parameterId),
    parameterIdNum:
      row.parameterIdNum == null || !Number.isFinite(Number(row.parameterIdNum))
        ? null
        : Number(row.parameterIdNum) & 0xffff,
    verified: Boolean(row.verified),
    supportsRead:
      row.supportsRead === true || row.supportsRead === false
        ? row.supportsRead
        : null,
    supportsWrite:
      row.supportsWrite === true || row.supportsWrite === false
        ? row.supportsWrite
        : null,
    supportsPush:
      row.supportsPush === true || row.supportsPush === false
        ? row.supportsPush
        : null,
    changedCount: Number(row.changedCount) || 0,
    status:
      row.status === "rejected" || row.status === "aborted"
        ? row.status
        : "completed",
    startedAt: String(row.startedAt || new Date().toISOString()),
    finishedAt: String(row.finishedAt || new Date().toISOString())
  };
}

/**
 * @param {Omit<LearnedParameter, "id" | "idNum" | "assignedAt"> & {
 *   idNum: number,
 *   assignedAt?: string
 * }} input
 * @returns {LearnedParameter}
 */
export function confirmLearnedParameter(input) {
  const entry = normalizeAssignment({
    ...input,
    assignedAt: input.assignedAt || new Date().toISOString()
  });
  assignments.set(entry.idNum, entry);
  schedulePersist();
  notify();
  return entry;
}

/**
 * @param {Omit<LearningSession, "id" | "finishedAt"> & {
 *   id?: string,
 *   finishedAt?: string
 * }} input
 * @returns {LearningSession}
 */
export function recordLearningSession(input) {
  const session = normalizeSession({
    ...input,
    id: input.id || `learn-${Date.now().toString(36)}`,
    finishedAt: input.finishedAt || new Date().toISOString()
  });
  if (!session) {
    throw new Error("Invalid learning session");
  }
  sessions.unshift(session);
  if (sessions.length > MAX_SESSIONS) {
    sessions.length = MAX_SESSIONS;
  }
  schedulePersist();
  notify();
  return session;
}

/**
 * @returns {LearnedParameter[]}
 */
export function listLearnedParameters() {
  return [...assignments.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/**
 * @returns {LearningSession[]}
 */
export function listLearningSessions() {
  return [...sessions].sort(
    (a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt)
  );
}

/**
 * @param {number} idNum
 * @returns {LearnedParameter | null}
 */
export function lookupLearnedParameter(idNum) {
  return assignments.get(idNum & 0xffff) ?? null;
}

/**
 * @returns {string}
 */
export function exportLearnedParametersJson() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      assignments: listLearnedParameters(),
      sessions: listLearningSessions()
    },
    null,
    2
  );
}

/**
 * @param {string} [filename]
 */
export function downloadLearnedParametersJson(filename) {
  const json = exportLearnedParametersJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = filename || `kemper-learned-parameters-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeLearnedParameters(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

loadLearnedParameters();
