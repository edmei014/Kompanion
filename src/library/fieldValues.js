export const MISSING_FIELD_PLACEHOLDER = "Coming soon...";

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatGearFieldValue(value) {
  if (value === undefined || value === null || value === "") {
    return MISSING_FIELD_PLACEHOLDER;
  }

  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(", ") : MISSING_FIELD_PLACEHOLDER;
  }

  return String(value);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isMissingGearFieldValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
