/**
 * Gear Library design modes.
 * Four presentation identities over the same amp library — not separate data sets.
 */

export const GEAR_DESIGN_MODE = Object.freeze({
  DEFAULT: "default",
  COLLECTIONS: "collections",
  /** @deprecated Use COLLECTIONS — kept for stored preference migration. */
  STUDIO: "studio",
  EDITORIAL: "editorial",
  MUSEUM: "museum"
});

export const GEAR_DESIGN_PREVIEW = {
  /** Set false to hide the design mode switch entirely. */
  enabled: true,
  storageKey: "liveCompanion.gearDesignPreview",
  defaultId: GEAR_DESIGN_MODE.DEFAULT
};

/** @type {{ id: string, label: string, shortLabel: string }[]} */
export const GEAR_DESIGN_PREVIEW_OPTIONS = [
  {
    id: GEAR_DESIGN_MODE.DEFAULT,
    label: "Standard",
    shortLabel: "Standard"
  },
  {
    id: GEAR_DESIGN_MODE.COLLECTIONS,
    label: "Collections",
    shortLabel: "Collections"
  },
  {
    id: GEAR_DESIGN_MODE.EDITORIAL,
    label: "Magazine",
    shortLabel: "Magazine"
  },
  {
    id: GEAR_DESIGN_MODE.MUSEUM,
    label: "Museum",
    shortLabel: "Museum"
  }
];

/** @type {string} */
let activeDesignMode = GEAR_DESIGN_MODE.DEFAULT;

/**
 * @param {string} designId
 * @returns {string}
 */
function normalizeGearDesignId(designId) {
  if (designId === GEAR_DESIGN_MODE.STUDIO) return GEAR_DESIGN_MODE.COLLECTIONS;
  return designId;
}

/**
 * @param {string} designId
 * @returns {boolean}
 */
export function isGearDesignPreviewOption(designId) {
  const normalized = normalizeGearDesignId(designId);
  return GEAR_DESIGN_PREVIEW_OPTIONS.some((option) => option.id === normalized);
}

/**
 * @param {string | null | undefined} designId
 * @returns {boolean}
 */
export function isMuseumDesignMode(designId = activeDesignMode) {
  return designId === GEAR_DESIGN_MODE.MUSEUM;
}

/**
 * @param {string | null | undefined} designId
 * @returns {boolean}
 */
export function isCollectionsDesignMode(designId = activeDesignMode) {
  return (
    designId === GEAR_DESIGN_MODE.COLLECTIONS ||
    designId === GEAR_DESIGN_MODE.STUDIO
  );
}

/**
 * @param {string | null | undefined} designId
 * @returns {boolean}
 */
export function isCardGridDesignMode(designId = activeDesignMode) {
  return !isMuseumDesignMode(designId) && !isCollectionsDesignMode(designId);
}

/**
 * @returns {string}
 */
export function getActiveGearDesignMode() {
  return activeDesignMode;
}

/**
 * @returns {string}
 */
export function readStoredGearDesignPreview() {
  try {
    const stored = window.localStorage.getItem(GEAR_DESIGN_PREVIEW.storageKey);
    if (stored && isGearDesignPreviewOption(stored)) {
      return normalizeGearDesignId(stored);
    }
  } catch {
    // Ignore storage access errors.
  }

  return GEAR_DESIGN_PREVIEW.defaultId;
}

/**
 * @param {string} designId
 */
export function storeGearDesignPreview(designId) {
  try {
    const normalized = normalizeGearDesignId(designId);

    if (normalized === GEAR_DESIGN_PREVIEW.defaultId) {
      window.localStorage.removeItem(GEAR_DESIGN_PREVIEW.storageKey);
      return;
    }

    window.localStorage.setItem(GEAR_DESIGN_PREVIEW.storageKey, normalized);
  } catch {
    // Ignore storage access errors.
  }
}

/**
 * Applies the active design mode on body + optional roots.
 * Standard (`default`) is set explicitly so every mode has a stable identity hook.
 *
 * @param {string} designId
 * @param {{ rootElements?: Array<HTMLElement | null | undefined> }} [options]
 * @returns {string}
 */
export function applyGearDesignPreview(designId, options = {}) {
  const nextId = isGearDesignPreviewOption(designId)
    ? normalizeGearDesignId(designId)
    : GEAR_DESIGN_PREVIEW.defaultId;

  activeDesignMode = nextId;
  document.body.dataset.gearDesign = nextId;

  for (const element of options.rootElements ?? []) {
    if (element) element.dataset.gearDesign = nextId;
  }

  return nextId;
}

/**
 * @param {{
 *   rootElement?: HTMLElement | null,
 *   rootElements?: Array<HTMLElement | null | undefined>,
 *   onChange?: (designId: string) => void
 * }} [options]
 */
export function initializeGearDesignPreview(options = {}) {
  const { rootElement = null, rootElements = [], onChange = null } = options;
  const targets = [rootElement, ...rootElements].filter(Boolean);

  if (!GEAR_DESIGN_PREVIEW.enabled) {
    if (rootElement) rootElement.hidden = true;
    applyGearDesignPreview(GEAR_DESIGN_PREVIEW.defaultId, {
      rootElements: targets
    });
    return GEAR_DESIGN_PREVIEW.defaultId;
  }

  if (rootElement) rootElement.hidden = false;

  const selectElement = rootElement?.querySelector("#gearDesignPreviewSelect");
  let activeId = applyGearDesignPreview(readStoredGearDesignPreview(), {
    rootElements: targets
  });

  if (selectElement) {
    selectElement.innerHTML = GEAR_DESIGN_PREVIEW_OPTIONS.map(
      ({ id, label }) =>
        `<option value="${id}"${id === activeId ? " selected" : ""}>${label}</option>`
    ).join("");

    selectElement.addEventListener("change", () => {
      activeId = applyGearDesignPreview(selectElement.value, {
        rootElements: targets
      });
      storeGearDesignPreview(activeId);
      onChange?.(activeId);
    });
  }

  return activeId;
}
