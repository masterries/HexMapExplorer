import { useState, useCallback, useRef } from 'react';
import { generateHexGridStarExpand, getHexPolygon } from '../utils/geo';
import { fetchCacheBatch, fetchOSRMRoute, saveCacheBatch, requestQueue } from '../utils/api';

export function useHexGrid() {
  const [hexagons, setHexagons] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, ring: 0, maxRing: 0 });
  const [status, setStatus] = useState('');
  const abortRef = useRef(false);

  const generateGrid = useCallback(async ({
    centerLat, centerLon, destLat, destLon, radius, hexSize
  }) => {
    setIsGenerating(true);
    setHexagons([]);
    setStatus('Generating hexagon grid...');
    abortRef.current = false;

    try {
      // Generate hex grid in star-expand order (center outward)
      const { hexagons: gridHexes, hexSizeMeters } = generateHexGridStarExpand(
        centerLat, centerLon, destLat, destLon, radius, hexSize
      );

      const maxRing = Math.max(...gridHexes.map(h => h.ring));
      setProgress({ current: 0, total: gridHexes.length, ring: 0, maxRing });

      // Check cache first
      setStatus('Checking cache...');
      const keys = gridHexes.map(h => h.key);
      const cachedData = await fetchCacheBatch(keys);

      // Apply cached values and generate polygons
      const updatedHexes = gridHexes.map(hex => ({
        ...hex,
        time: cachedData[hex.key] !== undefined ? parseFloat(cachedData[hex.key]) : null,
        polygon: getHexPolygon(hex.mercX, hex.mercY, hexSizeMeters)
      }));

      // Show cached hexes immediately
      const cachedHexes = updatedHexes.filter(h => h.time !== null);
      if (cachedHexes.length > 0) {
        setHexagons(cachedHexes);
      }

      // Find missing hexes
      const missingHexes = updatedHexes.filter(h => h.time === null);

      if (missingHexes.length === 0) {
        setStatus('Complete (all cached)');
        setHexagons(updatedHexes);
        setProgress({ current: updatedHexes.length, total: updatedHexes.length, ring: maxRing, maxRing });
        setIsGenerating(false);
        return;
      }

      // Fetch missing hexes in star-expand order (ring by ring)
      setStatus(`Fetching ${missingHexes.length} routes (center outward)...`);

      const newCache = {};
      let completed = cachedHexes.length;
      const allHexes = [...cachedHexes];

      // Group missing by ring for progress tracking
      const missingByRing = new Map();
      missingHexes.forEach(hex => {
        if (!missingByRing.has(hex.ring)) missingByRing.set(hex.ring, []);
        missingByRing.get(hex.ring).push(hex);
      });

      // Process ring by ring (star-expand pattern)
      const rings = [...missingByRing.keys()].sort((a, b) => a - b);

      for (const ringNum of rings) {
        if (abortRef.current) break;

        const ringHexes = missingByRing.get(ringNum);
        setStatus(`Ring ${ringNum}/${maxRing}: Fetching ${ringHexes.length} routes...`);

        // Process all hexes in this ring in parallel (within queue limits)
        const ringPromises = ringHexes.map(hex =>
          requestQueue.add(async () => {
            if (abortRef.current) return null;

            // OSRM expects [lon, lat], our centerLL is [lat, lon]
            const time = await fetchOSRMRoute(
              [hex.centerLL[1], hex.centerLL[0]],
              [destLon, destLat]
            );

            if (time !== null) {
              hex.time = time;
              newCache[hex.key] = time;
            }

            completed++;
            setProgress({
              current: completed,
              total: gridHexes.length,
              ring: ringNum,
              maxRing
            });

            return hex;
          })
        );

        const results = await Promise.all(ringPromises);

        // Add completed hexes from this ring
        const completedHexes = results.filter(h => h && h.time !== null);
        allHexes.push(...completedHexes);
        setHexagons([...allHexes]);

        // Small delay between rings for visual effect
        if (ringNum < maxRing && !abortRef.current) {
          await new Promise(r => setTimeout(r, 50));
        }
      }

      // Save new cache entries
      if (Object.keys(newCache).length > 0) {
        setStatus('Saving to cache...');
        await saveCacheBatch(newCache);
      }

      setStatus(`Complete: ${allHexes.length} hexagons`);
      setProgress({ current: allHexes.length, total: gridHexes.length, ring: maxRing, maxRing });

    } catch (error) {
      console.error('Grid generation error:', error);
      setStatus('Error generating grid');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
    setStatus('Aborted');
    setIsGenerating(false);
  }, []);

  const clear = useCallback(() => {
    setHexagons([]);
    setProgress({ current: 0, total: 0, ring: 0, maxRing: 0 });
    setStatus('');
  }, []);

  return {
    hexagons,
    isGenerating,
    progress,
    status,
    generateGrid,
    abort,
    clear
  };
}
