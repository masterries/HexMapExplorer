/**
 * Backend API service for cache and history operations
 */

const BASE_URL = '';

/**
 * Save map configuration to database
 * @param {Object} config - Map configuration
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function saveMapConfig(config) {
  try {
    const response = await fetch(`${BASE_URL}save_map.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to save map config:', error);
    throw error;
  }
}

/**
 * Load map history from database
 * @returns {Promise<Array>}
 */
export async function loadHistory() {
  try {
    const response = await fetch(`${BASE_URL}get_history.php`);
    return await response.json();
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

/**
 * Fetch cached driving times from backend
 * @param {string[]} keys - Cache keys to fetch
 * @returns {Promise<Object>} - Key-value pairs of cached data
 */
export async function fetchCacheBatch(keys) {
  try {
    const response = await fetch(`${BASE_URL}cache_layer.php`, {
      method: 'POST',
      body: JSON.stringify({ action: 'get', data: keys })
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch cache batch:', error);
    return {};
  }
}

/**
 * Save driving times to backend cache
 * @param {Object} data - Key-value pairs to cache
 * @returns {Promise<void>}
 */
export async function saveCacheBatch(data) {
  try {
    await fetch(`${BASE_URL}cache_layer.php`, {
      method: 'POST',
      body: JSON.stringify({ action: 'set', data })
    });
  } catch (error) {
    console.error('Failed to save cache batch:', error);
  }
}
