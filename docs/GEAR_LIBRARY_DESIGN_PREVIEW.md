# Gear Library — Design Preview

Experimental visual directions used during evaluation.
The production standard has now been finalized as a hybrid of:

- Magazine elegance (chapters, typography, calm pacing)
- Collections manufacturer overview (palette-first boxes)
- Heritage warmth (subtle brand atmosphere via themes)

Use **Design Preview** only for comparison against the new standard.


## How to use

1. Open **Gear Library**.
2. Use **Design Preview** in the header.
3. Switch between:
   - **Standard** — current production look
   - **Collections**
   - **Magazine**
   - **Museum**

The selection is stored in `localStorage` under `liveCompanion.gearDesignPreview`.
Internal ids remain `default`, `collections`, `editorial`, and `museum`.
Legacy value `studio` migrates to `collections`.

To hide the switch entirely, set `GEAR_DESIGN_PREVIEW.enabled = false` in
`src/gearLibraryDesignPreview.js`.

---

## Variant 1 — Magazine

### Idea
A coffee-table book / magazine about legendary amplifiers.
Chapters feel literary. The library invites slow reading and discovery.

### Strengths
- Strong storytelling atmosphere
- Clear manufacturer chapters
- Calm, premium browsing pace
- Excellent for description-heavy future content

### Trade-offs
- Lower information density
- Harder to scan many amps quickly
- Serif/magazine tone may feel less “tool-like”

---

## Variant 2 — Museum

### Idea
Each amp is an exhibit. One object at a time, with gallery silence around it.

### Strengths
- Maximum image impact
- Highest perceived material quality
- Very clear focus per amp
- Memorable, distinctive interaction

### Trade-offs
- Slowest browsing
- Weak overview of large catalogs
- Less practical for power users searching quickly

---

## Variant 3 — Collections

### Idea
Each manufacturer is a collection box. Small thumbnails show the full product
palette at a glance — catalog overview, not individual product presentation.

Header: manufacturer name, country, founded year, amp count.
Thumbs: roughly 6–8 per row.

### Strengths
- Fast overview of entire brand lineups
- Clear “collection as a whole” focus
- Distinct from Standard cards, Magazine chapters, and Museum exhibits
- Calm, dense, catalogue-like browsing

### Trade-offs
- Less drama per individual amp than Museum/Magazine
- Model names are secondary (tooltips / detail on click)
- Dense grids can feel utilitarian if spacing is too tight

---

## Recommendation for next step

Use the three previews side by side on a large monitor with a few manufacturers
(e.g. Marshall, Fender, Mesa) and judge:

1. First impression of quality
2. Desire to explore individual amps
3. Practical browsing speed
4. Fit with Kempanion as a performance tool

Then pick one direction (or a hybrid) as the final design foundation.
