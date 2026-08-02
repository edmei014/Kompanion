import { manufacturerRecords } from "../data/manufacturers/index.js";
import { createManufacturerRecord } from "../data/manufacturers/manufacturerSchema.js";
import { resolveManufacturerIdFromAmpName } from "../data/manufacturers/manufacturerIds.js";
import { allAmpRecords } from "../data/amps/index.js";
import { createAmpRecord } from "../data/ampSchema.js";
import { formatGearFieldValue, isMissingGearFieldValue } from "./fieldValues.js";

/**
 * @typedef {Object} ManufacturerDetailView
 * @property {string} id
 * @property {string} name
 * @property {string | null} metaLine
 * @property {string | null} description
 * @property {string | null} history
 * @property {string | null} websiteUrl
 * @property {boolean} hasProfile
 */

/**
 * @typedef {Object} ManufacturerCatalogCounts
 * @property {number} amps
 */

/**
 * @typedef {Object} ManufacturerBrowseEntry
 * @property {string} id
 * @property {string} name
 * @property {string | null} founded
 * @property {string | null} country
 * @property {string | null} summary
 * @property {string} searchText
 * @property {ManufacturerCatalogCounts} catalogCounts
 */

/** @type {Map<string, import("../data/manufacturers/manufacturerSchema.js").ManufacturerRecord> | null} */
let recordsById = null;

function ensureIndex() {
  if (recordsById) return;

  recordsById = new Map();

  for (const raw of manufacturerRecords) {
    const record = createManufacturerRecord(raw);
    if (record.id) {
      recordsById.set(record.id, record);
    }
  }
}

function getAmpsByManufacturerId(manufacturerId) {
  if (!manufacturerId) return [];

  return allAmpRecords
    .map((raw) => createAmpRecord(raw))
    .filter((amp) => amp.manufacturerId === manufacturerId);
}

/** @param {unknown} value @returns {string | null} */
function formatProfileParagraph(value) {
  if (isMissingGearFieldValue(value)) return null;
  return String(value).trim();
}

/** @param {string | null | undefined} description @returns {string | null} */
function extractDescriptionSummary(description) {
  const text = formatProfileParagraph(description);
  if (!text) return null;

  const firstLine = text.split(/\n+/)[0]?.trim();
  return firstLine || null;
}

/** @param {string} manufacturerId @returns {ManufacturerCatalogCounts} */
function buildManufacturerCatalogCounts(manufacturerId) {
  return {
    amps: getAmpsByManufacturerId(manufacturerId).length
  };
}

/** @param {import("../data/manufacturers/manufacturerSchema.js").ManufacturerRecord} record @returns {ManufacturerBrowseEntry} */
function createManufacturerBrowseEntry(record) {
  const founded = formatProfileParagraph(record.founded);
  const country = formatProfileParagraph(record.country);
  const summary = extractDescriptionSummary(record.description);

  return {
    id: record.id,
    name: record.name,
    founded,
    country,
    summary,
    searchText: [record.name, country, founded, summary, record.description, record.history]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    catalogCounts: buildManufacturerCatalogCounts(record.id)
  };
}

/**
 * @param {{ query?: string }} [options]
 * @returns {ManufacturerBrowseEntry[]}
 */
export function getManufacturerBrowseEntries(options = {}) {
  ensureIndex();

  const query = (options.query ?? "").trim().toLowerCase();

  let entries = [...recordsById.values()].map((record) =>
    createManufacturerBrowseEntry(record)
  );

  entries.sort((left, right) => left.name.localeCompare(right.name));

  if (query) {
    entries = entries.filter((entry) => entry.searchText.includes(query));
  }

  return entries;
}

export function getManufacturerLibraryStats() {
  ensureIndex();
  return {
    manufacturerCount: recordsById.size
  };
}

/** @param {import("../data/manufacturers/manufacturerSchema.js").ManufacturerRecord} record */
function buildManufacturerMetaLine(record) {
  /** @type {string[]} */
  const parts = [];

  const country = formatProfileParagraph(record.country);
  if (country) parts.push(country);

  if (!isMissingGearFieldValue(record.founded)) {
    parts.push(`Founded ${String(record.founded).trim()}`);
  }

  const founder = formatProfileParagraph(record.founder);
  if (founder) parts.push(founder);

  return parts.length ? parts.join(" • ") : null;
}

/** @returns {string[]} */
export function getAllManufacturerIds() {
  ensureIndex();
  return [...recordsById.keys()].sort((left, right) => left.localeCompare(right));
}

/** @param {string} manufacturerId @returns {import("../data/manufacturers/manufacturerSchema.js").ManufacturerRecord | null} */
export function getManufacturerById(manufacturerId) {
  ensureIndex();
  if (!manufacturerId) return null;
  return recordsById.get(manufacturerId) ?? null;
}

/** @param {string} ampManufacturerName @returns {string | null} */
export function resolveManufacturerIdFromAmpManufacturerName(ampManufacturerName) {
  const manufacturerId = resolveManufacturerIdFromAmpName(ampManufacturerName);
  return manufacturerId || null;
}

/** @param {string} manufacturerId @returns {string | null} */
export function getManufacturerDisplayName(manufacturerId) {
  const record = getManufacturerById(manufacturerId);
  if (record?.name) return record.name;

  const amps = getAmpsByManufacturerId(manufacturerId);
  return amps[0]?.manufacturer ?? null;
}

/** @param {string} manufacturerId @returns {ManufacturerDetailView | null} */
export function getManufacturerDetailView(manufacturerId) {
  if (!manufacturerId) return null;

  const profile = getManufacturerById(manufacturerId);
  const amps = getAmpsByManufacturerId(manufacturerId);

  if (!profile && amps.length === 0) return null;

  if (profile) {
    return {
      id: profile.id,
      name: profile.name,
      metaLine: buildManufacturerMetaLine(profile),
      description: formatProfileParagraph(profile.description),
      history: formatProfileParagraph(profile.history),
      websiteUrl: formatProfileParagraph(profile.website),
      hasProfile: true
    };
  }

  return {
    id: manufacturerId,
    name: amps[0].manufacturer,
    metaLine: null,
    description: formatGearFieldValue(null),
    history: null,
    websiteUrl: null,
    hasProfile: false
  };
}

/** @deprecated Use getManufacturerById */
export function getManufacturerByName(name) {
  const manufacturerId = resolveManufacturerIdFromAmpManufacturerName(name);
  return manufacturerId ? getManufacturerById(manufacturerId) : null;
}

/** @deprecated Use getAllManufacturerIds */
export function getAllManufacturerNames() {
  return getAllManufacturerIds();
}
