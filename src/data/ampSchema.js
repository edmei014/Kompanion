/** @typedef {import("../library/ampLibrary.js").AmpRecord} AmpRecord */

import { resolveManufacturerIdFromAmpName } from "./manufacturers/manufacturerIds.js";
import { normalizeAmpThemeInput } from "../theme/ampTheme.js";

/** @type {(keyof AmpRecord)[]} */
export const AMP_RECORD_FIELDS = [
  "id",
  "manufacturerId",
  "manufacturer",
  "model",
  "aliases",
  "image",
  "description",
  "history",
  "introduced",
  "discontinued",
  "country",
  "ampType",
  "power",
  "channels",
  "tubes",
  "genres",
  "notableUsers",
  "tags",
  "theme",
  "isCombo"
];

/**
 * Normalizes raw amp data to the canonical AmpRecord shape.
 * All fields are always present; unused values are null or [].
 * @param {Partial<AmpRecord> & Pick<AmpRecord, "id" | "manufacturer" | "model">} raw
 * @returns {AmpRecord}
 */
export function createAmpRecord(raw) {
  const manufacturer = String(raw.manufacturer ?? "");
  const manufacturerId =
    String(raw.manufacturerId ?? "").trim() ||
    resolveManufacturerIdFromAmpName(manufacturer);

  return {
    id: String(raw.id ?? ""),
    manufacturerId,
    manufacturer,
    model: String(raw.model ?? ""),
    aliases: Array.isArray(raw.aliases)
      ? raw.aliases.map((alias) => String(alias).trim()).filter(Boolean)
      : [],
    image: raw.image ? String(raw.image) : null,
    description: raw.description ?? null,
    history: raw.history ?? null,
    introduced: raw.introduced ?? null,
    discontinued: raw.discontinued ?? null,
    country: raw.country ?? null,
    ampType: raw.ampType ?? null,
    power: raw.power ?? null,
    channels: raw.channels ?? null,
    tubes: raw.tubes ?? null,
    genres: raw.genres ?? null,
    notableUsers: raw.notableUsers ?? null,
    tags: raw.tags ?? null,
    theme: normalizeAmpThemeInput(raw.theme),
    // Only emitted when set, so normalizing data files does not add `isCombo: false` everywhere.
    ...(raw.isCombo === true ? { isCombo: true } : {})
  };
}

/**
 * Serializes a normalized amp record for manufacturer data files.
 * @param {AmpRecord} record
 */
export function serializeAmpRecord(record) {
  return JSON.stringify(record, null, 2).replace(/"([^"]+)":/g, "$1:");
}
