/**
 * AmpDetailsOverlay — reusable entry point for the Kempanion (live) amp detail card.
 *
 * Opens `#gearAmpDetailOverlay` — the technical live-tool detail card — over the
 * current view without navigating away. Gear Library uses its own archive card.
 *
 * Host is bound once from `initializeGearLibrary()`; callers use
 * openAmpDetailsOverlay / closeAmpDetailsOverlay.
 */

/**
 * @typedef {{
 *   open: (ampId: string) => boolean,
 *   close: () => void,
 *   isOpen: () => boolean
 * }} AmpDetailsOverlayHost
 */

/** @type {AmpDetailsOverlayHost | null} */
let host = null;

/**
 * Bind the shared Gear Library detail card implementation.
 * Called once from `initializeGearLibrary()`.
 *
 * @param {AmpDetailsOverlayHost} api
 */
export function bindAmpDetailsOverlay(api) {
  host = api;
}

/**
 * Open the amp detail card for a Gear Library amp id.
 *
 * @param {string | null | undefined} ampId
 * @param {{ source?: string }} [options] Reserved for future callers (live, history, search, …)
 * @returns {boolean} true if the overlay opened
 */
export function openAmpDetailsOverlay(ampId, options = {}) {
  void options;
  if (!host?.open || !ampId) return false;
  return Boolean(host.open(ampId));
}

/**
 * Close the amp detail overlay if open.
 */
export function closeAmpDetailsOverlay() {
  host?.close?.();
}

/**
 * @returns {boolean}
 */
export function isAmpDetailsOverlayOpen() {
  return Boolean(host?.isOpen?.());
}
