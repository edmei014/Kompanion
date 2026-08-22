/**
 * Presentation layout variants — composition of Museum / Discover stages.
 *
 * Top-level user-facing modes live in `presentationModes.js` and reference
 * these layouts. Prefer adding a new Presentation Mode for product features;
 * add a layout variant only when the on-screen composition changes.
 */

export const PRESENTATION_VARIANT = Object.freeze({
  AMP_ONLY: "amp-only",
  AMP_DISCOVER: "amp-discover",
  DISCOVER_ONLY: "discover-only"
});

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   shortLabel: string,
 *   description: string,
 *   showsAmp: boolean,
 *   showsDiscover: boolean,
 *   discoverLayout: "hidden" | "strip" | "hero",
 *   drivesDiscoverRotation: boolean
 * }} PresentationVariantConfig
 */

/** @type {PresentationVariantConfig[]} */
export const PRESENTATION_VARIANTS = Object.freeze([
  {
    id: PRESENTATION_VARIANT.AMP_ONLY,
    label: "Amp Only",
    shortLabel: "Amp Only",
    description: "Clean digital exhibition focused on the amplifier.",
    showsAmp: true,
    showsDiscover: false,
    discoverLayout: "hidden",
    drivesDiscoverRotation: false
  },
  {
    id: PRESENTATION_VARIANT.AMP_DISCOVER,
    label: "Amp + Discover",
    shortLabel: "Amp + Discover",
    description: "Museum stage with Discover as supporting knowledge panels.",
    showsAmp: true,
    showsDiscover: true,
    discoverLayout: "strip",
    drivesDiscoverRotation: false
  },
  {
    id: PRESENTATION_VARIANT.DISCOVER_ONLY,
    label: "Discover Only",
    shortLabel: "Discover Only",
    description: "Rotating knowledge display for a secondary monitor.",
    showsAmp: false,
    showsDiscover: true,
    discoverLayout: "hero",
    drivesDiscoverRotation: true
  }
]);

/**
 * @param {string | null | undefined} variantId
 * @returns {boolean}
 */
export function isPresentationVariant(variantId) {
  return PRESENTATION_VARIANTS.some((variant) => variant.id === variantId);
}

/**
 * @param {string | null | undefined} variantId
 * @returns {PresentationVariantConfig | null}
 */
export function getPresentationVariantConfig(variantId) {
  return PRESENTATION_VARIANTS.find((variant) => variant.id === variantId) ?? null;
}
