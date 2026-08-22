/**
 * Structured Kemper SysEx decoder for the protocol analyzer.
 * Distinguishes Function / Parameter-ID / Value / ASCII — no UI mapping.
 */

import { decodeKemperAscii, hasReadableAscii } from "./kemperCharset.js";
import {
  describeFunctionCode,
  isParameterFunction,
  isStringFunction
} from "./functionCodes.js";
import {
  formatParameterIdHex,
  lookupParameter
} from "./parameterRegistry.js";
import {
  formatByteHex,
  isExtendedFunction,
  parseExtendedSysEx
} from "./decodeExtended.js";

/**
 * @typedef {{
 *   ok: boolean,
 *   functionCode: number | null,
 *   functionLabel: string | null,
 *   functionDisplay: string | null,
 *   instance: number | null,
 *   parameterId: number | null,
 *   parameterIdHex: string | null,
 *   parameterName: string | null,
 *   parameterType: string | null,
 *   value: number | null,
 *   ascii: string | null,
 *   hasReadableAscii: boolean,
 *   frameLength: number | null,
 *   payloadLength: number | null,
 *   addressEncoding: "nrpn14" | "extended32" | null,
 *   addressBytes: number[] | null,
 *   addressValue: number | null,
 *   addressHex: string | null,
 *   payloadBytes: number[] | null,
 *   payloadHex: string | null,
 *   numericValues: number[] | null,
 *   twoByteMisreadHex: string | null,
 *   summaryLines: string[]
 * }} DecodedSysEx
 */

/**
 * @returns {DecodedSysEx}
 */
function emptyDecode() {
  return {
    ok: false,
    functionCode: null,
    functionLabel: null,
    functionDisplay: null,
    instance: null,
    parameterId: null,
    parameterIdHex: null,
    parameterName: null,
    parameterType: null,
    value: null,
    ascii: null,
    hasReadableAscii: false,
    frameLength: null,
    payloadLength: null,
    addressEncoding: null,
    addressBytes: null,
    addressValue: null,
    addressHex: null,
    payloadBytes: null,
    payloadHex: null,
    numericValues: null,
    twoByteMisreadHex: null,
    summaryLines: []
  };
}

/**
 * @param {number[]} frame
 * @returns {boolean}
 */
function isKemperFrame(frame) {
  return (
    Array.isArray(frame) &&
    frame.length >= 8 &&
    frame[0] === 0xf0 &&
    frame[1] === 0x00 &&
    frame[2] === 0x20 &&
    frame[3] === 0x33 &&
    frame[frame.length - 1] === 0xf7
  );
}

/**
 * @param {number[]} frame
 * @param {number} start
 * @returns {string}
 */
function decodeAsciiFrom(frame, start) {
  if (start >= frame.length - 1) return "";
  return decodeKemperAscii(frame.slice(start, frame.length - 1));
}

/**
 * Decode one Kemper SysEx frame into structured fields.
 *
 * Layout (standard 14-bit address messages):
 *   F0 00 20 33 [prod] [dev] [fn] [instance] [addrH] [addrL] [payload…] F7
 *
 * Extended functions 0x05 / 0x06 / 0x07 use a 5-byte address instead.
 * Those keep parameterId null so live state never stores a truncated 2-byte ID.
 *
 * Function 0x3C (rendered string) inserts value MSB/LSB before the text.
 *
 * @param {number[]} frame
 * @returns {DecodedSysEx}
 */
export function decodeKemperSysEx(frame) {
  const result = emptyDecode();
  if (!isKemperFrame(frame)) return result;

  const functionCode = frame[6];
  const instance = frame[7];
  const fn = describeFunctionCode(functionCode);

  result.ok = true;
  result.functionCode = functionCode;
  result.functionLabel = fn.label;
  result.functionDisplay = fn.display;
  result.instance = instance;
  result.frameLength = frame.length;

  // Sys communication (beacon / sensing) — no parameter payload.
  if (functionCode === 0x7e) {
    result.summaryLines = [`Function: ${fn.label}`];
    return result;
  }

  // Extended 5-byte address. Do not fold into a 2-byte parameterId.
  if (isExtendedFunction(functionCode)) {
    applyExtendedDecode(result, frame);
    result.summaryLines = buildSummaryLines(result);
    return result;
  }

  result.payloadLength = frame.length >= 11 ? Math.max(0, frame.length - 11) : 0;
  result.payloadBytes = frame.length >= 11 ? frame.slice(10, frame.length - 1) : [];
  result.payloadHex = formatByteHex(result.payloadBytes);

  if (frame.length < 10) {
    result.summaryLines = [`Function: ${fn.label}`];
    return result;
  }

  const addrH = frame[8] & 0x7f;
  const addrL = frame[9] & 0x7f;
  const parameterId = (addrH << 8) | addrL;
  const registered = lookupParameter(parameterId);

  result.addressEncoding = "nrpn14";
  result.addressBytes = [addrH, addrL];
  result.addressValue = parameterId;
  result.addressHex = formatParameterIdHex(parameterId);
  result.parameterId = parameterId;
  result.parameterIdHex = formatParameterIdHex(parameterId);
  result.parameterName = registered?.name ?? null;
  result.parameterType = registered?.type ?? null;

  if (functionCode === 0x3c) {
    if (frame.length >= 12) {
      result.value = ((frame[10] & 0x7f) << 7) | (frame[11] & 0x7f);
    }
    const ascii = decodeAsciiFrom(frame, 12);
    result.ascii = ascii;
    result.hasReadableAscii = hasReadableAscii(ascii);
  } else if (isStringFunction(functionCode)) {
    const ascii = decodeAsciiFrom(frame, 10);
    result.ascii = ascii;
    result.hasReadableAscii = hasReadableAscii(ascii);
  } else if (isParameterFunction(functionCode) || frame.length >= 12) {
    if (frame.length >= 12) {
      result.value = ((frame[10] & 0x7f) << 7) | (frame[11] & 0x7f);
    }
    if (frame.length > 12) {
      const ascii = decodeAsciiFrom(frame, 12);
      if (hasReadableAscii(ascii)) {
        result.ascii = ascii;
        result.hasReadableAscii = true;
      }
    }
  } else if (frame.length > 10) {
    const ascii = decodeAsciiFrom(frame, 10);
    if (hasReadableAscii(ascii)) {
      result.ascii = ascii;
      result.hasReadableAscii = true;
    }
  }

  result.summaryLines = buildSummaryLines(result);
  return result;
}

/**
 * @param {DecodedSysEx} result
 * @param {number[]} frame
 */
function applyExtendedDecode(result, frame) {
  const parsed = parseExtendedSysEx(frame);
  result.addressEncoding = "extended32";
  result.addressBytes = parsed.addressBytes;
  result.addressValue = parsed.addressValue;
  result.addressHex = parsed.addressHex;
  result.payloadBytes = parsed.payloadBytes;
  result.payloadHex = parsed.payloadHex;
  result.payloadLength = parsed.payloadLength;
  result.numericValues = parsed.numericValues;
  result.twoByteMisreadHex = parsed.twoByteMisreadHex;
  result.ascii = parsed.ascii;
  result.hasReadableAscii = parsed.hasReadableAscii;
  if (parsed.numericValues.length === 1) {
    result.value = parsed.numericValues[0];
  }
}

/**
 * @param {DecodedSysEx} decoded
 * @returns {string[]}
 */
function buildSummaryLines(decoded) {
  /** @type {string[]} */
  const lines = [];

  if (decoded.functionLabel) {
    lines.push(`Function: ${decoded.functionLabel}`);
  } else if (decoded.functionDisplay) {
    lines.push(`Function: ${decoded.functionDisplay}`);
  }

  if (decoded.addressEncoding === "extended32" && decoded.addressHex) {
    const addrBytes = decoded.addressBytes?.length
      ? formatByteHex(decoded.addressBytes)
      : "";
    lines.push(
      addrBytes
        ? `Address: ${addrBytes} (${decoded.addressHex})`
        : `Address: ${decoded.addressHex}`
    );
  } else if (decoded.parameterIdHex) {
    const nameSuffix = decoded.parameterName
      ? ` (${decoded.parameterName})`
      : "";
    const typeSuffix = decoded.parameterType
      ? ` [${decoded.parameterType}]`
      : "";
    lines.push(`Parameter: ${decoded.parameterIdHex}${nameSuffix}${typeSuffix}`);
  }

  if (decoded.payloadLength != null && decoded.addressEncoding === "extended32") {
    lines.push(`Payload length: ${decoded.payloadLength}`);
  }

  if (decoded.ascii != null && decoded.hasReadableAscii) {
    lines.push(`ASCII: ${decoded.ascii}`);
  } else if (decoded.numericValues?.length) {
    lines.push(
      `Value: ${decoded.numericValues
        .map((value) => `$${value.toString(16).toUpperCase()}`)
        .join(", ")}`
    );
  } else if (decoded.value != null) {
    lines.push(`Value: ${decoded.value}`);
  }

  return lines;
}

/**
 * Pretty multi-line block for analyzer UI / copy.
 *
 * @param {DecodedSysEx} decoded
 * @returns {string}
 */
export function formatDecodedBlock(decoded) {
  if (!decoded?.ok || !decoded.summaryLines.length) return "";
  return ["Decoded", "----------------", ...decoded.summaryLines].join("\n");
}
