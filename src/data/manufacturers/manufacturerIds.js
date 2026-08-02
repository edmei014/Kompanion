import { manufacturerRecords } from "./index.js";

/**
 * Optional display-name aliases → canonical manufacturerId.
 * Use when amp.manufacturer or Kemper strings differ from manufacturerRecords.name.
 * Canonical names from manufacturerRecords are added automatically.
 */
const MANUFACTURER_NAME_ALIASES = {
  // Name spelling variants only — IDs must match manufacturerRecords[].id
  Vox: "vox",
  "Mesa/Boogie": "mesa-boogie",
  Mesa: "mesa-boogie",
  "Bell and Howell": "bell-and-howell",
  "Driftwood": "driftwood"
};

/**
 * Builds name → id from manufacturerRecords, then applies aliases.
 * Single source of truth: manufacturerRecords[].id / .name.
 */
function buildManufacturerIdByAmpName() {
  /** @type {Record<string, string>} */
  const map = {};

  for (const record of manufacturerRecords) {
    if (!record?.id || !record?.name) continue;
    map[record.name] = record.id;
  }

  for (const [name, id] of Object.entries(MANUFACTURER_NAME_ALIASES)) {
    map[name] = id;
  }

  return map;
}

/** @type {Record<string, string>} */
export const MANUFACTURER_ID_BY_AMP_NAME = buildManufacturerIdByAmpName();

/** @param {string} ampManufacturerName */
export function resolveManufacturerIdFromAmpName(ampManufacturerName) {
  const name = String(ampManufacturerName ?? "").trim();
  if (!name) return "";
  return MANUFACTURER_ID_BY_AMP_NAME[name] ?? "";
}
