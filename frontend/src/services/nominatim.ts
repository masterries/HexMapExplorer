export interface GeoResult {
  lat: number;
  lon: number;
}

/** Geocode a free-text query via Nominatim. Returns the first match or null. */
export async function geocode(
  query: string,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  return null;
}
