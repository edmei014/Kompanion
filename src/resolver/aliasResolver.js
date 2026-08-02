import { getAllAmps } from "../library/ampLibrary.js";

/** @type {{ alias: string, ampId: string, length: number }[] | null} */
let aliasIndex = null;

/**
 * @param {{ alias: string, ampId: string, length: number }[]} index
 * @param {string} alias
 * @param {string} ampId
 */
function addAliasEntry(index, alias, ampId) {
  const normalizedAlias = String(alias || "")
    .trim()
    .toLowerCase();
  if (!normalizedAlias) return;

  index.push({
    alias: normalizedAlias,
    ampId,
    length: normalizedAlias.length
  });
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function manufacturerNameVariants(value) {
  const name = String(value || "").trim();
  if (!name) return [];

  const variants = new Set([name]);
  variants.add(name.replace(/&/g, "and"));
  variants.add(name.replace(/\band\b/gi, "&"));
  return [...variants];
}

function buildAliasIndex() {
  const index = [];

  for (const amp of getAllAmps()) {
    for (const alias of amp.aliases || []) {
      addAliasEntry(index, alias, amp.id);
    }

    // Canonical Gear Library identity also participates in resolution.
    addAliasEntry(index, amp.model, amp.id);
    addAliasEntry(index, `${amp.manufacturer} ${amp.model}`, amp.id);

    for (const manufacturerName of manufacturerNameVariants(amp.manufacturer)) {
      addAliasEntry(index, `${manufacturerName} ${amp.model}`, amp.id);
    }
  }

  index.sort((left, right) => right.length - left.length);
  return index;
}

/** @returns {{ alias: string, ampId: string, length: number }[]} */
export function getAliasIndexEntries() {
  ensureAliasIndex();
  return aliasIndex.map((entry) => ({ ...entry }));
}

/**
 * @param {string} ampId
 * @returns {{ alias: string, ampId: string, length: number }[]}
 */
export function getAliasIndexEntriesForAmp(ampId) {
  ensureAliasIndex();
  return aliasIndex
    .filter((entry) => entry.ampId === ampId)
    .map((entry) => ({ ...entry }));
}

function ensureAliasIndex() {
  if (!aliasIndex) {
    aliasIndex = buildAliasIndex();
  }
}

/**
 * Scores alias matches inside one normalized search string.
 * @param {string} normalized
 * @returns {{ ampId: string, length: number } | null}
 */
function findBestAliasMatch(normalized) {
  if (!normalized) return null;

  let bestAmpId = null;
  let bestLength = 0;

  for (const entry of aliasIndex) {
    if (normalized.includes(entry.alias) && entry.length > bestLength) {
      bestAmpId = entry.ampId;
      bestLength = entry.length;
    }
  }

  return bestAmpId ? { ampId: bestAmpId, length: bestLength } : null;
}

/**
 * Resolves free-form text to a single amp ID using longest-alias scoring.
 * @param {string} searchText
 * @returns {string | null}
 */
export function resolveAmpId(searchText = "") {
  return resolveAmpIdFromSources(searchText);
}

/**
 * Resolves across multiple independent text sources (e.g. amp name + rig name).
 * Each source is scored with the existing longest-alias rule; the globally
 * best match wins.
 * @param {...unknown} sources
 * @returns {string | null}
 */
export function resolveAmpIdFromSources(...sources) {
  ensureAliasIndex();

  let bestAmpId = null;
  let bestLength = 0;

  for (const source of sources) {
    const normalized = String(source ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) continue;

    const match = findBestAliasMatch(normalized);
    if (match && match.length > bestLength) {
      bestAmpId = match.ampId;
      bestLength = match.length;
    }
  }

  return bestAmpId;
}
