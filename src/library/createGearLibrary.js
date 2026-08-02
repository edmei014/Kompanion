import { formatGearFieldValue } from "./fieldValues.js";

/**
 * @template {Record<string, unknown>} TRecord
 * @template {string} TId
 * @typedef {Object} GearLibraryConfig
 * @property {Partial<TRecord>[]} records
 * @property {(raw: Partial<TRecord>) => TRecord} normalizeRecord
 * @property {(record: TRecord) => TId} getRecordId
 * @property {(record: TRecord) => string} buildSearchText
 * @property {{ key: string, label: string }[]} [detailFields]
 * @property {string | null} [imageBasePath]
 * @property {(filename: string | null) => string | null} [resolveImageSrc]
 * @property {(record: TRecord) => string | null} [getImageFilename]
 * @property {(record: TRecord) => string} [getManufacturer]
 * @property {(record: TRecord) => string} [getManufacturerId]
 * @property {(record: TRecord) => string} [getModel]
 */

/**
 * Creates a reusable, indexed gear library for a single category.
 * @template {Record<string, unknown>} TRecord
 * @template {string} TId
 * @param {GearLibraryConfig<TRecord, TId>} config
 */
export function createGearLibrary(config) {
  const {
    records,
    normalizeRecord,
    getRecordId,
    buildSearchText,
    detailFields = [],
    imageBasePath = null,
    resolveImageSrc = null,
    getImageFilename = (record) =>
      typeof record.image === "string" && record.image ? record.image : null,
    getManufacturer = (record) => String(record.manufacturer ?? ""),
    getManufacturerId = (record) => String(record.manufacturerId ?? ""),
    getModel = (record) => String(record.model ?? "")
  } = config;

  /** @type {Map<TId, TRecord> | null} */
  let recordsById = null;

  /** @type {TRecord[] | null} */
  let catalog = null;

  function ensureIndex() {
    if (recordsById && catalog) return;

    recordsById = new Map();
    catalog = records.map((raw) => normalizeRecord(raw));

    for (const record of catalog) {
      recordsById.set(getRecordId(record), record);
    }
  }

  function getAllRecords() {
    ensureIndex();
    return catalog;
  }

  /** @param {TId} recordId */
  function getRecordById(recordId) {
    ensureIndex();
    return recordsById.get(recordId) ?? null;
  }

  function getManufacturers() {
    const manufacturers = new Set();

    for (const record of getAllRecords()) {
      const manufacturer = getManufacturer(record);
      if (manufacturer && manufacturer !== "Unknown") {
        manufacturers.add(manufacturer);
      }
    }

    return [...manufacturers].sort((left, right) => left.localeCompare(right));
  }

  /** @param {string} manufacturer */
  function getRecordsByManufacturer(manufacturer) {
    return getAllRecords().filter(
      (record) => getManufacturer(record) === manufacturer
    );
  }

  /** @param {string} query */
  function searchRecords(query = "") {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return getAllRecords();

    return getAllRecords().filter((record) =>
      buildSearchText(record).includes(normalizedQuery)
    );
  }

  /** @param {TId} recordId */
  function getImageFilenameForRecord(recordId) {
    const record = getRecordById(recordId);
    if (!record) return null;
    return getImageFilename(record);
  }

  /** @param {TId} recordId */
  function getImageSrc(recordId) {
    const record = getRecordById(recordId);
    if (!record) return null;

    const filename = getImageFilename(record);
    if (resolveImageSrc) {
      return resolveImageSrc(filename);
    }

    if (!filename || !imageBasePath) return null;
    return `${imageBasePath}/${filename}`;
  }

  /** @param {TId} recordId */
  function hasImage(recordId) {
    return Boolean(getImageFilenameForRecord(recordId));
  }

  /** @param {TId} recordId @param {string} fieldKey */
  function getFieldDisplayValue(recordId, fieldKey) {
    const record = getRecordById(recordId);
    if (!record) return formatGearFieldValue(null);
    return formatGearFieldValue(record[fieldKey]);
  }

  /** @param {TId} recordId */
  function getDetailView(recordId) {
    const record = getRecordById(recordId);
    if (!record) return null;

    return {
      id: getRecordId(record),
      manufacturer: getManufacturer(record),
      model: getModel(record),
      imageSrc: getImageSrc(recordId),
      hasImage: hasImage(recordId),
      fields: detailFields.map(({ key, label }) => ({
        key,
        label,
        displayValue: formatGearFieldValue(record[key])
      }))
    };
  }

  function getLibraryStats() {
    return {
      itemCount: getAllRecords().length,
      manufacturerCount: getManufacturers().length
    };
  }

  /** @param {TRecord[]} filteredRecords */
  function createBrowseEntries(filteredRecords) {
    const allRecords = getAllRecords();

    return filteredRecords.map((record) => {
      const recordId = getRecordId(record);
      const index = allRecords.findIndex(
        (entry) => getRecordId(entry) === recordId
      );

      return {
        id: recordId,
        manufacturerId: getManufacturerId(record),
        manufacturer: getManufacturer(record),
        model: getModel(record),
        imageSrc: getImageSrc(recordId),
        hasImage: hasImage(recordId),
        searchText: buildSearchText(record),
        sortIndex: index >= 0 ? index : 0
      };
    });
  }

  return {
    getAllRecords,
    getRecordById,
    getManufacturers,
    getRecordsByManufacturer,
    searchRecords,
    getImageFilenameForRecord,
    getImageSrc,
    hasImage,
    getFieldDisplayValue,
    getDetailView,
    getLibraryStats,
    createBrowseEntries,
    detailFields
  };
}
