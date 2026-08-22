import { allCabinetRecords } from "../data/cabinets/index.js";
import { createGearLibrary } from "./createGearLibrary.js";

const cabinetStore = createGearLibrary({
  records: allCabinetRecords,
  normalizeRecord: (raw) => ({
    id: String(raw.id ?? ""),
    manufacturerId: String(raw.manufacturerId ?? "").trim(),
    manufacturer: String(raw.manufacturer ?? ""),
    model: String(raw.model ?? ""),
    aliases: Array.isArray(raw.aliases)
      ? raw.aliases.map((alias) => String(alias).trim()).filter(Boolean)
      : [],
    image: raw.image ? String(raw.image) : null,
    configuration: raw.configuration ?? null,
    variant: raw.variant ?? null,
    enclosure: raw.enclosure ?? null,
    speakers: raw.speakers ?? null,
    speaker: raw.speaker ?? null
  }),
  getRecordId: (record) => record.id,
  buildSearchText: (record) =>
    `${record.manufacturer} ${record.model} ${record.aliases.join(" ")}`.toLowerCase(),
  imageBasePath: "/images/cabinets"
});

/**
 * @param {ReturnType<typeof getAllCabinets>[number]} record
 * @returns {string[]}
 */
function collectCabinetAliases(record) {
  const aliases = new Set();
  const model = String(record.model ?? "").trim().toLowerCase();
  const manufacturer = String(record.manufacturer ?? "").trim().toLowerCase();

  if (model) aliases.add(model);
  if (manufacturer && model) aliases.add(`${manufacturer} ${model}`);

  for (const alias of record.aliases || []) {
    const normalized = String(alias).trim().toLowerCase();
    if (normalized) aliases.add(normalized);
  }

  return [...aliases];
}

export function getAllCabinets() {
  return cabinetStore.getAllRecords();
}

export function getCabinetById(cabinetId) {
  return cabinetStore.getRecordById(cabinetId);
}

export function searchCabinets(query = "") {
  return cabinetStore.searchRecords(query);
}

export function getCabinetImage(cabinetId) {
  return cabinetStore.getImageSrc(cabinetId);
}

/**
 * Longest-alias match against Gear Library cabinet records.
 * Returns null when nothing in the library matches — never guesses.
 *
 * @param {...unknown} sources
 * @returns {ReturnType<typeof getCabinetById>}
 */
export function resolveCabinetRecordFromTextSources(...sources) {
  const haystack = sources
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (!haystack) return null;

  let best = null;
  let bestLength = 0;

  for (const record of getAllCabinets()) {
    for (const alias of collectCabinetAliases(record)) {
      if (alias.length < 3 || alias.length < bestLength) continue;
      if (!haystack.includes(alias)) continue;
      best = record;
      bestLength = alias.length;
    }
  }

  return best;
}

/**
 * Present-only view of a cabinet record. Missing fields are omitted.
 *
 * @param {string} cabinetId
 * @returns {{
 *   id: string,
 *   manufacturer: string,
 *   model: string,
 *   imageSrc: string | null,
 *   hasImage: boolean,
 *   recognizedRows: { label: string, value: string }[],
 *   variant: string
 * } | null}
 */
export function getCabinetDetailView(cabinetId) {
  const cabinet = getCabinetById(cabinetId);
  if (!cabinet) return null;

  /** @type {{ label: string, value: string }[]} */
  const recognizedRows = [];
  const manufacturer = String(cabinet.manufacturer ?? "").trim();
  const model = String(cabinet.model ?? "").trim();
  const variant = String(cabinet.variant ?? cabinet.enclosure ?? "").trim();

  if (manufacturer) recognizedRows.push({ label: "Manufacturer", value: manufacturer });
  if (model) recognizedRows.push({ label: "Model", value: model });
  if (variant) recognizedRows.push({ label: "Configuration", value: variant });

  const imageSrc = getCabinetImage(cabinetId);

  return {
    id: cabinet.id,
    manufacturer,
    model,
    variant,
    imageSrc,
    hasImage: Boolean(imageSrc),
    recognizedRows
  };
}
