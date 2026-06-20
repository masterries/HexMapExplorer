/**
 * Pure hex-grid + Web Mercator (EPSG:3857) geometry. No DOM, no Leaflet, no
 * external deps. These mirror the math from the original index.html, which used
 * Turf's toMercator/toWgs84 — the formulas below are the standard spherical
 * Mercator transform Turf uses (Earth radius 6378137), so results are identical.
 */

export type MercatorXY = [number, number];
export type LonLat = [number, number];

const EARTH_RADIUS = 6378137;

export function toMercator([lon, lat]: LonLat): MercatorXY {
  const x = ((lon * Math.PI) / 180) * EARTH_RADIUS;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * EARTH_RADIUS;
  return [x, y];
}

export function toWgs84([x, y]: MercatorXY): LonLat {
  const lon = ((x / EARTH_RADIUS) * 180) / Math.PI;
  const lat = ((2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180) / Math.PI;
  return [lon, lat];
}

export interface Axial {
  q: number;
  r: number;
}

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/** Hex grid distance in axial coordinates. */
export function hexDist(q1: number, r1: number, q2: number, r2: number): number {
  return (
    (Math.abs(q1 - q2) +
      Math.abs(r1 - r2) +
      Math.abs(-q1 - r1 - (-q2 - r2))) /
    2
  );
}

export function getNeighbors(q: number, r: number): Axial[] {
  const dirs: [number, number][] = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  return dirs.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

/** Axial (q, r) -> Mercator coordinates, pointy-top layout. */
export function axialToMerc(
  q: number,
  r: number,
  centerMerc: MercatorXY,
  hexSizeMeters: number,
): MercatorXY {
  const xOff = hexSizeMeters * Math.sqrt(3) * (q + r / 2);
  const yOff = hexSizeMeters * (3 / 2) * r;
  return [centerMerc[0] + xOff, centerMerc[1] + yOff];
}

/** Hexagon polygon vertices as [lat, lon] pairs for Leaflet. */
export function hexPolygonLatLng(
  cx: number,
  cy: number,
  hexSizeMeters: number,
): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    const vx = cx + hexSizeMeters * Math.cos(angle);
    const vy = cy + hexSizeMeters * Math.sin(angle);
    const [lon, lat] = toWgs84([vx, vy]);
    verts.push([lat, lon]);
  }
  return verts;
}

/** Find the axial hex that contains the destination point. */
export function findDestHex(
  destMerc: MercatorXY,
  centerMerc: MercatorXY,
  hexSizeMeters: number,
): Axial {
  const dx = destMerc[0] - centerMerc[0];
  const dy = destMerc[1] - centerMerc[1];
  const r = Math.round(dy / (hexSizeMeters * 1.5));
  const q = Math.round(dx / (hexSizeMeters * Math.sqrt(3)) - r / 2);
  return { q, r };
}

export function isWithinRadius(q: number, r: number, radius: number): boolean {
  return hexDist(0, 0, q, r) <= radius;
}

/** Cache key matching the backend's "slat_slon_dlat_dlon" format (6 decimals). */
export function getCacheKey(
  slat: number,
  slon: number,
  dlat: number,
  dlon: number,
): string {
  return `${slat.toFixed(6)}_${slon.toFixed(6)}_${dlat.toFixed(6)}_${dlon.toFixed(6)}`;
}

/** Interpolate green -> red by driving time. null/undefined -> gray. */
export function getColor(
  d: number | null | undefined,
  lower: number,
  upper: number,
): string {
  if (d === null || d === undefined) return '#9ca3af';
  let v = d;
  if (v < lower) v = lower;
  if (v > upper) v = upper;
  const ratio = upper === lower ? 0 : (v - lower) / (upper - lower);
  const red = Math.round(ratio * 255);
  const green = Math.round((1 - ratio) * 255);
  return `rgb(${red},${green},0)`;
}

/** Number of hexes in a grid of the given radius. */
export function hexCount(radius: number): number {
  return 3 * radius * (radius + 1) + 1;
}
