/**
 * Museum design mode — curated single-amplifier exhibition.
 * One amp on stage at a time; model strip switches the exhibit.
 */

import {
  getAmpById,
  getAmpDetailView,
  getManufacturerById,
  parseAmpSortYear
} from "../library/index.js";

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
 * @param {import("../library/ampLibrary.js").AmpRecord | null | undefined} amp
 * @returns {string}
 */
function formatExhibitPower(amp) {
  const value = textOrEmpty(amp?.power);
  if (!value) return "";
  if (/w\b/i.test(value)) return value;
  if (/^\d+(\.\d+)?$/.test(value)) return `${value} W`;
  return value;
}

/**
 * @param {import("../library/ampLibrary.js").AmpRecord | null | undefined} amp
 * @returns {string}
 */
function formatExhibitYear(amp) {
  const year = parseAmpSortYear(amp?.introduced);
  if (year != null) return String(year);
  return textOrEmpty(amp?.introduced);
}

/**
 * @param {string} ampId
 */
export function getMuseumExhibitEntry(ampId) {
  const detail = getAmpDetailView(ampId);
  if (!detail) return null;

  const amp = getAmpById(ampId);
  const manufacturerRecord = getManufacturerById(detail.manufacturerId);
  const country =
    textOrEmpty(amp?.country) || textOrEmpty(manufacturerRecord?.country);

  return {
    id: detail.id,
    manufacturerId: detail.manufacturerId,
    manufacturer: detail.manufacturer,
    model: detail.model,
    title: `${detail.manufacturer} ${detail.model}`.trim(),
    imageSrc: detail.imageSrc,
    hasImage: detail.hasImage,
    theme: detail.theme,
    country,
    year: formatExhibitYear(amp),
    ampType: textOrEmpty(amp?.ampType),
    power: formatExhibitPower(amp),
    description: textOrEmpty(detail.description),
    history: textOrEmpty(detail.history),
    artists: detail.playedBy.filter((name) => Boolean(String(name).trim())),
    valveConfiguration: detail.valveConfiguration
  };
}

/**
 * @param {import("../library/ampLibrary.js").AmpValveConfigurationLine[] | null | undefined} valveConfiguration
 * @returns {string}
 */
function formatExhibitValveConfiguration(valveConfiguration) {
  if (!Array.isArray(valveConfiguration) || !valveConfiguration.length) return "";

  return valveConfiguration
    .map((line) => {
      const label = textOrEmpty(line?.label);
      const value = textOrEmpty(line?.value);
      if (!value) return "";
      return label ? `${label}: ${value}` : value;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {{ label: string, value: string }[]} facts
 */
function renderMuseumExhibitFacts(facts) {
  const rows = facts.filter((fact) => fact.value);
  if (!rows.length) return "";

  return `
    <dl class="museum-exhibit-facts">
      ${rows
        .map(({ label, value }) => {
          const multiline = value.includes("\n");
          return `
            <div class="museum-exhibit-fact">
              <dt>${escapeHtml(label)}</dt>
              <dd${multiline ? ' class="museum-exhibit-fact-value--lines"' : ""}>${escapeHtml(value)}</dd>
            </div>
          `;
        })
        .join("")}
    </dl>
  `;
}

/**
 * @param {ReturnType<typeof getMuseumExhibitEntry>} exhibit
 */
function renderMuseumExhibit(exhibit) {
  if (!exhibit) return "";

  const proseBlocks = [
    exhibit.description
      ? `
        <section class="museum-exhibit-section">
          <h4 class="museum-exhibit-section-title">Description</h4>
          <p class="museum-exhibit-section-text">${escapeHtml(exhibit.description)}</p>
        </section>
      `
      : "",
    exhibit.history
      ? `
        <section class="museum-exhibit-section">
          <h4 class="museum-exhibit-section-title">History</h4>
          <p class="museum-exhibit-section-text">${escapeHtml(exhibit.history)}</p>
        </section>
      `
      : "",
    exhibit.artists.length
      ? `
        <section class="museum-exhibit-section">
          <h4 class="museum-exhibit-section-title">Artists</h4>
          <ul class="museum-exhibit-artists">
            ${exhibit.artists
              .map((name) => `<li>${escapeHtml(name)}</li>`)
              .join("")}
          </ul>
        </section>
      `
      : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <article
      class="museum-exhibit"
      data-amp-id="${escapeHtml(exhibit.id)}"
      data-manufacturer-id="${escapeHtml(exhibit.manufacturerId)}"
      aria-labelledby="museum-exhibit-title"
    >
      <div class="museum-exhibit-layout">
        <div class="museum-exhibit-hero" data-has-image="${exhibit.hasImage ? "true" : "false"}">
          <img
            class="museum-exhibit-image"
            src="${escapeHtml(exhibit.imageSrc || "")}"
            alt="${escapeHtml(exhibit.title)}"
            loading="eager"
          />
        </div>

        <div class="museum-exhibit-panel">
          <header class="museum-exhibit-header">
            <p class="museum-exhibit-kicker">On display</p>
            <h3 class="museum-exhibit-title" id="museum-exhibit-title">
              ${escapeHtml(exhibit.model)}
            </h3>
          </header>

          ${renderMuseumExhibitFacts([
            { label: "Manufacturer", value: exhibit.manufacturer },
            { label: "Country", value: exhibit.country },
            { label: "Year", value: exhibit.year },
            { label: "Type", value: exhibit.ampType },
            { label: "Power", value: exhibit.power },
            {
              label: "Tube Configuration",
              value: formatExhibitValveConfiguration(exhibit.valveConfiguration)
            }
          ])}

          <div class="museum-exhibit-body">
            ${proseBlocks || `<p class="museum-exhibit-empty">Exhibit details coming soon.</p>`}
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Horizontal model strip for the active manufacturer exhibition.
 *
 * @param {AmpBrowseEntry[]} entries
 * @param {string | null | undefined} activeAmpId
 * @returns {string}
 */
export function renderMuseumModelNav(entries, activeAmpId) {
  if (!entries?.length) return "";

  return entries
    .map((entry) => {
      const isActive = entry.id === activeAmpId;
      return `
        <button
          type="button"
          class="museum-model-nav-item"
          data-amp-id="${escapeHtml(entry.id)}"
          data-manufacturer-id="${escapeHtml(entry.manufacturerId)}"
          data-active="${isActive ? "true" : "false"}"
          aria-current="${isActive ? "true" : "false"}"
          title="${escapeHtml(entry.model)}"
        >
          <span class="museum-model-nav-item-label">${escapeHtml(entry.model)}</span>
        </button>
      `;
    })
    .join("");
}

/**
 * Single curated exhibition: one amp on stage for the active manufacturer.
 *
 * @param {{
 *   manufacturer: string,
 *   manufacturerId: string,
 *   exhibit: ReturnType<typeof getMuseumExhibitEntry>
 * }} options
 * @returns {string}
 */
export function renderMuseumExhibition({ manufacturer, manufacturerId, exhibit }) {
  if (!exhibit) return "";

  return `
    <div
      class="museum-catalog"
      data-museum-root="true"
      data-manufacturer-id="${escapeHtml(manufacturerId)}"
      data-amp-id="${escapeHtml(exhibit.id)}"
    >
      <div
        class="museum-stage"
        role="region"
        aria-label="${escapeHtml(manufacturer)} ${escapeHtml(exhibit.model)}"
      >
        ${renderMuseumExhibit(exhibit)}
      </div>
    </div>
  `;
}

/**
 * @param {AmpBrowseSection[]} sections
 * @param {string | null | undefined} manufacturerId
 * @returns {AmpBrowseSection | null}
 */
export function resolveMuseumSection(sections, manufacturerId) {
  if (!sections?.length) return null;
  const id = String(manufacturerId ?? "").trim();
  if (id) {
    const match = sections.find((section) => section.manufacturerId === id);
    if (match) return match;
  }
  return sections[0] ?? null;
}

/**
 * @param {AmpBrowseSection | null | undefined} section
 * @param {string | null | undefined} ampId
 * @returns {string | null}
 */
export function resolveMuseumAmpId(section, ampId) {
  const entries = section?.entries ?? [];
  if (!entries.length) return null;

  const id = String(ampId ?? "").trim();
  if (id && entries.some((entry) => entry.id === id)) return id;
  return entries[0].id;
}
