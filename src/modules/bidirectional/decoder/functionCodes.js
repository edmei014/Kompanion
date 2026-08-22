/**
 * Kemper SysEx function-code labels for the protocol analyzer.
 * Unknown codes stay as hex until the registry grows.
 */

/** @type {Readonly<Record<number, string>>} */
export const KEMPER_FUNCTION_LABELS = Object.freeze({
  0x00: "Parameter",
  0x01: "Single Parameter Change",
  0x02: "Multi Parameter Change",
  0x03: "String",
  0x04: "BLOB",
  0x05: "Reserved / Extended (undocumented)",
  0x06: "Extended Parameter Change",
  0x07: "Extended String Parameter Change",
  0x08: "Morphed Multi Parameter",
  0x3c: "String",
  0x41: "Request Parameter",
  0x42: "Request Multi Parameter",
  0x43: "Request String",
  0x47: "Request Extended String",
  0x7c: "Request Rendered String",
  0x7e: "Sys Communication"
});

/**
 * @param {number} functionCode
 * @returns {{ code: number, label: string, display: string }}
 */
export function describeFunctionCode(functionCode) {
  const code = functionCode & 0xff;
  const label = KEMPER_FUNCTION_LABELS[code] ?? null;
  const hex = `0x${code.toString(16).toUpperCase().padStart(2, "0")}`;

  return {
    code,
    label: label ?? hex,
    display: label ? `${hex} (${label})` : hex
  };
}

/**
 * @param {number} functionCode
 * @returns {boolean}
 */
export function isStringFunction(functionCode) {
  const code = functionCode & 0xff;
  return code === 0x03 || code === 0x3c;
}

/**
 * @param {number} functionCode
 * @returns {boolean}
 */
export function isParameterFunction(functionCode) {
  const code = functionCode & 0xff;
  return code === 0x00 || code === 0x01 || code === 0x02 || code === 0x08;
}
