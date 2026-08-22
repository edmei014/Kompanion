/**
 * Global manufacturer chapter navigation for the Amp Collection.
 * Works across Standard, Collections, Magazine, and Museum presentations.
 */

/**
 * @typedef {{
 *   manufacturerId: string,
 *   manufacturer: string,
 *   ampCount: number,
 *   label: string
 * }} ChapterOption
 */

/**
 * @param {Array<{ manufacturerId?: string, manufacturer?: string }>} entries
 * @returns {ChapterOption[]}
 */
export function buildChapterOptions(entries) {
  /** @type {Map<string, { manufacturer: string, ampCount: number }>} */
  const byId = new Map();

  for (const entry of entries ?? []) {
    const id = String(entry?.manufacturerId ?? "").trim();
    const name = String(entry?.manufacturer ?? "").trim();
    if (!id || !name) continue;

    const existing = byId.get(id);
    if (existing) {
      existing.ampCount += 1;
      continue;
    }

    byId.set(id, { manufacturer: name, ampCount: 1 });
  }

  return [...byId.entries()]
    .map(([manufacturerId, { manufacturer, ampCount }]) => ({
      manufacturerId,
      manufacturer,
      ampCount,
      label: `${manufacturer} (${ampCount})`
    }))
    .sort((left, right) =>
      left.manufacturer.localeCompare(right.manufacturer, undefined, {
        sensitivity: "base"
      })
    );
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Syncs chapter options. The select always shows a manufacturer name with count,
 * e.g. "Fender (35)" — never a "Jump to Chapter" placeholder.
 *
 * @param {HTMLSelectElement | null | undefined} selectElement
 * @param {ChapterOption[]} options
 * @param {{ selectedId?: string | null }} [config]
 */
export function syncChapterSelect(selectElement, options, config = {}) {
  if (!selectElement) return;

  const preferred = String(config.selectedId ?? selectElement.value ?? "").trim();

  selectElement.innerHTML = options
    .map(
      ({ manufacturerId, label }) =>
        `<option value="${escapeHtml(manufacturerId)}">${escapeHtml(label)}</option>`
    )
    .join("");

  if (preferred && options.some((option) => option.manufacturerId === preferred)) {
    selectElement.value = preferred;
  } else if (options[0]) {
    selectElement.value = options[0].manufacturerId;
  } else {
    selectElement.value = "";
  }

  selectElement.disabled = options.length === 0;
}

/**
 * Scrolls the amp browser to the first matching manufacturer chapter/block.
 *
 * @param {{
 *   manufacturerId: string,
 *   root?: HTMLElement | null,
 *   scrollRoot?: HTMLElement | null,
 *   topPadding?: number
 * }} options
 * @returns {boolean}
 */
export function jumpToManufacturerChapter({
  manufacturerId,
  root = null,
  scrollRoot = null,
  topPadding = 16
}) {
  const id = String(manufacturerId ?? "").trim();
  if (!id || !root) return false;

  const scroller =
    scrollRoot ?? root.closest?.(".gear-library-scroll") ?? null;

  /** @type {HTMLElement | null} */
  const target =
    root.querySelector(`.museum-chapter[data-manufacturer-id="${CSS.escape(id)}"]`) ||
    root.querySelector(`.collections-box[data-manufacturer-id="${CSS.escape(id)}"]`) ||
    root.querySelector(`.amp-browser-group[data-manufacturer-id="${CSS.escape(id)}"]`) ||
    root.querySelector(`[data-manufacturer-id="${CSS.escape(id)}"]`);

  if (!target) return false;

  if (scroller) {
    const scrollerTop = scroller.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const nextTop = scroller.scrollTop + (targetTop - scrollerTop) - topPadding;
    scroller.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return true;
}

/**
 * Resolves which manufacturer chapter is currently at the reading top.
 *
 * @param {HTMLElement | null | undefined} root
 * @param {HTMLElement | null | undefined} scrollRoot
 * @param {number} [topPadding]
 * @returns {string | null}
 */
export function getActiveManufacturerChapterId(
  root,
  scrollRoot,
  topPadding = 28
) {
  if (!root || !scrollRoot) return null;

  /** @type {HTMLElement[]} */
  const chapters = [
    ...root.querySelectorAll(
      ".museum-chapter[data-manufacturer-id], .collections-box[data-manufacturer-id], .amp-browser-group[data-manufacturer-id]"
    )
  ];
  if (!chapters.length) return null;

  const scrollerRect = scrollRoot.getBoundingClientRect();
  const anchorY = scrollerRect.top + topPadding;

  /** @type {HTMLElement | null} */
  let active = null;

  for (const chapter of chapters) {
    const rect = chapter.getBoundingClientRect();
    if (rect.top <= anchorY + 8) {
      active = chapter;
      continue;
    }
    break;
  }

  if (!active) active = chapters[0];
  return active?.dataset?.manufacturerId || null;
}
