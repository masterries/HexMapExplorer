/**
 * In-memory cache store for instant data access
 * Syncs with backend for persistence but returns instantly from memory
 */

class CacheStore {
  constructor() {
    this.cache = new Map();
    this.pendingSaves = new Map();
    this.saveTimeout = null;
    this.isInitialized = false;
  }

  /**
   * Get value from cache instantly (synchronous)
   * @param {string} key - Cache key
   * @returns {number|null} - Cached value or null
   */
  get(key) {
    return this.cache.has(key) ? this.cache.get(key) : null;
  }

  /**
   * Check if key exists in cache (synchronous)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Set value in cache and queue for backend sync
   * @param {string} key - Cache key
   * @param {number} value - Value to cache
   */
  set(key, value) {
    this.cache.set(key, value);
    this.pendingSaves.set(key, value);
    this.scheduleSave();
  }

  /**
   * Set multiple values at once
   * @param {Object} entries - Key-value pairs to cache
   */
  setMany(entries) {
    Object.entries(entries).forEach(([key, value]) => {
      this.cache.set(key, value);
      this.pendingSaves.set(key, value);
    });
    this.scheduleSave();
  }

  /**
   * Get multiple values at once (synchronous)
   * @param {string[]} keys - Array of cache keys
   * @returns {Object} - Key-value pairs for found entries
   */
  getMany(keys) {
    const result = {};
    keys.forEach(key => {
      if (this.cache.has(key)) {
        result[key] = this.cache.get(key);
      }
    });
    return result;
  }

  /**
   * Check which keys are missing from cache
   * @param {string[]} keys - Array of cache keys
   * @returns {string[]} - Keys not in cache
   */
  getMissingKeys(keys) {
    return keys.filter(key => !this.cache.has(key));
  }

  /**
   * Schedule background save to backend
   */
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves - batch them together
    this.saveTimeout = setTimeout(() => {
      this.flushToBackend();
    }, 100);
  }

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
      console.error('Failed to sync cache to backend:', error);
      // Re-queue failed saves
      Object.entries(data).forEach(([key, value]) => {
        this.pendingSaves.set(key, value);
      });
    }
  }

  /**
   * Load values from backend into memory cache
   * @param {string[]} keys - Keys to fetch from backend
   * @returns {Object} - Fetched key-value pairs
   */
  async fetchFromBackend(keys) {
    if (keys.length === 0) return {};

    try {
      const res = await fetch('cache_layer.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'get', data: keys })
      });
      const data = await res.json();

      // Store fetched values in memory for instant future access
      Object.entries(data).forEach(([key, value]) => {
        this.cache.set(key, parseFloat(value));
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch from backend:', error);
      return {};
    }
  }

  /**
   * Get value - checks memory first, then backend
   * Returns instantly if in memory, otherwise fetches async
   * @param {string} key - Cache key
   * @returns {Promise<number|null>}
   */
  async getAsync(key) {
    // Instant return if in memory
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Fetch from backend
    const data = await this.fetchFromBackend([key]);
    return data[key] !== undefined ? parseFloat(data[key]) : null;
  }

  /**
   * Get multiple values - checks memory first, fetches missing from backend
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} - All found key-value pairs
   */
  async getManyAsync(keys) {
    const result = {};
    const missingKeys = [];

    // First, get all we have in memory (instant)
    keys.forEach(key => {
      if (this.cache.has(key)) {
        result[key] = this.cache.get(key);
      } else {
        missingKeys.push(key);
      }
    });

    // If we have everything, return immediately
    if (missingKeys.length === 0) {
      return result;
    }

    // Fetch missing from backend
    const backendData = await this.fetchFromBackend(missingKeys);
    Object.entries(backendData).forEach(([key, value]) => {
      result[key] = parseFloat(value);
    });

    return result;
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    this.pendingSaves.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingSaves: this.pendingSaves.size
    };
  }
}

// Singleton instance for global access
export const cacheStore = new CacheStore();
export default cacheStore;
