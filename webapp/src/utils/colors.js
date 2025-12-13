/**
 * Color utility functions for hex grid visualization
 */

/**
 * Get color based on driving time value
 * @param {number|null} duration - Driving time in minutes
 * @param {number} minVal - Minimum value for green
 * @param {number} maxVal - Maximum value for red
 * @returns {string} - RGB color string
 */
export function getColor(duration, minVal = 5, maxVal = 70) {
  if (duration === null || duration === undefined) {
    return '#9ca3af'; // gray-400
  }

  // Clamp values
  let d = duration;
  if (d < minVal) d = minVal;
  if (d > maxVal) d = maxVal;

  const ratio = (d - minVal) / (maxVal - minVal);

  // Green to Red interpolation
  const r = Math.round(ratio * 255);
  const g = Math.round((1 - ratio) * 255);

  return `rgb(${r},${g},0)`;
}

/**
 * Get hex state style based on current state
 * @param {string} state - Hex state (queued, exploring, visited, path)
 * @param {number|null} drivingTime - Driving time for color
 * @param {number} colorMin - Min color threshold
 * @param {number} colorMax - Max color threshold
 * @returns {Object} - Leaflet polygon style object
 */
export function getHexStyle(state, drivingTime = null, colorMin = 5, colorMax = 70) {
  switch (state) {
    case 'queued':
      return {
        color: '#3b82f6',
        weight: 2,
        fillColor: '#93c5fd',
        fillOpacity: 0.4
      };
    case 'exploring':
      return {
        color: '#f59e0b',
        weight: 3,
        fillColor: '#fbbf24',
        fillOpacity: 0.8
      };
    case 'visited':
      return {
        color: '#ffffff',
        weight: 1,
        fillColor: getColor(drivingTime, colorMin, colorMax),
        fillOpacity: 0.4
      };
    case 'path':
      return {
        color: '#dc2626',
        weight: 4,
        fillColor: getColor(drivingTime, colorMin, colorMax),
        fillOpacity: 0.5
      };
    default:
      return {
        color: '#9ca3af',
        weight: 1,
        fillColor: '#e5e7eb',
        fillOpacity: 0.3
      };
  }
}

/**
 * Interpolate between two colors
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {string} - Interpolated color (hex)
 */
export function interpolateColor(color1, color2, factor) {
  const hex = (x) => {
    x = x.toString(16);
    return x.length === 1 ? '0' + x : x;
  };

  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
