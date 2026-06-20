import { toMercator, toWgs84 } from './hexGeo';
import type { BBox, Poi } from '../types';

/** Default radius (meters) for "POIs near this hex" counts. */
export const NEARBY_RADIUS_M = 1000;
/** Max amenity radius the UI allows; POIs are fetched out to this distance so
 *  changing the radius never needs a re-fetch. */
export const MAX_NEARBY_RADIUS_M = 3000;

export interface PoiCategory {
  key: string;
  label: string;
  color: string;
}

/** Categories offered in the UI. Keys must match the backend CATEGORY_SELECTORS. */
export const POI_CATEGORIES: PoiCategory[] = [
  { key: 'supermarket', label: 'Supermarkets', color: '#16a34a' },
  { key: 'bakery', label: 'Bakeries', color: '#b45309' },
  { key: 'school', label: 'Schools', color: '#2563eb' },
  { key: 'kindergarten', label: 'Kindergartens', color: '#06b6d4' },
  { key: 'pharmacy', label: 'Pharmacies', color: '#dc2626' },
  { key: 'doctor', label: 'Doctors', color: '#db2777' },
  { key: 'hospital', label: 'Hospitals', color: '#9f1239' },
  { key: 'restaurant', label: 'Restaurants', color: '#ea580c' },
  { key: 'cafe', label: 'Cafés', color: '#ca8a04' },
  { key: 'bank', label: 'Banks', color: '#475569' },
  { key: 'fuel', label: 'Fuel', color: '#7c3aed' },
  { key: 'park', label: 'Parks', color: '#65a30d' },
  { key: 'gym', label: 'Gyms', color: '#0d9488' },
  { key: 'transit', label: 'Transit', color: '#6b7280' },
];

export const POI_COLORS: Record<string, string> = Object.fromEntries(
  POI_CATEGORIES.map((c) => [c.key, c.color]),
);
export const POI_LABELS: Record<string, string> = Object.fromEntries(
  POI_CATEGORIES.map((c) => [c.key, c.label]),
);

/**
 * Bounding box covering the whole hex grid plus padding for the nearby radius,
 * so edge hexes still get their surrounding POIs.
 */
export function gridBbox(
  centerLat: number,
  centerLon: number,
  radius: number,
  hexSizeKm: number,
): BBox {
  const hexSizeM = hexSizeKm * 1000;
  // Pad by the MAX amenity radius so any radius the slider allows is covered.
  const reach = radius * hexSizeM * Math.sqrt(3) + hexSizeM + MAX_NEARBY_RADIUS_M;
  const c = toMercator([centerLon, centerLat]);
  const [westLon, southLat] = toWgs84([c[0] - reach, c[1] - reach]);
  const [eastLon, northLat] = toWgs84([c[0] + reach, c[1] + reach]);
  return { south: southLat, west: westLon, north: northLat, east: eastLon };
}

/** Fast equirectangular distance approximation in meters (fine for ~1km). */
export function approxDistMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * 111320;
  const dLon = (lon2 - lon1) * 111320 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Count POIs within `radiusM` of a point, grouped by category. */
export function countNearbyPois(
  pois: Poi[],
  lat: number,
  lon: number,
  radiusM: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of pois) {
    if (approxDistMeters(lat, lon, p.lat, p.lon) <= radiusM) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
  }
  return counts;
}
