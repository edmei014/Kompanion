/**
 * Top-level Presentation modes — independent of Gear Library filters.
 *
 * Add new modes here. Each mode may reuse a layout variant and a playlist
 * strategy; stubs can ship disabled until their host behaviour exists.
 */

import {
  PRESENTATION_VARIANT,
  getPresentationVariantConfig
} from "./presentationVariants.js";

/** @typedef {"bag" | "museum-curated" | "none"} PresentationPlaylistStrategy */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   enabled: boolean,
 *   layoutVariant: string | null,
 *   playlistStrategy: PresentationPlaylistStrategy,
 *   showsAmp: boolean,
 *   showsDiscover: boolean
 * }} PresentationModeConfig
 */

export const PRESENTATION_MODE = Object.freeze({
  OFF: "",
  MUSEUM: "museum",
  SCREENSAVER: "screensaver",
  SECOND_DISPLAY: "second-display",
  FULLSCREEN_LOOP: "fullscreen-loop"
});

/** @type {PresentationModeConfig[]} */
export const PRESENTATION_MODES = Object.freeze([
  {
    id: PRESENTATION_MODE.MUSEUM,
    label: "Museum",
    description:
      "Curated exhibition slideshow — varied manufacturers, decades, types, and power classes.",
    enabled: true,
    layoutVariant: PRESENTATION_VARIANT.AMP_ONLY,
    playlistStrategy: "museum-curated",
    showsAmp: true,
    showsDiscover: false
  },
  {
    id: PRESENTATION_MODE.SCREENSAVER,
    label: "Screensaver",
    description: "Idle exhibition loop (coming soon).",
    enabled: false,
    layoutVariant: PRESENTATION_VARIANT.AMP_ONLY,
    playlistStrategy: "museum-curated",
    showsAmp: true,
    showsDiscover: false
  },
  {
    id: PRESENTATION_MODE.SECOND_DISPLAY,
    label: "Second Display",
    description: "Discover-focused knowledge board for a secondary monitor.",
    enabled: true,
    layoutVariant: PRESENTATION_VARIANT.DISCOVER_ONLY,
    playlistStrategy: "none",
    showsAmp: false,
    showsDiscover: true
  },
  {
    id: PRESENTATION_MODE.FULLSCREEN_LOOP,
    label: "Fullscreen Loop",
    description:
      "Bag-only loop with bag shuffle — each amp once per round, manufacturers spread out.",
    enabled: true,
    layoutVariant: PRESENTATION_VARIANT.AMP_ONLY,
    playlistStrategy: "bag",
    showsAmp: true,
    showsDiscover: false
  }
]);

/**
 * @param {string | null | undefined} modeId
 * @returns {boolean}
 */
export function isPresentationMode(modeId) {
  if (!modeId) return false;
  return PRESENTATION_MODES.some((mode) => mode.id === modeId && mode.enabled);
}

/**
 * @param {string | null | undefined} modeId
 * @returns {PresentationModeConfig | null}
 */
export function getPresentationModeConfig(modeId) {
  if (!modeId) return null;
  return PRESENTATION_MODES.find((mode) => mode.id === modeId) ?? null;
}

/**
 * Resolve the layout variant config for a presentation mode.
 * @param {string | null | undefined} modeId
 * @returns {import("./presentationVariants.js").PresentationVariantConfig | null}
 */
export function getLayoutVariantForMode(modeId) {
  const mode = getPresentationModeConfig(modeId);
  if (!mode?.layoutVariant) return null;
  return getPresentationVariantConfig(mode.layoutVariant);
}

/**
 * Options for the Presentation mode menu (includes disabled stubs).
 * @returns {Array<{ id: string, label: string, enabled: boolean }>}
 */
export function listPresentationModeOptions() {
  return PRESENTATION_MODES.map((mode) => ({
    id: mode.id,
    label: mode.label,
    enabled: mode.enabled
  }));
}
