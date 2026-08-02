import { allAmpRecords } from "../data/amps/index.js";
import { createAmpRecord } from "../data/ampSchema.js";
import {
  resolveAmpId,
  resolveAmpIdFromSources
} from "../resolver/aliasResolver.js";

import {
  AMP_IMAGE_BASE_PATH,
  isUsableAmpImageFilename,
  resolveAmpImageSrc
} from "../resolver/imageResolver.js";
import { resolveThemeForAmp } from "../theme/manufacturerThemes.js";

import { createGearLibrary } from "./createGearLibrary.js";
import { formatGearFieldValue, isMissingGearFieldValue } from "./fieldValues.js";
import { getManufacturerDisplayName } from "./manufacturerLibrary.js";

export { AMP_IMAGE_BASE_PATH };

/**
 * @typedef {Object} AmpRecord
 * @property {string} id
 * @property {string} manufacturerId
 * @property {string} manufacturer
 * @property {string} model
 * @property {string[]} aliases
 * @property {string | null} image
 * @property {string | null} description
 * @property {string | null} history
 * @property {string | number | null} introduced
 * @property {string | number | null} discontinued
 * @property {string | null} country
 * @property {string | null} ampType
 * @property {string | null} power
 * @property {string | number | null} channels
 * @property {Record<string, string | string[]> | string | null} tubes
 * @property {string | string[] | null} genres
 * @property {string | string[] | null} notableUsers
 * @property {string | string[] | null} tags
 */

/**
 * @typedef {Object} AmpValveConfigurationLine
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} AmpBrowseEntry
 * @property {string} id
 * @property {string} manufacturerId
 * @property {string} manufacturer
 * @property {string} model
 * @property {string} imageSrc
 * @property {boolean} hasImage
 * @property {import("../theme/ampTheme.js").AmpTheme} theme
 * @property {string} searchText
 * @property {number} sortIndex
 * @property {number | null} sortYear
 */

/**
 * Render chapter for the amp browser.
 * For manufacturer sort: one chapter per manufacturer.
 * For model/year sort: a consecutive run that may repeat manufacturers.
 *
 * @typedef {Object} AmpBrowseSection
 * @property {string} manufacturerId
 * @property {string} manufacturer
 * @property {AmpBrowseEntry[]} entries
 */

/**
 * @typedef {Object} AmpTimelineSection
 * @property {number | null} year
 * @property {string} label
 * @property {string} sectionId
 * @property {AmpBrowseEntry[]} entries
 */





/**
 * @typedef {Object} AmpDetailView
 * @property {string} id
 * @property {string} manufacturerId
 * @property {string} manufacturer
 * @property {string} model
 * @property {string | null} imageSrc
 * @property {boolean} hasImage
 * @property {string} description
 * @property {string} history
 * @property {string[]} specs
 * @property {AmpValveConfigurationLine[] | null} valveConfiguration
 * @property {string[]} playedBy
 */

/** Amp browser presentation modes (shared data, distinct UI). */
export const AMP_BROWSER_VIEW = Object.freeze({
  MANUFACTURER: "manufacturer",
  MODEL: "model",
  TIMELINE: "timeline"
});

export const AMP_BROWSER_VIEWS = [
  { value: AMP_BROWSER_VIEW.MANUFACTURER, label: "Manufacturer View" },
  { value: AMP_BROWSER_VIEW.MODEL, label: "Model View" },
  { value: AMP_BROWSER_VIEW.TIMELINE, label: "Timeline View" }
];

export const AMP_BROWSER_VIEW_DEFAULT = AMP_BROWSER_VIEW.MANUFACTURER;

/** @deprecated Use AMP_BROWSER_VIEWS */
export const AMP_SORT_OPTIONS = AMP_BROWSER_VIEWS;

/** @deprecated Use AMP_BROWSER_VIEW_DEFAULT */
export const AMP_SORT_DEFAULT = AMP_BROWSER_VIEW_DEFAULT;


export const AMP_IMAGE_FILTER = {
  ALL: "all",
  AVAILABLE: "available"
};

const ampStore = createGearLibrary({
  records: allAmpRecords,
  normalizeRecord: createAmpRecord,
  getRecordId: (record) => record.id,
  buildSearchText: (record) => {
    const aliases = record.aliases.join(" ");
    return `${record.manufacturer} ${record.model} ${aliases}`.toLowerCase();
  },
  imageBasePath: AMP_IMAGE_BASE_PATH,
  getImageFilename: (record) => record.image,
  getManufacturer: (record) =>
    getManufacturerDisplayName(record.manufacturerId) ?? record.manufacturer,
  getManufacturerId: (record) => record.manufacturerId,
  getModel: (record) => record.model
});

/** @returns {AmpRecord[]} */
export function getAllAmps() {
  return ampStore.getAllRecords();
}

/** @param {string} ampId @returns {AmpRecord | null} */
export function getAmpById(ampId) {
  return ampStore.getRecordById(ampId);
}

/** @returns {string[]} */
export function getManufacturers() {
  return ampStore.getManufacturers();
}

/** @param {string} manufacturer @returns {AmpRecord[]} */
export function getAmpsByManufacturer(manufacturer) {
  return ampStore.getRecordsByManufacturer(manufacturer);
}

/** @param {string} manufacturerId @returns {AmpRecord[]} */
export function getAmpsByManufacturerId(manufacturerId) {
  return getAllAmps().filter((amp) => amp.manufacturerId === manufacturerId);
}

/** @param {string} query @returns {AmpRecord[]} */
export function searchAmps(query = "") {
  return ampStore.searchRecords(query);
}

/** @param {string} ampId @returns {string[]} */
export function getAmpAliases(ampId) {
  const amp = getAmpById(ampId);
  return amp ? [...amp.aliases] : [];
}

/** @param {string} ampId @returns {string | null} Public image URL or null. */
export function getAmpImage(ampId) {
  return ampStore.getImageSrc(ampId);
}

/** @param {string} ampId @returns {string | null} Image filename or null. */
export function getAmpImageFilename(ampId) {
  return ampStore.getImageFilenameForRecord(ampId);
}

/** @param {string} ampId @returns {boolean} */
export function hasAmpImage(ampId) {
  return ampStore.hasImage(ampId);
}

/** @param {AmpRecord} amp @returns {boolean} */
export function ampHasUsableImage(amp) {
  return isUsableAmpImageFilename(amp.image);
}

/** @param {string} searchText @returns {string | null} */
export function resolveAmpIdFromText(searchText = "") {
  return resolveAmpId(searchText);
}

/**
 * Resolves across multiple independent text sources with shared alias scoring.
 * @param {...unknown} sources
 * @returns {string | null}
 */
export function resolveAmpIdFromTextSources(...sources) {
  return resolveAmpIdFromSources(...sources);
}

/**
 * Resolves free-form Kemper/live text to a full AmpRecord from the Gear Library.
 * @param {string} searchText
 * @returns {AmpRecord | null}
 */
export function resolveAmpRecordFromText(searchText = "") {
  const ampId = resolveAmpIdFromText(searchText);
  return ampId ? getAmpById(ampId) : null;
}

/**
 * Resolves an AmpRecord from multiple independent lookup sources
 * (e.g. amp name + rig name). Best alias score across all sources wins.
 * @param {...unknown} sources
 * @returns {AmpRecord | null}
 */
export function resolveAmpRecordFromTextSources(...sources) {
  const ampId = resolveAmpIdFromTextSources(...sources);
  return ampId ? getAmpById(ampId) : null;
}

/** @param {string} searchText @returns {string | null} */
export function getAmpImageForText(searchText = "") {
  const ampId = resolveAmpIdFromText(searchText);
  return ampId ? getAmpImage(ampId) : null;
}

/** @param {string} searchText @returns {string} Filename for Live Companion legacy path assembly. */
export function getAmpImageFilenameForText(searchText = "") {
  const ampId = resolveAmpIdFromText(searchText);
  return ampId ? getAmpImageFilename(ampId) || "" : "";
}

/** @param {string} ampId @param {string} fieldKey @returns {string} */
export function getAmpFieldDisplayValue(ampId, fieldKey) {
  return ampStore.getFieldDisplayValue(ampId, fieldKey);
}

/** @param {string | number | null | undefined} introduced @param {string | number | null | undefined} discontinued */
function formatProductionPeriod(introduced, discontinued) {
  const start = isMissingGearFieldValue(introduced) ? null : String(introduced).trim();
  const end = isMissingGearFieldValue(discontinued) ? null : String(discontinued).trim();

  if (start && end) return `${start}–${end}`;
  if (start) return `${start}–`;
  if (end) return `–${end}`;
  return null;
}

/** @param {unknown} power */
function formatAmpSpecPower(power) {
  const value = String(power).trim();
  if (!value) return null;
  if (/w\b/i.test(value)) return value;
  if (/^\d+(\.\d+)?$/.test(value)) return `${value} W`;
  return value;
}

/** @param {unknown} channels */
function formatAmpSpecChannels(channels) {
  const raw = String(channels).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d+)/);
  if (!match) return raw;

  const count = Number(match[1]);
  return count === 1 ? "1 Channel" : `${count} Channels`;
}

/** @param {unknown} value @returns {string | null} */
function formatTubeGroupValue(value) {
  if (isMissingGearFieldValue(value)) return null;

  if (Array.isArray(value)) {
    const parts = value.map((entry) => String(entry).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
}

/** @param {unknown} tubes @returns {AmpValveConfigurationLine[] | null} */
function buildAmpValveConfiguration(tubes) {
  if (!tubes || typeof tubes !== "object" || Array.isArray(tubes)) return null;

  /** @type {AmpValveConfigurationLine[]} */
  const lines = [];

  const preamp = formatTubeGroupValue(tubes.preamp);
  if (preamp) lines.push({ label: "Preamp", value: preamp });

  const power = formatTubeGroupValue(tubes.power);
  if (power) lines.push({ label: "Power", value: power });

  return lines.length ? lines : null;
}

/** @param {unknown} notableUsers @returns {string[]} */
function buildPlayedByList(notableUsers) {
  if (isMissingGearFieldValue(notableUsers)) return [];

  if (Array.isArray(notableUsers)) {
    return notableUsers.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return [String(notableUsers).trim()].filter(Boolean);
}

/** @param {AmpRecord} amp */
function buildAmpSpecsBar(amp) {
  /** @type {string[]} */
  const specs = [];

  const power = formatAmpSpecPower(amp.power);
  if (power) specs.push(power);

  const period = formatProductionPeriod(amp.introduced, amp.discontinued);
  if (period) specs.push(period);

  const channels = formatAmpSpecChannels(amp.channels);
  if (channels) specs.push(channels);

  return specs;
}

/** @param {string} ampId @returns {AmpDetailView | null} */
export function getAmpDetailView(ampId) {
  const amp = getAmpById(ampId);
  if (!amp) return null;

  return {
    id: amp.id,
    manufacturerId: amp.manufacturerId,
    manufacturer: getManufacturerDisplayName(amp.manufacturerId) ?? amp.manufacturer,
    model: amp.model,
    imageSrc: getAmpImage(ampId),
    hasImage: hasAmpImage(ampId),
    description: formatGearFieldValue(amp.description),
    history: formatGearFieldValue(amp.history),
    specs: buildAmpSpecsBar(amp),
    valveConfiguration: buildAmpValveConfiguration(amp.tubes),
    playedBy: buildPlayedByList(amp.notableUsers)
  };
}

export function getAmpLibraryStats() {
  const stats = ampStore.getLibraryStats();
  return {
    ampCount: stats.itemCount,
    manufacturerCount: stats.manufacturerCount
  };
}

/**
 * @param {unknown} introduced
 * @returns {number | null}
 */
export function parseAmpSortYear(introduced) {
  if (introduced === undefined || introduced === null || introduced === "") {
    return null;
  }

  const match = String(introduced).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/**
 * @param {{
 *   query?: string,
 *   manufacturer?: string,
 *   sort?: string,
 *   imageFilter?: string
 * }} [options]
 * @returns {AmpBrowseEntry[]}
 */
export function getAmpBrowseEntries(options = {}) {
  const {
    query = "",
    manufacturer = "",
    sort = AMP_BROWSER_VIEW_DEFAULT,
    imageFilter = AMP_IMAGE_FILTER.ALL
  } = options;
  const normalizedQuery = query.trim().toLowerCase();
  const sortMode = getAmpBrowseSortModeForView(sort);

  let records = searchAmps(normalizedQuery);

  if (manufacturer) {
    records = records.filter((amp) => amp.manufacturer === manufacturer);
  }

  if (imageFilter === AMP_IMAGE_FILTER.AVAILABLE) {
    records = records.filter((amp) => ampHasUsableImage(amp));
  }

  const browseEntries = ampStore.createBrowseEntries(records).map((entry) => {
    const amp = getAmpById(entry.id);
    return {
      ...entry,
      sortYear: amp ? parseAmpSortYear(amp.introduced) : null,
      theme: resolveThemeForAmp(amp)
    };
  });

  return browseEntries.sort((left, right) =>
    compareAmpBrowseEntries(left, right, sortMode)
  );
}

/**
 * Classic manufacturer chapters: one section per manufacturer.
 * @param {AmpBrowseEntry[]} entries
 * @returns {AmpBrowseSection[]}
 */
export function groupAmpBrowseEntriesByManufacturer(entries) {
  /** @type {Map<string, AmpBrowseSection>} */
  const groups = new Map();

  for (const entry of entries) {
    const groupKey = entry.manufacturerId || entry.manufacturer;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        manufacturerId: entry.manufacturerId,
        manufacturer: entry.manufacturer,
        entries: []
      });
    }

    groups.get(groupKey)?.entries.push(entry);
  }

  return [...groups.values()];
}

/**
 * Visual manufacturer runs for flat amp sorts (model / year).
 * Inserts a heading whenever the manufacturer changes in the sorted stream.
 * The same manufacturer may appear multiple times.
 *
 * @param {AmpBrowseEntry[]} entries
 * @returns {AmpBrowseSection[]}
 */
export function segmentAmpBrowseEntriesByManufacturerRuns(entries) {
  /** @type {AmpBrowseSection[]} */
  const sections = [];

  for (const entry of entries) {
    const entryKey = entry.manufacturerId || entry.manufacturer;
    const previous = sections[sections.length - 1];
    const previousKey = previous
      ? previous.manufacturerId || previous.manufacturer
      : null;

    if (previous && previousKey === entryKey) {
      previous.entries.push(entry);
      continue;
    }

    sections.push({
      manufacturerId: entry.manufacturerId,
      manufacturer: entry.manufacturer,
      entries: [entry]
    });
  }

  return sections;
}

export function getAmpBrowseSortModeForView(view) {
  if (view === AMP_BROWSER_VIEW.MODEL || view === "model") return "model";
  if (
    view === AMP_BROWSER_VIEW.TIMELINE ||
    view === "timeline" ||
    view === "year"
  ) {
    return "year";
  }
  return "manufacturer";
}

/**
 * Classic manufacturer chapters for Manufacturer View.
 * @param {AmpBrowseEntry[]} entries
 * @returns {AmpBrowseSection[]}
 */
export function buildAmpManufacturerViewSections(entries) {
  return groupAmpBrowseEntriesByManufacturer(entries);
}

/**
 * Chronological year chapters for Timeline View.
 * Amps without a known year are collected at the end.
 *
 * @param {AmpBrowseEntry[]} entries
 * @returns {AmpTimelineSection[]}
 */
export function buildAmpTimelineSections(entries) {
  /** @type {Map<number | "unknown", AmpBrowseEntry[]>} */
  const byYear = new Map();

  for (const entry of entries) {
    const key = entry.sortYear === null ? "unknown" : entry.sortYear;
    if (!byYear.has(key)) {
      byYear.set(key, []);
    }
    byYear.get(key)?.push(entry);
  }

  const knownYears = [...byYear.keys()]
    .filter((key) => key !== "unknown")
    .map(Number)
    .sort((left, right) => left - right);

  /** @type {AmpTimelineSection[]} */
  const sections = knownYears.map((year) => ({
    year,
    label: String(year),
    sectionId: `timeline-year-${year}`,
    entries: byYear.get(year) ?? []
  }));

  if (byYear.has("unknown")) {
    sections.push({
      year: null,
      label: "Unknown Year",
      sectionId: "timeline-year-unknown",
      entries: byYear.get("unknown") ?? []
    });
  }

  return sections;
}

/**
 * @deprecated Prefer view-specific builders.
 * @param {AmpBrowseEntry[]} entries
 * @param {string} sortMode
 * @returns {AmpBrowseSection[]}
 */
export function buildAmpBrowseSections(entries, sortMode = AMP_BROWSER_VIEW_DEFAULT) {
  if (sortMode === AMP_BROWSER_VIEW.MANUFACTURER || sortMode === "manufacturer") {
    return buildAmpManufacturerViewSections(entries);
  }

  return segmentAmpBrowseEntriesByManufacturerRuns(entries);
}

/** @param {string} view */
export function isAmpBrowserView(view) {
  return AMP_BROWSER_VIEWS.some((option) => option.value === view);
}

/** @param {string} sortMode */
export function isAmpSortMode(sortMode) {
  return (
    sortMode === "manufacturer" ||
    sortMode === "model" ||
    sortMode === "year" ||
    isAmpBrowserView(sortMode)
  );
}

/**
 * @param {AmpBrowseEntry} left
 * @param {AmpBrowseEntry} right
 * @param {string} sortMode
 */
export function compareAmpBrowseEntries(left, right, sortMode) {
  const mode =
    sortMode === AMP_BROWSER_VIEW.TIMELINE
      ? "year"
      : sortMode === AMP_BROWSER_VIEW.MODEL
        ? "model"
        : sortMode === AMP_BROWSER_VIEW.MANUFACTURER
          ? "manufacturer"
          : sortMode;

  switch (mode) {
    case "model":
      return (
        left.model.localeCompare(right.model, undefined, { sensitivity: "base" }) ||
        left.sortIndex - right.sortIndex
      );
    case "year": {
      const leftYear = left.sortYear;
      const rightYear = right.sortYear;

      if (leftYear === null && rightYear === null) {
        return (
          left.model.localeCompare(right.model, undefined, { sensitivity: "base" }) ||
          left.sortIndex - right.sortIndex
        );
      }

      if (leftYear === null) return 1;
      if (rightYear === null) return -1;

      return (
        leftYear - rightYear ||
        left.model.localeCompare(right.model, undefined, { sensitivity: "base" }) ||
        left.sortIndex - right.sortIndex
      );
    }
    case "manufacturer":
    default:
      return (
        left.manufacturer.localeCompare(right.manufacturer, undefined, {
          sensitivity: "base"
        }) ||
        left.model.localeCompare(right.model, undefined, { sensitivity: "base" }) ||
        left.sortIndex - right.sortIndex
      );
  }
}

