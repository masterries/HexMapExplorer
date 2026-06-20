export interface AppConfig {
  /** Center of the search area (where candidate homes are scanned). */
  centerLat: number;
  centerLon: number;
  /** The workplace — drive times are computed from each hex to this point. */
  destLat: number;
  destLon: number;
  radius: number;
  hexSize: number;
  showLabels: boolean;
  colorMin: number;
  colorMax: number;
  saveName: string;
  /** POI category keys to fetch/show (see services/poi.ts). */
  poiCategories: string[];
  /** How hexes are colored: by commute time or by liveability score. */
  colorMode: ColorMode;
  /** Weight of commute vs amenities in the liveability score (0..1). */
  commuteWeight: number;
  /** Radius (km) within which amenities count toward a hex's score. */
  nearbyRadiusKm: number;
  /** Map interaction: show all hexes, or focus one and fade the rest. */
  viewMode: ViewMode;
}

export type ColorMode = 'commute' | 'liveability';
export type ViewMode = 'all' | 'navigate';

/** A hex ranked by liveability score. */
export interface RankedHex {
  q: number;
  r: number;
  lat: number;
  lon: number;
  time: number | null;
  score: number;
  commuteScore: number;
  poiScore: number;
}

/** A point of interest from OpenStreetMap (via the backend Overpass proxy). */
export interface Poi {
  lat: number;
  lon: number;
  category: string;
  name?: string;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface PoiCacheEntry {
  cacheKey: string;
  count: number;
  updatedAt: string;
}

export interface CacheStats {
  drivingTime: { count: number };
  poi: { count: number; entries: PoiCacheEntry[] };
}

/** A saved map configuration, as returned by GET /api/maps (camelCase). */
export interface MapRequest {
  id: number;
  name: string;
  centerLat: number;
  centerLon: number;
  destLat: number;
  destLon: number;
  radius: number;
  hexSize: number;
  createdAt: string;
}

export interface SaveMapPayload {
  name: string;
  centerLat: number;
  centerLon: number;
  destLat: number;
  destLon: number;
  radius: number;
  hexSize: number;
}

/** 'pending' = placeholder while routing; 'done' = colored by drive time. */
export type HexState = 'pending' | 'done';
export type PointKind = 'center' | 'dest';
