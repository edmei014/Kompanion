/**
 * Fits each Presentation slide as a fixed, fully visible composition.
 * Shrinks type / spacing / image together — never introduces scrolling.
 */

const FIT_MIN = 0.72;
const FIT_STEP = 0.03;
const FIT_MAX_PASSES = 14;

/** @type {(() => void) | null} */
let stopFit = null;

/**
 * @param {HTMLElement} root
 * @param {number} scale
 */
function applyFitScale(root, scale) {
  root.style.setProperty("--pres-fit", String(scale));
  document.body.style.setProperty("--pres-fit", String(scale));
}

/**
 * @param {HTMLElement} viewport
 * @param {HTMLElement} composition
 * @returns {boolean}
 */
function compositionOverflows(viewport, composition) {
  const viewH = viewport.clientHeight;
  const viewW = viewport.clientWidth;
  if (viewH <= 0 || viewW <= 0) return false;

  const compH = composition.scrollHeight;
  const compW = composition.scrollWidth;

  return compH > viewH + 1 || compW > viewW + 1;
}

/**
 * Clears any last-resort transform used when CSS vars alone cannot fit.
 *
 * @param {HTMLElement} composition
 */
function clearFallbackScale(composition) {
  composition.style.removeProperty("transform");
  composition.style.removeProperty("transform-origin");
}

/**
 * Shrink type/spacing/image together until the composition fits.
 * If still oversized at the minimum, apply a final uniform scale.
 *
 * @param {HTMLElement} viewport
 * @param {HTMLElement} composition
 */
function fitComposition(viewport, composition) {
  clearFallbackScale(composition);
  applyFitScale(composition, 1);
  void composition.offsetHeight;

  if (!compositionOverflows(viewport, composition)) {
    return;
  }

  let scale = 1;
  for (let pass = 0; pass < FIT_MAX_PASSES; pass += 1) {
    scale = Math.max(FIT_MIN, scale - FIT_STEP);
    applyFitScale(composition, scale);
    void composition.offsetHeight;

    if (!compositionOverflows(viewport, composition)) {
      return;
    }

    if (scale <= FIT_MIN + 0.001) {
      break;
    }
  }

  // Last resort: keep the whole slide visible without scrolling.
  const viewH = viewport.clientHeight;
  const viewW = viewport.clientWidth;
  const compH = composition.scrollHeight;
  const compW = composition.scrollWidth;
  if (viewH > 0 && viewW > 0 && (compH > viewH || compW > viewW)) {
    const fallback = Math.max(
      0.55,
      Math.min(viewH / compH, viewW / compW, 1) * 0.98
    );
    composition.style.transformOrigin = "center center";
    composition.style.transform = `scale(${fallback})`;
  }
}

/**
 * @param {ParentNode | null | undefined} root
 * @returns {{ viewport: HTMLElement, composition: HTMLElement } | null}
 */
function resolveFitTargets(root) {
  if (!root || !(root instanceof Element)) return null;

  const panel =
    root.closest?.(".gear-library-panel") ||
    document.querySelector("#gearLibraryView .gear-library-panel");
  if (!(panel instanceof HTMLElement)) return null;

  const variant = document.body.dataset.presentationVariant || "";

  /** @type {HTMLElement | null} */
  let composition = null;

  if (variant === "discover-only") {
    composition = panel.querySelector(".gear-discover-column");
  } else if (variant === "amp-discover") {
    composition = panel.querySelector(".gear-library-layout");
  } else {
    composition =
      panel.querySelector(".museum-exhibit-layout") ||
      panel.querySelector(".museum-catalog");
  }

  if (!(composition instanceof HTMLElement)) return null;

  return { viewport: panel, composition };
}

/**
 * Runs one fit pass for the active presentation composition.
 *
 * @param {ParentNode | null | undefined} [root]
 */
export function fitPresentationComposition(root = document.querySelector("#gearLibraryView")) {
  if (document.body.dataset.presentationMode !== "true") return;

  const targets = resolveFitTargets(root);
  if (!targets) return;

  fitComposition(targets.viewport, targets.composition);
}

/**
 * Binds resize/fit for Presentation Mode. Call after each slide change.
 *
 * @param {ParentNode | null | undefined} [root]
 * @returns {() => void}
 */
export function bindPresentationFit(root = document.querySelector("#gearLibraryView")) {
  stopPresentationFit();

  /** @type {ReturnType<typeof setTimeout> | null} */
  let delayedTimer = null;

  const run = () => {
    window.requestAnimationFrame(() => {
      fitPresentationComposition(root);
      // Second pass after images/fonts settle.
      window.requestAnimationFrame(() => fitPresentationComposition(root));
    });

    // Optical amp align can nudge after the first paint — refit once more.
    if (delayedTimer) window.clearTimeout(delayedTimer);
    delayedTimer = window.setTimeout(() => {
      delayedTimer = null;
      fitPresentationComposition(root);
    }, 140);
  };

  run();

  const onResize = () => run();
  window.addEventListener("resize", onResize);

  /** @type {ResizeObserver | null} */
  let observer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let resizeDebounce = null;
  const panel = document.querySelector("#gearLibraryView .gear-library-panel");
  if (panel && typeof ResizeObserver === "function") {
    // Observe viewport only — fitting changes composition size and must not re-enter.
    observer = new ResizeObserver(() => {
      if (resizeDebounce) window.clearTimeout(resizeDebounce);
      resizeDebounce = window.setTimeout(() => {
        resizeDebounce = null;
        run();
      }, 80);
    });
    observer.observe(panel);
  }

  const images = root?.querySelectorAll?.("img") ?? [];
  /** @type {Array<() => void>} */
  const imageCleanups = [];
  images.forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.complete) return;
    const onLoad = () => run();
    img.addEventListener("load", onLoad, { once: true });
    imageCleanups.push(() => img.removeEventListener("load", onLoad));
  });

  stopFit = () => {
    window.removeEventListener("resize", onResize);
    if (delayedTimer) window.clearTimeout(delayedTimer);
    if (resizeDebounce) window.clearTimeout(resizeDebounce);
    observer?.disconnect();
    imageCleanups.forEach((cleanup) => cleanup());
    document.body.style.removeProperty("--pres-fit");
    const compositions = document.querySelectorAll(
      ".gear-library-layout, .museum-exhibit-layout, .museum-catalog, .gear-discover-column"
    );
    compositions.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.removeProperty("--pres-fit");
      clearFallbackScale(el);
    });
    stopFit = null;
  };

  return stopFit;
}

export function stopPresentationFit() {
  if (stopFit) stopFit();
}
