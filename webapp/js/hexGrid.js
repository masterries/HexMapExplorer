/**
 * Hex grid coordinate and geometry utilities
 */
const HexGrid = {
  /**
   * Generate hex key from axial coordinates
   */
  hexKey(q, r) {
    return `${q},${r}`;
  },

  /**
   * Calculate hex distance (for A* heuristic)
   */
  hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs((-q1 - r1) - (-q2 - r2))) / 2;
  },

  /**
   * Get 6 neighboring hexes
   */
  getNeighbors(q, r) {
    const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    return dirs.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
  },

  /**
   * Check if hex is within radius
   */
  isValid(q, r, radius) {
    return this.hexDistance(0, 0, q, r) <= radius;
  },

  /**
   * Convert axial to Mercator coordinates
   */
  axialToMercator(q, r, hexSizeMeters, centerMerc) {
    const xOffset = hexSizeMeters * Math.sqrt(3) * (q + r / 2);
    const yOffset = hexSizeMeters * (3 / 2) * r;
    return [centerMerc[0] + xOffset, centerMerc[1] + yOffset];
  },

  /**
   * Get hexagon polygon vertices for Leaflet [lat, lon]
   */
  getHexPolygon(cx, cy, hexSizeMeters) {
    const vertices = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (60 * i - 30) * Math.PI / 180;
      const vx = cx + hexSizeMeters * Math.cos(angleRad);
      const vy = cy + hexSizeMeters * Math.sin(angleRad);
      const pt = turf.toWgs84(turf.point([vx, vy]));
      vertices.push([pt.geometry.coordinates[1], pt.geometry.coordinates[0]]);
    }
    return vertices;
  },

  /**
   * Find which hex contains a coordinate
   */
  findHexContaining(destMerc, centerMerc, hexSizeMeters) {
    const dx = destMerc[0] - centerMerc[0];
    const dy = destMerc[1] - centerMerc[1];
    const r = Math.round(dy / (hexSizeMeters * 1.5));
    const q = Math.round((dx / (hexSizeMeters * Math.sqrt(3))) - r / 2);
    return { q, r };
  },

  /**
   * Calculate total hex count for radius
   */
  calculateHexCount(radius) {
    return 3 * radius * (radius + 1) + 1;
  },

  /**
   * Generate cache key
   */
  getCacheKey(srcLat, srcLon, destLat, destLon) {
    return `${srcLat.toFixed(6)}_${srcLon.toFixed(6)}_${destLat.toFixed(6)}_${destLon.toFixed(6)}`;
  },

  /**
   * Convert hex to WGS84 lat/lon
   */
  hexToLatLon(q, r, hexSizeMeters, centerMerc) {
    const [mx, my] = this.axialToMercator(q, r, hexSizeMeters, centerMerc);
    const pt = turf.toWgs84(turf.point([mx, my]));
    return {
      lat: pt.geometry.coordinates[1],
      lon: pt.geometry.coordinates[0]
    };
  }
};
