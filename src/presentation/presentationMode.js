/**
 * Presentation Mode — top-level display/presentation layer.
 *
 * Modes (Museum, Second Display, …) are independent of Gear Library filters.
 * Layout variants and playlist strategies are resolved from the mode registry.
 */

import {
  getPresentationVariantConfig,
  PRESENTATION_VARIANT
} from "./presentationVariants.js";
import {
  getLayoutVariantForMode,
  getPresentationModeConfig,
  isPresentationMode,
  PRESENTATION_MODE
} from "./presentationModes.js";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

export { PRESENTATION_VARIANT } from "./presentationVariants.js";
export {
  PRESENTATION_MODE,
  PRESENTATION_MODES,
  getPresentationModeConfig,
  isPresentationMode
} from "./presentationModes.js";

export const PRESENTATION_INTERVAL_MS = Object.freeze({
  SEC_30: 30_000,
  SEC_60: 60_000,
  SEC_120: 120_000
});

export const PRESENTATION_INTERVAL_DEFAULT = PRESENTATION_INTERVAL_MS.SEC_60;

/** Playlist scopes — ready for manufacturer / favourites / collection filters. */
export const PRESENTATION_SCOPE = Object.freeze({
  ALL: "all",
  MANUFACTURER: "manufacturer"
});

const FADE_MS = 400;
const CURSOR_HIDE_MS = 2500;

/** Sentinel playlist entry for Discover-only advance ticks. */
const DISCOVER_TICK_SLIDE = Object.freeze({
  ampId: "__discover_tick__",
  manufacturerId: "",
  manufacturer: ""
});

/**
 * @typedef {{
 *   ampId: string,
 *   manufacturerId: string,
 *   manufacturer: string
 * }} PresentationSlide
 *
 * @typedef {{
 *   captureState: () => unknown,
 *   restoreState: (snapshot: unknown) => void,
 *   enterMuseumLayout: () => void,
 *   applyPresentationVariant: (variantId: string) => void,
 *   clearPresentationVariant: () => void,
 *   buildPlaylist: (
 *     scope: string,
 *     context?: {
 *       manufacturerId?: string | null,
 *       strategy?: string | null,
 *       modeId?: string | null
 *     }
 *   ) => PresentationSlide[],
 *   showSlide: (slide: PresentationSlide) => void | Promise<void>,
 *   rotateDiscoverBoard: () => void | Promise<void>,
 *   getFadeTarget: () => HTMLElement | null,
 *   getEnterOptions?: () => { startAmpId?: string | null, manufacturerId?: string | null },
 *   handleEscape?: () => boolean,
 *   onActiveChange?: (active: boolean, modeId: string | null) => void,
 *   onCompositionReady?: () => void
 * }} PresentationHost
 */

/** @type {PresentationHost | null} */
let host = null;
/** @type {HTMLButtonElement | null} */
let modeButton = null;
/** @type {HTMLElement | null} */
let modeButtonLabel = null;
/** @type {HTMLButtonElement | null} */
let exitButton = null;

let active = false;
let paused = false;
/** True while Presentation stays armed but another app module is visible. */
let suspended = false;
let transitioning = false;
let intervalMs = PRESENTATION_INTERVAL_DEFAULT;
let scope = PRESENTATION_SCOPE.ALL;
/** @type {string} */
let modeId = PRESENTATION_MODE.MUSEUM;
/** @type {string} */
let layoutVariantId = PRESENTATION_VARIANT.AMP_ONLY;
/** @type {PresentationSlide[]} */
let playlist = [];
let index = 0;
/** @type {unknown} */
let snapshot = null;

/** @type {{
 *   decorations: boolean,
 *   maximized: boolean,
 *   fullscreen: boolean,
 *   position: { x: number, y: number } | null,
 *   size: { width: number, height: number } | null
 * } | null} */
let windowSnapshot = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let advanceTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let cursorTimer = null;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isTauriRuntime() {
  return Boolean(window.__TAURI_INTERNALS__);
}

async function enterPresentationWindow() {
  if (!isTauriRuntime()) return;

  try {
    const win = getCurrentWindow();
    const [decorations, maximized, fullscreen, position, size] = await Promise.all([
      win.isDecorated(),
      win.isMaximized(),
      win.isFullscreen(),
      win.outerPosition(),
      win.outerSize()
    ]);

    windowSnapshot = {
      decorations,
      maximized,
      fullscreen,
      position: position ? { x: position.x, y: position.y } : null,
      size: size ? { width: size.width, height: size.height } : null
    };

    if (decorations) {
      await win.setDecorations(false);
    }
    if (!fullscreen) {
      await win.setFullscreen(true);
    }
  } catch (error) {
    console.warn("Presentation fullscreen unavailable:", error);
  }
}

async function exitPresentationWindow() {
  const saved = windowSnapshot;
  windowSnapshot = null;
  if (!isTauriRuntime()) return;

  try {
    const win = getCurrentWindow();
    await win.setFullscreen(Boolean(saved?.fullscreen));
    await win.setDecorations(saved?.decorations !== false);

    if (saved?.maximized) {
      await win.maximize();
      return;
    }

    if (saved?.position && saved?.size) {
      await win.setPosition(new PhysicalPosition(saved.position.x, saved.position.y));
      await win.setSize(new PhysicalSize(saved.size.width, saved.size.height));
    }
  } catch (error) {
    console.warn("Presentation window restore failed:", error);
  }
}

export function isPresentationModeActive() {
  return active;
}

export function isPresentationSuspended() {
  return suspended;
}

export function isPresentationPaused() {
  return paused;
}

/** Pause slideshow chrome while the user visits another module. */
export function suspendPresentationMode() {
  if (!active || suspended) return;

  suspended = true;
  clearAdvanceTimer();
  clearCursorTimer();
  setCursorHidden(false);
  document.body.dataset.presentationSuspended = "true";

  if (exitButton) {
    exitButton.hidden = true;
    exitButton.setAttribute("aria-hidden", "true");
  }
}

/** Resume Presentation after returning to Gear Library. */
export function resumePresentationMode() {
  if (!active || !suspended) return;

  suspended = false;
  delete document.body.dataset.presentationSuspended;
  syncChrome();
  if (!paused) restartAdvanceTimer();
  scheduleCursorHide();
}

/** @deprecated Prefer getPresentationModeId — returns layout variant while active. */
export function getPresentationVariant() {
  return active ? layoutVariantId : null;
}

export function getPresentationModeId() {
  return active ? modeId : null;
}

export function getPresentationIntervalMs() {
  return intervalMs;
}

/**
 * @param {number} nextMs
 */
export function setPresentationIntervalMs(nextMs) {
  const allowed = Object.values(PRESENTATION_INTERVAL_MS);
  intervalMs = allowed.includes(nextMs) ? nextMs : PRESENTATION_INTERVAL_DEFAULT;
  if (active && !paused) restartAdvanceTimer();
}

/**
 * @param {string} nextScope
 */
export function setPresentationScope(nextScope) {
  if (!Object.values(PRESENTATION_SCOPE).includes(nextScope)) return;
  scope = nextScope;
}

export function getPresentationScope() {
  return scope;
}

function clearAdvanceTimer() {
  if (advanceTimer != null) {
    window.clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function clearCursorTimer() {
  if (cursorTimer != null) {
    window.clearTimeout(cursorTimer);
    cursorTimer = null;
  }
}

function setCursorHidden(hidden) {
  document.body.dataset.presentationCursor = hidden ? "hidden" : "visible";
}

function scheduleCursorHide() {
  clearCursorTimer();
  setCursorHidden(false);
  if (!active || suspended) return;

  cursorTimer = window.setTimeout(() => {
    cursorTimer = null;
    if (active && !suspended) setCursorHidden(true);
  }, CURSOR_HIDE_MS);
}

function currentLayoutConfig() {
  return getPresentationVariantConfig(layoutVariantId);
}

function currentModeConfig() {
  return getPresentationModeConfig(modeId);
}

function restartAdvanceTimer() {
  clearAdvanceTimer();
  if (!active || paused || suspended) return;

  const config = currentLayoutConfig();
  const needsTimer = config?.drivesDiscoverRotation
    ? true
    : playlist.length > 1;
  if (!needsTimer) return;

  advanceTimer = window.setTimeout(() => {
    advanceTimer = null;
    void goToRelative(1);
  }, intervalMs);
}

/**
 * @param {HTMLElement | null} element
 * @param {"out" | "in"} phase
 */
async function fade(element, phase) {
  if (!element) return;

  element.style.transition = `opacity ${FADE_MS}ms ease`;

  if (phase === "out") {
    element.style.opacity = "0";
    await wait(FADE_MS);
    return;
  }

  element.style.opacity = "0";
  void element.offsetWidth;
  element.style.opacity = "1";
  await wait(FADE_MS);
}

/**
 * Rebuild a fresh shuffled round, avoiding an immediate repeat of `avoidAmpId`.
 * @param {string | null} avoidAmpId
 * @param {{ manufacturerId?: string | null }} [context]
 */
function rebuildPlaylistRound(avoidAmpId, context = {}) {
  if (!host) return;
  const mode = currentModeConfig();
  const next = host.buildPlaylist(scope, {
    manufacturerId: context.manufacturerId ?? null,
    strategy: mode?.playlistStrategy ?? "bag",
    modeId
  });
  if (!next.length) {
    playlist = next;
    return;
  }

  if (
    avoidAmpId &&
    next.length > 1 &&
    next[0]?.ampId === avoidAmpId
  ) {
    const swapAt = 1 + Math.floor(Math.random() * (next.length - 1));
    const tmp = next[0];
    next[0] = next[swapAt];
    next[swapAt] = tmp;
  }

  playlist = next;
}

/**
 * @param {number} delta
 */
async function goToRelative(delta) {
  if (!active || suspended || !host || transitioning) return;

  const config = currentLayoutConfig();
  if (!config) return;

  transitioning = true;
  clearAdvanceTimer();

  const target = host.getFadeTarget?.() ?? null;
  await fade(target, "out");

  if (config.drivesDiscoverRotation || !config.showsAmp) {
    await host.rotateDiscoverBoard();
  } else if (playlist.length) {
    const previousAmpId = playlist[index]?.ampId ?? null;
    let nextIndex = index + delta;

    if (delta > 0 && nextIndex >= playlist.length) {
      // Full round complete — reshuffle without replacement for a new bag.
      rebuildPlaylistRound(previousAmpId, {
        manufacturerId: host.getEnterOptions?.()?.manufacturerId ?? null
      });
      nextIndex = 0;
    } else if (delta < 0 && nextIndex < 0) {
      // Stepping backward wraps within the current round (no reshuffle).
      nextIndex = playlist.length - 1;
    }

    index = nextIndex;
    const slide = playlist[index];
    if (slide) await host.showSlide(slide);
  }

  await fade(host.getFadeTarget?.() ?? target, "in");
  host.onCompositionReady?.();

  transitioning = false;
  if (!paused) restartAdvanceTimer();
}

function syncChrome() {
  if (modeButtonLabel) modeButtonLabel.textContent = "Presentation";
  if (modeButton) {
    modeButton.setAttribute("aria-label", "Presentation");
    modeButton.setAttribute("aria-pressed", active ? "true" : "false");
  }

  if (exitButton) {
    const showExit = active && !suspended;
    exitButton.hidden = !showExit;
    exitButton.setAttribute("aria-hidden", showExit ? "false" : "true");
  }

  document.body.dataset.presentationMode = active ? "true" : "false";
  document.body.dataset.presentationPaused = active && paused ? "true" : "false";
  document.body.dataset.presentationSuspended = active && suspended ? "true" : "false";

  if (active) {
    document.body.dataset.presentationModeId = modeId;
    document.body.dataset.presentationVariant = layoutVariantId;
  } else {
    delete document.body.dataset.presentationModeId;
    delete document.body.dataset.presentationVariant;
    delete document.body.dataset.presentationCursor;
  }

  host?.onActiveChange?.(active, active ? modeId : null);
}

/**
 * @param {string} nextModeId
 * @param {{ manufacturerId?: string | null }} [context]
 */
function applyMode(nextModeId, context = {}) {
  const mode = getPresentationModeConfig(nextModeId);
  if (!mode || !mode.enabled) return null;

  const layout = getLayoutVariantForMode(nextModeId);
  if (!layout) return null;

  modeId = nextModeId;
  layoutVariantId = mode.layoutVariant || layout.id;

  if (layout.showsAmp) {
    rebuildPlaylistRound(null, {
      manufacturerId: context.manufacturerId ?? null
    });
    if (!playlist.length) return null;
  } else {
    playlist = [DISCOVER_TICK_SLIDE];
  }

  return { mode, layout };
}

/**
 * @param {{
 *   mode?: string,
 *   variant?: string,
 *   startAmpId?: string | null,
 *   manufacturerId?: string | null
 * }} [options]
 */
export async function enterPresentationMode(options = {}) {
  if (!host) return;

  // Accept legacy `variant` keys mapped onto modes when possible.
  let requested =
    options.mode ||
    (options.variant === PRESENTATION_VARIANT.DISCOVER_ONLY
      ? PRESENTATION_MODE.SECOND_DISPLAY
      : options.variant === PRESENTATION_VARIANT.AMP_ONLY
        ? PRESENTATION_MODE.MUSEUM
        : options.variant) ||
    modeId;

  if (!isPresentationMode(requested)) {
    requested = PRESENTATION_MODE.MUSEUM;
  }

  if (active && modeId === requested) return;

  const applied = applyMode(requested, {
    manufacturerId: options.manufacturerId ?? null
  });
  if (!applied) return;

  const { layout } = applied;

  if (active) {
    clearAdvanceTimer();
    host.enterMuseumLayout();
    host.applyPresentationVariant(layoutVariantId);

    const startId = String(options.startAmpId ?? "").trim();
    if (layout.showsAmp) {
      const startIndex = startId
        ? playlist.findIndex((slide) => slide.ampId === startId)
        : 0;
      index = startIndex >= 0 ? startIndex : 0;
      await host.showSlide(playlist[index]);
    } else {
      index = 0;
      await host.rotateDiscoverBoard();
    }

    syncChrome();
    setCursorHidden(true);
    paused = false;
    restartAdvanceTimer();
    return;
  }

  snapshot = host.captureState();

  host.enterMuseumLayout();
  host.applyPresentationVariant(layoutVariantId);

  const startId = String(options.startAmpId ?? "").trim();
  const startIndex =
    layout.showsAmp && startId
      ? playlist.findIndex((slide) => slide.ampId === startId)
      : 0;
  index = startIndex >= 0 ? startIndex : 0;
  paused = false;
  active = true;
  syncChrome();
  await enterPresentationWindow();
  setCursorHidden(true);

  transitioning = true;
  if (layout.showsAmp) {
    await host.showSlide(playlist[index]);
  } else {
    await host.rotateDiscoverBoard();
  }

  const target = host.getFadeTarget?.();
  if (target) {
    target.style.opacity = "0";
    void target.offsetWidth;
    target.style.opacity = "1";
    await wait(FADE_MS);
  }
  host.onCompositionReady?.();
  transitioning = false;

  restartAdvanceTimer();
}

export function exitPresentationMode() {
  if (!active || !host) return;

  clearAdvanceTimer();
  clearCursorTimer();
  setCursorHidden(false);

  const restore = snapshot;
  snapshot = null;
  playlist = [];
  index = 0;
  paused = false;
  suspended = false;
  transitioning = false;
  active = false;
  delete document.body.dataset.presentationSuspended;

  host.clearPresentationVariant();
  syncChrome();
  host.restoreState(restore);
  void exitPresentationWindow();
}

export function togglePresentationPause() {
  if (!active) return;

  paused = !paused;
  document.body.dataset.presentationPaused = paused ? "true" : "false";

  if (paused) {
    clearAdvanceTimer();
  } else {
    restartAdvanceTimer();
  }
}

export function presentationNext() {
  void goToRelative(1);
}

export function presentationPrevious() {
  void goToRelative(-1);
}

function handleKeydown(event) {
  if (!active || suspended) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (host?.handleEscape?.()) return;
    exitPresentationMode();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    presentationNext();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    presentationPrevious();
    return;
  }

  if (event.key === " " || event.code === "Space") {
    event.preventDefault();
    togglePresentationPause();
  }
}

function handlePointerActivity(event) {
  if (!active || suspended) return;

  if (exitButton && event.target instanceof Node && exitButton.contains(event.target)) {
    clearCursorTimer();
    setCursorHidden(false);
    return;
  }

  scheduleCursorHide();
}

function handleModeButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();

  if (active) return;

  void enterPresentationMode({
    mode: PRESENTATION_MODE.MUSEUM,
    ...(host?.getEnterOptions?.() ?? {})
  });
}

/**
 * @param {{
 *   host: PresentationHost,
 *   modeButton?: HTMLButtonElement | null,
 *   modeButtonLabel?: HTMLElement | null,
 *   exitButton?: HTMLButtonElement | null
 * }} options
 */
export function initializePresentationMode(options) {
  host = options.host;
  modeButton = options.modeButton ?? null;
  modeButtonLabel = options.modeButtonLabel ?? null;
  exitButton = options.exitButton ?? null;

  modeButton?.addEventListener("click", handleModeButtonClick);

  exitButton?.addEventListener("click", () => {
    exitPresentationMode();
  });

  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("mousemove", handlePointerActivity, { passive: true });
  document.addEventListener("pointerdown", handlePointerActivity, { passive: true });

  syncChrome();
}
