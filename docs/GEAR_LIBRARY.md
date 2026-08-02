# Gear Library Architecture

The Gear Library is the **single source of truth** for all equipment data in Live Companion.

Application code (UI, Live Companion, resolvers) must **never import from `src/data/` directly**.  
Use the public API in `src/library/index.js`.

---

## Directory roles

### `src/data/`

Version-controlled, file-based datasets. One folder per category:

```
data/
  amps/           Manufacturer files + index.js
  cabinets/
  effects/
  speakers/
  microphones/
  pedals/
  ampSchema.js    Canonical AmpRecord shape + createAmpRecord()
```

- **Purpose:** Store raw records only.
- **No business logic.** No UI helpers. No alias matching.
- Each manufacturer file exports one array, e.g. `marshallAmps`.
- `index.js` merges all manufacturer arrays into `allAmpRecords`.

### `src/library/`

Public API layer. The only entry point for the rest of the app.

```
library/
  index.js              Public exports — import from here
  ampLibrary.js         Amp category API
  cabinetLibrary.js     Cabinet category API (stub)
  effectLibrary.js      Effect category API (stub)
  createGearLibrary.js  Shared factory for all categories
  fieldValues.js        Central missing-value formatting
```

- **Purpose:** Normalize data, index records, expose query functions.
- Handles placeholders (`Coming soon...`), image URLs, search, sorting views.
- UI receives **view models** (`AmpBrowseEntry`, `AmpDetailView`) — not raw files.

### `src/resolver/`

Internal helpers used **by the library**, not by UI code.

```
resolver/
  aliasResolver.js   Text → Amp ID (longest alias match)
  imageResolver.js   Deprecated shim — use library API instead
```

- **Purpose:** Low-level resolution without duplicating library data.
- Alias resolver returns **only an ID** — never descriptions or images.

---

## Amp public API

Import from `src/library/index.js`:

| Function | Description |
|----------|-------------|
| `getAllAmps()` | All normalized amp records |
| `getAmpById(id)` | Single record or `null` |
| `getManufacturers()` | Sorted manufacturer names |
| `getAmpsByManufacturer(name)` | Amps for one manufacturer |
| `searchAmps(query)` | Filter by search text |
| `getAmpAliases(id)` | Alias list for an amp |
| `getAmpImage(id)` | Public image URL or `null` |
| `hasAmpImage(id)` | Whether an image exists |
| `getAmpImageForText(text)` | Resolve rig text → image URL |
| `getAmpImageFilenameForText(text)` | Resolve rig text → filename (Live Companion) |
| `getAmpBrowseEntries(options)` | UI-ready catalog entries |
| `getAmpDetailView(id)` | UI-ready detail panel data |
| `getAmpLibraryStats()` | Counts for stats bar |

Missing field values are formatted centrally via `fieldValues.js`.  
The UI should use `displayValue` from `getAmpDetailView()` — never check `if (description)` on raw records.

---

## AmpRecord shape

Every amp uses the same structure. All fields are always present after normalization:

```js
{
  id: "marshall-jcm800-2203",
  manufacturer: "Marshall",
  model: "JCM800 2203",
  aliases: ["jcm 800", "..."],
  image: "marshall jcm800 2203.png",  // or null
  description: null,
  history: null,
  introduced: null,
  discontinued: null,
  country: null,
  ampType: null,
  power: null,
  channels: null,
  tubes: null,
  genres: null,
  notableUsers: null,
  tags: null
}
```

Use `createAmpRecord()` from `src/data/ampSchema.js` when authoring data.

---

## Adding a new amp

1. Open (or create) the manufacturer file in `src/data/amps/`, e.g. `marshall.js`.
2. Add a record using `createAmpRecord()` shape — **image is optional**.
3. If the manufacturer file is new:
   - Create `src/data/amps/<manufacturer>.js`
   - Import and spread it in `src/data/amps/index.js`
4. Run `node scripts/normalize-amp-records.mjs` to enforce the full field structure.
5. No UI changes required.

### Example

```js
// src/data/amps/marshall.js
export const marshallAmps = [
  {
    id: "marshall-jcm800-2203",
    manufacturer: "Marshall",
    model: "JCM800 2203",
    aliases: ["jcm 800", "jcm800"],
    image: "marshall jcm800 2203.png",
    description: null,
    history: null,
    introduced: null,
    discontinued: null,
    country: null,
    ampType: null,
    power: null,
    channels: null,
    tubes: null,
    genres: null,
    notableUsers: null,
    tags: null
  }
];
```

---

## Adding a new manufacturer

One registration chain — Gear Library and Live Companion share it:

1. Create `src/data/amps/<fileKey>.js` exporting `<fileKey>Amps` (each amp needs `manufacturerId` + `aliases`).
2. Import + spread that array in `src/data/amps/index.js` (**required** — this is the only amp registry).
3. Add one manufacturer profile to `src/data/manufacturers/index.js` with the **same** `id` as `manufacturerId` on the amps.
4. If Kemper/display names differ from `manufacturerRecords.name`, add a name alias in `src/data/manufacturers/manufacturerIds.js` (`MANUFACTURER_NAME_ALIASES` only — IDs come from manufacturer records).
5. Run `node scripts/normalize-amp-records.mjs`.

On first library access, `validateGearRegistry()` logs amp count and fails loudly in the console if an amp’s `manufacturerId` is missing from manufacturer records.

Do **not** maintain a separate Live Companion amp list. Recognition uses `allAmpRecords` → `ampLibrary` → `aliasResolver`.

---

## Adding a new category (Cabinets, Effects, …)

1. Add dataset under `src/data/<category>/`.
2. Create `src/library/<category>Library.js` using `createGearLibrary()`.
3. Export public functions from `src/library/index.js`.
4. Follow the same pattern: data → library API → UI imports library only.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/normalize-amp-records.mjs` | Enforce full AmpRecord shape in all manufacturer files |
| `scripts/migrate-amp-data.mjs` | Legacy one-time migration helper |

---

## Rules for contributors

- **Do not** import `src/data/*` from UI or Live Companion code.
- **Do not** put alias logic or image paths in data files.
- **Do not** add UI-specific formatting in data or resolver layers.
- **Do** use `createAmpRecord()` and run the normalize script after data edits.
- **Do** extend the library API when new query patterns are needed.
