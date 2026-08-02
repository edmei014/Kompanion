const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_CLICK_SCALE = 2.5;
const FIT_FRACTION = 0.88;
const MIN_VISIBLE_FRACTION = 0.12;

let overlay = null;
let backdrop = null;
let closeButton = null;
let viewport = null;
let focusImage = null;
let expandButton = null;
let sourceImage = null;

let largeOverlay = null;
let largeBackdrop = null;
let largeCloseButton = null;
let largeFocusButton = null;
let largeImage = null;

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

export function isGearAmpImageLargeOpen() {
  return largeOverlay?.dataset.open === "true";
}

export function isGearAmpImageFocusOpen() {
  return overlay?.dataset.open === "true";
}

export function isAnyGearAmpImageViewOpen() {
  return isGearAmpImageLargeOpen() || isGearAmpImageFocusOpen();
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

function clampPosition(nextX, nextY, nextScale = scale) {
  if (!viewport) return { x: nextX, y: nextY };

  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const width = baseWidth * nextScale;
  const height = baseHeight * nextScale;

  if (width <= vw && height <= vh) {
    return getCenteredPosition(nextScale);
  }

  const minVisibleX = width * MIN_VISIBLE_FRACTION;
  const minVisibleY = height * MIN_VISIBLE_FRACTION;

  return {
    x: clamp(nextX, vw - width + minVisibleX, -minVisibleX),
    y: clamp(nextY, vh - height + minVisibleY, -minVisibleY)
  };
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
  if (!viewport || scale <= MIN_SCALE + 0.001) return false;

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
  const fitScale = Math.min(maxWidth / focusImage.naturalWidth, maxHeight / focusImage.naturalHeight);

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

  if (focusImage) {
    focusImage.classList.remove("is-animating");
    focusImage.style.width = "";
    focusImage.style.height = "";
    focusImage.style.transform = "";
  }

  if (viewport) {
    viewport.classList.remove("is-panning");
  }

  isPanning = false;
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
  zoomAtPoint(event.clientX, event.clientY, scale * factor, true);
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
  if (event.target !== focusImage) return;

  event.preventDefault();

  focusImage?.classList.remove("is-animating");
  isPanning = true;
  panStartX = event.clientX;
  panStartY = event.clientY;
  panOriginX = x;
  panOriginY = y;
  viewport?.classList.add("is-panning");
  focusImage.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!isPanning) return;

  const dx = event.clientX - panStartX;
  const dy = event.clientY - panStartY;
  ({ x, y } = clampPosition(panOriginX + dx, panOriginY + dy));
  applyTransform(false);
}

function handlePointerUp(event) {
  if (!isPanning) return;

  isPanning = false;
  viewport?.classList.remove("is-panning");

  if (focusImage?.hasPointerCapture(event.pointerId)) {
    focusImage.releasePointerCapture(event.pointerId);
  }
}

function syncLargeImageFromSource() {
  if (!largeImage || !sourceImage?.src) return;

  const nextSrc = sourceImage.currentSrc || sourceImage.src;
  if (largeImage.src !== nextSrc) {
    largeImage.src = nextSrc;
  }
  largeImage.alt = sourceImage.alt || "";
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

export function closeGearAmpImageFocus() {
  if (!overlay) return;

  resetViewerState();
  overlay.dataset.open = "false";
  overlay.setAttribute("aria-hidden", "true");
}

export function closeGearAmpImageLarge() {
  closeGearAmpImageFocus();
  if (!largeOverlay) return;

  largeOverlay.dataset.open = "false";
  largeOverlay.setAttribute("aria-hidden", "true");
}

export function closeGearAmpImageViews() {
  closeGearAmpImageLarge();
}

export function openGearAmpImageLarge() {
  if (!largeOverlay || !largeImage || !sourceImage?.src) return;

  closeGearAmpImageFocus();
  syncLargeImageFromSource();

  largeOverlay.dataset.open = "true";
  largeOverlay.setAttribute("aria-hidden", "false");

  if (largeCloseButton) {
    largeCloseButton.focus();
  }
}

export function openGearAmpImageFocus() {
  if (!overlay || !focusImage || !sourceImage?.src) return;

  resetViewerState();
  syncImageFromSource();

  overlay.dataset.open = "true";
  overlay.setAttribute("aria-hidden", "false");

  if (focusImage.complete && focusImage.naturalWidth) {
    finishOpenLayout();
  } else {
    focusImage.addEventListener("load", finishOpenLayout, { once: true });
  }

  if (closeButton) {
    closeButton.focus();
  }
}

/**
 * @param {{ sourceImage?: HTMLImageElement | null, expandButton?: HTMLButtonElement | null }} [options]
 */
export function initializeGearAmpImageFocus(options = {}) {
  largeOverlay = document.querySelector("#gearAmpImageLargeOverlay");
  largeBackdrop = document.querySelector("#gearAmpImageLargeBackdrop");
  largeCloseButton = document.querySelector("#gearAmpImageLargeClose");
  largeFocusButton = document.querySelector("#gearAmpImageLargeFocus");
  largeImage = document.querySelector("#gearAmpImageLargeImage");
  overlay = document.querySelector("#gearAmpImageFocusOverlay");
  backdrop = document.querySelector("#gearAmpImageFocusBackdrop");
  closeButton = document.querySelector("#gearAmpImageFocusClose");
  viewport = document.querySelector("#gearAmpImageFocusViewport");
  focusImage = document.querySelector("#gearAmpImageFocusImage");
  expandButton = options.expandButton ?? document.querySelector("#gearAmpDetailExpandImage");
  sourceImage = options.sourceImage ?? document.querySelector("#gearAmpDetailImage");

  if (expandButton) {
    expandButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openGearAmpImageLarge();
    });
  }

  if (largeCloseButton) {
    largeCloseButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeGearAmpImageLarge();
    });
  }

  if (largeFocusButton) {
    largeFocusButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openGearAmpImageFocus();
    });
  }

  if (largeBackdrop) {
    largeBackdrop.addEventListener("click", closeGearAmpImageLarge);
  }

  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeGearAmpImageFocus();
      if (isGearAmpImageLargeOpen() && largeFocusButton) {
        largeFocusButton.focus();
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeGearAmpImageFocus();
      if (isGearAmpImageLargeOpen() && largeFocusButton) {
        largeFocusButton.focus();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("wheel", handleWheel, { passive: false });
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
}
