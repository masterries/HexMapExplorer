# HexMapExplorer

Find a good place to live based on your commute. Set your **workplace** and a
**search area**, and HexMapExplorer builds a **commute-time heatmap**: a hexagonal
grid where each cell is colored by its driving time to the workplace — green = fast,
red = slow (routing via OSRM, cached in Postgres). Save configurations and reload
them from history.

Set the workplace and search-area center by searching an address, dragging the map
markers, or **Pick both points on the map** (guided: click for the search center,
then click for the workplace).

| Layer    | Stack |
|----------|-------|
| Frontend | React + Vite + TypeScript + Tailwind, Leaflet, Turf.js |
| Backend  | Node + TypeScript, Fastify, Drizzle ORM |
| Database | PostgreSQL (schema is versioned and auto-migrated) |
| Deploy   | Docker Compose (nginx-served SPA + API + Postgres) |

## Quick start (Docker — recommended)

```bash
cp .env.example .env          # then set POSTGRES_PASSWORD
docker compose up --build
```

Open **http://localhost:8080**.

That's it — Postgres starts, the backend waits for it, applies the database
migrations automatically, then nginx serves the app and proxies `/api` to the
backend. Data persists in the `pgdata` Docker volume.

To stop: `docker compose down` (add `-v` to also wipe the database volume).

## Local development (without Docker for the app)

Run Postgres in Docker and the two app processes natively with hot reload:

```bash
docker compose up -d db                       # Postgres on :5432

# Backend (terminal 1)
cd backend
cp ../.env.example .env                        # uncomment + set DATABASE_URL
npm install
npm run db:generate                            # only after schema changes
npm run dev                                     # tsx watch -> migrates, listens :3000

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                                     # Vite on :5173, proxies /api -> :3000
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend,
so the frontend uses the same relative `/api/*` URLs as production.

## Configuration

All configuration is via environment variables; see [`.env.example`](.env.example).
`docker compose` derives `DATABASE_URL` from the `POSTGRES_*` values. The backend
**refuses to start without a valid `DATABASE_URL`** (no insecure defaults).

## API

All endpoints are served under `/api`. Responses use camelCase JSON.

| Method | Path             | Body / Result |
|--------|------------------|---------------|
| `POST` | `/api/cache/get` | `{ keys: string[] }` → `{ [cacheKey]: durationMinutes }` |
| `POST` | `/api/cache/set` | `{ data: { [cacheKey]: durationMinutes } }` → `{ status, count }` |
| `POST` | `/api/maps`      | map config → `{ status, id }` |
| `GET`  | `/api/maps`      | last 50 saved configs (newest first) |
| `POST` | `/api/poi`       | `{ south, west, north, east, categories[], force? }` → `{ pois[], cached }` (Overpass, cached) |
| `GET`  | `/api/admin/stats` | cache overview: driving-time count + POI cache entries |
| `POST` | `/api/admin/driving/clear` | clear the driving-time cache → `{ deleted }` |
| `POST` | `/api/admin/poi/delete` | `{ key? }` — delete one POI cache entry, or all → `{ deleted }` |
| `GET`  | `/api/health`    | `{ status: "ok" }` |

> The `/api/admin/*` endpoints are **unauthenticated** (consistent with this
> self-hosted app). Put the deployment behind reverse-proxy auth or a VPN if you
> expose it publicly.

## Database schema

Two tables, owned by [`backend/src/db/schema.ts`](backend/src/db/schema.ts) and
applied through committed migrations in `backend/drizzle/`:

- **`driving_time_cache`** — `cache_key` (PK), `duration`, `updated_at`. Caches
  OSRM driving times so repeated grids are fast and don't re-hit OSRM.
- **`map_requests`** — saved configurations (search-center + workplace coordinates,
  radius, hex size, name, `created_at`).
- **`poi_cache`** — cached OpenStreetMap Overpass results per bounding box +
  category set (`data` is a JSONB array of POIs).

## Points of interest

Pick categories — supermarkets, bakeries, schools, kindergartens, pharmacies,
doctors, hospitals, restaurants, cafés, banks, fuel, parks, gyms, transit — and
**Load POIs** to fetch amenities for the search area from the OpenStreetMap
**Overpass API** (one query per area, cached in Postgres). They appear as
category-colored dots, and each **hex popup** lists the POIs within 1 km — so you
can see which low-commute hexes also have amenities nearby.

**Cache admin** (gear icon, top of the sidebar): inspect the driving-time and POI
caches, **force-reload** the current area (bypassing the cache), and **delete**
individual POI cache entries or clear a cache entirely.

## Liveability score

The **Liveability** panel combines the two signals into a single per-hex score
(0–100): a weighted blend of **commute time** (shorter = better) and **amenity
coverage** (more nearby categories within 1 km = better). A slider sets the
balance (e.g. *Commute 60% · Amenities 40%*).

- Switch **Color hexes by** from *Commute* to *Liveability* to recolor the grid by
  score (green = best, red = worst) **and relabel each hex** — the on-hex number
  follows the mode (commute minutes vs the 0–100 liveability score). Updates live as
  you change the weighting.
- The **Best locations** list ranks the top hexes (each row shows the score, the
  commute, and the amenity coverage %); click one to fly there and open its popup.
- **View: Show all / Navigate** — in *Navigate*, click a hex to focus it: the other
  hexes fade out and only its nearby amenities stay highlighted, so you can study one
  candidate location at a time. Click the map background (or *Show all*) to reset.
- The hex popup shows **how the score is composed** — e.g. `90/100 = 60% commute
  (0.90) + 40% amenities (0.90)` — so it's clear why a hex scores what it does. With
  no POIs loaded the amenity part is `0.00` (and the popup says so).

The sidebar is organized into **tabs** — *Trip* (locations + grid + generate),
*POIs*, *Score*, *Saved* — to keep it compact.

Amenity coverage uses the POIs loaded for the grid. **Generating the heatmap
auto-loads POIs** for the whole grid (for the selected categories), so the score is
complete for every hex without a separate step — or load/refresh them manually in
the POIs tab. Each category is weighted equally (per-category weights are a possible
future refinement).

## Roadmap

The heatmap + POIs + liveability score rank neighborhoods to live in:

1. ✅ **Points of interest per hex** — done (see above).
2. ✅ **Combined liveability score** — done (see above).
3. **Real-estate data** — overlay property prices/availability per hex to find
   genuinely good, affordable places to live.
4. **Per-category POI weights** — let some amenities matter more than others in the
   score (currently all selected categories are weighted equally).

## Notes

- Driving routes come from the public OSRM demo server and geocoding from
  Nominatim, called directly from the browser. The database cache absorbs most
  OSRM load; uncached hexes that fail (e.g. rate limiting) render gray.
- Previous prototype (PHP + a single `index.html`) lives in git history.
