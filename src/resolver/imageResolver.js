export const AMP_IMAGE_BASE_PATH = "/images/amps";

export const AMP_IMAGE_PLACEHOLDER_SRC = "/images/comingsoon.png";

/** @param {unknown} filename */
export function isUsableAmpImageFilename(filename) {
  if (filename === null || filename === undefined) return false;

  const trimmed = String(filename).trim();
  if (!trimmed) return false;
  if (trimmed.includes("..")) return false;
  if (/[/\\]/.test(trimmed)) return false;

  return true;
}

/**
 * Resolves a public amp image URL from a record filename.
 * Always returns a usable image URL — falls back to the placeholder when needed.
 * @param {unknown} filename
 * @returns {string}
 */
export function resolveAmpImageSrc(filename) {
  if (!isUsableAmpImageFilename(filename)) {
    return AMP_IMAGE_PLACEHOLDER_SRC;
  }

  return `${AMP_IMAGE_BASE_PATH}/${String(filename).trim()}`;
}
