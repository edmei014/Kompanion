/**
 * Kemper Appendix A — valid ASCII characters for string parameter tags.
 * Invalid bytes decode to ".". Trailing 0x00 is stripped by the string decoder.
 */

/** @type {ReadonlySet<number>} */
export const KEMPER_VALID_ASCII_BYTES = Object.freeze(
  new Set([
    0x20, // space
    0x21, // !
    0x23, // #
    0x24, // $
    0x26, // &
    0x27, // '
    0x28, // (
    0x29, // )
    0x2a, // *
    0x2b, // +
    0x2c, // ,
    0x2d, // -
    0x2e, // .
    0x2f, // /
    // 0-9
    0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
    0x3a, // :
    0x3b, // ;
    0x3d, // =
    0x3f, // ?
    // A-Z
    0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a,
    0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52, 0x53, 0x54,
    0x55, 0x56, 0x57, 0x58, 0x59, 0x5a,
    0x5c, // \
    0x5f, // _
    // a-z
    0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a,
    0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72, 0x73, 0x74,
    0x75, 0x76, 0x77, 0x78, 0x79, 0x7a
  ])
);

/**
 * Decode Kemper tag bytes with Appendix A rules.
 * Trailing NUL bytes are removed. Invalid bytes become ".".
 *
 * @param {number[]} bytes
 * @returns {string}
 */
export function decodeKemperAscii(bytes) {
  if (!Array.isArray(bytes) || bytes.length === 0) return "";

  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0x00) {
    end -= 1;
  }

  let result = "";
  for (let index = 0; index < end; index += 1) {
    const byte = bytes[index];
    if (byte === 0x00) {
      // Embedded NUL ends the string payload.
      break;
    }
    result += KEMPER_VALID_ASCII_BYTES.has(byte)
      ? String.fromCharCode(byte)
      : ".";
  }

  return result;
}

/**
 * True when decoded text is worth showing in the analyzer.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasReadableAscii(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // All "." usually means no valid Appendix-A content was present.
  if (/^\.+$/.test(trimmed)) return false;
  return true;
}
