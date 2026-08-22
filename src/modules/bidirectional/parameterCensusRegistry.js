/**
 * Persistent Parameter Census registry — every Kemper ID that responds to Read.
 * Names are never guessed; meaning is learned later.
 */

import { formatParameterIdHex } from "./decoder/parameterRegistry.js";

const STORAGE_KEY = "kompanion.parameter-census";
const JOB_STORAGE_KEY = "kompanion.parameter-census-job";

/**
 * @typedef {"boolean" | "continuous" | "enum" | "string" | "binary" | "unknown_binary"} CensusValueType
 *
 * @typedef {{
 *   id: string,
 *   idNum: number,
 *   readable: true,
 *   type: CensusValueType,
 *   rawValue: number | null,
 *   ascii: string | null,
 *   dataLength: number | null,
 *   name: null,
 *   supportsWrite: boolean | null,
 *   supportsPush: boolean | null,
 *   firstSeen: string,
 *   lastSeen: string,
 *   classification: "Readable Parameter"
 * }} CensusParameter
 *
 * @typedef {{
 *   startId: number,
 *   endId: number,
 *   delayMs: number,
 *   timeoutMs: number,
 *   nextId: number,
 *   status: "idle" | "running" | "paused" | "completed",
 *   idsTested: number,
 *   startedAt: string | null,
 *   updatedAt: string | null
 * }} CensusJob
 */

/** @type {Map<number, CensusParameter>} */
const registry = new Map();

/** @type {CensusJob} */
let job = defaultJob();

/** @type {Set<() => void>} */
const listeners = new Set();

let persistTimer = null;

function defaultJob() {
  return {
    startId: 0x0000,
    endId: 0x7f7f,
    delayMs: 5,
    timeoutMs: 80,
    nextId: 0x0000,
    status: /** @type {CensusJob["status"]} */ ("idle"),
    idsTested: 0,
    startedAt: null,
    updatedAt: null
  };
}

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn("[Parameter Census] listener failed:", error);
    }
  }
}

function schedulePersist() {
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistParameterCensus();
  }, 400);
}

export function persistParameterCensus() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        parameters: listCensusParameters()
      })
    );
    localStorage.setItem(
      JOB_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        job
      })
    );
  } catch (error) {
    console.warn("[Parameter Census] persist failed:", error);
  }
}

export function loadParameterCensus() {
  registry.clear();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed?.parameters) ? parsed.parameters : [];
      for (const row of rows) {
        const idNum = Number(row?.idNum ?? parseInt(String(row?.id || ""), 16));
        if (!Number.isFinite(idNum)) continue;
        registry.set(idNum & 0xffff, normalizeEntry({ ...row, idNum }));
      }
    }
  } catch {
    registry.clear();
  }

  try {
    const jobRaw = localStorage.getItem(JOB_STORAGE_KEY);
    if (jobRaw) {
      const parsed = JSON.parse(jobRaw);
      if (parsed?.job && typeof parsed.job === "object") {
        job = {
          ...defaultJob(),
          ...parsed.job,
          status:
            parsed.job.status === "running"
              ? "paused"
              : parsed.job.status || "idle"
        };
      }
    }
  } catch {
    job = defaultJob();
  }
}

/**
 * @param {Partial<CensusParameter> & { idNum: number }} row
 * @returns {CensusParameter}
 */
function normalizeEntry(row) {
  const idNum = row.idNum & 0xffff;
  const now = new Date().toISOString();
  return {
    id: formatParameterIdHex(idNum),
    idNum,
    readable: true,
    type: normalizeType(row.type),
    rawValue:
      row.rawValue == null || !Number.isFinite(Number(row.rawValue))
        ? null
        : Number(row.rawValue),
    ascii: row.ascii == null || row.ascii === "" ? null : String(row.ascii),
    dataLength:
      row.dataLength == null || !Number.isFinite(Number(row.dataLength))
        ? null
        : Number(row.dataLength),
    name: null,
    supportsWrite:
      row.supportsWrite === true || row.supportsWrite === false
        ? row.supportsWrite
        : null,
    supportsPush:
      row.supportsPush === true || row.supportsPush === false
        ? row.supportsPush
        : null,
    firstSeen: String(row.firstSeen || now),
    lastSeen: String(row.lastSeen || row.firstSeen || now),
    classification: "Readable Parameter"
  };
}

/**
 * @param {unknown} type
 * @returns {CensusValueType}
 */
function normalizeType(type) {
  switch (String(type || "")) {
    case "boolean":
    case "continuous":
    case "enum":
    case "string":
    case "binary":
    case "unknown_binary":
      return /** @type {CensusValueType} */ (String(type));
    default:
      return "continuous";
  }
}

/**
 * @param {{
 *   idNum: number,
 *   type: CensusValueType,
 *   rawValue?: number | null,
 *   ascii?: string | null,
 *   dataLength?: number | null,
 *   supportsWrite?: boolean | null,
 *   supportsPush?: boolean | null
 * }} input
 * @returns {CensusParameter}
 */
export function upsertCensusParameter(input) {
  const id = input.idNum & 0xffff;
  const existing = registry.get(id);
  const now = new Date().toISOString();
  const next = normalizeEntry({
    idNum: id,
    type: input.type,
    rawValue: input.rawValue !== undefined ? input.rawValue : existing?.rawValue,
    ascii: input.ascii !== undefined ? input.ascii : existing?.ascii,
    dataLength:
      input.dataLength !== undefined ? input.dataLength : existing?.dataLength,
    supportsWrite:
      input.supportsWrite !== undefined
        ? input.supportsWrite
        : (existing?.supportsWrite ?? null),
    supportsPush:
      input.supportsPush !== undefined
        ? input.supportsPush
        : (existing?.supportsPush ?? null),
    firstSeen: existing?.firstSeen || now,
    lastSeen: now
  });
  registry.set(id, next);
  schedulePersist();
  notify();
  return next;
}

/**
 * @returns {CensusParameter[]}
 */
export function listCensusParameters() {
  return [...registry.values()].sort((a, b) => a.idNum - b.idNum);
}

/**
 * @returns {number[]}
 */
export function listCensusReadableIds() {
  return listCensusParameters().map((row) => row.idNum);
}

/**
 * @param {number} idNum
 * @returns {CensusParameter | null}
 */
export function lookupCensusParameter(idNum) {
  return registry.get(idNum & 0xffff) ?? null;
}

/**
 * @returns {CensusJob}
 */
export function getCensusJob() {
  return { ...job };
}

/**
 * @param {Partial<CensusJob>} patch
 * @returns {CensusJob}
 */
export function updateCensusJob(patch) {
  job = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  schedulePersist();
  notify();
  return getCensusJob();
}

/**
 * @returns {{
 *   readable: number,
 *   strings: number,
 *   booleans: number,
 *   continuous: number,
 *   enums: number,
 *   binary: number,
 *   unknownBinary: number,
 *   idsTested: number,
 *   nextId: number,
 *   startId: number,
 *   endId: number,
 *   status: string
 * }}
 */
export function getCensusStatistics() {
  let strings = 0;
  let booleans = 0;
  let continuous = 0;
  let enums = 0;
  let binary = 0;
  let unknownBinary = 0;

  for (const row of registry.values()) {
    switch (row.type) {
      case "string":
        strings += 1;
        break;
      case "boolean":
        booleans += 1;
        break;
      case "continuous":
        continuous += 1;
        break;
      case "enum":
        enums += 1;
        break;
      case "binary":
        binary += 1;
        break;
      case "unknown_binary":
        unknownBinary += 1;
        break;
      default:
        break;
    }
  }

  return {
    readable: registry.size,
    strings,
    booleans,
    continuous,
    enums,
    binary: binary + unknownBinary,
    unknownBinary,
    idsTested: job.idsTested,
    nextId: job.nextId,
    startId: job.startId,
    endId: job.endId,
    status: job.status
  };
}

/**
 * @returns {string}
 */
export function exportParameterCensusJson() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      job: getCensusJob(),
      statistics: getCensusStatistics(),
      parameters: listCensusParameters()
    },
    null,
    2
  );
}

/**
 * @param {string} [filename]
 */
export function downloadParameterCensusJson(filename) {
  const json = exportParameterCensusJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = filename || `kemper-parameter-census-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
export function subscribeParameterCensus(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

loadParameterCensus();
