import {
  AMP_BROWSER_VIEW,
  AMP_BROWSER_VIEW_DEFAULT,
  AMP_BROWSER_VIEWS,
  AMP_IMAGE_FILTER,
  DISCOVER_BOARD_CATEGORIES,
  DISCOVER_ROTATION_FADE_MS,
  buildAmpManufacturerViewSections,
  buildAmpTimelineSections,
  createDiscoverRotationController,
  getAmpBrowseEntries,
  getAmpDetailView,
  getAmpLibraryStats,
  getManufacturerBrowseEntries,
  getManufacturerDetailView,
  getManufacturerLibraryStats,
  isAmpBrowserView
} from "./library/index.js";
import { GEAR_CATEGORY, gearLibraryCategories, getGearCategory } from "./gearLibraryCatalog.js";
import { applyAmpThemeToElement, serializeAmpThemeStyle } from "./theme/ampTheme.js";
import {
  closeGearAmpImageFocus,
  closeGearAmpImageLarge,
  closeGearAmpImageViews,
  initializeGearAmpImageFocus,
  isGearAmpImageFocusOpen,
  isGearAmpImageLargeOpen
} from "./gearAmpImageFocus.js";
import { initializeGearDesignPreview } from "./gearLibraryDesignPreview.js";

const APP_VIEW = {
  LIVE: "live",
  GEAR: "gear"
};

const ALL_MANUFACTURERS = "all";

let activeView = APP_VIEW.LIVE;
let activeGearCategory = GEAR_CATEGORY.AMPS;
let selectedAmpId = null;
let selectedManufacturerId = null;
let onViewChange = null;
let ampCatalogEntries = [];
let ampLibraryStatsData = { ampCount: 0, manufacturerCount: 0 };

const ampBrowserState = {
  manufacturer: ALL_MANUFACTURERS,
  searchQuery: "",
  view: AMP_BROWSER_VIEW_DEFAULT,
  imageFilter: AMP_IMAGE_FILTER.ALL
};

const manufacturerBrowserState = {
  searchQuery: ""
};

let manufacturerCatalogEntries = [];
let manufacturerLibraryStatsData = { manufacturerCount: 0 };

let liveViewRoot = null;
let gearLibraryViewRoot = null;
let appRoot = null;
let gearLibraryTitle = null;
let gearCategoryShell = null;
let gearLibraryScroll = null;
let gearLibrarySearch = null;
let gearLibraryViewWrap = null;
let gearAmpViewSelect = null;
let gearAmpBrowserStage = null;
let gearAmpTimelineRail = null;
let gearAmpTimelineTrack = null;
let gearAmpImageFilterWrap = null;
/** @type {IntersectionObserver | null} */
let timelineYearObserver = null;
let timelineRailBound = false;
let gearAmpImageFilter = null;
let manufacturerBrowserGrid = null;
let ampBrowserGrid = null;
let gearLibraryStatsEl = null;
let gearLibraryEmptyState = null;
let gearCategoryNav = null;
let gearAmpDetailOverlay = null;
let gearAmpDetailBackdrop = null;
let gearAmpDetailClose = null;
let gearAmpDetailImage = null;
let gearAmpDetailManufacturer = null;
let gearAmpDetailModel = null;
let gearAmpDetailSpecs = null;
let gearAmpDetailDescription = null;
let gearAmpDetailHistory = null;
let gearAmpDetailValveSection = null;
let gearAmpDetailValveList = null;
let gearAmpDetailPlayedBySection = null;
let gearAmpDetailPlayedByList = null;
let gearManufacturerDetailOverlay = null;
let gearManufacturerDetailBackdrop = null;
let gearManufacturerDetailClose = null;
let gearManufacturerDetailTitle = null;
let gearManufacturerDetailMeta = null;
let gearManufacturerDetailDescription = null;
let gearManufacturerDetailHistory = null;
let gearManufacturerDetailWebsite = null;
let gearDiscoverBoard = null;
/** @type {import("./library/discoverLibrary.js").DiscoverBoardState | null} */
let discoverBoardState = null;
/** @type {ReturnType<typeof createDiscoverRotationController> | null} */
let discoverRotationController = null;
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const discoverFadeTimers = new Map();
let primaryNavButtons = [];

export function registerViewChangeHandler(handler) {
  onViewChange = handler;
}

export function getActiveAppView() {
  return activeView;
}

function setViewRootVisibility(view) {
  document.body.dataset.appView = view;

  if (liveViewRoot) {
    const showLive = view === APP_VIEW.LIVE;
    liveViewRoot.setAttribute("aria-hidden", showLive ? "false" : "true");
  }

  if (gearLibraryViewRoot) {
    const showGear = view === APP_VIEW.GEAR;
    gearLibraryViewRoot.setAttribute("aria-hidden", showGear ? "false" : "true");
  }
}

function isAmpDetailOpen() {
  return gearAmpDetailOverlay?.dataset.open === "true";
}

function isManufacturerDetailOpen() {
  return gearManufacturerDetailOverlay?.dataset.open === "true";
}

function updateGearOverlayLock() {
  const ampOpen = isAmpDetailOpen();
  const manufacturerOpen = isManufacturerDetailOpen();
  const anyOpen = ampOpen || manufacturerOpen;

  document.body.dataset.gearDetailOpen = ampOpen ? "true" : "false";
  document.body.dataset.gearManufacturerOpen = manufacturerOpen ? "true" : "false";
  document.body.dataset.gearOverlayOpen = anyOpen ? "true" : "false";

  if (gearLibraryViewRoot) {
    gearLibraryViewRoot.dataset.detailOpen = anyOpen ? "true" : "false";
  }

  if (appRoot) {
    if (anyOpen) {
      appRoot.setAttribute("inert", "");
    } else {
      appRoot.removeAttribute("inert");
    }
  }
}

function closeAllGearOverlays() {
  closeGearAmpImageViews();
  closeManufacturerDetail();
  closeAmpDetail();
}

export function setAppView(view) {
  if (view !== APP_VIEW.LIVE && view !== APP_VIEW.GEAR) return;
  if (activeView === view) return;

  activeView = view;
  setViewRootVisibility(view);

  primaryNavButtons.forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (view !== APP_VIEW.GEAR) {
    closeAllGearOverlays();
    stopDiscoverRotation();
  }

  onViewChange?.(view);

  if (view === APP_VIEW.GEAR) {
    resetAmpBrowserViewToDefault();
    renderActiveGearCategory();
    if (discoverBoardState) {
      startDiscoverRotation();
    }
  }
}

function resetAmpBrowserViewToDefault() {
  ampBrowserState.view = AMP_BROWSER_VIEW_DEFAULT;

  if (gearAmpViewSelect) {
    gearAmpViewSelect.value = AMP_BROWSER_VIEW_DEFAULT;
  }
}

function isManufacturersCategory() {
  return activeGearCategory === GEAR_CATEGORY.MANUFACTURERS;
}

function isAmpsCategory() {
  return activeGearCategory === GEAR_CATEGORY.AMPS;
}

function updateGearCategoryPanels() {
  const isManufacturers = isManufacturersCategory();

  if (gearCategoryShell) {
    gearCategoryShell.dataset.activeCategory = activeGearCategory;
  }

  if (gearLibraryViewWrap) {
    gearLibraryViewWrap.classList.toggle("is-inactive", isManufacturers);
    gearLibraryViewWrap.setAttribute("aria-hidden", isManufacturers ? "true" : "false");
  }

  if (gearAmpImageFilterWrap) {
    gearAmpImageFilterWrap.classList.toggle("is-inactive", isManufacturers);
    gearAmpImageFilterWrap.setAttribute("aria-hidden", isManufacturers ? "true" : "false");
  }

  if (gearLibraryTitle) {
    const category = getGearCategory(activeGearCategory);
    gearLibraryTitle.textContent =
      category?.id === GEAR_CATEGORY.MANUFACTURERS ? "Manufacturers" : "Amp Browser";
  }

  syncGearLibrarySearchField();

  if (gearLibraryScroll) {
    gearLibraryScroll.scrollTop = 0;
  }
}

function syncGearLibrarySearchField() {
  if (!gearLibrarySearch) return;

  gearLibrarySearch.value = isManufacturersCategory()
    ? manufacturerBrowserState.searchQuery
    : ampBrowserState.searchQuery;
  gearLibrarySearch.placeholder = isManufacturersCategory()
    ? "Search manufacturer, country…"
    : "Search manufacturer, model, alias…";
}

function updateGearLibraryEmptyState(isEmpty, message) {
  if (!gearLibraryEmptyState) return;

  gearLibraryEmptyState.textContent = message;
  gearLibraryEmptyState.hidden = !isEmpty;
}

function setGearCategory(categoryId) {
  const category = getGearCategory(categoryId);
  if (!category || !category.enabled) return;
  if (activeGearCategory === categoryId) return;

  activeGearCategory = categoryId;
  closeAllGearOverlays();
  renderGearCategoryNav();
  updateGearCategoryPanels();
  renderActiveGearCategory();
}

function renderActiveGearCategory() {
  if (manufacturerBrowserGrid) {
    manufacturerBrowserGrid.hidden = !isManufacturersCategory();
  }

  if (ampBrowserGrid) {
    ampBrowserGrid.hidden = !isAmpsCategory();
  }

  if (isManufacturersCategory()) {
    renderManufacturerBrowser();
    return;
  }

  if (isAmpsCategory()) {
    renderAmpBrowser();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadAmpBrowseEntries() {
  return getAmpBrowseEntries({
    query: ampBrowserState.searchQuery,
    manufacturer:
      ampBrowserState.manufacturer === ALL_MANUFACTURERS
        ? ""
        : ampBrowserState.manufacturer,
    sort: ampBrowserState.view,
    imageFilter: ampBrowserState.imageFilter
  });
}

function isAmpBrowserFiltered() {
  return (
    ampBrowserState.searchQuery.trim().length > 0 ||
    ampBrowserState.manufacturer !== ALL_MANUFACTURERS ||
    ampBrowserState.imageFilter === AMP_IMAGE_FILTER.AVAILABLE
  );
}

function syncAmpImageFilterUi() {
  if (!gearAmpImageFilter) return;

  gearAmpImageFilter.querySelectorAll(".gear-library-image-filter-option").forEach((button) => {
    const isActive = button.dataset.imageFilter === ampBrowserState.imageFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function findAmpEntry(ampId) {
  return ampCatalogEntries.find((entry) => entry.id === ampId) || null;
}

function renderGearCategoryNav() {
  if (!gearCategoryNav) return;

  gearCategoryNav.innerHTML = gearLibraryCategories
    .map((category) => {
      const isActive = category.id === activeGearCategory;
      const isDisabled = !category.enabled;

      return `
        <button
          type="button"
          class="gear-category-button${isActive ? " is-active" : ""}"
          data-category="${escapeHtml(category.id)}"
          aria-current="${isActive ? "page" : "false"}"
          ${isDisabled ? "disabled" : ""}
          title="${isDisabled ? "Coming soon..." : ""}"
        >
          ${escapeHtml(category.label)}
        </button>
      `;
    })
    .join("");
}

function renderManufacturerLibraryStats(filteredCount) {
  if (!gearLibraryStatsEl || !isManufacturersCategory()) return;

  const isFiltered = manufacturerBrowserState.searchQuery.trim().length > 0;

  gearLibraryStatsEl.innerHTML = `
    <span class="gear-library-stat">
      ${filteredCount} ${filteredCount === 1 ? "manufacturer" : "manufacturers"}
    </span>
    ${
      isFiltered
        ? `
          <span class="gear-library-stat-separator" aria-hidden="true">·</span>
          <span class="gear-library-stat gear-library-stat-muted">
            ${manufacturerLibraryStatsData.manufacturerCount} in collection
          </span>
        `
        : ""
    }
  `;
}

function renderManufacturerMetaLine({ founded, country }) {
  /** @type {string[]} */
  const parts = [];

  if (founded) parts.push(founded);
  if (country) parts.push(country);

  return parts.join(" · ");
}

function renderManufacturerBrowserCard(entry) {
  const { id, name, founded, country, summary } = entry;
  const metaLine = renderManufacturerMetaLine({ founded, country });
  const isSelected = selectedManufacturerId === id;

  return `
    <article
      class="manufacturer-browser-card"
      role="button"
      tabindex="0"
      aria-label="${escapeHtml(name)}"
      data-manufacturer-id="${escapeHtml(id)}"
      data-selected="${isSelected ? "true" : "false"}"
    >
      <div class="manufacturer-browser-card-body">
        <h3 class="manufacturer-browser-card-name">${escapeHtml(name)}</h3>
        ${
          metaLine
            ? `<p class="manufacturer-browser-card-meta">${escapeHtml(metaLine)}</p>`
            : ""
        }
        ${
          summary
            ? `<p class="manufacturer-browser-card-summary">${escapeHtml(summary)}</p>`
            : ""
        }
      </div>
    </article>
  `;
}

function updateManufacturerCardSelection() {
  if (!manufacturerBrowserGrid) return;

  manufacturerBrowserGrid.querySelectorAll(".manufacturer-browser-card").forEach((card) => {
    card.dataset.selected =
      card.dataset.manufacturerId === selectedManufacturerId ? "true" : "false";
  });
}

function renderManufacturerBrowser() {
  if (!manufacturerBrowserGrid) return;

  manufacturerCatalogEntries = getManufacturerBrowseEntries({
    query: manufacturerBrowserState.searchQuery
  });

  renderManufacturerLibraryStats(manufacturerCatalogEntries.length);

  const isEmpty = manufacturerCatalogEntries.length === 0;
  manufacturerBrowserGrid.hidden = isEmpty;
  updateGearLibraryEmptyState(isEmpty, "No manufacturers match your search.");

  manufacturerBrowserGrid.innerHTML = manufacturerCatalogEntries
    .map((entry) => renderManufacturerBrowserCard(entry))
    .join("");

  updateManufacturerCardSelection();
}

function handleManufacturerBrowserClick(event) {
  const card = event.target.closest(".manufacturer-browser-card");
  if (!card || !manufacturerBrowserGrid?.contains(card)) return;

  openManufacturerDetail(card.dataset.manufacturerId);
}

function handleManufacturerBrowserKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".manufacturer-browser-card");
  if (!card || !manufacturerBrowserGrid?.contains(card)) return;

  event.preventDefault();
  openManufacturerDetail(card.dataset.manufacturerId);
}

function handleGearLibrarySearchInput() {
  const query = gearLibrarySearch?.value || "";

  if (isManufacturersCategory()) {
    manufacturerBrowserState.searchQuery = query;
    closeAllGearOverlays();
    renderManufacturerBrowser();
    return;
  }

  ampBrowserState.searchQuery = query;
  closeAllGearOverlays();
  renderAmpBrowser();
}

function handleGearCategoryNavClick(event) {
  const button = event.target.closest(".gear-category-button");
  if (!button || !gearCategoryNav?.contains(button)) return;

  setGearCategory(button.dataset.category);
}

function renderLibraryStats(filteredCount) {
  if (!gearLibraryStatsEl || !isAmpsCategory()) return;

  const isFiltered = isAmpBrowserFiltered();

  gearLibraryStatsEl.innerHTML = `
    <span class="gear-library-stat">
      ${filteredCount} ${filteredCount === 1 ? "amp" : "amps"}
    </span>
    ${
      isFiltered
        ? `
          <span class="gear-library-stat-separator" aria-hidden="true">·</span>
          <span class="gear-library-stat gear-library-stat-muted">
            ${ampLibraryStatsData.ampCount} in collection
          </span>
        `
        : `
          <span class="gear-library-stat-separator" aria-hidden="true">·</span>
          <span class="gear-library-stat gear-library-stat-muted">
            ${ampLibraryStatsData.manufacturerCount} manufacturers
          </span>
        `
    }
  `;
}

function renderViewOptions() {
  if (!gearAmpViewSelect) return;

  gearAmpViewSelect.innerHTML = AMP_BROWSER_VIEWS.map(
    ({ value, label }) =>
      `<option value="${escapeHtml(value)}"${
        ampBrowserState.view === value ? " selected" : ""
      }>${escapeHtml(label)}</option>`
  ).join("");
}

/**
 * @param {import("./library/ampLibrary.js").AmpBrowseEntry} entry
 * @param {{ showManufacturer?: boolean }} [options]
 */
function renderAmpBrowserCard(entry, options = {}) {
  const { showManufacturer = false } = options;
  const { model, manufacturer, id: ampId, imageSrc, theme } = entry;
  const isSelected = selectedAmpId === ampId;
  const themeStyle = serializeAmpThemeStyle(theme);
  const ariaLabel = showManufacturer ? `${manufacturer} ${model}` : model;

  return `
    <article
      class="amp-browser-card${showManufacturer ? " amp-browser-card--with-manufacturer" : ""}"
      role="button"
      tabindex="0"
      aria-label="${escapeHtml(ariaLabel)}"
      data-amp-id="${escapeHtml(ampId)}"
      data-selected="${isSelected ? "true" : "false"}"
      style="${escapeHtml(themeStyle)}"
    >
      <div class="amp-browser-card-media">
        <img
          class="amp-browser-card-image"
          src="${escapeHtml(imageSrc)}"
          alt=""
          loading="lazy"
        />
      </div>
      <div class="amp-browser-card-meta">
        ${
          showManufacturer
            ? `<span class="amp-browser-card-manufacturer">${escapeHtml(manufacturer)}</span>`
            : ""
        }
        <strong class="amp-browser-card-model">${escapeHtml(model)}</strong>
      </div>
    </article>
  `;
}

function manufacturerGroupId(manufacturerId) {
  return manufacturerId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderAmpBrowserGroup(
  { manufacturerId, manufacturer, entries },
  sectionIndex = 0
) {
  const groupId = `amp-group-${manufacturerGroupId(manufacturerId)}-${sectionIndex}`;

  return `
    <section class="amp-browser-group" aria-labelledby="${groupId}">
      <button
        type="button"
        class="gear-manufacturer-link amp-browser-group-title"
        id="${groupId}"
        data-manufacturer-id="${escapeHtml(manufacturerId)}"
      >
        ${escapeHtml(manufacturer)}
      </button>
      <div class="amp-browser-group-grid" role="group" aria-label="${escapeHtml(manufacturer)} amps">
        ${entries.map((entry) => renderAmpBrowserCard(entry)).join("")}
      </div>
    </section>
  `;
}

function renderAmpModelView(entries) {
  return `
    <div class="amp-browser-flat-grid" role="list" aria-label="Amps by model">
      ${entries
        .map((entry) => renderAmpBrowserCard(entry, { showManufacturer: true }))
        .join("")}
    </div>
  `;
}

/**
 * @param {import("./library/ampLibrary.js").AmpTimelineSection} section
 */
function renderAmpTimelineYearSection(section) {
  return `
    <section
      class="amp-browser-year-section"
      id="${escapeHtml(section.sectionId)}"
      data-timeline-year="${section.year === null ? "unknown" : section.year}"
      aria-labelledby="${escapeHtml(section.sectionId)}-title"
    >
      <h3 id="${escapeHtml(section.sectionId)}-title" class="amp-browser-year-title">
        ${escapeHtml(section.label)}
      </h3>
      <div class="amp-browser-group-grid" role="group" aria-label="${escapeHtml(section.label)} amps">
        ${section.entries
          .map((entry) => renderAmpBrowserCard(entry, { showManufacturer: true }))
          .join("")}
      </div>
    </section>
  `;
}

function renderAmpTimelineView(entries) {
  const sections = buildAmpTimelineSections(entries);
  return sections.map((section) => renderAmpTimelineYearSection(section)).join("");
}

function syncAmpBrowserPresentation() {
  const view = ampBrowserState.view;

  if (gearAmpBrowserStage) {
    gearAmpBrowserStage.dataset.ampView = view;
  }

  if (ampBrowserGrid) {
    ampBrowserGrid.dataset.ampPresentation = view;
  }

  if (gearAmpTimelineRail) {
    gearAmpTimelineRail.hidden = view !== AMP_BROWSER_VIEW.TIMELINE;
  }
}

function disconnectTimelineYearObserver() {
  if (timelineYearObserver) {
    timelineYearObserver.disconnect();
    timelineYearObserver = null;
  }
}

function setActiveTimelineYear(yearKey) {
  if (!gearAmpTimelineTrack) return;

  gearAmpTimelineTrack.querySelectorAll(".gear-amp-timeline-year").forEach((button) => {
    const isActive = button.dataset.timelineYear === String(yearKey);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function scrollToTimelineYear(yearKey, { smooth = true } = {}) {
  if (!gearLibraryScroll) return;

  const section = ampBrowserGrid?.querySelector(
    `[data-timeline-year="${CSS.escape(String(yearKey))}"]`
  );
  if (!section) return;

  const scrollTop =
    section.getBoundingClientRect().top -
    gearLibraryScroll.getBoundingClientRect().top +
    gearLibraryScroll.scrollTop -
    24;

  gearLibraryScroll.scrollTo({
    top: Math.max(0, scrollTop),
    behavior: smooth ? "smooth" : "auto"
  });
  setActiveTimelineYear(yearKey);
}

function renderTimelineRail(entries) {
  if (!gearAmpTimelineTrack) return;

  const sections = buildAmpTimelineSections(entries);
  const known = sections.filter((section) => section.year !== null);
  const minYear = known[0]?.year ?? null;
  const maxYear = known[known.length - 1]?.year ?? null;
  const span = minYear !== null && maxYear !== null ? Math.max(1, maxYear - minYear) : 1;

  gearAmpTimelineTrack.innerHTML = sections
    .map((section) => {
      const yearKey = section.year === null ? "unknown" : section.year;
      const top =
        section.year === null || minYear === null
          ? 100
          : ((section.year - minYear) / span) * 100;
      const showLabel =
        section.year === null ||
        section.year === minYear ||
        section.year === maxYear ||
        (typeof section.year === "number" && section.year % 10 === 0);

      return `
        <button
          type="button"
          class="gear-amp-timeline-year${showLabel ? " has-label" : ""}"
          data-timeline-year="${escapeHtml(String(yearKey))}"
          style="top: ${Math.min(100, Math.max(0, top))}%"
          aria-label="Go to ${escapeHtml(section.label)}"
          title="${escapeHtml(section.label)}"
        >
          <span class="gear-amp-timeline-year-marker" aria-hidden="true"></span>
          <span class="gear-amp-timeline-year-label">${escapeHtml(section.label)}</span>
        </button>
      `;
    })
    .join("");

  if (sections[0]) {
    setActiveTimelineYear(sections[0].year === null ? "unknown" : sections[0].year);
  }
}

function observeTimelineYears() {
  disconnectTimelineYearObserver();
  if (!gearLibraryScroll || !ampBrowserGrid) return;

  const sections = [
    ...ampBrowserGrid.querySelectorAll(".amp-browser-year-section[data-timeline-year]")
  ];
  if (!sections.length) return;

  timelineYearObserver = new IntersectionObserver(
    (observations) => {
      const visible = observations
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

      const active = visible[0]?.target;
      if (!active) return;

      setActiveTimelineYear(active.dataset.timelineYear || "unknown");
    },
    {
      root: gearLibraryScroll,
      threshold: [0.2, 0.45],
      rootMargin: "-18% 0px -55% 0px"
    }
  );

  sections.forEach((section) => timelineYearObserver?.observe(section));
}

function nearestTimelineYearKey(clientY) {
  if (!gearAmpTimelineTrack) return null;

  const buttons = [
    ...gearAmpTimelineTrack.querySelectorAll(".gear-amp-timeline-year")
  ];
  if (!buttons.length) return null;

  let nearest = buttons[0];
  let nearestDistance = Infinity;

  for (const button of buttons) {
    const rect = button.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const distance = Math.abs(clientY - midpoint);
    if (distance < nearestDistance) {
      nearest = button;
      nearestDistance = distance;
    }
  }

  return nearest.dataset.timelineYear || "unknown";
}

function bindTimelineRail() {
  if (!gearAmpTimelineTrack || timelineRailBound) return;

  timelineRailBound = true;
  let isDragging = false;

  gearAmpTimelineTrack.addEventListener("click", (event) => {
    const yearButton = event.target.closest(".gear-amp-timeline-year");
    if (!yearButton || !gearAmpTimelineTrack.contains(yearButton)) return;
    scrollToTimelineYear(yearButton.dataset.timelineYear || "unknown");
  });

  gearAmpTimelineTrack.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    gearAmpTimelineTrack.setPointerCapture(event.pointerId);
    const yearKey = nearestTimelineYearKey(event.clientY);
    if (yearKey) scrollToTimelineYear(yearKey, { smooth: false });
  });

  gearAmpTimelineTrack.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const yearKey = nearestTimelineYearKey(event.clientY);
    if (yearKey) scrollToTimelineYear(yearKey, { smooth: false });
  });

  const endDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    if (gearAmpTimelineTrack.hasPointerCapture(event.pointerId)) {
      gearAmpTimelineTrack.releasePointerCapture(event.pointerId);
    }
  };

  gearAmpTimelineTrack.addEventListener("pointerup", endDrag);
  gearAmpTimelineTrack.addEventListener("pointercancel", endDrag);
}

function applyAmpDetailHeroTheme(hero, theme) {
  applyAmpThemeToElement(hero, theme, { detail: true });
  hero.dataset.themeVisible = "false";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      hero.dataset.themeVisible = "true";
    });
  });
}

function renderAmpDetailPanel(ampId) {
  if (!gearAmpDetailOverlay) return;

  const detail = getAmpDetailView(ampId);
  if (!detail) return;

  if (gearAmpDetailImage) {
    const hero = gearAmpDetailImage.closest(".gear-amp-detail-hero");

    gearAmpDetailImage.src = detail.imageSrc;
    gearAmpDetailImage.alt = `${detail.manufacturer} ${detail.model}`;
    gearAmpDetailImage.hidden = false;
    if (hero) {
      hero.dataset.hasImage = "true";
      applyAmpDetailHeroTheme(hero, detail.theme);
    }
  }

  if (gearAmpDetailManufacturer) {
    gearAmpDetailManufacturer.textContent = detail.manufacturer;
    gearAmpDetailManufacturer.dataset.manufacturerId = detail.manufacturerId;
  }

  if (gearAmpDetailModel) {
    gearAmpDetailModel.textContent = detail.model;
  }

  if (gearAmpDetailSpecs) {
    const hasSpecs = detail.specs.length > 0;
    gearAmpDetailSpecs.hidden = !hasSpecs;
    gearAmpDetailSpecs.innerHTML = hasSpecs
      ? detail.specs
          .map(
            (spec) =>
              `<span class="gear-amp-detail-spec">${escapeHtml(spec)}</span>`
          )
          .join("")
      : "";
  }

  if (gearAmpDetailDescription) {
    gearAmpDetailDescription.textContent = detail.description;
  }

  if (gearAmpDetailHistory) {
    gearAmpDetailHistory.textContent = detail.history;
  }

  if (gearAmpDetailValveSection && gearAmpDetailValveList) {
    const valveConfiguration = detail.valveConfiguration;
    const hasValveConfiguration = Boolean(valveConfiguration?.length);

    gearAmpDetailValveSection.hidden = !hasValveConfiguration;
    gearAmpDetailValveList.innerHTML = hasValveConfiguration
      ? valveConfiguration
          .map(
            ({ label, value }) => `
              <div class="gear-amp-detail-valve-row">
                <p class="gear-amp-detail-valve-label">${escapeHtml(label)}</p>
                <p class="gear-amp-detail-valve-value">${escapeHtml(value)}</p>
              </div>
            `
          )
          .join("")
      : "";
  }

  if (gearAmpDetailPlayedBySection && gearAmpDetailPlayedByList) {
    const hasPlayedBy = detail.playedBy.length > 0;

    gearAmpDetailPlayedBySection.hidden = !hasPlayedBy;
    gearAmpDetailPlayedByList.innerHTML = hasPlayedBy
      ? detail.playedBy
          .map((name) => `<li>${escapeHtml(name)}</li>`)
          .join("")
      : "";
  }
}

function renderManufacturerDetailPanel(manufacturerId) {
  if (!gearManufacturerDetailOverlay) return;

  const detail = getManufacturerDetailView(manufacturerId);
  if (!detail) return;

  if (gearManufacturerDetailTitle) {
    gearManufacturerDetailTitle.textContent = detail.name;
  }

  if (gearManufacturerDetailMeta) {
    if (detail.metaLine) {
      gearManufacturerDetailMeta.textContent = detail.metaLine;
      gearManufacturerDetailMeta.hidden = false;
    } else {
      gearManufacturerDetailMeta.textContent = "";
      gearManufacturerDetailMeta.hidden = true;
    }
  }

  if (gearManufacturerDetailDescription) {
    if (detail.description) {
      gearManufacturerDetailDescription.textContent = detail.description;
      gearManufacturerDetailDescription.hidden = false;
    } else {
      gearManufacturerDetailDescription.textContent = "";
      gearManufacturerDetailDescription.hidden = true;
    }
  }

  if (gearManufacturerDetailHistory) {
    if (detail.history) {
      gearManufacturerDetailHistory.textContent = detail.history;
      gearManufacturerDetailHistory.hidden = false;
    } else {
      gearManufacturerDetailHistory.textContent = "";
      gearManufacturerDetailHistory.hidden = true;
    }
  }

  if (gearManufacturerDetailWebsite) {
    if (detail.websiteUrl) {
      gearManufacturerDetailWebsite.href = detail.websiteUrl;
      gearManufacturerDetailWebsite.hidden = false;
    } else {
      gearManufacturerDetailWebsite.removeAttribute("href");
      gearManufacturerDetailWebsite.hidden = true;
    }
  }
}

function setAmpDetailOpen(isOpen) {
  if (gearAmpDetailOverlay) {
    gearAmpDetailOverlay.dataset.open = isOpen ? "true" : "false";
    gearAmpDetailOverlay.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  updateGearOverlayLock();

  if (isOpen && gearAmpDetailClose) {
    gearAmpDetailClose.focus();
  }
}

function setManufacturerDetailOpen(isOpen) {
  if (gearManufacturerDetailOverlay) {
    gearManufacturerDetailOverlay.dataset.open = isOpen ? "true" : "false";
    gearManufacturerDetailOverlay.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  updateGearOverlayLock();

  if (isOpen && gearManufacturerDetailClose) {
    gearManufacturerDetailClose.focus();
  }
}

function handleGearOverlayKeydown(event) {
  if (event.key !== "Escape") return;

  if (isGearAmpImageFocusOpen()) {
    event.preventDefault();
    closeGearAmpImageFocus();
    document.querySelector("#gearAmpImageLargeFocus")?.focus();
    return;
  }

  if (isGearAmpImageLargeOpen()) {
    event.preventDefault();
    closeGearAmpImageLarge();
    return;
  }

  if (isManufacturerDetailOpen()) {
    event.preventDefault();
    closeManufacturerDetail();
    return;
  }

  if (isAmpDetailOpen()) {
    event.preventDefault();
    closeAmpDetail();
  }
}

function handleManufacturerLinkClick(event) {
  const manufacturerId = event.currentTarget?.dataset?.manufacturerId;
  if (!manufacturerId) return;

  event.preventDefault();
  openManufacturerDetail(manufacturerId);
}

function openManufacturerDetail(manufacturerId) {
  if (!getManufacturerDetailView(manufacturerId)) return;

  closeAmpDetail();
  selectedManufacturerId = manufacturerId;
  renderManufacturerDetailPanel(manufacturerId);
  setManufacturerDetailOpen(true);
  updateManufacturerCardSelection();
}

function closeManufacturerDetail() {
  selectedManufacturerId = null;
  setManufacturerDetailOpen(false);
  updateManufacturerCardSelection();
}

function updateAmpCardSelection() {
  if (!ampBrowserGrid) return;

  ampBrowserGrid.querySelectorAll(".amp-browser-card").forEach((card) => {
    card.dataset.selected = card.dataset.ampId === selectedAmpId ? "true" : "false";
  });
}

function openAmpDetail(ampId) {
  if (!ampId || !getAmpDetailView(ampId)) return;

  closeManufacturerDetail();
  selectedAmpId = ampId;
  renderAmpDetailPanel(ampId);
  setAmpDetailOpen(true);
  updateAmpCardSelection();
}

function renderDiscoverEntry(article, view) {
  const categoryEl = article.querySelector(".gear-discover-category");
  const titleEl = article.querySelector(".gear-discover-title");
  const textEl = article.querySelector(".gear-discover-text");
  const ampLinkEl = article.querySelector(".gear-discover-amp-link");

  if (!view) {
    article.hidden = true;
    article.dataset.discoverId = "";
    if (ampLinkEl) {
      ampLinkEl.hidden = true;
      ampLinkEl.dataset.ampId = "";
      ampLinkEl.textContent = "";
    }
    return;
  }

  article.hidden = false;
  article.dataset.discoverId = view.id;

  if (categoryEl) categoryEl.textContent = view.categoryLabel;
  if (titleEl) titleEl.textContent = view.title;
  if (textEl) textEl.textContent = view.text;

  if (ampLinkEl) {
    if (view.ampLink) {
      ampLinkEl.hidden = false;
      ampLinkEl.dataset.ampId = view.ampLink.ampId;
      ampLinkEl.textContent = view.ampLink.label;
    } else {
      ampLinkEl.hidden = true;
      ampLinkEl.dataset.ampId = "";
      ampLinkEl.textContent = "";
    }
  }
}

function clearDiscoverFadeTimers() {
  for (const timerId of discoverFadeTimers.values()) {
    clearTimeout(timerId);
  }
  discoverFadeTimers.clear();

  if (!gearDiscoverBoard) return;
  gearDiscoverBoard
    .querySelectorAll(".gear-discover-entry.is-fading-out")
    .forEach((el) => el.classList.remove("is-fading-out"));
}

/**
 * Crossfades a single Discover slot. Content swaps at mid-fade only.
 * @param {string} categoryId
 * @param {import("./library/discoverLibrary.js").DiscoverEntryView | null} view
 */
function fadeDiscoverSlot(categoryId, view) {
  if (!gearDiscoverBoard) return;

  const article = gearDiscoverBoard.querySelector(
    `[data-discover-category="${categoryId}"]`
  );
  if (!article) return;

  const previousTimer = discoverFadeTimers.get(categoryId);
  if (previousTimer !== undefined) {
    clearTimeout(previousTimer);
    discoverFadeTimers.delete(categoryId);
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    article.classList.remove("is-fading-out");
    renderDiscoverEntry(article, view);
    return;
  }

  article.classList.add("is-fading-out");

  const timerId = setTimeout(() => {
    renderDiscoverEntry(article, view);
    // Next frame so the browser paints opacity:0 content before fading in.
    requestAnimationFrame(() => {
      article.classList.remove("is-fading-out");
      discoverFadeTimers.delete(categoryId);
    });
  }, DISCOVER_ROTATION_FADE_MS);

  discoverFadeTimers.set(categoryId, timerId);
}

function renderDiscoverBoard(state = discoverBoardState) {
  if (!gearDiscoverBoard || !state) return;

  discoverBoardState = state;
  clearDiscoverFadeTimers();

  for (const { id } of DISCOVER_BOARD_CATEGORIES) {
    const article = gearDiscoverBoard.querySelector(
      `[data-discover-category="${id}"]`
    );
    if (!article) continue;
    renderDiscoverEntry(article, state[id]?.view ?? null);
  }
}

function stopDiscoverRotation() {
  discoverRotationController?.stop();
  clearDiscoverFadeTimers();
}

function startDiscoverRotation() {
  if (!discoverRotationController || !gearDiscoverBoard) return;

  discoverBoardState = discoverRotationController.start();
  renderDiscoverBoard(discoverBoardState);
}

function initializeDiscoverColumn() {
  if (!gearDiscoverBoard) return;

  discoverRotationController = createDiscoverRotationController({
    onSlotRotate: ({ categoryId, view, state }) => {
      discoverBoardState = state;
      fadeDiscoverSlot(categoryId, view);
    }
  });

  startDiscoverRotation();

  gearDiscoverBoard.addEventListener("click", (event) => {
    const ampLink = event.target.closest(".gear-discover-amp-link");
    if (!ampLink || !gearDiscoverBoard.contains(ampLink)) return;

    const ampId = ampLink.dataset.ampId;
    if (ampId) openAmpDetail(ampId);
  });
}

function closeAmpDetail() {
  closeGearAmpImageViews();
  selectedAmpId = null;
  setAmpDetailOpen(false);
  updateAmpCardSelection();
}

function renderAmpBrowser() {
  if (!ampBrowserGrid) return;

  ampCatalogEntries = loadAmpBrowseEntries();
  const view = isAmpBrowserView(ampBrowserState.view)
    ? ampBrowserState.view
    : AMP_BROWSER_VIEW_DEFAULT;
  ampBrowserState.view = view;

  if (selectedAmpId && !findAmpEntry(selectedAmpId)) {
    closeAmpDetail();
  }

  renderLibraryStats(ampCatalogEntries.length);
  syncAmpBrowserPresentation();

  const isEmpty = ampCatalogEntries.length === 0;
  ampBrowserGrid.hidden = isEmpty;
  updateGearLibraryEmptyState(isEmpty, "No amps match your filters.");

  disconnectTimelineYearObserver();

  if (isEmpty) {
    ampBrowserGrid.innerHTML = "";
    if (gearAmpTimelineTrack) gearAmpTimelineTrack.innerHTML = "";
    return;
  }

  if (view === AMP_BROWSER_VIEW.MODEL) {
    ampBrowserGrid.innerHTML = renderAmpModelView(ampCatalogEntries);
    return;
  }

  if (view === AMP_BROWSER_VIEW.TIMELINE) {
    ampBrowserGrid.innerHTML = renderAmpTimelineView(ampCatalogEntries);
    renderTimelineRail(ampCatalogEntries);
    observeTimelineYears();
    if (gearLibraryScroll) {
      gearLibraryScroll.scrollTop = 0;
    }
    return;
  }

  if (gearAmpTimelineTrack) gearAmpTimelineTrack.innerHTML = "";
  ampBrowserGrid.innerHTML = buildAmpManufacturerViewSections(ampCatalogEntries)
    .map((section, sectionIndex) => renderAmpBrowserGroup(section, sectionIndex))
    .join("");
}

function handleAmpBrowserClick(event) {
  const manufacturerLink = event.target.closest(".gear-manufacturer-link");
  if (
    manufacturerLink?.dataset?.manufacturerId &&
    ampBrowserGrid?.contains(manufacturerLink)
  ) {
    openManufacturerDetail(manufacturerLink.dataset.manufacturerId);
    return;
  }

  const card = event.target.closest(".amp-browser-card");
  if (!card || !ampBrowserGrid?.contains(card)) return;

  openAmpDetail(card.dataset.ampId);
}

function handleAmpBrowserKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".amp-browser-card");
  if (!card || !ampBrowserGrid?.contains(card)) return;

  event.preventDefault();
  openAmpDetail(card.dataset.ampId);
}

function handleAmpViewChange() {
  const nextView = gearAmpViewSelect?.value || AMP_BROWSER_VIEW_DEFAULT;
  ampBrowserState.view = isAmpBrowserView(nextView)
    ? nextView
    : AMP_BROWSER_VIEW_DEFAULT;

  if (gearAmpViewSelect && gearAmpViewSelect.value !== ampBrowserState.view) {
    gearAmpViewSelect.value = ampBrowserState.view;
  }

  closeAllGearOverlays();
  renderAmpBrowser();
}

function handleAmpImageFilterClick(event) {
  const button = event.target.closest(".gear-library-image-filter-option");
  if (!button || !gearAmpImageFilter?.contains(button)) return;

  const nextFilter = button.dataset.imageFilter;
  if (!nextFilter || nextFilter === ampBrowserState.imageFilter) return;

  ampBrowserState.imageFilter = nextFilter;
  syncAmpImageFilterUi();
  closeAllGearOverlays();
  renderAmpBrowser();
}

function setupGearLibraryControls() {
  renderViewOptions();
  syncAmpImageFilterUi();
  bindTimelineRail();

  if (gearCategoryNav) {
    gearCategoryNav.addEventListener("click", handleGearCategoryNavClick);
  }

  if (gearLibrarySearch) {
    gearLibrarySearch.addEventListener("input", handleGearLibrarySearchInput);
  }

  if (manufacturerBrowserGrid) {
    manufacturerBrowserGrid.addEventListener("click", handleManufacturerBrowserClick);
    manufacturerBrowserGrid.addEventListener("keydown", handleManufacturerBrowserKeydown);
  }

  if (gearAmpViewSelect) {
    gearAmpViewSelect.addEventListener("change", handleAmpViewChange);
  }

  if (gearAmpImageFilter) {
    gearAmpImageFilter.addEventListener("click", handleAmpImageFilterClick);
  }

  if (ampBrowserGrid) {
    ampBrowserGrid.addEventListener("click", handleAmpBrowserClick);
    ampBrowserGrid.addEventListener("keydown", handleAmpBrowserKeydown);
  }

  if (gearAmpDetailClose) {
    gearAmpDetailClose.addEventListener("click", closeAmpDetail);
  }

  if (gearAmpDetailBackdrop) {
    gearAmpDetailBackdrop.addEventListener("click", closeAmpDetail);
  }

  if (gearAmpDetailManufacturer) {
    gearAmpDetailManufacturer.addEventListener("click", handleManufacturerLinkClick);
  }

  if (gearManufacturerDetailClose) {
    gearManufacturerDetailClose.addEventListener("click", closeManufacturerDetail);
  }

  if (gearManufacturerDetailBackdrop) {
    gearManufacturerDetailBackdrop.addEventListener("click", closeManufacturerDetail);
  }

  initializeGearAmpImageFocus({
    sourceImage: gearAmpDetailImage,
    expandButton: document.querySelector("#gearAmpDetailExpandImage")
  });

  document.addEventListener("keydown", handleGearOverlayKeydown);
}

function bindGearLibraryDom() {
  appRoot = document.querySelector("#appRoot");
  liveViewRoot = document.querySelector("#liveView");
  gearLibraryViewRoot = document.querySelector("#gearLibraryView");
  gearLibraryTitle = document.querySelector("#gearLibraryTitle");
  gearCategoryShell = document.querySelector("#gearCategoryShell");
  gearLibraryScroll = document.querySelector("#gearLibraryScroll");
  gearLibrarySearch = document.querySelector("#gearLibrarySearch");
  gearLibraryViewWrap = document.querySelector("#gearLibraryViewWrap");
  gearAmpViewSelect = document.querySelector("#gearAmpViewSelect");
  gearAmpBrowserStage = document.querySelector("#gearAmpBrowserStage");
  gearAmpTimelineRail = document.querySelector("#gearAmpTimelineRail");
  gearAmpTimelineTrack = document.querySelector("#gearAmpTimelineTrack");
  gearAmpImageFilterWrap = document.querySelector("#gearAmpImageFilterWrap");
  gearAmpImageFilter = document.querySelector("#gearAmpImageFilter");
  manufacturerBrowserGrid = document.querySelector("#manufacturerBrowserGrid");
  ampBrowserGrid = document.querySelector("#ampBrowserGrid");
  gearLibraryStatsEl = document.querySelector("#gearLibraryStats");
  gearLibraryEmptyState = document.querySelector("#gearLibraryEmptyState");
  gearCategoryNav = document.querySelector("#gearCategoryNav");
  gearAmpDetailOverlay = document.querySelector("#gearAmpDetailOverlay");
  gearAmpDetailBackdrop = document.querySelector("#gearAmpDetailBackdrop");
  gearAmpDetailClose = document.querySelector("#gearAmpDetailClose");
  gearAmpDetailImage = document.querySelector("#gearAmpDetailImage");
  gearAmpDetailManufacturer = document.querySelector("#gearAmpDetailManufacturer");
  gearAmpDetailModel = document.querySelector("#gearAmpDetailModel");
  gearAmpDetailSpecs = document.querySelector("#gearAmpDetailSpecs");
  gearAmpDetailDescription = document.querySelector("#gearAmpDetailDescription");
  gearAmpDetailHistory = document.querySelector("#gearAmpDetailHistory");
  gearAmpDetailValveSection = document.querySelector("#gearAmpDetailValveSection");
  gearAmpDetailValveList = document.querySelector("#gearAmpDetailValveList");
  gearAmpDetailPlayedBySection = document.querySelector("#gearAmpDetailPlayedBySection");
  gearAmpDetailPlayedByList = document.querySelector("#gearAmpDetailPlayedByList");
  gearManufacturerDetailOverlay = document.querySelector("#gearManufacturerDetailOverlay");
  gearManufacturerDetailBackdrop = document.querySelector("#gearManufacturerDetailBackdrop");
  gearManufacturerDetailClose = document.querySelector("#gearManufacturerDetailClose");
  gearManufacturerDetailTitle = document.querySelector("#gearManufacturerDetailTitle");
  gearManufacturerDetailMeta = document.querySelector("#gearManufacturerDetailMeta");
  gearManufacturerDetailDescription = document.querySelector(
    "#gearManufacturerDetailDescription"
  );
  gearManufacturerDetailHistory = document.querySelector("#gearManufacturerDetailHistory");
  gearManufacturerDetailWebsite = document.querySelector("#gearManufacturerDetailWebsite");
  gearDiscoverBoard = document.querySelector("#gearDiscoverBoard");
  primaryNavButtons = [...document.querySelectorAll(".primary-nav-button")];
}

function refreshGearLibraryCache() {
  ampLibraryStatsData = getAmpLibraryStats();
  manufacturerLibraryStatsData = getManufacturerLibraryStats();
}

function setupNavigation() {
  primaryNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAppView(button.dataset.view);
    });
  });
}

export function initializeGearLibrary() {
  bindGearLibraryDom();
  refreshGearLibraryCache();
  initializeGearDesignPreview({
    rootElement: document.querySelector("#gearDesignPreview")
  });

  document.body.dataset.appView = APP_VIEW.LIVE;
  setViewRootVisibility(APP_VIEW.LIVE);
  closeAllGearOverlays();

  renderGearCategoryNav();
  updateGearCategoryPanels();
  setupGearLibraryControls();
  renderActiveGearCategory();
  initializeDiscoverColumn();
  setupNavigation();
}
