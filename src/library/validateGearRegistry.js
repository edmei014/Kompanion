import { allAmpRecords } from "../data/amps/index.js";
import { createAmpRecord } from "../data/ampSchema.js";
import { manufacturerRecords } from "../data/manufacturers/index.js";
import { createManufacturerRecord } from "../data/manufacturers/manufacturerSchema.js";

/**
 * @typedef {Object} GearRegistryReport
 * @property {number} ampCount
 * @property {number} manufacturerCount
 * @property {string[]} missingManufacturerIds
 * @property {string[]} orphanManufacturerIds
 * @property {string[]} duplicateAmpIds
 * @property {string[]} emptyAliasAmps
 * @property {Array<{ alias: string, ampIds: string[] }>} duplicateAliases
 * @property {boolean} ok
 */

/**
 * Validates that Gear Library and Live Companion share one consistent registry.
 * Call once when the amp library indexes — never silently drop amps.
 *
 * @param {{ warn?: boolean }} [options]
 * @returns {GearRegistryReport}
 */
export function validateGearRegistry(options = {}) {
  const { warn = true } = options;

  const manufacturers = manufacturerRecords.map((raw) =>
    createManufacturerRecord(raw)
  );
  const manufacturerIds = new Set(
    manufacturers.map((record) => record.id).filter(Boolean)
  );

  const amps = allAmpRecords.map((raw) => createAmpRecord(raw));
  /** @type {Map<string, number>} */
  const ampIdCounts = new Map();
  /** @type {Map<string, Set<string>>} */
  const aliasOwners = new Map();
  /** @type {string[]} */
  const emptyAliasAmps = [];
  /** @type {string[]} */
  const missingManufacturerIds = [];

  for (const amp of amps) {
    ampIdCounts.set(amp.id, (ampIdCounts.get(amp.id) ?? 0) + 1);

    if (!amp.manufacturerId || !manufacturerIds.has(amp.manufacturerId)) {
      missingManufacturerIds.push(
        `${amp.id} → manufacturerId "${amp.manufacturerId || "(empty)"}"`
      );
    }

    if (!amp.aliases.length) {
      emptyAliasAmps.push(amp.id);
    }

    const identityAliases = [
      ...amp.aliases,
      amp.model,
      `${amp.manufacturer} ${amp.model}`
    ];

    for (const alias of identityAliases) {
      const key = String(alias || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!aliasOwners.has(key)) aliasOwners.set(key, new Set());
      aliasOwners.get(key).add(amp.id);
    }
  }

  const ampManufacturerIds = new Set(
    amps.map((amp) => amp.manufacturerId).filter(Boolean)
  );
  const orphanManufacturerIds = [...manufacturerIds].filter(
    (id) => !ampManufacturerIds.has(id)
  );

  const duplicateAmpIds = [...ampIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const duplicateAliases = [...aliasOwners.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([alias, owners]) => ({ alias, ampIds: [...owners].sort() }))
    .sort((left, right) => left.alias.localeCompare(right.alias));

  const report = {
    ampCount: amps.length,
    manufacturerCount: manufacturerIds.size,
    missingManufacturerIds: [...new Set(missingManufacturerIds)].sort(),
    orphanManufacturerIds: orphanManufacturerIds.sort(),
    duplicateAmpIds,
    emptyAliasAmps: emptyAliasAmps.sort(),
    duplicateAliases,
    ok:
      missingManufacturerIds.length === 0 &&
      duplicateAmpIds.length === 0
  };

  if (warn && typeof console !== "undefined") {
    console.info(
      `[Gear Registry] ${report.ampCount} amps, ${report.manufacturerCount} manufacturers`
    );

    if (report.missingManufacturerIds.length) {
      console.error(
        "[Gear Registry] Amp manufacturerId missing from manufacturerRecords:",
        report.missingManufacturerIds
      );
    }

    if (report.duplicateAmpIds.length) {
      console.error(
        "[Gear Registry] Duplicate amp ids:",
        report.duplicateAmpIds
      );
    }

    if (report.duplicateAliases.length) {
      console.warn(
        "[Gear Registry] Shared aliases (longest-match still applies):",
        report.duplicateAliases.slice(0, 20)
      );
    }

    if (report.orphanManufacturerIds.length) {
      console.warn(
        "[Gear Registry] Manufacturers without amps:",
        report.orphanManufacturerIds
      );
    }
  }

  return report;
}
