import { allCabinetRecords } from "../data/cabinets/index.js";
import { createGearLibrary } from "./createGearLibrary.js";

const cabinetStore = createGearLibrary({
  records: allCabinetRecords,
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
  imageBasePath: "/images/cabinets"
});

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
