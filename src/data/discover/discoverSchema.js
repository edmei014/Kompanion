/**
 * @typedef {"legendary_recording" | "amp_story" | "did_you_know"} DiscoverCategoryId
 */

/**
 * @typedef {Object} DiscoverRecord
 * @property {string} id
 * @property {DiscoverCategoryId} type
 * @property {string} title
 * @property {string} text
 * @property {string | null} [ampId]
 * @property {string | null} [manufacturerId]
 * @property {string | null} [image]
 * @property {string[]} [tags]
 */

export const DISCOVER_CATEGORY = Object.freeze({
  LEGENDARY_RECORDING: "legendary_recording",
  AMP_STORY: "amp_story",
  DID_YOU_KNOW: "did_you_know"
});

/**
 * Board order for the Discover magazine column.
 * @type {readonly { id: DiscoverCategoryId, label: string }[]}
 */
export const DISCOVER_BOARD_CATEGORIES = Object.freeze([
  { id: DISCOVER_CATEGORY.LEGENDARY_RECORDING, label: "Legendary Recordings" },
  { id: DISCOVER_CATEGORY.AMP_STORY, label: "Amp Stories" },
  { id: DISCOVER_CATEGORY.DID_YOU_KNOW, label: "Did You Know" }
]);

/** @type {Record<DiscoverCategoryId, string>} */
export const DISCOVER_CATEGORY_LABELS = Object.freeze({
  legendary_recording: "Legendary Recordings",
  amp_story: "Amp Stories",
  did_you_know: "Did You Know"
});

const VALID_CATEGORIES = new Set(Object.values(DISCOVER_CATEGORY));

/**
 * @param {unknown} type
 * @returns {type is DiscoverCategoryId}
 */
export function isDiscoverCategoryId(type) {
  return VALID_CATEGORIES.has(/** @type {DiscoverCategoryId} */ (type));
}

/**
 * @param {DiscoverCategoryId | string} type
 * @returns {string}
 */
export function getDiscoverCategoryLabel(type) {
  if (isDiscoverCategoryId(type)) {
    return DISCOVER_CATEGORY_LABELS[type];
  }
  return "Discover";
}

/**
 * @param {Partial<DiscoverRecord> & Pick<DiscoverRecord, "id" | "type" | "title" | "text">} raw
 * @returns {DiscoverRecord}
 */
export function createDiscoverRecord(raw) {
  const type = isDiscoverCategoryId(raw.type)
    ? raw.type
    : DISCOVER_CATEGORY.DID_YOU_KNOW;

  return {
    id: String(raw.id ?? "").trim(),
    type,
    title: String(raw.title ?? "").trim(),
    text: String(raw.text ?? "").trim(),
    ampId: raw.ampId ? String(raw.ampId).trim() : null,
    manufacturerId: raw.manufacturerId
      ? String(raw.manufacturerId).trim()
      : null,
    image: raw.image ? String(raw.image).trim() : null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : []
  };
}
