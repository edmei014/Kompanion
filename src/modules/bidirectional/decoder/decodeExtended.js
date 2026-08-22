/**
 * Kemper extended SysEx (Function 0x05 / 0x06 / 0x07).
 *
 * Official MIDI Parameter Documentation:
 *   $06 Extended Parameter Change
 *   $07 Extended String Parameter Change
 *   $05 reserved (captured anyway — protocol author recalled 5 or 6)
 *
 * Controller and numeric value are 32-bit numbers packed into 5 MIDI data
 * bytes (7-bit, big-endian). This is NOT a 2-byte page/offset ID.
 *
 * Layout after manufacturer / product / device:
 *   [fn] [instance] [addr0..addr4] [payload…] F7
 */

import { decodeKemperAscii, hasReadableAscii } from "./kemperCharset.js";

/** Functions that use 5-byte extended addressing on receive. */
export const EXTENDED_FUNCTION_CODES = Object.freeze([0x05, 0x06, 0x07]);

const EXTENDED_FUNCTION_SET = new Set(EXTENDED_FUNCTION_CODES);

/**
 * @param {number} functionCode
 * @returns {boolean}
 */
export function isExtendedFunction(functionCode) {
  return EXTENDED_FUNCTION_SET.has(functionCode & 0xff);
}

/**
 * Unpack 5 MIDI data bytes into a 32-bit unsigned integer.
 * Byte0 holds the top 4 bits; remaining bytes hold 7 bits each.
 *
 * @param {number[]} bytes
 * @param {number} [offset]
 * @returns {number | null}
 */
export function unpackKemperUint32(bytes, offset = 0) {
  if (!Array.isArray(bytes) || bytes.length < offset + 5) return null;
  const b0 = bytes[offset] & 0x7f;
  const b1 = bytes[offset + 1] & 0x7f;
  const b2 = bytes[offset + 2] & 0x7f;
  const b3 = bytes[offset + 3] & 0x7f;
  const b4 = bytes[offset + 4] & 0x7f;
  return (
    (b0 & 0x0f) * 0x10000000 +
    b1 * 0x200000 +
    b2 * 0x4000 +
    b3 * 0x80 +
    b4
  );
}

/**
 * @param {number} value
 * @returns {string}
 */
export function formatExtendedAddressHex(value) {
  if (!Number.isFinite(value)) return "—";
  return `$${Math.trunc(value).toString(16).toUpperCase().padStart(8, "0")}`;
}

/**
 * @param {number[]} bytes
 * @returns {string}
 */
export function formatByteHex(bytes) {
  if (!Array.isArray(bytes) || !bytes.length) return "";
  return bytes
    .map((byte) => (byte & 0xff).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

/**
 * What the old 2-byte decoder would have reported (for capture contrast only).
 *
 * @param {number[]} frame
 * @returns {{ parameterId: number, parameterIdHex: string } | null}
 */
export function misreadAsTwoByteId(frame) {
  if (!Array.isArray(frame) || frame.length < 10) return null;
  const parameterId = ((frame[8] & 0x7f) << 8) | (frame[9] & 0x7f);
  return {
    parameterId,
    parameterIdHex: `$${parameterId.toString(16).toUpperCase().padStart(4, "0")}`
  };
}

/**
 * @param {number[]} frame
 * @returns {{
 *   ok: boolean,
 *   functionCode: number,
 *   instance: number,
 *   addressBytes: number[] | null,
 *   addressValue: number | null,
 *   addressHex: string | null,
 *   payloadBytes: number[],
 *   payloadHex: string,
 *   payloadLength: number,
 *   numericValues: number[],
 *   leftoverBytes: number[],
 *   ascii: string | null,
 *   hasReadableAscii: boolean,
 *   twoByteMisreadHex: string | null
 * }}
 */
export function parseExtendedSysEx(frame) {
  const functionCode = frame[6] & 0xff;
  const instance = frame[7] & 0xff;
  const twoByte = misreadAsTwoByteId(frame);

  const result = {
    ok: false,
    functionCode,
    instance,
    addressBytes: null,
    addressValue: null,
    addressHex: null,
    payloadBytes: [],
    payloadHex: "",
    payloadLength: 0,
    numericValues: [],
    leftoverBytes: [],
    ascii: null,
    hasReadableAscii: false,
    twoByteMisreadHex: twoByte?.parameterIdHex ?? null
  };

  if (!Array.isArray(frame) || frame.length < 14) {
    const payload = Array.isArray(frame)
      ? frame.slice(8, Math.max(8, frame.length - 1))
      : [];
    result.payloadBytes = payload;
    result.payloadHex = formatByteHex(payload);
    result.payloadLength = payload.length;
    return result;
  }

  const addressBytes = frame.slice(8, 13).map((byte) => byte & 0x7f);
  const addressValue = unpackKemperUint32(addressBytes, 0);
  const payloadBytes = frame.slice(13, frame.length - 1);

  result.ok = true;
  result.addressBytes = addressBytes;
  result.addressValue = addressValue;
  result.addressHex =
    addressValue != null ? formatExtendedAddressHex(addressValue) : null;
  result.payloadBytes = payloadBytes;
  result.payloadHex = formatByteHex(payloadBytes);
  result.payloadLength = payloadBytes.length;

  if (functionCode === 0x06 || functionCode === 0x05) {
    let offset = 0;
    while (offset + 5 <= payloadBytes.length) {
      const value = unpackKemperUint32(payloadBytes, offset);
      if (value != null) result.numericValues.push(value);
      offset += 5;
    }
    result.leftoverBytes = payloadBytes.slice(offset);
  }

  const stringSource =
    functionCode === 0x07 || functionCode === 0x05
      ? payloadBytes
      : result.leftoverBytes.length
        ? result.leftoverBytes
        : payloadBytes;
  const ascii = decodeKemperAscii(stringSource);
  if (hasReadableAscii(ascii)) {
    result.ascii = ascii;
    result.hasReadableAscii = true;
  } else if (functionCode === 0x07 && ascii) {
    result.ascii = ascii;
    result.hasReadableAscii = hasReadableAscii(ascii);
  }

  return result;
}
