/**
 * Hex grid coordinate and geometry utilities
 * Uses axial coordinate system for hexagonal grids
 */

import * as turf from '@turf/turf';

/**
 * Generate hex key from axial coordinates
 * @param {number} q - Axial q coordinate
 * @param {number} r - Axial r coordinate
 * @returns {string} - Unique hex key
 */
export function hexKey(q, r) {
  return `${q},${r}`;
}

/**
 * Parse hex key back to coordinates
 * @param {string} key - Hex key
 * @returns {{q: number, r: number}}
 */
export function parseHexKey(key) {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * Calculate hex distance (heuristic for A*)
 * @param {number} q1
 * @param {number} r1
 * @param {number} q2
 * @param {number} r2
 * @returns {number} - Distance in hex steps
 */
export function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs((-q1 - r1) - (-q2 - r2))) / 2;
}

/**
 * Get 6 neighboring hexes in axial coordinates
 * @param {number} q
 * @param {number} r
 * @returns {Array<{q: number, r: number}>}
 */
export function getNeighbors(q, r) {
  const directions = [
    [1, 0], [1, -1], [0, -1],
    [-1, 0], [-1, 1], [0, 1]
  ];
  return directions.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

/**
 * Check if hex is within radius from center (0, 0)
 * @param {number} q
 * @param {number} r
 * @param {number} radius
 * @returns {boolean}
 */
export function isValidHex(q, r, radius) {
  return hexDistance(0, 0, q, r) <= radius;
}

/**
 * Convert axial coordinates to Mercator projection coordinates
 * @param {number} q
 * @param {number} r
 * @param {number} hexSizeMeters - Size of hexagon in meters
 * @param {number[]} centerMerc - Center point in Mercator [x, y]
 * @returns {number[]} - [x, y] in Mercator
 */
export function axialToMercator(q, r, hexSizeMeters, centerMerc) {
  const xOffset = hexSizeMeters * Math.sqrt(3) * (q + r / 2);
  const yOffset = hexSizeMeters * (3 / 2) * r;
  return [centerMerc[0] + xOffset, centerMerc[1] + yOffset];
}

/**
 * Get hexagon polygon vertices in Leaflet format [lat, lon]
 * @param {number} cx - Center x in Mercator
 * @param {number} cy - Center y in Mercator
 * @param {number} hexSizeMeters - Hex size in meters
 * @returns {Array<[number, number]>} - Array of [lat, lon] vertices
 */
export function getHexPolygon(cx, cy, hexSizeMeters) {
  const vertices = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (60 * i - 30) * Math.PI / 180;
    const vx = cx + hexSizeMeters * Math.cos(angleRad);
    const vy = cy + hexSizeMeters * Math.sin(angleRad);
    const pt = turf.toWgs84(turf.point([vx, vy]));
    vertices.push([pt.geometry.coordinates[1], pt.geometry.coordinates[0]]); // [lat, lon]
  }
  return vertices;
}

/**
 * Find which hex contains a given coordinate
 * @param {number} targetLat
 * @param {number} targetLon
 * @param {number} centerLat
 * @param {number} centerLon
 * @param {number} hexSizeMeters
 * @returns {{q: number, r: number}}
 */
export function findHexContaining(targetLat, targetLon, centerLat, centerLon, hexSizeMeters) {
  const centerPt = turf.point([centerLon, centerLat]);
  const centerMerc = turf.toMercator(centerPt).geometry.coordinates;

  const targetPt = turf.point([targetLon, targetLat]);
  const targetMerc = turf.toMercator(targetPt).geometry.coordinates;

  const dx = targetMerc[0] - centerMerc[0];
  const dy = targetMerc[1] - centerMerc[1];

  // Inverse of axial to offset
  const r = Math.round(dy / (hexSizeMeters * 1.5));
  const q = Math.round((dx / (hexSizeMeters * Math.sqrt(3))) - r / 2);

  return { q, r };
}

/**
 * Calculate total number of hexes for a given radius
 * Formula: 3 * r * (r + 1) + 1
 * @param {number} radius
 * @returns {number}
 */
export function calculateHexCount(radius) {
  return 3 * radius * (radius + 1) + 1;
}

/**
 * Generate cache key for driving time lookup
 * @param {number} srcLat
 * @param {number} srcLon
 * @param {number} destLat
 * @param {number} destLon
 * @returns {string}
 */
export function getCacheKey(srcLat, srcLon, destLat, destLon) {
  return `${srcLat.toFixed(6)}_${srcLon.toFixed(6)}_${destLat.toFixed(6)}_${destLon.toFixed(6)}`;
}

/**
 * Convert hex center to WGS84 coordinates
 * @param {number} q
 * @param {number} r
 * @param {number} hexSizeMeters
 * @param {number[]} centerMerc
 * @returns {{lat: number, lon: number}}
 */
export function hexToLatLon(q, r, hexSizeMeters, centerMerc) {
  const [mx, my] = axialToMercator(q, r, hexSizeMeters, centerMerc);
  const pt = turf.toWgs84(turf.point([mx, my]));
  return {
    lat: pt.geometry.coordinates[1],
    lon: pt.geometry.coordinates[0]
  };
}
