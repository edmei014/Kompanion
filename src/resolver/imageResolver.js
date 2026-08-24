import { convertFileSrc } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";

export const AMP_IMAGE_BASE_PATH = "/images/amps";

export const AMP_IMAGE_PLACEHOLDER_SRC = "/images/comingsoon.png";

let resolvedAmpImageBasePath = AMP_IMAGE_BASE_PATH;

export async function initializeAmpImageResolver() {
  if (!window.__TAURI_INTERNALS__) {
    resolvedAmpImageBasePath = AMP_IMAGE_BASE_PATH;
    return;
  }

  const resourcePath = await resolveResource("images/amps");
  resolvedAmpImageBasePath = convertFileSrc(resourcePath).replace(/\/+$/, "");
}

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

  return `${resolvedAmpImageBasePath}/${encodeURIComponent(String(filename).trim())}`;
}
