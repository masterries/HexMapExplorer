/**
 * API service functions
 */
const API = {
  /**
   * Fetch driving time from OSRM
   */
  async fetchOSRM(source, dest) {
    const url = `https://router.project-osrm.org/route/v1/driving/${source[0]},${source[1]};${dest[0]},${dest[1]}?overview=false`;
    try {
      const res = await fetch(url);
      if (res.status !== 200) return null;
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].duration / 60.0;
      }
    } catch (e) {
      console.error('OSRM error:', e);
    }
    return null;
  },

  /**
   * Search location using Nominatim
   */
  async searchLocation(query) {
    if (!query) return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          name: data[0].display_name
        };
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    return null;
  },

  /**
   * Save map config to PHP backend
   */
  async saveConfig(config) {
    try {
      const res = await fetch('save_map.php', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return await res.json();
    } catch (e) {
      console.error('Save error:', e);
      return { status: 'error', message: 'Network error' };
    }
  },

  /**
   * Load history from PHP backend
   */
  async loadHistory() {
    try {
      const res = await fetch('get_history.php');
      return await res.json();
    } catch (e) {
      console.error('Load history error:', e);
      return [];
    }
  }
};

/**
 * Request queue for managing concurrent requests
 */
const RequestQueue = {
  concurrency: 6,
  pending: 0,
  queue: [],

  async add(fn) {
    if (this.pending >= this.concurrency) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.pending++;
    try {
      return await fn();
    } finally {
      this.pending--;
      if (this.queue.length > 0) this.queue.shift()();
    }
  }
};
