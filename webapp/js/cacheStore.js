/**
 * In-memory cache store for INSTANT data access
 * Syncs with backend for persistence but returns instantly from memory
 */
const CacheStore = {
  cache: new Map(),
  pendingSaves: new Map(),
  saveTimeout: null,

  /**
   * Get value from cache INSTANTLY (synchronous)
   */
  get(key) {
    return this.cache.has(key) ? this.cache.get(key) : null;
  },

  /**
   * Check if key exists (synchronous)
   */
  has(key) {
    return this.cache.has(key);
  },

  /**
   * Set value in memory and queue for backend sync
   */
  set(key, value) {
    this.cache.set(key, value);
    this.pendingSaves.set(key, value);
    this.scheduleSave();
  },

  /**
   * Set multiple values at once
   */
  setMany(entries) {
    Object.entries(entries).forEach(([key, value]) => {
      this.cache.set(key, parseFloat(value));
      this.pendingSaves.set(key, value);
    });
    this.scheduleSave();
  },

  /**
   * Get multiple values (synchronous)
   */
  getMany(keys) {
    const result = {};
    keys.forEach(key => {
      if (this.cache.has(key)) {
        result[key] = this.cache.get(key);
      }
    });
    return result;
  },

  /**
   * Check which keys are missing
   */
  getMissingKeys(keys) {
    return keys.filter(key => !this.cache.has(key));
  },

  /**
   * Schedule background save to backend (debounced)
   */
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.flushToBackend(), 100);
  },

  /**
   * Flush pending saves to backend
   */
  async flushToBackend() {
    if (this.pendingSaves.size === 0) return;

    const data = Object.fromEntries(this.pendingSaves);
    this.pendingSaves.clear();

    try {
      await fetch('cache_layer.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'set', data })
      });
    } catch (error) {
      console.error('Cache sync failed:', error);
      // Re-queue failed saves
      Object.entries(data).forEach(([key, value]) => {
        this.pendingSaves.set(key, value);
      });
    }
  },

  /**
   * Fetch from backend and store in memory
   */
  async fetchFromBackend(keys) {
    if (keys.length === 0) return {};

    try {
      const res = await fetch('cache_layer.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'get', data: keys })
      });
      const data = await res.json();

      // Store in memory for instant future access
      Object.entries(data).forEach(([key, value]) => {
        this.cache.set(key, parseFloat(value));
      });

      return data;
    } catch (error) {
      console.error('Backend fetch failed:', error);
      return {};
    }
  },

  /**
   * Get stats
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingSaves: this.pendingSaves.size
    };
  },

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.pendingSaves.clear();
  }
};
