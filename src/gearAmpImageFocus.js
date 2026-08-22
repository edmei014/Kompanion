const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_CLICK_SCALE = 2.5;
/** Default fit: ~90% of the viewport, centered with exhibit-like margins. */
const FIT_FRACTION = 0.9;

let overlay = null;
let backdrop = null;
let closeButton = null;
let viewport = null;
let focusImage = null;
/** @type {HTMLImageElement | null} */
let sourceImage = null;
/** @type {((isOpen: boolean) => void) | null} */
let onOpenChange = null;

let baseWidth = 0;
let baseHeight = 0;
let scale = 1;
let x = 0;
let y = 0;

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;
let activePointerId = null;

export function isGearAmpImageFocusOpen() {
  return overlay?.dataset.open === "true";
}

/** @deprecated Large view removed — alias for focus open state. */
export function isGearAmpImageLargeOpen() {
  return false;
}

export function isAnyGearAmpImageViewOpen() {
  return isGearAmpImageFocusOpen();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCenteredPosition(nextScale = scale) {
  if (!viewport) return { x: 0, y: 0 };

  return {
    x: (viewport.clientWidth - baseWidth * nextScale) / 2,
    y: (viewport.clientHeight - baseHeight * nextScale) / 2
  };
}

/**
 * Edge-based clamp: free pan while image content remains; stop at true edges.
 */
function clampPosition(nextX, nextY, nextScale = scale) {
  if (!viewport) return { x: nextX, y: nextY };

  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const width = baseWidth * nextScale;
  const height = baseHeight * nextScale;

  let clampedX = nextX;
  let clampedY = nextY;

  if (width <= vw) {
    clampedX = (vw - width) / 2;
  } else {
    clampedX = clamp(nextX, vw - width, 0);
  }

  if (height <= vh) {
    clampedY = (vh - height) / 2;
  } else {
    clampedY = clamp(nextY, vh - height, 0);
  }

  return { x: clampedX, y: clampedY };
}

function applyTransform(animate = false) {
  if (!focusImage) return;

  if (animate) {
    focusImage.classList.add("is-animating");
  } else {
    focusImage.classList.remove("is-animating");
  }

  focusImage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function canPan() {
  if (!viewport || !baseWidth) return false;

  return (
    baseWidth * scale > viewport.clientWidth + 1 ||
    baseHeight * scale > viewport.clientHeight + 1
  );
}

function animateTransform(targetScale, targetX, targetY) {
  scale = targetScale;
  ({ x, y } = clampPosition(targetX, targetY, targetScale));
  applyTransform(true);
}

function layoutBaseImage() {
  if (!viewport || !focusImage || !focusImage.naturalWidth) return;

  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const maxWidth = vw * FIT_FRACTION;
  const maxHeight = vh * FIT_FRACTION;
  const fitScale = Math.min(
    maxWidth / focusImage.naturalWidth,
    maxHeight / focusImage.naturalHeight
  );

  baseWidth = focusImage.naturalWidth * fitScale;
  baseHeight = focusImage.naturalHeight * fitScale;
  focusImage.style.width = `${baseWidth}px`;
  focusImage.style.height = `${baseHeight}px`;

  scale = MIN_SCALE;
  ({ x, y } = getCenteredPosition(MIN_SCALE));
  applyTransform(false);
}

function resetViewerState() {
  scale = MIN_SCALE;
  x = 0;
  y = 0;
  baseWidth = 0;
  baseHeight = 0;
  isPanning = false;
  activePointerId = null;

  if (focusImage) {
    focusImage.classList.remove("is-animating");
    focusImage.style.width = "";
    focusImage.style.height = "";
    focusImage.style.transform = "";
  }

  if (viewport) {
    viewport.classList.remove("is-panning");
  }
}

function zoomAtPoint(clientX, clientY, targetScale, animate) {
  if (!viewport || !focusImage || !baseWidth) return;

  const rect = viewport.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const nextScale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
  const imageX = (mx - x) / scale;
  const imageY = (my - y) / scale;
  const nextX = mx - imageX * nextScale;
  const nextY = my - imageY * nextScale;
  const clamped = clampPosition(nextX, nextY, nextScale);

  scale = nextScale;
  x = clamped.x;
  y = clamped.y;
  applyTransform(animate);
}

function handleWheel(event) {
  if (!isGearAmpImageFocusOpen() || !baseWidth) return;

  event.preventDefault();

  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomAtPoint(event.clientX, event.clientY, scale * factor, false);
}

function handleDoubleClick(event) {
  if (!isGearAmpImageFocusOpen() || !baseWidth) return;

  event.preventDefault();
  event.stopPropagation();

  if (Math.abs(scale - MIN_SCALE) < 0.02) {
    zoomAtPoint(event.clientX, event.clientY, DOUBLE_CLICK_SCALE, true);
    return;
  }

  const centered = getCenteredPosition(MIN_SCALE);
  animateTransform(MIN_SCALE, centered.x, centered.y);
}

function handlePointerDown(event) {
  if (!isGearAmpImageFocusOpen() || event.button !== 0 || !canPan()) return;
  if (event.target !== focusImage && event.target !== viewport) return;

  event.preventDefault();

  focusImage?.classList.remove("is-animating");
  isPanning = true;
  activePointerId = event.pointerId;
  panStartX = event.clientX;
  panStartY = event.clientY;
  panOriginX = x;
  panOriginY = y;
  viewport?.classList.add("is-panning");

  const captureTarget = event.target === viewport ? viewport : focusImage;
  captureTarget?.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event) {
  if (!isPanning || event.pointerId !== activePointerId) return;

  const dx = event.clientX - panStartX;
  const dy = event.clientY - panStartY;
  ({ x, y } = clampPosition(panOriginX + dx, panOriginY + dy));
  applyTransform(false);
}

function handlePointerUp(event) {
  if (!isPanning || event.pointerId !== activePointerId) return;

  isPanning = false;
  activePointerId = null;
  viewport?.classList.remove("is-panning");

  if (focusImage?.hasPointerCapture?.(event.pointerId)) {
    focusImage.releasePointerCapture(event.pointerId);
  }
  if (viewport?.hasPointerCapture?.(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId);
  }
}

function syncImageFromSource() {
  if (!focusImage || !sourceImage?.src) return;

  const nextSrc = sourceImage.currentSrc || sourceImage.src;
  if (focusImage.src !== nextSrc) {
    focusImage.src = nextSrc;
  }
  focusImage.alt = sourceImage.alt || "";
}

function finishOpenLayout() {
  layoutBaseImage();
}

function notifyOpenChange(isOpen) {
  onOpenChange?.(isOpen);
}

export function closeGearAmpImageFocus() {
  if (!overlay || !isGearAmpImageFocusOpen()) {
    resetViewerState();
    return;
  }

  resetViewerState();
  overlay.dataset.open = "false";
  overlay.setAttribute("aria-hidden", "true");
  notifyOpenChange(false);
}

/** @deprecated Large view removed — closes the single fullscreen viewer. */
export function closeGearAmpImageLarge() {
  closeGearAmpImageFocus();
}

export function closeGearAmpImageViews() {
  closeGearAmpImageFocus();
}

/**
 * Opens the single fullscreen amp viewer from any image element.
 * @param {HTMLImageElement | null | undefined} image
 */
export function openGearAmpImageFocus(image) {
  if (!overlay || !focusImage) return;

  const nextSource =
    image instanceof HTMLImageElement
      ? image
      : sourceImage instanceof HTMLImageElement
        ? sourceImage
        : null;

  if (!nextSource?.src) return;

  sourceImage = nextSource;
  resetViewerState();
  syncImageFromSource();

  overlay.dataset.open = "true";
  overlay.setAttribute("aria-hidden", "false");
  notifyOpenChange(true);

  if (focusImage.complete && focusImage.naturalWidth) {
    finishOpenLayout();
  } else {
    focusImage.addEventListener("load", finishOpenLayout, { once: true });
  }

  if (closeButton) {
    closeButton.focus();
  }
}

/** @deprecated Large view removed — opens the single fullscreen viewer. */
export function openGearAmpImageLarge(image) {
  openGearAmpImageFocus(image);
}

/**
 * @param {{
 *   sourceImage?: HTMLImageElement | null,
 *   onOpenChange?: ((isOpen: boolean) => void) | null
 * }} [options]
 */
export function initializeGearAmpImageFocus(options = {}) {
  overlay = document.querySelector("#gearAmpImageFocusOverlay");
  backdrop = document.querySelector("#gearAmpImageFocusBackdrop");
  closeButton = document.querySelector("#gearAmpImageFocusClose");
  viewport = document.querySelector("#gearAmpImageFocusViewport");
  focusImage = document.querySelector("#gearAmpImageFocusImage");
  sourceImage = options.sourceImage ?? document.querySelector("#gearAmpDetailImage");
  onOpenChange = options.onOpenChange ?? null;

  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeGearAmpImageFocus();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      if (isPanning) return;
      closeGearAmpImageFocus();
    });
  }

  if (overlay) {
    overlay.addEventListener("wheel", handleWheel, { passive: false });
  }

  if (viewport) {
    viewport.addEventListener("click", (event) => {
      if (event.target !== viewport || isPanning) return;
      closeGearAmpImageFocus();
    });
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerUp);
  }

  if (focusImage) {
    focusImage.addEventListener("dblclick", handleDoubleClick);
    focusImage.addEventListener("pointerdown", handlePointerDown);
    focusImage.addEventListener("pointermove", handlePointerMove);
    focusImage.addEventListener("pointerup", handlePointerUp);
    focusImage.addEventListener("pointercancel", handlePointerUp);
    focusImage.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") return;
      focusImage.classList.remove("is-animating");
    });
  }

  window.addEventListener("resize", () => {
    if (!isGearAmpImageFocusOpen() || !focusImage?.naturalWidth) return;

    const previousScale = scale;
    layoutBaseImage();

    if (previousScale > MIN_SCALE + 0.01 && viewport) {
      zoomAtPoint(viewport.clientWidth / 2, viewport.clientHeight / 2, previousScale, false);
    }
  });
}
