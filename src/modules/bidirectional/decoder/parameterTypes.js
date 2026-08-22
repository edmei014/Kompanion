/**
 * Parameter value types for the Kemper Parameter Registry.
 */

export const PARAMETER_TYPE = Object.freeze({
  BOOLEAN: "Boolean",
  INTEGER: "Integer",
  STRING: "String",
  ENUM: "Enum"
});

/**
 * @param {string} type
 * @returns {boolean}
 */
export function isParameterType(type) {
  return Object.values(PARAMETER_TYPE).includes(type);
}
