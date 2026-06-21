import { useCallback, useRef, useState } from 'react';
import type { AppConfig } from '../types';

const DEFAULT_CONFIG: AppConfig = {
  centerLat: 49.8734,
  centerLon: 6.1727,
  destLat: 49.8734,
  destLon: 6.1727,
  radius: 6,
  hexSize: 0.4,
  showLabels: true,
  colorMin: 5,
  colorMax: 70,
  saveName: '',
  poiCategories: ['supermarket', 'bakery', 'school', 'pharmacy', 'doctor'],
  colorMode: 'commute',
  commuteWeight: 0.6,
  nearbyRadiusKm: 1.0,
  viewMode: 'all',
  priceMetric: 'apartment',
};

/**
 * Sidebar form state. Exposes a ref kept in sync with the latest value so the
 * imperative map + A* hooks can read current config without re-subscribing.
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const configRef = useRef(config);
  configRef.current = config;

  const setField = useCallback(
    <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const patch = useCallback((partial: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  return { config, configRef, setField, patch };
}
