/**
 * Collections design mode — manufacturer collection boxes over the shared amp library.
 * Focus: the full product palette per brand, not individual amp cards.
 */

import { getManufacturerById } from "../library/index.js";

/**
 * @typedef {import("../library/ampLibrary.js").AmpBrowseSection} AmpBrowseSection
 * @typedef {import("../library/ampLibrary.js").AmpBrowseEntry} AmpBrowseEntry
 */

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
 * @param {unknown} value
 * @returns {string}
 */
function textOrEmpty(value) {
  return String(value ?? "").trim();
}

/**
 * @param {string} manufacturerId
 * @param {number} [sectionIndex]
 */
export function collectionsBoxDomId(manufacturerId, sectionIndex = 0) {
  const safe = String(manufacturerId || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `collections-box-${safe}-${sectionIndex}`;
}

/**
 * @param {string} manufacturerId
 * @param {number} ampCount
 */
function renderCollectionMeta(manufacturerId, ampCount) {
  const record = getManufacturerById(manufacturerId);
  /** @type {string[]} */
  const parts = [];

  const country = textOrEmpty(record?.country);
  const founded = textOrEmpty(record?.founded);

  if (country) parts.push(country);
  if (founded) parts.push(`Founded ${founded}`);
  parts.push(`${ampCount} ${ampCount === 1 ? "Amplifier" : "Amplifiers"}`);

  return parts.join(" • ");
}

/**
 * @param {AmpBrowseEntry} entry
 */
function renderCollectionThumb(entry) {
  const label = `${entry.manufacturer} ${entry.model}`.trim();

  return `
    <article
      class="collections-thumb"
      role="button"
      tabindex="0"
      aria-label="${escapeHtml(label)}"
      data-amp-id="${escapeHtml(entry.id)}"
      data-manufacturer-id="${escapeHtml(entry.manufacturerId)}"
      title="${escapeHtml(entry.model)}"
    >
      <div class="collections-thumb-media" data-has-image="${entry.hasImage ? "true" : "false"}">
        <img
          class="collections-thumb-image"
          src="${escapeHtml(entry.imageSrc)}"
          alt=""
          loading="lazy"
        />
      </div>
    </article>
  `;
}

/**
 * @param {AmpBrowseSection} section
 * @param {number} sectionIndex
 */
function renderCollectionBox(section, sectionIndex) {
  const boxId = collectionsBoxDomId(section.manufacturerId, sectionIndex);
  const meta = renderCollectionMeta(section.manufacturerId, section.entries.length);

  return `
    <section
      class="collections-box"
      id="${escapeHtml(boxId)}"
      data-manufacturer-id="${escapeHtml(section.manufacturerId)}"
      aria-labelledby="${escapeHtml(boxId)}-title"
    >
      <header class="collections-box-header">
        <h2 class="collections-box-title" id="${escapeHtml(boxId)}-title">
          ${escapeHtml(section.manufacturer)}
        </h2>
        <p class="collections-box-meta">${escapeHtml(meta)}</p>
      </header>
      <div
        class="collections-box-thumbs"
        role="group"
        aria-label="${escapeHtml(section.manufacturer)} collection"
      >
        ${section.entries.map((entry) => renderCollectionThumb(entry)).join("")}
      </div>
    </section>
  `;
}

/**
 * @param {AmpBrowseSection[]} sections
 * @returns {string}
 */
export function renderCollectionsCatalog(sections) {
  if (!sections.length) return "";

  return `
    <div class="collections-catalog" data-collections-root="true">
      ${sections
        .map((section, sectionIndex) => renderCollectionBox(section, sectionIndex))
        .join("")}
    </div>
  `;
}
