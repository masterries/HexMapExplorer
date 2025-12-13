// Geographic utilities for hex grid calculations

const EARTH_RADIUS = 6378137; // meters

// Converts Lat/Lon to Mercator X/Y (Meters)
export function toMercator(lat, lon) {
  const x = EARTH_RADIUS * (lon * Math.PI / 180);
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return [x, y];
}

// Converts Mercator X/Y to Lat/Lon
export function toLatLon(x, y) {
  const lon = (x / EARTH_RADIUS) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
  return [lat, lon];
}

// Generate hexagon polygon vertices in Mercator, return as GeoJSON coordinates
export function getHexPolygon(centerX, centerY, hexSizeMeters) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = angleDeg * Math.PI / 180;
    const vx = centerX + hexSizeMeters * Math.cos(angleRad);
    const vy = centerY + hexSizeMeters * Math.sin(angleRad);
    const ll = toLatLon(vx, vy);
    verts.push([ll[1], ll[0]]); // GeoJSON expects [Lon, Lat]
  }
  verts.push(verts[0]); // Close polygon
  return verts;
}

// Calculate cache key for a route
export function getCacheKey(startLat, startLon, destLat, destLon) {
  return `${startLat.toFixed(6)}_${startLon.toFixed(6)}_${destLat.toFixed(6)}_${destLon.toFixed(6)}`;
}

// Get color for driving time (green -> yellow -> red gradient)
export function getDrivingTimeColor(minutes) {
  if (minutes === null || minutes === undefined) return '#9ca3af'; // gray

  const maxMinutes = 60;
  const ratio = Math.min(minutes / maxMinutes, 1);

  // Green (0 min) -> Yellow (30 min) -> Red (60+ min)
  let r, g;
  if (ratio < 0.5) {
    // Green to Yellow
    const t = ratio * 2;
    r = Math.round(t * 255);
    g = 255;
  } else {
    // Yellow to Red
    const t = (ratio - 0.5) * 2;
    r = 255;
    g = Math.round((1 - t) * 255);
  }

  return `rgb(${r},${g},0)`;
}

// Calculate total hex count for a given radius
export function getHexCount(radius) {
  return 3 * radius * (radius + 1) + 1;
}

// Generate hexagon grid with star-expand order (center outward, ring by ring)
// This ensures we request low driving times first (center) then expand to higher times
export function generateHexGridStarExpand(centerLat, centerLon, destLat, destLon, radius, hexSizeKm) {
  const centerMerc = toMercator(centerLat, centerLon);
  const hexSizeMeters = hexSizeKm * 1000;

  const hexagons = [];
  const hexesByRing = new Map();

  // Generate all hexagons and organize by ring
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(q) + Math.abs(r) + Math.abs(s) <= radius * 2) {
        // Calculate ring number (distance from center)
        const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));

        // Pointy-topped hex: x = size * sqrt(3) * (q + r/2), y = size * 3/2 * r
        const xOffset = hexSizeMeters * Math.sqrt(3) * (q + r / 2);
        const yOffset = hexSizeMeters * (3 / 2) * r;

        const hx = centerMerc[0] + xOffset;
        const hy = centerMerc[1] + yOffset;

        const ll = toLatLon(hx, hy);
        const key = getCacheKey(ll[0], ll[1], destLat, destLon);

        const hex = {
          q,
          r,
          ring,
          centerLL: ll, // [lat, lon]
          mercX: hx,
          mercY: hy,
          key,
          time: null,
          polygon: null // Will be generated on demand
        };

        if (!hexesByRing.has(ring)) {
          hexesByRing.set(ring, []);
        }
        hexesByRing.get(ring).push(hex);
      }
    }
  }

  // Flatten in ring order (0, 1, 2, ... radius)
  // This creates the star-expand pattern: center first, then outward rings
  for (let ringNum = 0; ringNum <= radius; ringNum++) {
    const ringHexes = hexesByRing.get(ringNum) || [];
    // Sort hexes within ring by angle for smooth visual expansion
    ringHexes.sort((a, b) => {
      const angleA = Math.atan2(a.mercY - centerMerc[1], a.mercX - centerMerc[0]);
      const angleB = Math.atan2(b.mercY - centerMerc[1], b.mercX - centerMerc[0]);
      return angleA - angleB;
    });
    hexagons.push(...ringHexes);
  }

  return { hexagons, hexSizeMeters };
}
