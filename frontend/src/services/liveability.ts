import { countNearbyPois, NEARBY_RADIUS_M } from './poi';
import type { Poi } from '../types';

/** Nearby count at which a category's coverage sub-score saturates to 1. */
const POI_SATURATION = 2;

export interface ScoreParams {
  /** Weight given to commute (0..1); amenities get the rest. */
  commuteWeight: number;
  /** Categories that count toward the amenity score. */
  categories: string[];
  /** Optional per-category weights (default 1). */
  categoryWeights?: Record<string, number>;
  /** Commute-time range used for normalization (same as the color range). */
  colorMin: number;
  colorMax: number;
  radiusM?: number;
}

export interface HexScore {
  /** Combined liveability score, 0..1 (1 = best). */
  score: number;
  /** Commute sub-score, 0..1 (1 = fastest). */
  commuteScore: number;
  /** Amenity coverage sub-score, 0..1 (1 = fully covered). */
  poiScore: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** 1 at/below colorMin (fast), 0 at/above colorMax (slow). null → 0. */
export function commuteScore(
  timeMin: number | null,
  colorMin: number,
  colorMax: number,
): number {
  if (timeMin == null) return 0;
  const span = colorMax - colorMin || 1;
  return clamp01(1 - (timeMin - colorMin) / span);
}

/** Weighted average of per-category coverage (each saturating with count). */
export function poiScore(
  pois: Poi[],
  lat: number,
  lon: number,
  categories: string[],
  weights: Record<string, number> = {},
  radiusM: number = NEARBY_RADIUS_M,
): number {
  if (categories.length === 0) return 0;
  const counts = countNearbyPois(pois, lat, lon, radiusM);
  let wsum = 0;
  let acc = 0;
  for (const c of categories) {
    const w = weights[c] ?? 1;
    if (w <= 0) continue;
    const coverage = Math.min((counts[c] ?? 0) / POI_SATURATION, 1);
    acc += w * coverage;
    wsum += w;
  }
  return wsum > 0 ? acc / wsum : 0;
}

export function liveabilityScore(
  timeMin: number | null,
  pois: Poi[],
  lat: number,
  lon: number,
  p: ScoreParams,
): HexScore {
  const cs = commuteScore(timeMin, p.colorMin, p.colorMax);
  const ps = poiScore(pois, lat, lon, p.categories, p.categoryWeights, p.radiusM);
  const wc = clamp01(p.commuteWeight);
  return { score: wc * cs + (1 - wc) * ps, commuteScore: cs, poiScore: ps };
}

/** Score 0..1 → color. 0 = red (worst), 0.5 = yellow, 1 = green (best). */
export function scoreColor(score: number): string {
  const s = clamp01(score);
  const r = Math.round(s < 0.5 ? 255 : 255 * (2 - 2 * s));
  const g = Math.round(s < 0.5 ? 255 * (2 * s) : 255);
  return `rgb(${r},${g},0)`;
}
