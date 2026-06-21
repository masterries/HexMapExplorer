import type { LuPrices, PriceMetric } from '../types';

/**
 * Commune-level real-estate prices, and the geometry needed to attach a
 * commune's price series to a hex by point-in-polygon. Pure (no deps): a small
 * ray-casting test over the bundled commune GeoJSON, plus an inline SVG
 * sparkline for the popup. Matches the dependency-light convention.
 */

/** Normalize a commune name for matching the price data against the GeoJSON
 *  (strip accents/case/punctuation so "Esch-sur-Sûre" === "esch sur sure"). */
export function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// --- Point-in-polygon over the commune boundaries ---

type Ring = number[][]; // [ [lon,lat], ... ]
type Polygon = Ring[]; // [outer, ...holes]

interface CommuneShape {
  name: string; // original COMMUNE (current/canonical display name)
  bbox: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
  polys: Polygon[];
}

export interface CommuneIndex {
  /** Containing commune's display name for a point, or null if outside all. */
  locate(lat: number, lon: number): string | null;
}

interface CommuneFeature {
  properties: { COMMUNE?: string };
  geometry: { type: string; coordinates: unknown };
}

function ringContains(ring: Ring, lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polyContains(poly: Polygon, lon: number, lat: number): boolean {
  if (!poly.length || !ringContains(poly[0], lon, lat)) return false;
  for (let h = 1; h < poly.length; h++) {
    if (ringContains(poly[h], lon, lat)) return false; // inside a hole
  }
  return true;
}

/** Build a fast point-in-commune index from the bundled GeoJSON. */
export function buildCommuneIndex(geojson: { features: CommuneFeature[] }): CommuneIndex {
  const shapes: CommuneShape[] = [];
  for (const f of geojson.features) {
    const name = f.properties?.COMMUNE;
    if (!name) continue;
    const g = f.geometry;
    let polys: Polygon[];
    if (g.type === 'Polygon') polys = [g.coordinates as Polygon];
    else if (g.type === 'MultiPolygon') polys = g.coordinates as Polygon[];
    else continue;

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    for (const poly of polys)
      for (const ring of poly)
        for (const pt of ring) {
          if (pt[0] < minLon) minLon = pt[0];
          if (pt[0] > maxLon) maxLon = pt[0];
          if (pt[1] < minLat) minLat = pt[1];
          if (pt[1] > maxLat) maxLat = pt[1];
        }
    shapes.push({ name, bbox: [minLon, minLat, maxLon, maxLat], polys });
  }
  return {
    locate(lat, lon) {
      for (const s of shapes) {
        const [minLon, minLat, maxLon, maxLat] = s.bbox;
        if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
        for (const poly of s.polys) {
          if (polyContains(poly, lon, lat)) return s.name;
        }
      }
      return null;
    },
  };
}

// --- Series helpers ---

/** commune (normalized) -> series, for O(1) lookup once boundaries resolve. */
export function indexPricesByCommune(prices: LuPrices): Map<string, LuPrices['communes'][number]> {
  const m = new Map<string, LuPrices['communes'][number]>();
  for (const c of prices.communes) m.set(normName(c.name), c);
  return m;
}

export function seriesFor(c: LuPrices['communes'][number], metric: PriceMetric): (number | null)[] {
  return metric === 'house' ? c.house : c.apartment;
}

/** Last non-null value in a series, or null. */
export function latestValue(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) if (series[i] != null) return series[i];
  return null;
}

/** First non-null value in a series, or null. */
export function firstValue(series: (number | null)[]): number | null {
  for (let i = 0; i < series.length; i++) if (series[i] != null) return series[i];
  return null;
}

// --- Sparkline (inline SVG for the hex popup) ---

export function sparklineSvg(
  values: (number | null)[],
  opts: { width?: number; height?: number; stroke?: string } = {},
): string {
  const w = opts.width ?? 136;
  const h = opts.height ?? 34;
  const pad = 3;
  const stroke = opts.stroke ?? '#2563eb';
  const pts: { v: number; i: number }[] = [];
  values.forEach((v, i) => {
    if (v != null) pts.push({ v, i });
  });
  if (pts.length < 2) return '';
  const xs = values.length - 1 || 1;
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  const span = max - min || 1;
  const X = (i: number) => pad + (i / xs) * (w - 2 * pad);
  const Y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const d = pts
    .map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`)
    .join(' ');
  const last = pts[pts.length - 1];
  return (
    `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block">` +
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${X(last.i).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="2.2" fill="${stroke}"/>` +
    `</svg>`
  );
}

/** Fetch the bundled commune boundaries (served from /lu-communes.geojson). */
export async function loadCommuneGeo(): Promise<{ features: CommuneFeature[] }> {
  const res = await fetch('/lu-communes.geojson');
  if (!res.ok) throw new Error(`commune boundaries failed: ${res.status}`);
  return (await res.json()) as { features: CommuneFeature[] };
}

/** Human-readable data.public.lu page for the asking-price series (CC0). */
export const PRICE_SOURCE_URL =
  'https://data.public.lu/en/datasets/prix-annonces-des-logements-par-commune/';

/** OpenStreetMap link centered on a point, so a nearby place can be verified. */
export function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
}
