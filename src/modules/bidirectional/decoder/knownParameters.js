/**
 * Seed list of known Kemper parameters for the Live Inspector registry.
 *
 * Extend freely — Live Inspector / state store pick up new entries automatically.
 *
 * Fields:
 *   id, name, category, type, scaleFunction, unit, known
 */

import { PARAMETER_TYPE } from "./parameterTypes.js";

/**
 * @param {number} page
 * @param {number} offset
 * @returns {number}
 */
function id(page, offset) {
  return ((page & 0x7f) << 8) | (offset & 0x7f);
}

/**
 * @type {Array<{
 *   id: number,
 *   name: string,
 *   category: string,
 *   type: string,
 *   scaleFunction: string | null,
 *   unit?: string,
 *   known?: boolean,
 *   notes?: string,
 *   enumValues?: Record<number, string>
 * }>}
 */
export const KNOWN_PARAMETERS = [
  // --- Rig / Strings ---
  {
    id: id(0x00, 0x01),
    name: "Rig Name",
    category: "Rig",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x02),
    name: "Rig Author",
    category: "Rig",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x10),
    name: "Amp Name",
    category: "Amplifier",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x15),
    name: "Amp Manufacturer",
    category: "Amplifier",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x18),
    name: "Amp Model",
    category: "Amplifier",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x1b),
    name: "Amp Year of Production",
    category: "Amplifier",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x20),
    name: "Cabinet Name",
    category: "Cabinet",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x25),
    name: "Cabinet Manufacturer",
    category: "Cabinet",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },
  {
    id: id(0x00, 0x2a),
    name: "Cabinet Model",
    category: "Cabinet",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: true
  },

  // --- Numerics ---
  {
    id: id(0x04, 0x00),
    name: "Tempo",
    category: "Rig",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: "scaleTempo",
    unit: "BPM",
    known: true,
    writable: true
  },
  {
    id: id(0x0a, 0x04),
    name: "Gain",
    category: "Amplifier",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: "scaleGain",
    unit: "",
    known: true,
    writable: true
  },

  // --- Effects ---
  {
    id: id(0x32, 0x03),
    name: "Stomp A",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x32, 0x00),
    name: "Stomp A Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x33, 0x03),
    name: "Stomp B",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x33, 0x00),
    name: "Stomp B Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x34, 0x03),
    name: "Stomp C",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x34, 0x00),
    name: "Stomp C Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x35, 0x03),
    name: "Stomp D",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x35, 0x00),
    name: "Stomp D Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x38, 0x03),
    name: "Stomp X",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x38, 0x00),
    name: "Stomp X Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x3a, 0x03),
    name: "MOD",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x3a, 0x00),
    name: "MOD Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x3c, 0x03),
    name: "Delay",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x3c, 0x00),
    name: "Delay Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },
  {
    id: id(0x3d, 0x03),
    name: "Reverb",
    category: "Effect",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: true,
    writable: true
  },
  {
    id: id(0x3d, 0x00),
    name: "Reverb Type",
    category: "Effect",
    type: PARAMETER_TYPE.INTEGER,
    scaleFunction: null,
    unit: "",
    known: true
  },

  // Observed discovery IDs
  {
    id: 0x1903,
    name: "Module On/Off",
    category: "Effect Parameter",
    type: PARAMETER_TYPE.BOOLEAN,
    scaleFunction: "scaleBoolean",
    unit: "",
    known: false,
    notes: "Seen in bidirectional traffic; confirm exact module against docs"
  },
  {
    id: 0x003c,
    name: "Rendered String",
    category: "System",
    type: PARAMETER_TYPE.STRING,
    scaleFunction: "scaleString",
    unit: "",
    known: false
  }
];
