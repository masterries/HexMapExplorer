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
  /** Which real-estate series colors/labels hexes in 'price' mode. */
  priceMetric: PriceMetric;
  /** Performance mode: hide on-hex numbers (labels) for speed on big grids. */
  performanceMode: boolean;
}

export type ColorMode = 'commute' | 'liveability' | 'price';
export type ViewMode = 'all' | 'navigate';
export type PriceMetric = 'apartment' | 'house';

/** Per-commune asking-price series (€/m²); arrays align to LuPrices.years. */
export interface CommunePrices {
  name: string;
  apartment: (number | null)[];
  house: (number | null)[];
}

/** National real-estate price dataset from the backend /api/prices/lu route. */
export interface LuPrices {
  years: number[];
  communes: CommunePrices[];
  source: string;
  fetchedAt: string;
  cached?: boolean;
}

/** A nearby point of interest with its distance from the hex. */
export interface NearbyPoi {
  category: string;
  name?: string;
  lat: number;
  lon: number;
  distM: number;
  website?: string;
  openingHours?: string;
}

/** Everything needed to render the per-hex detail view (built by the map hook
 *  on click and handed to React). */
export interface HexDetail {
  q: number;
  r: number;
  lat: number;
  lon: number;
  time: number | null;
  score: number;
  commuteScore: number;
  poiScore: number;
  commuteWeight: number;
  nearbyRadiusM: number;
  counts: Record<string, number>;
  /** Actual nearby POIs (with names + distance) inside the amenity radius. */
  nearbyPois: NearbyPoi[];
  /** Commune containing the hex, or null if outside Luxembourg / no data loaded. */
  commune: string | null;
  years: number[] | null;
  apartment: (number | null)[] | null;
  house: (number | null)[] | null;
  priceSource: string | null;
}

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
  website?: string;
  openingHours?: string;
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
