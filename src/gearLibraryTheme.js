/**
 * Gear Library color themes — Museum Dark / Museum Light.
 * Independent from Kempanion; persisted separately from design preview modes.
 */

export const GEAR_COLOR_THEME = Object.freeze({
  MUSEUM_DARK: "museum-dark",
  MUSEUM_LIGHT: "museum-light"
});

export const GEAR_COLOR_THEME_OPTIONS = Object.freeze([
  {
    id: GEAR_COLOR_THEME.MUSEUM_DARK,
    label: "Dark Mode",
    shortLabel: "Dark"
  },
  {
    id: GEAR_COLOR_THEME.MUSEUM_LIGHT,
    label: "Light Mode",
    shortLabel: "Light"
  }
]);

const STORAGE_KEY = "kompanion.gearColorTheme";
const DEFAULT_THEME = GEAR_COLOR_THEME.MUSEUM_DARK;

/** @type {string} */
let activeTheme = DEFAULT_THEME;

/** @type {((themeId: string) => void) | null} */
let onThemeChange = null;

/**
 * @param {string | null | undefined} themeId
 * @returns {boolean}
 */
export function isGearColorTheme(themeId) {
  return GEAR_COLOR_THEME_OPTIONS.some((option) => option.id === themeId);
}

/**
 * @returns {string}
 */
export function getActiveGearColorTheme() {
  return activeTheme;
}

/**
 * @returns {string}
 */
function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isGearColorTheme(stored)) return stored;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}

/**
 * @param {string} themeId
 */
function persistTheme(themeId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // ignore
  }
}

/**
 * Apply theme to document + Gear Library overlays.
 * @param {string} themeId
 */
function applyThemeDataset(themeId) {
  document.body.dataset.gearTheme = themeId;

  for (const id of [
    "gearLibraryView",
    "gearArchiveAmpDetailOverlay",
    "gearManufacturerDetailOverlay"
  ]) {
    const el = document.getElementById(id);
    if (el) el.dataset.gearTheme = themeId;
  }
}

/**
 * @param {HTMLElement | null | undefined} toggle
 */
function syncThemeToggle(toggle) {
  if (!(toggle instanceof HTMLButtonElement)) return;

  const isDark = activeTheme === GEAR_COLOR_THEME.MUSEUM_DARK;
  toggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
  toggle.setAttribute("aria-pressed", isDark ? "false" : "true");
}

/**
 * @param {string} themeId
 * @param {{ persist?: boolean, silent?: boolean }} [options]
 * @returns {string}
 */
export function setGearColorTheme(themeId, options = {}) {
  const next = isGearColorTheme(themeId) ? themeId : DEFAULT_THEME;
  activeTheme = next;
  applyThemeDataset(next);

  if (options.persist !== false) {
    persistTheme(next);
  }

  syncThemeToggle(document.querySelector("#gearColorThemeToggle"));

  if (!options.silent && typeof onThemeChange === "function") {
    onThemeChange(next);
  }

  return next;
}

/**
 * Toggle between museum-dark and museum-light.
 * @param {{ persist?: boolean, silent?: boolean }} [options]
 * @returns {string}
 */
export function toggleGearColorTheme(options = {}) {
  const next =
    activeTheme === GEAR_COLOR_THEME.MUSEUM_DARK
      ? GEAR_COLOR_THEME.MUSEUM_LIGHT
      : GEAR_COLOR_THEME.MUSEUM_DARK;
  return setGearColorTheme(next, options);
}

/**
 * @param {{
 *   toggleElement?: HTMLButtonElement | null,
 *   onChange?: (themeId: string) => void
 * }} [options]
 */
export function initializeGearColorTheme(options = {}) {
  onThemeChange = options.onChange ?? null;
  activeTheme = readStoredTheme();
  applyThemeDataset(activeTheme);

  const toggle =
    options.toggleElement ??
    document.querySelector("#gearColorThemeToggle");

  if (toggle instanceof HTMLButtonElement) {
    syncThemeToggle(toggle);
    toggle.addEventListener("click", () => {
      toggleGearColorTheme();
    });
  }
}
