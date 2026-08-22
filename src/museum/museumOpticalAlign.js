/**
 * Optical vertical alignment for Museum exhibits.
 * Centers the visible amplifier (ignoring transparent PNG margins)
 * on the vertical midpoint of the information panel.
 */

const ALPHA_THRESHOLD = 12;
const MAX_SCAN_EDGE = 480;

/** @type {Map<string, { top: number, left: number, bottom: number, right: number } | null>} */
const visibleBoundsCache = new Map();

/**
 * @param {HTMLImageElement} image
 * @returns {string}
 */
function imageCacheKey(image) {
  return image.currentSrc || image.src || "";
}

/**
 * Finds the opaque pixel bounding box in natural image coordinates.
 * Transparent canvas margins are ignored so heads/combos/stacks align optically.
 *
 * @param {HTMLImageElement} image
 * @returns {{ top: number, left: number, bottom: number, right: number } | null}
 */
function measureVisibleBounds(image) {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) return null;

  const sampleScale = Math.min(
    1,
    MAX_SCAN_EDGE / Math.max(naturalWidth, naturalHeight)
  );
  const sampleWidth = Math.max(1, Math.round(naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(naturalHeight * sampleScale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    context.clearRect(0, 0, sampleWidth, sampleHeight);
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sampleHeight; y += 1) {
      const row = y * sampleWidth * 4;
      for (let x = 0; x < sampleWidth; x += 1) {
        const alpha = data[row + x * 4 + 3];
        if (alpha <= ALPHA_THRESHOLD) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0 || maxY < 0) return null;

    const inv = 1 / sampleScale;
    return {
      left: minX * inv,
      top: minY * inv,
      right: (maxX + 1) * inv,
      bottom: (maxY + 1) * inv
    };
  } catch {
    // Tainted canvas / decode failure — fall back to full frame.
    return null;
  }
}

/**
 * @param {HTMLImageElement} image
 * @returns {Promise<{ top: number, left: number, bottom: number, right: number } | null>}
 */
async function getVisibleBounds(image) {
  const key = imageCacheKey(image);
  if (!key) return null;

  if (visibleBoundsCache.has(key)) {
    return visibleBoundsCache.get(key) ?? null;
  }

  if (!image.complete || !image.naturalWidth) {
    await new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    }).catch(() => null);
  }

  if (!image.naturalWidth) {
    visibleBoundsCache.set(key, null);
    return null;
  }

  const bounds = measureVisibleBounds(image);
  visibleBoundsCache.set(key, bounds);
  return bounds;
}

/**
 * Aligns the visible amplifier center with the metadata column center.
 *
 * @param {HTMLImageElement} image
 * @param {HTMLElement} panel
 * @param {{ signal?: { cancelled: boolean } }} [options]
 */
export async function alignMuseumExhibitOptically(image, panel, options = {}) {
  if (!image || !panel) return;

  const signal = options.signal;
  const presentation =
    document.body.dataset.presentationMode === "true";

  // Presentation uses translate so optical nudge never grows layout height.
  image.style.marginTop = "0px";
  if (presentation) {
    image.style.transform = "translateY(0px)";
  }

  // Force layout with a clean baseline before measuring centers.
  void image.offsetHeight;

  const bounds = await getVisibleBounds(image);
  if (signal?.cancelled) return;

  const naturalHeight = image.naturalHeight || 1;
  const imgRect = image.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  if (!imgRect.height || !panelRect.height) return;

  const displayScaleY = imgRect.height / naturalHeight;
  const visibleTop = bounds?.top ?? 0;
  const visibleBottom = bounds?.bottom ?? naturalHeight;
  const visibleCenterY =
    imgRect.top + ((visibleTop + visibleBottom) / 2) * displayScaleY;
  const panelCenterY = panelRect.top + panelRect.height / 2;
  const delta = panelCenterY - visibleCenterY;

  if (signal?.cancelled) return;

  if (!Number.isFinite(delta) || Math.abs(delta) < 0.5) {
    image.style.marginTop = "0px";
    if (presentation) image.style.transform = "translateY(0px)";
    return;
  }

  if (presentation) {
    image.style.transform = `translateY(${delta}px)`;
    return;
  }

  image.style.marginTop = `${delta}px`;
}

/**
 * Binds optical alignment for the current museum exhibit root.
 *
 * @param {ParentNode | null | undefined} root
 * @returns {() => void}
 */
export function bindMuseumOpticalAlign(root) {
  if (!root) return () => {};

  /** @type {HTMLImageElement | null} */
  const image = root.querySelector(".museum-exhibit-image");
  /** @type {HTMLElement | null} */
  const panel = root.querySelector(".museum-exhibit-panel");
  /** @type {HTMLElement | null} */
  const layout = root.querySelector(".museum-exhibit-layout");
  if (!image || !panel) return () => {};

  const signal = { cancelled: false };
  let frame = 0;
  let running = false;

  const run = () => {
    if (signal.cancelled || running) return;
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      if (signal.cancelled) return;
      running = true;
      void alignMuseumExhibitOptically(image, panel, { signal }).finally(() => {
        running = false;
      });
    });
  };

  if (image.complete && image.naturalWidth) {
    run();
  } else {
    image.addEventListener("load", run, { once: true });
  }

  const resizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(run)
      : null;
  resizeObserver?.observe(panel);
  if (layout) resizeObserver?.observe(layout);

  window.addEventListener("resize", run);

  return () => {
    signal.cancelled = true;
    window.cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", run);
    image.style.marginTop = "";
    image.style.transform = "";
  };
}
