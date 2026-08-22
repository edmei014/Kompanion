/**
 * Live Companion control → Parameter Registry bindings.
 * UI code references these IDs instead of hardcoding SysEx/CC details.
 */

import { paramId } from "./decoder/parameterRegistry.js";

/** Canonical writable controls confirmed via Protocol Research Lab. */
export const CONTROL_PARAMETERS = Object.freeze({
  gain: Object.freeze({
    key: "gain",
    parameterId: paramId(0x0a, 0x04),
    scaleFunction: "scaleGain"
  }),
  tempo: Object.freeze({
    key: "tempo",
    parameterId: paramId(0x04, 0x00),
    scaleFunction: "scaleTempo"
  }),
  stompA: Object.freeze({
    key: "stompA",
    parameterId: paramId(0x32, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  stompB: Object.freeze({
    key: "stompB",
    parameterId: paramId(0x33, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  stompC: Object.freeze({
    key: "stompC",
    parameterId: paramId(0x34, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  stompD: Object.freeze({
    key: "stompD",
    parameterId: paramId(0x35, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  stompX: Object.freeze({
    key: "stompX",
    parameterId: paramId(0x38, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  mod: Object.freeze({
    key: "mod",
    parameterId: paramId(0x3a, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  delay: Object.freeze({
    key: "delay",
    parameterId: paramId(0x3c, 0x03),
    scaleFunction: "scaleBoolean"
  }),
  reverb: Object.freeze({
    key: "reverb",
    parameterId: paramId(0x3d, 0x03),
    scaleFunction: "scaleBoolean"
  })
});

/**
 * Effect type parameter IDs (integer type codes — read/learn, not toggled here).
 */
export const EFFECT_TYPE_PARAMETERS = Object.freeze({
  stompA: paramId(0x32, 0x00),
  stompB: paramId(0x33, 0x00),
  stompC: paramId(0x34, 0x00),
  stompD: paramId(0x35, 0x00),
  stompX: paramId(0x38, 0x00),
  mod: paramId(0x3a, 0x00),
  delay: paramId(0x3c, 0x00),
  reverb: paramId(0x3d, 0x00)
});

/**
 * @param {string} controlKey
 * @returns {{ key: string, parameterId: number, scaleFunction: string } | null}
 */
export function getControlParameter(controlKey) {
  return CONTROL_PARAMETERS[controlKey] ?? null;
}
