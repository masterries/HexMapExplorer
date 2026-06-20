import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { MapApi } from './useLeafletMap';
import type { AppConfig } from '../types';
import { axialToMerc, getCacheKey, toMercator, toWgs84 } from '../services/hexGeo';
import { fetchOSRM } from '../services/osrm';
import { getCache, setCache } from '../api/client';

/** How many OSRM route requests to run at once for uncached hexes. */
const CONCURRENCY = 6;
/** Flush newly-routed times to the DB cache in batches of this size. */
const CACHE_FLUSH_EVERY = 25;

interface HexItem {
  q: number;
  r: number;
  key: string;
  hLat: number;
  hLon: number;
}

/**
 * Builds a commute-time heatmap: for every hex within the radius, compute the
 * driving time from the hex to the workplace and color it green -> red.
 *
 * The expensive routing is cached in Postgres. This first does a single batch
 * cache lookup for the whole grid, paints the cached hexes instantly, then
 * routes only the misses through OSRM with limited concurrency, persisting the
 * results back to the cache. Stop is an AbortController.
 */
export function useHeatmap(
  apiRef: MutableRefObject<MapApi | null>,
  configRef: MutableRefObject<AppConfig>,
) {
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressVisible, setProgressVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatusText('Stopping…');
  }, []);

  const start = useCallback(
    async (override?: Partial<AppConfig>) => {
      const api = apiRef.current;
      if (!api || abortRef.current) return; // not ready / already running

      const cfg: AppConfig = { ...configRef.current, ...override };
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      setIsRunning(true);
      setProgress(0);
      setProgressVisible(true);

      api.setRenderConfig({
        centerLat: cfg.centerLat,
        centerLon: cfg.centerLon,
        hexSize: cfg.hexSize,
        colorMin: cfg.colorMin,
        colorMax: cfg.colorMax,
        showLabels: cfg.showLabels,
      });
      api.clearHexes();

      const hexSizeMeters = cfg.hexSize * 1000;
      const centerMerc = toMercator([cfg.centerLon, cfg.centerLat]);

      // Enumerate every hex within the radius (axial coordinate range).
      const items: HexItem[] = [];
      for (let q = -cfg.radius; q <= cfg.radius; q++) {
        const rLow = Math.max(-cfg.radius, -q - cfg.radius);
        const rHigh = Math.min(cfg.radius, -q + cfg.radius);
        for (let r = rLow; r <= rHigh; r++) {
          const [mx, my] = axialToMerc(q, r, centerMerc, hexSizeMeters);
          const [hLon, hLat] = toWgs84([mx, my]);
          items.push({
            q,
            r,
            hLat,
            hLon,
            key: getCacheKey(hLat, hLon, cfg.destLat, cfg.destLon),
          });
        }
      }
      const total = items.length;

      let done = 0;
      let cachedCount = 0;
      let routedCount = 0;
      const pending: Record<string, number> = {};

      const flushCache = async () => {
        const keys = Object.keys(pending);
        if (keys.length === 0) return;
        const batch: Record<string, number> = {};
        for (const k of keys) {
          batch[k] = pending[k];
          delete pending[k];
        }
        try {
          await setCache(batch, signal);
        } catch {
          /* best-effort */
        }
      };

      try {
        // 1. One batch cache lookup for the whole grid.
        setStatusText(`Checking cache for ${total} hexes…`);
        let cached: Record<string, number> = {};
        try {
          cached = await getCache(
            items.map((i) => i.key),
            signal,
          );
        } catch {
          /* treat as full miss */
        }

        // 2. Paint cached hexes immediately; queue the misses.
        const misses: HexItem[] = [];
        for (const item of items) {
          const t = cached[item.key];
          if (t !== undefined) {
            api.addHex(item.q, item.r, 'done', t);
            done++;
            cachedCount++;
          } else {
            api.addHex(item.q, item.r, 'pending', null);
            misses.push(item);
          }
        }
        setProgress((done / total) * 100);
        setStatusText(`${cachedCount} from cache · routing ${misses.length}…`);

        // 3. Route the misses through OSRM with limited concurrency.
        let next = 0;
        const worker = async () => {
          while (next < misses.length && !signal.aborted) {
            const item = misses[next++];
            const t = await fetchOSRM(
              [item.hLon, item.hLat],
              [cfg.destLon, cfg.destLat],
              signal,
            );
            api.addHex(item.q, item.r, 'done', t);
            if (t !== null) {
              pending[item.key] = t;
              routedCount++;
            }
            done++;
            setProgress((done / total) * 100);
            if (done % 10 === 0) {
              setStatusText(`${done}/${total} hexes · ${cachedCount} cached, ${routedCount} routed`);
            }
            if (Object.keys(pending).length >= CACHE_FLUSH_EVERY) await flushCache();
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, misses.length) }, () => worker()),
        );

        if (signal.aborted) {
          setStatusText(`Stopped at ${done}/${total} hexes`);
        } else {
          setProgress(100);
          setStatusText(`Done · ${total} hexes (${cachedCount} cached, ${routedCount} routed)`);
        }
      } finally {
        await flushCache();
        setIsRunning(false);
        abortRef.current = null;
        api.refreshLabels();
        setTimeout(() => setProgressVisible(false), 3000);
      }
    },
    [apiRef, configRef],
  );

  return { statusText, progress, progressVisible, isRunning, start, stop };
}
