# France Retail Places Extractor

A web app that pulls retail chain store data across France using the **Google Places API (New)**, then lets you browse, map, clean, and export the results as JSON or CSV.

Think of it as a small data-collection studio: pick a few retail brands, pick a few places in France, hit start, and the app queries Google for every brand + place combination and stores everything in one dataset.

---

## What it does

1. **Extract** - You choose retail chains (e.g. Decathlon, IKEA, Carrefour) and coverage areas (cities, regions, or all of France). The app sends a `text search` request to Google Places for each combination.
2. **Deduplicate** - Every store gets saved by its Google Place ID, so the same shop is never added twice.
3. **Enrich** - Each store is tagged with its region, locality (actual commune), and chain using a built-in French geography lookup, without extra API calls.
4. **Review** - Explore results in a data table, on an interactive Google Map, or as raw JSON.
5. **Export** - Download everything as JSON (3 formats) or CSV, or import a JSON file back into the app.

---

## Features

### Data extraction
- 27 major French retail chains pre-configured (`src/data/retailChains.ts`)
- 30 coverage points: national, 13 regions, 11 cities, 5 overseas territories (`src/data/frenchCities.ts`)
- Configurable search radius, request delay (throttling), results per query, and language
- Live progress bar, log console, pause / resume / stop controls
- Optional fields you can toggle: reviews, editorial summary, generative summary, review summary, restroom, price level

### Data views
- **[01] Config & Pull** - pick chains and coverage areas, configure the run
- **[02] Stores** - sortable, filterable table with search, pagination, and Excel/CSV export
- **[03] Map Frame** - Google Map with per-chain colored markers, filters, and a "Capture as JPG" button
- **[04] Raw JSON** - pretty-printed JSON preview with copy, download, import, and reset

### Data management
- Results auto-save to your browser's `localStorage`
- **Blacklist**: deleted stores are remembered, so they never come back after a re-extraction or import
- Import accepts raw Google Places payloads, clean arrays, or GeoJSON

---

## Tech stack

| Layer      | Technology                                                       |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite                                       |
| Styling    | Tailwind CSS 4                                                   |
| Maps       | `@vis.gl/react-google-maps`                                      |
| Icons      | `lucide-react`                                                   |
| Backend    | Express (`server.ts` for dev, `api/index.ts` for Vercel)         |
| Tooling    | `tsx` (dev runner), `esbuild` (server bundle)                    |

The frontend never calls Google directly. All Google requests go through the backend, which keeps the API key server-side and lets you pass a custom key at runtime.

---

## Getting started

### 1. Requirements
- Node.js 18+ (or [Bun](https://bun.sh) - a `bun.lock` is included)
- A Google Cloud API key with the **Places API (New)** enabled
  - Get one here: https://console.cloud.google.com/google/maps-apis/start

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in the value:
```bash
GOOGLE_MAPS_PLATFORM_KEY="your_google_places_api_key"
```
The key is optional - you can also paste it directly into the app's **Config & Pull** tab, which stores it in `localStorage`.

### 4. Run the dev server
```bash
npm run dev
```
Open http://localhost:3000

---

## Scripts

| Command           | What it does                                              |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Start the Express + Vite dev server on port 3000         |
| `npm run build`   | Build the frontend and bundle the server to `dist/`      |
| `npm start`       | Run the production server (`dist/server.cjs`)            |
| `npm run lint`    | Type-check the project (`tsc --noEmit`)                  |
| `npm run clean`   | Remove build output                                      |

---

## How extraction works

The engine (`src/App.tsx` -> `startExtraction`) builds a task queue of **chain x coverage area** pairs, then runs them one by one:

```
for each (chain, area):
  POST /api/places/search  { textQuery: "<chain> <area>", lat, lng, radius }
  -> merge new results into the dataset, skip duplicates and blacklisted IDs
  -> wait `delayMs` before the next request
```

After each batch the dataset is saved to `localStorage`, so a refresh won't lose your work.

### Coverage and enrichment (`src/utils/geo.ts`)
Each store's region, locality, and chain are resolved without network calls:
- **Region** comes from Google's `administrative_area_level_1` component, normalized and matched against the built-in region list (accent/punctuation-insensitive, so `Île-de-France` == `ile de france`).
- **Locality** is read from the address components, falling back to the coverage area or an address substring match.
- **Chain** is matched by id, then name, then containment (so `H&M` -> `hm`, `E.Leclerc` -> `e_leclerc`).

---

## API endpoints

The backend is defined twice with identical logic:
- `server.ts` - used by `npm run dev` (also serves the Vite frontend)
- `api/index.ts` - used as a Vercel serverless function

| Method | Path                       | Purpose                                            |
| ------ | -------------------------- | -------------------------------------------------- |
| POST   | `/api/places/validate-key` | Test whether an API key can reach Google Places    |
| POST   | `/api/places/search`       | Text search for places near a lat/lng              |
| GET    | `/api/health`              | Health check + whether a server-side key is set    |

**`/api/places/search` body**
```jsonc
{
  "apiKey": "optional - falls back to env key",
  "textQuery": "Decathlon Paris",
  "lat": 48.8566,
  "lng": 2.3522,
  "radiusMeters": 20000,
  "pageSize": 20,
  "languageCode": "fr",
  "includeReviews": true,
  "includeEditorialSummary": true,
  "includeGenerativeSummary": true,
  "includeReviewSummary": true,
  "includeRestroom": true,
  "includePriceLevel": true
}
```

---

## Export formats

Available in the **Raw JSON** tab:

| Format            | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| **Raw Google Places** | `id`, coverage tags, and the full untouched Google payload (`rawData`) |
| **Clean Array**   | Flat, tidy fields: name, address, lat/lng, rating, website, phone... |
| **GeoJSON**       | Standard `FeatureCollection` of Points, ready for GIS tools          |

All three can be re-imported later - the importer (`src/utils/dataset.ts`) auto-detects the shape.

The **Stores** tab also exports a CSV named like `matrix_brand_location_YYYY-MM-DD.csv`.

---

## Project structure

```
fr-api-places/
├── api/index.ts              # Vercel serverless backend
├── server.ts                 # Express dev/prod server + same API routes
├── index.html                # App shell (fonts + cache-recovery fallback)
├── src/
│   ├── App.tsx               # Main app, extraction engine, state, persistence
│   ├── main.tsx              # React entry point
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── components/           # UI building blocks
│   │   ├── ApiKeySection.tsx
│   │   ├── ChainSelector.tsx
│   │   ├── CitySelector.tsx
│   │   ├── ExtractionControl.tsx
│   │   ├── ResultsTableView.tsx
│   │   ├── MapView.tsx
│   │   ├── JsonViewer.tsx
│   │   └── PlaceDetailModal.tsx
│   ├── data/
│   │   ├── retailChains.ts   # 27 pre-configured retail brands
│   │   └── frenchCities.ts   # Coverage matrix: national/regions/cities/territories
│   └── utils/
│       ├── geo.ts            # Region/locality/chain resolution & enrichment
│       └── dataset.ts        # Export builders + import parser
├── html-fr/                  # Standalone French SEO pages (bus schedules), unrelated to the app
├── public/                   # Static assets (robots.txt)
├── matrix_brand_location.csv # Sample/example output template
├── vercel.json               # Vercel routing + cache headers
└── vite.config.ts            # Vite config
```

---

## Deployment

A `vercel.json` is included. To deploy on Vercel:
1. Push the repo to GitHub and import it into Vercel.
2. Set the environment variable `GOOGLE_MAPS_PLATFORM_KEY` in the Vercel dashboard.
3. Vercel serves the static frontend and runs `api/index.ts` as a serverless function.

The app is also compatible with Google AI Studio / Cloud Run; `metadata.json` and the injected environment variables support that setup.

---

## Notes and limitations

- **Browser storage**: the dataset lives in `localStorage`, which is per-browser and limited in size. Large extractions may hit the storage cap; the app will skip caching rather than crash.
- **Google billing**: every extraction run consumes Places API calls (Text Search, plus Enterprise SKU charges when you enable summary/review fields). Watch your Google Cloud quota.
- **Map tiles & JPG capture**: capturing the map as an image can fail if Google Maps tiles block CORS. The app suggests using Snipping Tool (Win+Shift+S) as a fallback.
- **`html-fr/`**: these are separate static French-language pages about bus schedules and are not part of the React app.
