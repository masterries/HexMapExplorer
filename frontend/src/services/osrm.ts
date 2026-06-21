// Defaults to the public OSRM demo (called directly from the browser). Build
// the SPA with VITE_OSRM_URL=/osrm to use a self-hosted OSRM proxied by nginx
// (see docker-compose.osrm.yml).
const OSRM_BASE =
  (import.meta.env.VITE_OSRM_URL || 'https://router.project-osrm.org') + '/route/v1/driving';

/**
 * Driving time in minutes between source and dest ([lon, lat] each), or null
 * on any failure (non-200, no route, network error, or abort). The caller's
 * loop checks the AbortSignal separately to stop.
 */
export async function fetchOSRM(
  source: [number, number],
  dest: [number, number],
  signal?: AbortSignal,
): Promise<number | null> {
  const url = `${OSRM_BASE}/${source[0]},${source[1]};${dest[0]},${dest[1]}?overview=false`;
  try {
    const res = await fetch(url, { signal });
    if (res.status !== 200) return null;
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].duration / 60.0;
    }
  } catch (err) {
    // Aborts and network errors both fall through to null.
    if ((err as Error)?.name !== 'AbortError') console.error(err);
  }
  return null;
}
