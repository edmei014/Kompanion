/**
 * Experimental Gear Library design preview.
 * Does not alter the default library look unless a preview variant is selected.
 */

export const GEAR_DESIGN_PREVIEW = {
  /** Set false to hide the preview switch entirely. */
  enabled: true,
  storageKey: "liveCompanion.gearDesignPreview",
  defaultId: "default"
};

/** @type {{ id: string, label: string, shortLabel: string }[]} */
export const GEAR_DESIGN_PREVIEW_OPTIONS = [
  {
    id: "default",
    label: "Default",
    shortLabel: "Default"
  },
  {
    id: "editorial",
    label: "Editorial",
    shortLabel: "Editorial"
  },
  {
    id: "museum",
    label: "Museum",
    shortLabel: "Museum"
  },
  {
    id: "studio",
    label: "Studio Collection",
    shortLabel: "Studio"
  }
];

/**
 * @param {string} designId
 * @returns {boolean}
 */
export function isGearDesignPreviewOption(designId) {
  return GEAR_DESIGN_PREVIEW_OPTIONS.some((option) => option.id === designId);
}

/**
 * @returns {string}
 */
export function readStoredGearDesignPreview() {
  try {
    const stored = window.localStorage.getItem(GEAR_DESIGN_PREVIEW.storageKey);
    if (stored && isGearDesignPreviewOption(stored)) return stored;
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
    if (designId === GEAR_DESIGN_PREVIEW.defaultId) {
      window.localStorage.removeItem(GEAR_DESIGN_PREVIEW.storageKey);
      return;
    }

    window.localStorage.setItem(GEAR_DESIGN_PREVIEW.storageKey, designId);
  } catch {
    // Ignore storage access errors.
  }
}

/**
 * Applies the design preview attribute without touching default styles when unset/default.
 * @param {string} designId
 */
export function applyGearDesignPreview(designId) {
  const nextId = isGearDesignPreviewOption(designId)
    ? designId
    : GEAR_DESIGN_PREVIEW.defaultId;

  if (nextId === GEAR_DESIGN_PREVIEW.defaultId) {
    document.body.removeAttribute("data-gear-design");
  } else {
    document.body.dataset.gearDesign = nextId;
  }

  return nextId;
}

/**
 * @param {{
 *   rootElement?: HTMLElement | null,
 *   onChange?: (designId: string) => void
 * }} [options]
 */
export function initializeGearDesignPreview(options = {}) {
  const { rootElement = null, onChange = null } = options;

  if (!GEAR_DESIGN_PREVIEW.enabled) {
    if (rootElement) rootElement.hidden = true;
    applyGearDesignPreview(GEAR_DESIGN_PREVIEW.defaultId);
    return GEAR_DESIGN_PREVIEW.defaultId;
  }

  if (rootElement) rootElement.hidden = false;

  const selectElement = rootElement?.querySelector("#gearDesignPreviewSelect");
  let activeId = applyGearDesignPreview(readStoredGearDesignPreview());

  if (selectElement) {
    selectElement.innerHTML = GEAR_DESIGN_PREVIEW_OPTIONS.map(
      ({ id, label }) =>
        `<option value="${id}"${id === activeId ? " selected" : ""}>${label}</option>`
    ).join("");

    selectElement.addEventListener("change", () => {
      activeId = applyGearDesignPreview(selectElement.value);
      storeGearDesignPreview(activeId);
      onChange?.(activeId);
    });
  }

  return activeId;
}
