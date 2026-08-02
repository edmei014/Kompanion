/**
 * Optional per-amp visual theme.
 * Manual overrides only — no automatic color extraction.
 *
 * @typedef {Object} AmpTheme
 * @property {string} surface
 * @property {string} gradientStart
 * @property {string} gradientEnd
 * @property {string} glow
 * @property {string} border
 */

/**
 * Partial theme as stored on amp records.
 * Legacy keys (background, accent) are accepted and mapped at resolve time.
 *
 * @typedef {Object} AmpThemeInput
 * @property {string} [surface]
 * @property {string} [gradientStart]
 * @property {string} [gradientEnd]
 * @property {string} [glow]
 * @property {string} [border]
 * @property {string} [background]
 * @property {string} [accent]
 */

/** @type {AmpTheme} */
export const DEFAULT_AMP_THEME = {
  surface: "rgba(13, 12, 11, 0.8)",
  gradientStart: "rgba(255, 244, 230, 0.035)",
  gradientEnd: "rgba(0, 0, 0, 0)",
  glow: "rgba(120, 108, 88, 0.12)",
  border: "rgba(48, 46, 42, 0.95)"
};

/**
 * Defaults used by the detail hero scene (slightly denser than card surfaces).
 * @type {AmpTheme}
 */
export const DEFAULT_AMP_DETAIL_THEME = {
  surface: "#121110",
  gradientStart: "#2e2a24",
  gradientEnd: "#121110",
  glow: "#1c1a16",
  border: "rgba(255, 244, 230, 0.04)"
};

/**
 * Normalizes optional theme fields from amp data.
 * Returns null when no usable override is present.
 * @param {unknown} raw
 * @returns {AmpThemeInput | null}
 */
export function normalizeAmpThemeInput(raw) {
  if (!raw || typeof raw !== "object") return null;

  const source = /** @type {Record<string, unknown>} */ (raw);
  const surface = readThemeColor(source.surface) || readThemeColor(source.background);
  const gradientStart = readThemeColor(source.gradientStart) || readThemeColor(source.accent);
  const gradientEnd = readThemeColor(source.gradientEnd);
  const glow = readThemeColor(source.glow);
  const border = readThemeColor(source.border);

  if (!surface && !gradientStart && !gradientEnd && !glow && !border) {
    return null;
  }

  return {
    ...(surface ? { surface } : {}),
    ...(gradientStart ? { gradientStart } : {}),
    ...(gradientEnd ? { gradientEnd } : {}),
    ...(glow ? { glow } : {}),
    ...(border ? { border } : {})
  };
}

/**
 * Resolves a complete theme. Missing fields fall back to defaults.
 * @param {AmpThemeInput | null | undefined} theme
 * @param {AmpTheme} [defaults]
 * @returns {AmpTheme}
 */
export function resolveAmpTheme(theme, defaults = DEFAULT_AMP_THEME) {
  const surface =
    readThemeColor(theme?.surface) ||
    readThemeColor(theme?.background) ||
    defaults.surface;
  const gradientStart =
    readThemeColor(theme?.gradientStart) ||
    readThemeColor(theme?.accent) ||
    defaults.gradientStart;
  const gradientEnd =
    readThemeColor(theme?.gradientEnd) ||
    readThemeColor(theme?.background) ||
    defaults.gradientEnd;
  const glow = readThemeColor(theme?.glow) || defaults.glow;
  const border = readThemeColor(theme?.border) || defaults.border;

  return { surface, gradientStart, gradientEnd, glow, border };
}

/**
 * @param {AmpThemeInput | null | undefined} theme
 * @returns {AmpTheme}
 */
export function resolveAmpDetailTheme(theme) {
  return resolveAmpTheme(theme, DEFAULT_AMP_DETAIL_THEME);
}

/**
 * @param {AmpTheme} theme
 * @returns {Record<string, string>}
 */
export function getAmpThemeCssVariables(theme) {
  return {
    "--amp-theme-surface": theme.surface,
    "--amp-theme-gradient-start": theme.gradientStart,
    "--amp-theme-gradient-end": theme.gradientEnd,
    "--amp-theme-glow": theme.glow,
    "--amp-theme-border": theme.border
  };
}

/**
 * Inline style string for cards / detail roots.
 * @param {AmpTheme} theme
 * @returns {string}
 */
export function serializeAmpThemeStyle(theme) {
  return Object.entries(getAmpThemeCssVariables(theme))
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

/**
 * Applies theme CSS variables to an element.
 * Also sets legacy detail-hero aliases for existing scene styles.
 * @param {HTMLElement | null | undefined} element
 * @param {AmpThemeInput | null | undefined} theme
 * @param {{ detail?: boolean }} [options]
 * @returns {AmpTheme | null}
 */
export function applyAmpThemeToElement(element, theme, options = {}) {
  if (!element) return null;

  const resolved = options.detail ? resolveAmpDetailTheme(theme) : resolveAmpTheme(theme);
  const variables = getAmpThemeCssVariables(resolved);

  for (const [property, value] of Object.entries(variables)) {
    element.style.setProperty(property, value);
  }

  // Legacy aliases used by the current detail hero scene layers.
  element.style.setProperty("--amp-image-theme-background", resolved.surface);
  element.style.setProperty("--amp-image-theme-accent", resolved.gradientStart);
  element.style.setProperty("--amp-image-theme-glow", resolved.glow);

  return resolved;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function readThemeColor(value) {
  return String(value ?? "").trim();
}

// --- Backward-compatible aliases (detail hero / older imports) ---

/** @typedef {AmpTheme} AmpImageTheme */

/** @type {AmpTheme} */
export const DEFAULT_AMP_IMAGE_THEME = DEFAULT_AMP_DETAIL_THEME;

/**
 * @param {AmpThemeInput | null | undefined} theme
 * @returns {AmpTheme}
 */
export function resolveAmpImageTheme(theme) {
  return resolveAmpDetailTheme(theme);
}

/**
 * @param {HTMLElement | null | undefined} element
 * @param {AmpThemeInput | null | undefined} theme
 * @returns {AmpTheme | null}
 */
export function applyAmpImageThemeToElement(element, theme) {
  return applyAmpThemeToElement(element, theme, { detail: true });
}
