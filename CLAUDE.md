# CLAUDE.md

Project context for AI coding assistants. Read this first.

## What this is

**HexMapExplorer** helps you find a good place to live based on commute + amenities.
You pick a **workplace** and a **search-area center**; the app builds a hex grid and:

1. **Commute heatmap** — colors each hex by driving time to the workplace (OSRM,
   cached in Postgres).
2. **POI layer** — fetches amenities (supermarkets, schools, doctors, …) from
   OpenStreetMap Overpass for the grid area (cached), shown as colored dots.
3. **Liveability score (0–100)** per hex — a weighted blend of commute time +
   nearby-amenity coverage. Hexes can be colored/ranked by it; a Navigate mode
   focuses one hex and shows its catchment.

It started as a PHP + single-`index.html` prototype and was rewritten into the
stack below. The old prototype is in git history only.

## Stack & layout (monorepo)

| Part | Tech | Location |
|------|------|----------|
| Frontend | React + Vite + TypeScript + Tailwind, Leaflet (raw, not react-leaflet) | `frontend/` |
| Backend | Node + TypeScript, Fastify, Drizzle ORM | `backend/` |
| Database | PostgreSQL (versioned migrations, auto-applied on startup) | `backend/drizzle/` |
| Deploy | Docker Compose: nginx (SPA + `/api` proxy) + backend + Postgres | `docker-compose.yml` |

## Commands

```bash
# Run everything (prod-like). Open http://localhost:8080
cp .env.example .env        # set POSTGRES_PASSWORD (+ ADMIN_TOKEN)
docker compose up --build

# Local dev
docker compose up -d db
cd backend  && npm install && npm run dev     # tsx watch, migrates, :3000
cd frontend && npm install && npm run dev     # Vite :5173, proxies /api -> :3000

# Checks
cd backend  && npm run typecheck
cd frontend && npm run build                  # tsc --noEmit && vite build
cd backend  && npm run db:generate            # after editing db/schema.ts
```

## Architecture notes (the important parts)

- **Leaflet is imperative, behind a hook.** `frontend/src/hooks/useLeafletMap.ts`
  owns the `L.map` in a ref (created once; guards React StrictMode double-init) and
  exposes a `MapApi` (addHex, setPois, setScoreConfig, setViewMode, focusHex, …).
  React never owns individual hex/POI layers. The map uses `preferCanvas: true` so
  it scales to thousands of shapes.
- **Heatmap generation** is an async controller: `hooks/useHeatmap.ts`. It enumerates
  hexes, batch-reads the driving cache, routes misses through OSRM with limited
  concurrency, and draws via the map API. Stop = `AbortController`.
- **Scoring** is pure: `services/liveability.ts` (commute + POI coverage, weighted)
  and `services/hexGeo.ts` (axial hex math + Web-Mercator, no deps). POI proximity
  uses a spatial hash index (`services/poi.ts` `buildPoiIndex`) so per-hex scoring is
  cheap on large grids.
- **State**: sidebar config lives in `state/useAppConfig.ts`; `App.tsx` wires hooks +
  components. Score recompute on slider drag is **debounced** (see the `setScoreConfig`
  effect in `App.tsx`).
- **API**: all under `/api`. Routes in `backend/src/routes/` — `cache` (driving-time),
  `maps` (saved configs), `poi` (Overpass proxy + cache), `admin` (cache management,
  gated by the `x-admin-token` header == `ADMIN_TOKEN`, default `admin`).
- **DB schema**: `backend/src/db/schema.ts` (Drizzle). Use `double precision` (never
  `numeric` — node-postgres returns strings) and `timestamptz`. Edit schema →
  `npm run db:generate` → commit the new `drizzle/*.sql`.
- OSRM (`router.project-osrm.org`) and Nominatim are called **directly from the
  browser**; the DB cache absorbs OSRM load. POIs go through the backend (cached +
  proper User-Agent).

## Conventions

- **Commit messages: do NOT mention Claude/AI and do NOT add a `Co-Authored-By`
  trailer.** The maintainer requires clean, human-style messages. Author commits as
  the existing git user.
- Work on a feature branch; `main` is the default. The maintainer has approved
  pushing to `main` for this repo.
- After UI changes, verify in a real browser (the preview tooling) — this app's value
  is visual; build-passing is not enough.
- Keep the frontend dependency-light and match existing component/style patterns.

## Gotchas

- Setting lat/lon via the input fields does **not** pan the map (only search / pick /
  drag / history-load do). Expected.
- Permanent hex labels are skipped above `LABEL_CAP` (800) hexes for performance.
- POIs are fetched out to `MAX_NEARBY_RADIUS_M` (3 km) so changing the amenity-radius
  slider never needs a re-fetch.
- `.env` and `.claude/` are gitignored; `.env.example` documents all config.
