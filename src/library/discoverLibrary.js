import { discoverRecords } from "../data/discover/index.js";
import {
  DISCOVER_BOARD_CATEGORIES,
  DISCOVER_CATEGORY,
  createDiscoverRecord,
  getDiscoverCategoryLabel,
  isDiscoverCategoryId
} from "../data/discover/discoverSchema.js";
import { getAmpById } from "./ampLibrary.js";

/**
 * @typedef {import("../data/discover/discoverSchema.js").DiscoverRecord} DiscoverRecord
 * @typedef {import("../data/discover/discoverSchema.js").DiscoverCategoryId} DiscoverCategoryId
 */

/**
 * @typedef {Object} DiscoverAmpLink
 * @property {string} ampId
 * @property {string} label
 */

/**
 * @typedef {Object} DiscoverEntryView
 * @property {string} id
 * @property {DiscoverCategoryId} type
 * @property {string} categoryLabel
 * @property {string} title
 * @property {string} text
 * @property {DiscoverAmpLink | null} ampLink
 * @property {string | null} manufacturerId
 * @property {string | null} image
 * @property {string[]} tags
 */

/**
 * @typedef {Object} DiscoverSlotState
 * @property {DiscoverCategoryId} categoryId
 * @property {number} index
 * @property {DiscoverEntryView | null} view
 */

/**
 * @typedef {Record<DiscoverCategoryId, DiscoverSlotState>} DiscoverBoardState
 */

/** @type {Map<string, DiscoverRecord> | null} */
let recordsById = null;

/** @type {Map<DiscoverCategoryId, DiscoverRecord[]> | null} */
let recordsByCategory = null;

/** @type {DiscoverRecord[] | null} */
let catalog = null;

function ensureIndex() {
  if (recordsById && recordsByCategory && catalog) return;

  recordsById = new Map();
  recordsByCategory = new Map(
    DISCOVER_BOARD_CATEGORIES.map(({ id }) => [id, []])
  );
  catalog = [];

  for (const raw of discoverRecords) {
    const record = createDiscoverRecord(raw);
    if (!record.id || !record.title || !record.text) continue;
    if (!isDiscoverCategoryId(record.type)) continue;

    recordsById.set(record.id, record);
    catalog.push(record);
    recordsByCategory.get(record.type)?.push(record);
  }
}

/** @returns {DiscoverRecord[]} */
export function getAllDiscoverRecords() {
  ensureIndex();
  return catalog;
}

/** @param {string} discoverId @returns {DiscoverRecord | null} */
export function getDiscoverById(discoverId) {
  ensureIndex();
  return recordsById.get(discoverId) ?? null;
}

/**
 * @param {DiscoverCategoryId} categoryId
 * @returns {DiscoverRecord[]}
 */
export function getDiscoverRecordsByCategory(categoryId) {
  ensureIndex();
  if (!isDiscoverCategoryId(categoryId)) return [];
  return recordsByCategory.get(categoryId) ?? [];
}

/**
 * @param {string | null | undefined} ampId
 * @returns {DiscoverAmpLink | null}
 */
function buildAmpLink(ampId) {
  if (!ampId) return null;

  const amp = getAmpById(ampId);
  if (!amp) return null;

  return {
    ampId: amp.id,
    label: `${amp.manufacturer} ${amp.model}`.trim()
  };
}

/**
 * @param {DiscoverRecord} record
 * @returns {DiscoverEntryView}
 */
export function createDiscoverEntryView(record) {
  return {
    id: record.id,
    type: record.type,
    categoryLabel: getDiscoverCategoryLabel(record.type),
    title: record.title,
    text: record.text,
    ampLink: buildAmpLink(record.ampId),
    manufacturerId: record.manufacturerId,
    image: record.image,
    tags: [...record.tags]
  };
}

/** @param {string} discoverId @returns {DiscoverEntryView | null} */
export function getDiscoverEntryView(discoverId) {
  const record = getDiscoverById(discoverId);
  return record ? createDiscoverEntryView(record) : null;
}

/**
 * @param {DiscoverCategoryId} categoryId
 * @param {number} index
 * @returns {DiscoverSlotState}
 */
function createSlotState(categoryId, index) {
  const records = getDiscoverRecordsByCategory(categoryId);
  const safeIndex =
    records.length === 0 ? -1 : ((index % records.length) + records.length) % records.length;

  return {
    categoryId,
    index: safeIndex,
    view: safeIndex >= 0 ? createDiscoverEntryView(records[safeIndex]) : null
  };
}

/**
 * Builds a board with one independently chosen entry per category.
 * @param {{ strategy?: "random" | "first" }} [options]
 * @returns {DiscoverBoardState}
 */
export function createDiscoverBoardState(options = {}) {
  const { strategy = "random" } = options;
  /** @type {DiscoverBoardState} */
  const state = /** @type {DiscoverBoardState} */ ({});

  for (const { id } of DISCOVER_BOARD_CATEGORIES) {
    const records = getDiscoverRecordsByCategory(id);
    const index =
      records.length === 0
        ? -1
        : strategy === "first"
          ? 0
          : Math.floor(Math.random() * records.length);

    state[id] = createSlotState(id, index);
  }

  return state;
}

/**
 * Advances one category sequentially (legacy helper).
 * Prefer rotateDiscoverSlot() from discoverRotation.js for production rotation.
 *
 * @param {DiscoverBoardState} state
 * @param {DiscoverCategoryId} categoryId
 * @returns {DiscoverBoardState}
 */
export function advanceDiscoverSlot(state, categoryId) {
  if (!isDiscoverCategoryId(categoryId)) return state;

  const records = getDiscoverRecordsByCategory(categoryId);
  if (!records.length) {
    return {
      ...state,
      [categoryId]: createSlotState(categoryId, -1)
    };
  }

  const currentIndex = state[categoryId]?.index ?? -1;
  const nextIndex = (currentIndex + 1) % records.length;

  return {
    ...state,
    [categoryId]: createSlotState(categoryId, nextIndex)
  };
}

/**
 * Advances every Discover category by one entry (legacy helper).
 * @param {DiscoverBoardState} state
 * @returns {DiscoverBoardState}
 */
export function advanceDiscoverBoard(state) {
  let next = state;

  for (const { id } of DISCOVER_BOARD_CATEGORIES) {
    next = advanceDiscoverSlot(next, id);
  }

  return next;
}

export function getDiscoverLibraryStats() {
  ensureIndex();

  return {
    entryCount: catalog.length,
    categories: DISCOVER_BOARD_CATEGORIES.map(({ id, label }) => ({
      id,
      label,
      entryCount: recordsByCategory.get(id)?.length ?? 0
    }))
  };
}

export {
  DISCOVER_BOARD_CATEGORIES,
  DISCOVER_CATEGORY,
  DISCOVER_CATEGORY_LABELS,
  getDiscoverCategoryLabel,
  isDiscoverCategoryId
} from "../data/discover/discoverSchema.js";
