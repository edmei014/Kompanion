/**
 * Kemper Parameter Registry for the Live Inspector.
 *
 * Registry entry shape:
 *   id, name, category, type, scaleFunction, unit, known, writable
 *
 * Unknown IDs are auto-registered so Current Parameters stays complete.
 * Writable entries are confirmed for SysEx Single Parameter Change writes.
 */

import { isParameterType, PARAMETER_TYPE } from "./parameterTypes.js";
import { KNOWN_PARAMETERS } from "./knownParameters.js";

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   category: string,
 *   type: string,
 *   scaleFunction: string | null,
 *   unit: string,
 *   known: boolean,
 *   writable?: boolean,
 *   notes?: string,
 *   enumValues?: Record<number, string>
 * }} ParameterDefinition
 */

/** @type {Map<number, ParameterDefinition>} */
const registry = new Map();

/**
 * @param {number} page
 * @param {number} offset
 * @returns {number}
 */
export function paramId(page, offset) {
  return ((page & 0x7f) << 8) | (offset & 0x7f);
}

/**
 * @param {number} id
 * @returns {string}
 */
export function formatParameterIdHex(id) {
  return `0x${(id & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * Infer a friendly unknown-parameter label from the address page family.
 *
 * @param {number} id
 * @returns {{ name: string, category: string }}
 */
export function describeUnknownParameter(id) {
  const page = (id >> 8) & 0x7f;

  if (page >= 0x32 && page <= 0x3d) {
    return {
      name: "Readable Parameter",
      category: "Effect Parameter"
    };
  }

  if (page === 0x00) {
    return {
      name: "Readable Parameter",
      category: "Rig"
    };
  }

  if (page === 0x0a) {
    return {
      name: "Readable Parameter",
      category: "Amplifier"
    };
  }

  if (page === 0x04) {
    return {
      name: "Readable Parameter",
      category: "Rig"
    };
  }

  return {
    name: "Readable Parameter",
    category: "Readable"
  };
}

/**
 * @param {number} id
 * @param {{
 *   name: string,
 *   category?: string,
 *   type: string,
 *   scaleFunction?: string | null,
 *   unit?: string,
 *   known?: boolean,
 *   writable?: boolean,
 *   notes?: string,
 *   enumValues?: Record<number, string>
 * }} definition
 */
export function registerParameter(id, definition) {
  const normalized = id & 0xffff;
  const type = definition.type;

  if (!isParameterType(type)) {
    throw new Error(
      `Unknown parameter type "${type}" for ${formatParameterIdHex(normalized)}`
    );
  }

  registry.set(normalized, {
    id: normalized,
    name: definition.name,
    category: definition.category || "Unknown",
    type,
    scaleFunction: definition.scaleFunction ?? null,
    unit: definition.unit ?? "",
    known: definition.known !== false,
    writable: definition.writable === true,
    notes: definition.notes,
    enumValues: definition.enumValues
      ? { ...definition.enumValues }
      : undefined
  });
}

/**
 * @param {Array<Parameters<typeof registerParameter>[1] & { id: number }>} definitions
 */
export function registerParameters(definitions) {
  definitions.forEach((definition) => {
    const { id, ...rest } = definition;
    registerParameter(id, rest);
  });
}

/**
 * @param {number | null | undefined} id
 * @returns {ParameterDefinition | null}
 */
export function lookupParameter(id) {
  if (id == null || !Number.isFinite(id)) return null;
  return registry.get(id & 0xffff) ?? null;
}

/**
 * Ensure an ID exists in the registry. Auto-creates unknown entries.
 *
 * @param {number} id
 * @param {{ type?: string, ascii?: boolean }} [hints]
 * @returns {ParameterDefinition}
 */
export function ensureParameter(id, hints = {}) {
  const normalized = id & 0xffff;
  const existing = registry.get(normalized);
  if (existing) return existing;

  const family = describeUnknownParameter(normalized);
  const type = hints.ascii
    ? PARAMETER_TYPE.STRING
    : hints.type || PARAMETER_TYPE.INTEGER;

  registerParameter(normalized, {
    name: family.name,
    category: family.category,
    type,
    scaleFunction: type === PARAMETER_TYPE.STRING ? "scaleString" : null,
    unit: "",
    known: false
  });

  return registry.get(normalized);
}

/**
 * @returns {readonly ParameterDefinition[]}
 */
export function listRegisteredParameters() {
  return Object.freeze(
    [...registry.values()].sort((left, right) => left.id - right.id)
  );
}

/**
 * @param {number} id
 * @returns {boolean}
 */
export function hasParameter(id) {
  return registry.has(id & 0xffff);
}

registerParameters(KNOWN_PARAMETERS);

export { PARAMETER_TYPE };
