import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { poiCache, type Poi } from '../db/schema.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'HexMapExplorer/1.0 (commute heatmap)';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ELEMENTS = 3000;
const OVERPASS_TIMEOUT_MS = 30_000;

/** Category key -> OpenStreetMap tag selectors (key=value). */
const CATEGORY_SELECTORS: Record<string, string[]> = {
  supermarket: ['shop=supermarket'],
  bakery: ['shop=bakery'],
  school: ['amenity=school'],
  kindergarten: ['amenity=kindergarten'],
  pharmacy: ['amenity=pharmacy'],
  doctor: ['amenity=doctors'],
  hospital: ['amenity=hospital'],
  restaurant: ['amenity=restaurant'],
  cafe: ['amenity=cafe'],
  bank: ['amenity=bank'],
  fuel: ['amenity=fuel'],
  park: ['leisure=park'],
  gym: ['leisure=fitness_centre'],
  transit: ['public_transport=station', 'highway=bus_stop', 'railway=station'],
};

interface PoiBody {
  south: number;
  west: number;
  north: number;
  east: number;
  categories: string[];
  force?: boolean;
}

const bodySchema = {
  type: 'object',
  required: ['south', 'west', 'north', 'east', 'categories'],
  additionalProperties: false,
  properties: {
    south: { type: 'number' },
    west: { type: 'number' },
    north: { type: 'number' },
    east: { type: 'number' },
    categories: { type: 'array', items: { type: 'string' } },
    force: { type: 'boolean' },
  },
} as const;

function selectorToOverpass(sel: string): string {
  const [k, v] = sel.split('=');
  return `["${k}"="${v}"]`;
}

function classify(
  tags: Record<string, string>,
  requested: Set<string>,
): string | null {
  if (requested.has('supermarket') && tags.shop === 'supermarket') return 'supermarket';
  if (requested.has('bakery') && tags.shop === 'bakery') return 'bakery';
  if (requested.has('school') && tags.amenity === 'school') return 'school';
  if (requested.has('kindergarten') && tags.amenity === 'kindergarten') return 'kindergarten';
  if (requested.has('pharmacy') && tags.amenity === 'pharmacy') return 'pharmacy';
  if (requested.has('doctor') && tags.amenity === 'doctors') return 'doctor';
  if (requested.has('hospital') && tags.amenity === 'hospital') return 'hospital';
  if (requested.has('restaurant') && tags.amenity === 'restaurant') return 'restaurant';
  if (requested.has('cafe') && tags.amenity === 'cafe') return 'cafe';
  if (requested.has('bank') && tags.amenity === 'bank') return 'bank';
  if (requested.has('fuel') && tags.amenity === 'fuel') return 'fuel';
  if (requested.has('park') && tags.leisure === 'park') return 'park';
  if (requested.has('gym') && tags.leisure === 'fitness_centre') return 'gym';
  if (
    requested.has('transit') &&
    (tags.public_transport === 'station' ||
      tags.highway === 'bus_stop' ||
      tags.railway === 'station')
  )
    return 'transit';
  return null;
}

async function fetchOverpass(b: PoiBody, categories: string[]): Promise<Poi[]> {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  const parts: string[] = [];
  for (const cat of categories) {
    for (const sel of CATEGORY_SELECTORS[cat] ?? []) {
      const f = selectorToOverpass(sel);
      parts.push(`node${f}(${bbox});`);
      parts.push(`way${f}(${bbox});`);
    }
  }
  const query = `[out:json][timeout:25];(${parts.join('')});out center ${MAX_ELEMENTS};`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'data=' + encodeURIComponent(query),
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Overpass responded ${res.status}`);

  const json = (await res.json()) as { elements?: OverpassElement[] };
  const elements = json.elements ?? [];
  const requested = new Set(categories);
  const pois: Poi[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const category = classify(tags, requested);
    if (!category) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const dedup = `${category}:${lat.toFixed(5)}:${lon.toFixed(5)}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    pois.push(tags.name ? { lat, lon, category, name: tags.name } : { lat, lon, category });
  }
  return pois;
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Points of interest for a bounding box. Queries the OpenStreetMap Overpass
 * API once per bbox + category set and caches the result in Postgres so
 * repeated grids don't re-hit Overpass.
 */
export async function poiRoutes(app: FastifyInstance): Promise<void> {
  app.post('/poi', { schema: { body: bodySchema } }, async (request, reply) => {
    const body = request.body as PoiBody;
    const categories = body.categories.filter((c) => c in CATEGORY_SELECTORS);
    if (categories.length === 0) return { pois: [], cached: false };

    const round = (n: number) => n.toFixed(4);
    const cacheKey = `${round(body.south)},${round(body.west)},${round(body.north)},${round(
      body.east,
    )}|${[...categories].sort().join(',')}`;

    const [row] = await db
      .select()
      .from(poiCache)
      .where(eq(poiCache.cacheKey, cacheKey))
      .limit(1);

    // `force` bypasses a fresh cache entry and re-fetches from Overpass.
    if (!body.force && row && Date.now() - row.updatedAt.getTime() < CACHE_TTL_MS) {
      return { pois: row.data, cached: true };
    }

    let pois: Poi[];
    try {
      pois = await fetchOverpass(body, categories);
    } catch (err) {
      request.log.error(err);
      // Serve a stale cache entry rather than failing outright, if we have one.
      if (row) return { pois: row.data, cached: true };
      return reply.status(502).send({ error: 'Overpass request failed' });
    }

    await db
      .insert(poiCache)
      .values({ cacheKey, data: pois })
      .onConflictDoUpdate({
        target: poiCache.cacheKey,
        set: { data: pois, updatedAt: sql`now()` },
      });

    return { pois, cached: false };
  });
}
