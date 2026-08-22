/**
 * Central Kemper parameter scaling functions.
 * Add new scalers here — Live Inspector resolves them by name from the registry.
 */

/**
 * @typedef {{
 *   raw: number | null,
 *   ascii?: string | null,
 *   enumValues?: Record<number, string>
 * }} ScaleInput
 *
 * @typedef {{
 *   value: string | number | boolean | null,
 *   display: string,
 *   unit?: string
 * }} ScaleResult
 */

/**
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleRaw(input) {
  if (input.raw == null) {
    return { value: null, display: "—" };
  }
  return { value: input.raw, display: String(input.raw) };
}

/**
 * Kemper gain display used by Live Companion (raw / 1638.3 → one decimal).
 *
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleGain(input) {
  if (input.raw == null) return { value: null, display: "—" };
  const scaled = input.raw / 1638.3;
  return {
    value: Number(scaled.toFixed(1)),
    display: scaled.toFixed(1),
    unit: ""
  };
}

/**
 * Tempo: Kemper often uses BPM * 64 (or similar). Keep raw when unsure;
 * if value looks like BPM*64, show BPM estimate.
 *
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleTempo(input) {
  if (input.raw == null) return { value: null, display: "—" };
  const bpm = input.raw / 64;
  if (bpm >= 40 && bpm <= 300) {
    return {
      value: Number(bpm.toFixed(1)),
      display: bpm.toFixed(1),
      unit: "BPM"
    };
  }
  return { value: input.raw, display: String(input.raw), unit: "" };
}

/**
 * Shared on/off evaluation for boolean parameters (effect slots).
 * Non-zero raw → ON, zero or non-numeric → OFF.
 * Independent of scaleBoolean(); do not change that scaler.
 *
 * @param {unknown} rawValue
 * @returns {boolean}
 */
export function isBooleanOn(rawValue) {
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return false;
  return n !== 0;
}

/**
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleBoolean(input) {
  if (input.raw == null) return { value: null, display: "—" };
  const on = input.raw !== 0;
  return { value: on, display: on ? "On" : "Off" };
}

/**
 * 14-bit raw → 0–100%.
 *
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scalePercent(input) {
  if (input.raw == null) return { value: null, display: "—" };
  const pct = Math.max(0, Math.min(100, (input.raw / 16383) * 100));
  return {
    value: Number(pct.toFixed(1)),
    display: pct.toFixed(1),
    unit: "%"
  };
}

/**
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleEnum(input) {
  if (input.raw == null) return { value: null, display: "—" };
  const label = input.enumValues?.[input.raw];
  return {
    value: input.raw,
    display: label ? `${label}` : String(input.raw)
  };
}

/**
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function scaleString(input) {
  const text = input.ascii ?? "";
  return {
    value: text || null,
    display: text || "—"
  };
}

/** @type {Record<string, (input: ScaleInput) => ScaleResult>} */
export const PARAMETER_SCALE_FUNCTIONS = Object.freeze({
  scaleRaw,
  scaleGain,
  scaleTempo,
  scaleBoolean,
  scalePercent,
  scaleEnum,
  scaleString
});

/**
 * @param {string | null | undefined} scaleName
 * @param {ScaleInput} input
 * @returns {ScaleResult}
 */
export function applyScaleFunction(scaleName, input) {
  if (!scaleName) {
    // No known scale → scaled value intentionally empty.
    if (input.ascii) return scaleString(input);
    return { value: null, display: "—" };
  }

  const fn = PARAMETER_SCALE_FUNCTIONS[scaleName];
  if (!fn) {
    return { value: null, display: "—" };
  }

  return fn(input);
}

/**
 * Inverse encoders: scaled / semantic value → 14-bit raw for SysEx writes.
 */

/**
 * @param {number} displayGain 0–10 style gain
 * @returns {number}
 */
export function encodeGain(displayGain) {
  const n = Number(displayGain);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(16383, Math.round(n * 1638.3)));
}

/**
 * @param {number} bpm
 * @returns {number}
 */
export function encodeTempo(bpm) {
  const n = Number(bpm);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(16383, Math.round(n * 64)));
}

/**
 * @param {boolean | number} on
 * @returns {number}
 */
export function encodeBoolean(on) {
  if (typeof on === "number") return on !== 0 ? 1 : 0;
  return on ? 1 : 0;
}

/** @type {Record<string, (scaled: unknown) => number>} */
export const PARAMETER_ENCODE_FUNCTIONS = Object.freeze({
  scaleGain: encodeGain,
  scaleTempo: encodeTempo,
  scaleBoolean: encodeBoolean,
  scaleRaw: (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(16383, Math.trunc(n)));
  },
  scalePercent: (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(16383, Math.round((n / 100) * 16383)));
  }
});

/**
 * Encode a scaled/semantic value to raw using the registry scale name.
 * @param {string | null | undefined} scaleName
 * @param {unknown} scaledValue
 * @returns {number | null}
 */
export function encodeScaledValue(scaleName, scaledValue) {
  if (scaledValue == null) return null;
  if (!scaleName) {
    const n = Number(scaledValue);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(16383, Math.trunc(n)));
  }
  const fn = PARAMETER_ENCODE_FUNCTIONS[scaleName];
  if (!fn) return null;
  return fn(scaledValue);
}
