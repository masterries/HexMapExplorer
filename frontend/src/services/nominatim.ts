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

export interface GeoSuggestion {
  lat: number;
  lon: number;
  label: string;
}

/**
 * Up to ~6 geocoding suggestions for the focus-search autocomplete. Debounce
 * + abort at the call site to respect the Nominatim usage policy (~1 req/s).
 */
export async function geocodeSuggest(
  query: string,
  signal?: AbortSignal,
): Promise<GeoSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!Array.isArray(data)) return [];
  return data.map((d) => ({
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    label: d.display_name,
  }));
}
