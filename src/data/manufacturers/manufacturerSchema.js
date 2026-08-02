/**
 * @typedef {Object} ManufacturerRecord
 * @property {string} id
 * @property {string} name
 * @property {string | null} description
 * @property {string | null} [history]
 * @property {string | null} [country]
 * @property {string | number | null} [founded]
 * @property {string | null} [founder]
 * @property {string | null} [website]
 * @property {string | null} [logo]
 * @property {string | null} [heroImage]
 */

/**
 * @param {Partial<ManufacturerRecord>} raw
 * @returns {ManufacturerRecord}
 */
export function createManufacturerRecord(raw = {}) {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    description: raw.description ?? null,
    history: raw.history ?? null,
    country: raw.country ?? null,
    founded: raw.founded ?? null,
    founder: raw.founder ?? null,
    website: raw.website ?? null,
    logo: raw.logo ?? null,
    heroImage: raw.heroImage ?? null
  };
}
