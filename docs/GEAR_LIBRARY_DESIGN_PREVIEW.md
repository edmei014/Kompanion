# Gear Library — Design Preview

Experimental visual directions used during evaluation.
The production default has now been finalized as a hybrid of:

- Editorial elegance (chapters, typography, calm pacing)
- Studio Collection product presentation (material cards, soft light)
- Heritage warmth (subtle brand atmosphere via themes)

Use **Design Preview** only for comparison against the new default.


## How to use

1. Open **Gear Library**.
2. Use **Design Preview** in the header.
3. Switch between:
   - **Default** — current production look
   - **Editorial**
   - **Museum**
   - **Studio Collection**

The selection is stored in `localStorage` under `liveCompanion.gearDesignPreview`.

To hide the switch entirely, set `GEAR_DESIGN_PREVIEW.enabled = false` in
`src/gearLibraryDesignPreview.js`.

---

## Variant 1 — Editorial

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
- Serif/editorial tone may feel less “tool-like”

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

## Variant 3 — Studio Collection

### Idea
High-end product presentation (studio / Leica / Apple product pages).
Technical elegance, polished cards, soft light, product-first hierarchy.

### Strengths
- Balanced density and prestige
- Strong product presence without museum slowness
- Feels closest to a refined software product UI
- Good fit for card + detail workflows

### Trade-offs
- Less narrative/chapter drama than Editorial
- Less singular focus than Museum
- Can still feel “grid-like” if spacing is not carefully tuned

---

## Recommendation for next step

Use the three previews side by side on a large monitor with a few manufacturers
(e.g. Marshall, Fender, Mesa) and judge:

1. First impression of quality
2. Desire to explore individual amps
3. Practical browsing speed
4. Fit with Live Companion as a performance tool

Then pick one direction (or a hybrid) as the final design foundation.
