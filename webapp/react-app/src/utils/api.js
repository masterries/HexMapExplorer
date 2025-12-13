// API utilities for routing and caching

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// Request queue for rate limiting
class RequestQueue {
  constructor(concurrency = 6) {
    this.concurrency = concurrency;
    this.pending = 0;
    this.queue = [];
  }

  async add(fn) {
    if (this.pending >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.pending++;
    try {
      return await fn();
    } finally {
      this.pending--;
      if (this.queue.length > 0) {
        this.queue.shift()();
      }
    }
  }
}

export const requestQueue = new RequestQueue(6);

// Fetch driving time from OSRM
// source/dest are [lon, lat]
export async function fetchOSRMRoute(sourceLonLat, destLonLat) {
  const url = `${OSRM_BASE}/${sourceLonLat[0]},${sourceLonLat[1]};${destLonLat[0]},${destLonLat[1]}?overview=false`;

  try {
    const res = await fetch(url);
    if (res.status !== 200) return null;

    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return data.routes[0].duration / 60.0; // Convert to minutes
    }
  } catch (e) {
    console.error('OSRM fetch error:', e);
  }
  return null;
}

// Batch fetch cached driving times
export async function fetchCacheBatch(keys) {
  try {
    const res = await fetch('/api/cache_layer.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', data: keys })
    });
    return await res.json();
  } catch (e) {
    console.error('Cache fetch error:', e);
    return {};
  }
}

// Save batch to cache
export async function saveCacheBatch(data) {
  try {
    await fetch('/api/cache_layer.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', data })
    });
  } catch (e) {
    console.error('Cache save error:', e);
  }
}

// Save map configuration
export async function saveMapConfig(config) {
  try {
    const res = await fetch('/api/save_map.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return await res.json();
  } catch (e) {
    console.error('Save config error:', e);
    return { status: 'error', message: 'Network error' };
  }
}

// Load history
export async function loadHistory() {
  try {
    const res = await fetch('/api/get_history.php');
    return await res.json();
  } catch (e) {
    console.error('Load history error:', e);
    return [];
  }
}
