/**
 * Geocoding service using Nominatim (OpenStreetMap)
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/**
 * Search for a location by name
 * @param {string} query - Search query
 * @returns {Promise<{lat: number, lon: number, displayName: string}|null>}
 */
export async function searchLocation(query) {
  if (!query || query.trim() === '') {
    return null;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding search failed:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Search for multiple locations
 * @param {string[]} queries
 * @returns {Promise<Array<{lat: number, lon: number, displayName: string}|null>>}
 */
export async function searchLocations(queries) {
  return Promise.all(queries.map(q => searchLocation(q)));
}
