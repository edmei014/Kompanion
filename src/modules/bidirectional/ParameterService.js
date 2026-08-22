/**
 * Unified Kemper parameter communication layer.
 *
 * Production UI calls setParameter / setScaledParameter.
 * Transport is bidirectional SysEx Single Parameter Change (0x01).
 * Incoming bidirectional updates remain the source of truth.
 */

import {
  buildSingleParameterChange,
  clampRaw14
} from "./decoder/protocolMessages.js";
import {
  formatParameterIdHex,
  lookupParameter
} from "./decoder/parameterRegistry.js";
import {
  applyScaleFunction,
  encodeScaledValue
} from "./decoder/parameterScales.js";
import { getControlParameter } from "./controlBindings.js";

/**
 * @typedef {{
 *   ok: boolean,
 *   parameterId: number,
 *   parameterIdHex: string,
 *   rawValue: number,
 *   definition: import("./decoder/parameterRegistry.js").ParameterDefinition | null,
 *   error?: string
 * }} ParameterWriteResult
 */

export class ParameterService {
  /**
   * @param {{
   *   getOutput?: () => Promise<MIDIOutput | null> | MIDIOutput | null,
   *   send?: (bytes: number[]) => void
   * }} [options]
   */
  constructor(options = {}) {
    this.getOutput = options.getOutput ?? null;
    this.externalSend = options.send ?? null;
  }

  /**
   * @param {() => Promise<MIDIOutput | null> | MIDIOutput | null} getOutput
   */
  setOutputProvider(getOutput) {
    this.getOutput = getOutput;
  }

  /**
   * Registry-backed handle for a control or parameter id.
   * @param {string | number} controlKeyOrId
   */
  get(controlKeyOrId) {
    const binding =
      typeof controlKeyOrId === "string"
        ? getControlParameter(controlKeyOrId)
        : null;
    const parameterId =
      binding?.parameterId ??
      (typeof controlKeyOrId === "number" ? controlKeyOrId & 0xffff : null);

    if (parameterId == null) {
      return null;
    }

    const definition = lookupParameter(parameterId);
    const scaleName = binding?.scaleFunction ?? definition?.scaleFunction ?? null;

    return {
      parameterId,
      parameterIdHex: formatParameterIdHex(parameterId),
      definition,
      scaleFunction: scaleName,
      decode: (rawValue) =>
        applyScaleFunction(scaleName, {
          raw: rawValue,
          enumValues: definition?.enumValues
        }),
      scale: (rawValue) =>
        applyScaleFunction(scaleName, {
          raw: rawValue,
          enumValues: definition?.enumValues
        }),
      encode: (scaledValue) => encodeScaledValue(scaleName, scaledValue),
      write: (rawValue) => this.setParameter(parameterId, rawValue),
      writeScaled: (scaledValue) =>
        this.setScaledParameter(parameterId, scaledValue)
    };
  }

  /**
   * Write a raw 14-bit parameter value via SysEx.
   * @param {number} parameterId
   * @param {number} value
   * @returns {Promise<ParameterWriteResult>}
   */
  async setParameter(parameterId, value) {
    const id = parameterId & 0xffff;
    const rawValue = clampRaw14(value);
    const definition = lookupParameter(id);
    const parameterIdHex = formatParameterIdHex(id);
    const bytes = buildSingleParameterChange(id, rawValue);

    try {
      const sent = await this.sendBytes(bytes);
      if (!sent) {
        return {
          ok: false,
          parameterId: id,
          parameterIdHex,
          rawValue,
          definition,
          error: "No MIDI output available"
        };
      }
      return {
        ok: true,
        parameterId: id,
        parameterIdHex,
        rawValue,
        definition
      };
    } catch (error) {
      return {
        ok: false,
        parameterId: id,
        parameterIdHex,
        rawValue,
        definition,
        error: error?.message || String(error)
      };
    }
  }

  /**
   * Encode a scaled value through the Parameter Registry, then write.
   * @param {number} parameterId
   * @param {unknown} scaledValue
   * @returns {Promise<ParameterWriteResult>}
   */
  async setScaledParameter(parameterId, scaledValue) {
    const definition = lookupParameter(parameterId);
    const raw = encodeScaledValue(definition?.scaleFunction, scaledValue);
    if (raw == null) {
      return {
        ok: false,
        parameterId: parameterId & 0xffff,
        parameterIdHex: formatParameterIdHex(parameterId),
        rawValue: 0,
        definition,
        error: "Unable to encode scaled value for parameter"
      };
    }
    return this.setParameter(parameterId, raw);
  }

  /**
   * Convenience: write by control binding key (`gain`, `tempo`, `delay`, …).
   * @param {string} controlKey
   * @param {unknown} scaledValue
   * @returns {Promise<ParameterWriteResult>}
   */
  async setControl(controlKey, scaledValue) {
    const handle = this.get(controlKey);
    if (!handle) {
      return {
        ok: false,
        parameterId: 0,
        parameterIdHex: "0x0000",
        rawValue: 0,
        definition: null,
        error: `Unknown control "${controlKey}"`
      };
    }
    return handle.writeScaled(scaledValue);
  }

  /**
   * @param {number[]} bytes
   * @returns {Promise<boolean>}
   */
  async sendBytes(bytes) {
    if (this.externalSend) {
      this.externalSend(bytes);
      return true;
    }

    if (!this.getOutput) return false;
    const output = await this.getOutput();
    if (!output) return false;
    output.send(bytes);
    return true;
  }
}

/** Shared production instance — wired from main.js with MIDI output provider. */
export const parameterService = new ParameterService();
