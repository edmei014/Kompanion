import { convertFileSrc } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";

export const AMP_IMAGE_BASE_PATH = "/images/amps";
export const AMP_PERFORMANCE_THUMB_BASE_PATH = "/images/amps-performance";

export const AMP_IMAGE_PLACEHOLDER_SRC = "/images/comingsoon.png";

let resolvedAmpImageBasePath = AMP_IMAGE_BASE_PATH;
let resolvedAmpPerformanceThumbBasePath = AMP_PERFORMANCE_THUMB_BASE_PATH;

export async function initializeAmpImageResolver() {
  if (!window.__TAURI_INTERNALS__ || import.meta.env.DEV) {
    // Dev: Vite middleware serves live files from src-tauri/resources/images/amps/.
    // Production (non-Tauri): same public path for browser preview.
    resolvedAmpImageBasePath = AMP_IMAGE_BASE_PATH;
    resolvedAmpPerformanceThumbBasePath = AMP_PERFORMANCE_THUMB_BASE_PATH;
    return;
  }

  const resourcePath = await resolveResource("images/amps");
  resolvedAmpImageBasePath = convertFileSrc(resourcePath).replace(/\/+$/, "");

  try {
    const performanceThumbPath = await resolveResource("images/amps-performance");
    resolvedAmpPerformanceThumbBasePath = convertFileSrc(performanceThumbPath).replace(/\/+$/, "");
  } catch {
    resolvedAmpPerformanceThumbBasePath = AMP_PERFORMANCE_THUMB_BASE_PATH;
  }
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

/**
 * Performance-browser thumbnail (pre-generated static asset, not the full-size amp image).
 * @param {unknown} filename Original amp record filename (e.g. jcm800.png).
 * @returns {string | null}
 */
export function resolveAmpPerformanceThumbnailSrc(filename) {
  if (!isUsableAmpImageFilename(filename)) return null;

  const baseName = String(filename)
    .trim()
    .replace(/\.[^.]+$/i, "");

  if (!baseName) return null;

  return `${resolvedAmpPerformanceThumbBasePath}/${encodeURIComponent(`${baseName}.png`)}`;
}
