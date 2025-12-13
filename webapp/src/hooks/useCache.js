/**
 * React hook for instant caching with background sync
 */

import { useCallback, useRef } from 'react';
import { cacheStore } from '../store/cacheStore';
import { fetchDrivingTime } from '../services/osrm';
import { getCacheKey, hexToLatLon } from '../utils/hexGrid';
import * as turf from '@turf/turf';

/**
 * Hook for managing driving time cache with instant access
 * @returns {Object} Cache operations
 */
export function useCache() {
  const pendingRequests = useRef(new Map());

  /**
   * Get driving time - returns instantly from cache if available
   * Otherwise fetches from OSRM and caches result
   * @param {number} hexQ
   * @param {number} hexR
   * @param {number} hexSizeMeters
   * @param {number[]} centerMerc
   * @param {number} destLat
   * @param {number} destLon
   * @returns {Promise<number|null>}
   */
  const getDrivingTime = useCallback(async (hexQ, hexR, hexSizeMeters, centerMerc, destLat, destLon) => {
    // Get hex center coordinates
    const { lat: hexLat, lon: hexLon } = hexToLatLon(hexQ, hexR, hexSizeMeters, centerMerc);
    const cacheKey = getCacheKey(hexLat, hexLon, destLat, destLon);

    // INSTANT: Check in-memory cache first
    const cached = cacheStore.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check if we already have a pending request for this key
    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = (async () => {
      // Try backend cache
      const backendData = await cacheStore.fetchFromBackend([cacheKey]);
      if (backendData[cacheKey] !== undefined) {
        pendingRequests.current.delete(cacheKey);
        return parseFloat(backendData[cacheKey]);
      }

      // Fetch from OSRM
      const time = await fetchDrivingTime([hexLon, hexLat], [destLon, destLat]);

      if (time !== null) {
        // Store in memory for instant future access + queue for backend sync
        cacheStore.set(cacheKey, time);
      }

      pendingRequests.current.delete(cacheKey);
      return time;
    })();

    pendingRequests.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  /**
   * Prefetch driving times for multiple hexes
   * @param {Array<{q: number, r: number}>} hexes
   * @param {number} hexSizeMeters
   * @param {number[]} centerMerc
   * @param {number} destLat
   * @param {number} destLon
   */
  const prefetchDrivingTimes = useCallback(async (hexes, hexSizeMeters, centerMerc, destLat, destLon) => {
    // Generate all cache keys
    const keys = hexes.map(({ q, r }) => {
      const { lat, lon } = hexToLatLon(q, r, hexSizeMeters, centerMerc);
      return getCacheKey(lat, lon, destLat, destLon);
    });

    // Find which ones we're missing
    const missingKeys = cacheStore.getMissingKeys(keys);

    if (missingKeys.length === 0) return;

    // Fetch missing from backend
    await cacheStore.fetchFromBackend(missingKeys);
  }, []);

  /**
   * Check if a driving time is already cached (synchronous)
   * @param {number} hexQ
   * @param {number} hexR
   * @param {number} hexSizeMeters
   * @param {number[]} centerMerc
   * @param {number} destLat
   * @param {number} destLon
   * @returns {boolean}
   */
  const isCached = useCallback((hexQ, hexR, hexSizeMeters, centerMerc, destLat, destLon) => {
    const { lat, lon } = hexToLatLon(hexQ, hexR, hexSizeMeters, centerMerc);
    const cacheKey = getCacheKey(lat, lon, destLat, destLon);
    return cacheStore.has(cacheKey);
  }, []);

  /**
   * Get cached value synchronously (returns null if not cached)
   * @param {number} hexQ
   * @param {number} hexR
   * @param {number} hexSizeMeters
   * @param {number[]} centerMerc
   * @param {number} destLat
   * @param {number} destLon
   * @returns {number|null}
   */
  const getCachedValue = useCallback((hexQ, hexR, hexSizeMeters, centerMerc, destLat, destLon) => {
    const { lat, lon } = hexToLatLon(hexQ, hexR, hexSizeMeters, centerMerc);
    const cacheKey = getCacheKey(lat, lon, destLat, destLon);
    return cacheStore.get(cacheKey);
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cacheStore.getStats();
  }, []);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    cacheStore.clear();
  }, []);

  return {
    getDrivingTime,
    prefetchDrivingTimes,
    isCached,
    getCachedValue,
    getCacheStats,
    clearCache
  };
}

export default useCache;
