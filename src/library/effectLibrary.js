import { allEffectRecords } from "../data/effects/index.js";
import { createGearLibrary } from "./createGearLibrary.js";

const effectStore = createGearLibrary({
  records: allEffectRecords,
  normalizeRecord: (raw) => ({
    id: String(raw.id ?? ""),
    manufacturer: String(raw.manufacturer ?? ""),
    model: String(raw.model ?? ""),
    aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    image: raw.image ?? null
  }),
  getRecordId: (record) => record.id,
  buildSearchText: (record) =>
    `${record.manufacturer} ${record.model} ${record.aliases.join(" ")}`.toLowerCase(),
  imageBasePath: "/images/effects"
});

export function getAllEffects() {
  return effectStore.getAllRecords();
}

export function getEffectById(effectId) {
  return effectStore.getRecordById(effectId);
}

export function searchEffects(query = "") {
  return effectStore.searchRecords(query);
}

export function getEffectImage(effectId) {
  return effectStore.getImageSrc(effectId);
}
