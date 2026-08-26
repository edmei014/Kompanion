# Kompanion

Kompanion is a desktop application for the Kemper Profiler. It has two main parts: Kempanion (live use with the Profiler) and Gear Atlas (amp database). Both use the same amp data and are linked in the UI.

---

## Overview

Kompanion reads rig and amp information from the Kemper and, where possible, maps it to entries in the Gear Atlas. The user sees the current rig, an amp image when a match exists, and can open further details for that model. The Gear Atlas can also be used on its own to browse, search, and filter the amp collection.

The two areas:

- Kempanion — connection to the Kemper, live rig/performance display, Performance Browser
- Gear Atlas — amp collection with search, filters, several view modes, and amp detail pages

---

## Kempanion

Kempanion connects to a Kemper Profiler over MIDI and shows current state from the device.

Functions include:

- connection status and MIDI port selection
- current rig name and performance information
- amp image and labels when the active rig matches a Gear Atlas entry
- slot and performance navigation from the live view
- Performance Browser (see below)

Timeline and Presentation Mode are part of the Gear Atlas UI but belong to the same application.

---

## Performance Browser

The Performance Browser lists performances from a locally built performance library. Each performance contains multiple slots; each slot holds one rig.

The user can:

- step through performances
- select a slot and load that rig on the Kemper
- see an amp image for the slot when a Gear Atlas match exists

Clicking the amp image opens the amp detail overlay (manufacturer, model, image, description, history, and other fields from the database). The compass signet in the top right of the Kempanion view opens the Gear Atlas; the same signet remains available from the live page while working with rigs.

---

## Gear Atlas

The Gear Atlas holds the amp models used for images and detail text in Kempanion. Entries include manufacturer, model name, images, and optional descriptive data.

### Rig and amp matching

Kempanion tries to match rig names and amp labels reported by the Kemper to Gear Atlas entries. Matching depends on naming; not every rig name will resolve automatically. If a model exists in the atlas, the user can see that it is in the database and align rig naming with atlas entries to improve future matches.

From Kempanion, the typical flow is: active rig → matched amp image → amp detail overlay → Gear Atlas (via the signet). From the atlas, clicking an amp card opens the same detail view for that entry.

### Browse and filter

- amp cards in grid or grouped layouts
- text search
- manufacturer filter and manufacturer category
- sort options (e.g. by manufacturer, model, or year)

The manufacturer filter limits the collection to one maker, which reduces noise in large lists.

### Amp detail

The detail view shows one amp: image, manufacturer, model, and text sections where defined in the data (description, history, specs, and similar). The same detail component is used from Kempanion (after a match) and from the atlas (after selecting a card).

### Switching views

- Compass signet on the Kempanion live page → Gear Atlas
- Kempanion signet on the Gear Atlas page → Kempanion live page
- The same signets also appear on the no-MIDI connection screen for atlas access without a connected Kemper

The Gear Atlas works without a Kemper connection; Kempanion live features require MIDI to the Profiler.

---

## Gear Atlas display modes

All modes use the same underlying amp data. They differ in layout only.

### Standard and Collections

Standard view shows amps as cards in a catalog layout. Collections groups amps into themed boxes. Both support search, filters, and opening amp detail.

### Museum Mode

Museum Mode shows one amp at a time in a dedicated exhibition-style layout, with a secondary row for other models from the same manufacturer. Sort controls are hidden in this mode. It is not the same as Presentation Mode.

### Amp detail

Available from any mode by selecting an amp. Opens the shared detail overlay or page for that model.

---

## Timeline

Timeline is a Gear Atlas view that sorts and groups amps by production year. A year rail can be used to jump between sections. It uses the same database as the standard catalog; it does not replace the Performance Browser.

---

## Presentation Mode

Presentation Mode is a full-screen display mode in the Gear Atlas. It hides most chrome (header, toolbar, filters) and shows amp content with minimal UI. It is intended for playing, practising, or presenting where a larger, less cluttered view is useful.

Presentation Mode is separate from Museum Mode: Museum is a catalog layout option; Presentation Mode is a fullscreen presentation layer.

---

## Installation & Getting Started

### Requirements

- Windows
- Kemper Profiler (for Kempanion live features)
- MIDI connection between Kemper and computer (e.g. via a MIDI interface)

### Installation

1. Download the installer from the GitHub Releases page for this project
2. Install and launch Kompanion from the Start menu
3. Connect the Kemper, then select MIDI input and output in Kompanion

After connection, live data updates from the Profiler. Build the performance library separately to use the Performance Browser.

### Building from source

```bash
git clone https://github.com/edmei014/Kompanion.git
cd Kompanion
npm install
npm run tauri:build
```

Installer output: `src-tauri/target/release/bundle/nsis/`

---

## Project Status

Early release. Kempanion and Gear Atlas are integrated; the amp database is extended over time. Video documentation may be added later in a separate section.

---

## Author

edmei014 — [github.com/edmei014](https://github.com/edmei014)

---

## Disclaimer

Kompanion is an independent third-party project. It is not affiliated with, endorsed by, or supported by Kemper GmbH.

“Kemper” and “Kemper Profiler” are trademarks of their respective owners and are used here only to describe compatibility.
