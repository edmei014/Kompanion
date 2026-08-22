/**
 * Kemper bidirectional SysEx message builders for protocol research.
 * Isolated from Live Companion production CC / control paths.
 */

const KEMPER_PREFIX = Object.freeze([0xf0, 0x00, 0x20, 0x33, 0x02, 0x7f]);
const KEMPER_INSTANCE = 0x00;

/** Single Parameter Change (Profiler MIDI docs / function code $01). */
export const FUNCTION_SINGLE_PARAMETER_CHANGE = 0x01;

/** Request Single Parameter Value (function code $41). */
export const FUNCTION_REQUEST_SINGLE_PARAMETER = 0x41;

/** Request String (function code $43). */
export const FUNCTION_REQUEST_STRING = 0x43;

/**
 * Clamp a numeric value to 14-bit MIDI range (0…16383).
 * @param {number} raw
 * @returns {number}
 */
export function clampRaw14(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(0x3fff, Math.trunc(n)));
}

/**
 * Split a 14-bit parameter id into address page / offset bytes.
 * @param {number} parameterId
 * @returns {{ addrH: number, addrL: number }}
 */
export function splitParameterId(parameterId) {
  const id = parameterId & 0xffff;
  return {
    addrH: (id >> 8) & 0x7f,
    addrL: id & 0x7f
  };
}

/**
 * Build a Single Parameter Change SysEx frame (write).
 *
 * Layout:
 *   F0 00 20 33 02 7F 01 00 [addrH] [addrL] [valH] [valL] F7
 *
 * @param {number} parameterId 14-bit / packed page+offset id
 * @param {number} rawValue decimal 0…16383
 * @returns {number[]}
 */
export function buildSingleParameterChange(parameterId, rawValue) {
  const { addrH, addrL } = splitParameterId(parameterId);
  const value = clampRaw14(rawValue);
  return [
    ...KEMPER_PREFIX,
    FUNCTION_SINGLE_PARAMETER_CHANGE,
    KEMPER_INSTANCE,
    addrH,
    addrL,
    (value >> 7) & 0x7f,
    value & 0x7f,
    0xf7
  ];
}

/**
 * Build a Request Single Parameter Value SysEx frame (read).
 * @param {number} parameterId
 * @returns {number[]}
 */
export function buildSingleParameterRequest(parameterId) {
  const { addrH, addrL } = splitParameterId(parameterId);
  return [
    ...KEMPER_PREFIX,
    FUNCTION_REQUEST_SINGLE_PARAMETER,
    KEMPER_INSTANCE,
    addrH,
    addrL,
    0xf7
  ];
}

/**
 * Build a Request String SysEx frame (read).
 * Layout: F0 00 20 33 02 7F 43 00 [addrH] [addrL] F7
 * @param {number} parameterId
 * @returns {number[]}
 */
export function buildStringParameterRequest(parameterId) {
  const { addrH, addrL } = splitParameterId(parameterId);
  return [
    ...KEMPER_PREFIX,
    FUNCTION_REQUEST_STRING,
    KEMPER_INSTANCE,
    addrH,
    addrL,
    0xf7
  ];
}
