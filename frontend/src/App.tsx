import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppConfig } from './state/useAppConfig';
import { useLeafletMap } from './hooks/useLeafletMap';
import { useHeatmap } from './hooks/useHeatmap';
import { geocode } from './services/nominatim';
import { gridBbox } from './services/poi';
import { getHistory, getLuPrices, getPois, saveMap } from './api/client';
import type { AppConfig, MapRequest, PointKind, RankedHex } from './types';

import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { MapView } from './components/MapView';
import { MobileChrome } from './components/MobileChrome';
import { DarkModeToggle } from './components/DarkModeToggle';
import { PointPicker } from './components/PointPicker';
import { GridControls } from './components/GridControls';
import { GenerateControls } from './components/GenerateControls';
import { PoiControls } from './components/PoiControls';
import { LiveabilityPanel } from './components/LiveabilityPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { InfoFooter } from './components/InfoFooter';
import { AdminPanel } from './components/AdminPanel';
import { PricePanel } from './components/PricePanel';
import { buildCommuneIndex, loadCommuneGeo, type CommuneIndex } from './services/realEstate';

const round4 = (n: number) => Number(n.toFixed(4));

export default function App() {
  const { config, configRef, setField, patch } = useAppConfig();

  const [isDark, setIsDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [history, setHistory] = useState<MapRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiStatus, setPoiStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [ranking, setRanking] = useState<RankedHex[]>([]);
  const [activeTab, setActiveTab] = useState('trip');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceStatus, setPriceStatus] = useState('');
  const [priceSource, setPriceSource] = useState('');
  const [priceLoaded, setPriceLoaded] = useState(false);
  const communeIndexRef = useRef<CommuneIndex | null>(null);

  // --- Map (imperative) ---
  const [pickFlow, setPickFlowState] = useState<'idle' | 'center' | 'dest'>('idle');
  const pickFlowRef = useRef<'idle' | 'center' | 'dest'>('idle');
  const setPickFlow = useCallback((v: 'idle' | 'center' | 'dest') => {
    pickFlowRef.current = v;
    setPickFlowState(v);
  }, []);

  const applyPickedCoords = useCallback(
    (kind: PointKind, lat: number, lon: number) => {
      if (kind === 'center') patch({ centerLat: round4(lat), centerLon: round4(lon) });
      else patch({ destLat: round4(lat), destLon: round4(lon) });
    },
    [patch],
  );

  // Map callbacks are delegated through a ref so the click handler can call
  // apiRef (declared just below) without a forward-reference.
  const mapHandlersRef = useRef({
    onPick: (_k: PointKind, _la: number, _lo: number) => {},
    onDrag: (_k: PointKind, _la: number, _lo: number) => {},
  });

  const { containerRef, apiRef } = useLeafletMap({
    onPick: (k, la, lo) => mapHandlersRef.current.onPick(k, la, lo),
    onMarkerDrag: (k, la, lo) => mapHandlersRef.current.onDrag(k, la, lo),
  });

  // Dragging a marker only updates its coordinates.
  mapHandlersRef.current.onDrag = applyPickedCoords;
  // A map-click pick updates coords and advances the guided "pick both" flow.
  mapHandlersRef.current.onPick = (kind, lat, lon) => {
    applyPickedCoords(kind, lat, lon);
    const flow = pickFlowRef.current;
    if (flow === 'center' && kind === 'center') {
      setPickFlow('dest');
      apiRef.current?.enablePick('dest');
    } else if (flow === 'dest' && kind === 'dest') {
      setPickFlow('idle');
    }
  };

  const startPickBoth = useCallback(() => {
    setMobileOpen(false);
    setPickFlow('center');
    apiRef.current?.enablePick('center');
  }, [apiRef, setPickFlow]);

  const cancelPickFlow = useCallback(() => {
    setPickFlow('idle');
    apiRef.current?.cancelPick();
  }, [apiRef, setPickFlow]);

  const { statusText, progress, progressVisible, isRunning, start, stop } =
    useHeatmap(apiRef, configRef);

  // --- Dark mode: sync body classes + map tiles + storage ---
  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark-mode', isDark);
    apiRef.current?.setDark(isDark);
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark, apiRef]);

  // --- Liveability scoring ---
  const refreshRanking = useCallback(() => {
    setRanking(apiRef.current?.getRanking(5) ?? []);
  }, [apiRef]);

  // Push the score config to the map (recolors hexes) and re-rank whenever the
  // mode, weighting, or selected categories change.
  useEffect(() => {
    // Debounced: dragging the weight/radius sliders shouldn't re-score every
    // hex on each tick (slow for large grids) — only after the value settles.
    const id = window.setTimeout(() => {
      apiRef.current?.setScoreConfig({
        mode: config.colorMode,
        commuteWeight: config.commuteWeight,
        categories: config.poiCategories,
        nearbyRadiusM: config.nearbyRadiusKm * 1000,
      });
      refreshRanking();
    }, 120);
    return () => window.clearTimeout(id);
  }, [
    config.colorMode,
    config.commuteWeight,
    config.poiCategories,
    config.nearbyRadiusKm,
    apiRef,
    refreshRanking,
  ]);

  // Sync the map view mode (show all / navigate).
  useEffect(() => {
    apiRef.current?.setViewMode(config.viewMode);
  }, [config.viewMode, apiRef]);

  // Sync the active price metric (apartment/house) to the map.
  useEffect(() => {
    apiRef.current?.setPriceMetric(config.priceMetric);
  }, [config.priceMetric, apiRef]);

  const handleFocusHex = useCallback(
    (q: number, r: number) => {
      apiRef.current?.focusHex(q, r);
      setMobileOpen(false);
    },
    [apiRef],
  );

  // --- Points of interest (Overpass) ---
  // Loads POIs for the whole grid bounding box (covers every hex + 1 km
  // padding) so the liveability score is complete. Called on demand and
  // automatically after generating.
  const handlePoiLoad = useCallback(
    async (force = false): Promise<void> => {
      const cfg = configRef.current;
      if (cfg.poiCategories.length === 0) {
        setPoiStatus('Select at least one category');
        return;
      }
      setPoiLoading(true);
      setPoiStatus(force ? 'Force-reloading from OpenStreetMap…' : 'Loading from OpenStreetMap…');
      try {
        const bbox = gridBbox(cfg.centerLat, cfg.centerLon, cfg.radius, cfg.hexSize);
        const { pois, cached } = await getPois(bbox, cfg.poiCategories, force);
        apiRef.current?.setPois(pois);
        setPoiStatus(`${pois.length} POIs${cached ? ' (cached)' : ''}`);
        refreshRanking();
      } catch {
        setPoiStatus('Failed to load POIs');
      } finally {
        setPoiLoading(false);
      }
    },
    [configRef, apiRef, refreshRanking],
  );

  // --- Real-estate prices (Luxembourg, commune-level) ---
  // Fetches the parsed price series from the backend and the commune
  // boundaries (once), then hands both to the map, which assigns each hex its
  // containing commune by point-in-polygon.
  const handlePriceLoad = useCallback(
    async (force = false): Promise<void> => {
      setPriceLoading(true);
      setPriceStatus(force ? 'Reloading prices…' : 'Loading prices…');
      try {
        if (!communeIndexRef.current) {
          communeIndexRef.current = buildCommuneIndex(await loadCommuneGeo());
        }
        const prices = await getLuPrices(force);
        apiRef.current?.setPriceData(prices, communeIndexRef.current);
        setPriceSource(prices.source);
        setPriceLoaded(true);
        const last = prices.years[prices.years.length - 1];
        setPriceStatus(
          `${prices.communes.length} communes · ${prices.years[0]}–${last}${prices.cached ? ' (cached)' : ''}`,
        );
      } catch {
        setPriceStatus('Failed to load prices');
      } finally {
        setPriceLoading(false);
      }
    },
    [apiRef],
  );

  // --- History ---
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getHistory());
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    const c = configRef.current;
    const res = await saveMap({
      name: c.saveName || 'Unnamed',
      centerLat: c.centerLat,
      centerLon: c.centerLon,
      destLat: c.destLat,
      destLon: c.destLon,
      radius: c.radius,
      hexSize: c.hexSize,
    });
    if (res.status === 'success') {
      await loadHistory();
      return true;
    }
    return false;
  }, [configRef, loadHistory]);

  const handleLoadItem = useCallback(
    async (item: MapRequest) => {
      const next: Partial<AppConfig> = {
        centerLat: item.centerLat,
        centerLon: item.centerLon,
        destLat: item.destLat,
        destLon: item.destLon,
        radius: item.radius,
        hexSize: item.hexSize ?? 0.4,
      };
      patch(next);
      const api = apiRef.current;
      api?.setMarker('center', item.centerLat, item.centerLon);
      api?.setMarker('dest', item.destLat, item.destLon);
      api?.flyTo(item.centerLat, item.centerLon, 11);
      setMobileOpen(false);
      setGenerating(true);
      try {
        await start(next);
        if (configRef.current.poiCategories.length > 0) {
          await handlePoiLoad();
        }
        refreshRanking();
      } finally {
        setGenerating(false);
      }
    },
    [patch, apiRef, start, handlePoiLoad, configRef, refreshRanking],
  );

  // --- Geocode search ---
  const handleSearch = useCallback(
    async (kind: PointKind, query: string): Promise<boolean> => {
      const result = await geocode(query);
      if (!result) return false;
      const lat = round4(result.lat);
      const lon = round4(result.lon);
      if (kind === 'center') patch({ centerLat: lat, centerLon: lon });
      else patch({ destLat: lat, destLon: lon });
      apiRef.current?.setMarker(kind, lat, lon);
      apiRef.current?.flyTo(lat, lon, 13);
      return true;
    },
    [patch, apiRef],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await start();
      // Auto-load POIs for the whole grid so the liveability score is complete
      // for every hex without a separate manual step.
      if (configRef.current.poiCategories.length > 0) {
        await handlePoiLoad();
      }
      refreshRanking();
    } finally {
      setGenerating(false);
    }
  }, [start, handlePoiLoad, configRef, refreshRanking]);

  const handleToggleCategory = useCallback(
    (key: string) => {
      const cats = configRef.current.poiCategories;
      const next = cats.includes(key) ? cats.filter((c) => c !== key) : [...cats, key];
      setField('poiCategories', next);
    },
    [configRef, setField],
  );

  const handlePoiClear = useCallback(() => {
    apiRef.current?.clearPois();
    setPoiStatus('');
  }, [apiRef]);

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden font-sans text-gray-800">
      <MobileChrome open={mobileOpen} onToggle={() => setMobileOpen((v) => !v)} />

      <Sidebar open={mobileOpen}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <button
              className="mobile-close-btn p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={() => setMobileOpen(false)}
              style={{ display: 'none' }}
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              HexMap <span className="font-light text-gray-500">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdminOpen(true)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Cache admin"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <DarkModeToggle isDark={isDark} onToggle={() => setIsDark((v) => !v)} />
          </div>
        </div>

        <TabBar
          tabs={[
            { key: 'trip', label: 'Trip' },
            { key: 'pois', label: 'POIs' },
            { key: 'score', label: 'Score' },
            { key: 'prices', label: 'Immo' },
            { key: 'saved', label: 'Saved' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        <div className="space-y-6 flex-grow">
          {activeTab === 'trip' && (
            <>
          <div className="space-y-4">
            <PointPicker
              kind="center"
              label="Search Center"
              lat={config.centerLat}
              lon={config.centerLon}
              onLatChange={(v) => setField('centerLat', v)}
              onLonChange={(v) => setField('centerLon', v)}
              onSearch={(q) => handleSearch('center', q)}
              onPick={() => apiRef.current?.enablePick('center')}
            />
            <PointPicker
              kind="dest"
              label="Workplace"
              lat={config.destLat}
              lon={config.destLon}
              onLatChange={(v) => setField('destLat', v)}
              onLonChange={(v) => setField('destLon', v)}
              onSearch={(q) => handleSearch('dest', q)}
              onPick={() => apiRef.current?.enablePick('dest')}
            />
          </div>

          <button
            onClick={startPickBoth}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pick both points on the map
          </button>

          <GridControls
            radius={config.radius}
            hexSize={config.hexSize}
            showLabels={config.showLabels}
            colorMin={config.colorMin}
            colorMax={config.colorMax}
            onRadiusChange={(v) => setField('radius', v)}
            onHexSizeChange={(v) => setField('hexSize', v)}
            onShowLabelsChange={(v) => {
              setField('showLabels', v);
              apiRef.current?.refreshLabels();
            }}
            onColorMinChange={(v) => setField('colorMin', v)}
            onColorMaxChange={(v) => setField('colorMax', v)}
          />

          <GenerateControls
            isRunning={isRunning}
            generating={generating}
            statusText={statusText}
            progress={progress}
            progressVisible={progressVisible}
            poiLoading={poiLoading}
            poiStatus={poiStatus}
            colorMin={config.colorMin}
            colorMax={config.colorMax}
            colorMode={config.colorMode}
            onGenerate={handleGenerate}
            onStop={stop}
          />
            </>
          )}

          {activeTab === 'pois' && (
          <PoiControls
            selected={config.poiCategories}
            onToggleCategory={handleToggleCategory}
            onLoad={() => void handlePoiLoad()}
            onClear={handlePoiClear}
            loading={poiLoading}
            status={poiStatus}
          />
          )}

          {activeTab === 'score' && (
          <LiveabilityPanel
            colorMode={config.colorMode}
            viewMode={config.viewMode}
            commuteWeight={config.commuteWeight}
            nearbyRadiusKm={config.nearbyRadiusKm}
            ranking={ranking}
            onColorModeChange={(m) => setField('colorMode', m)}
            onViewModeChange={(m) => setField('viewMode', m)}
            onCommuteWeightChange={(w) => setField('commuteWeight', w)}
            onNearbyRadiusChange={(v) => setField('nearbyRadiusKm', v)}
            onFocusHex={handleFocusHex}
          />
          )}

          {activeTab === 'prices' && (
          <PricePanel
            loaded={priceLoaded}
            loading={priceLoading}
            status={priceStatus}
            metric={config.priceMetric}
            source={priceSource}
            onLoad={() => void handlePriceLoad()}
            onMetricChange={(m) => setField('priceMetric', m)}
          />
          )}

          {activeTab === 'saved' && (
          <HistoryPanel
            saveName={config.saveName}
            onSaveNameChange={(v) => setField('saveName', v)}
            onSave={handleSave}
            history={history}
            historyLoading={historyLoading}
            onRefresh={() => void loadHistory()}
            onLoad={handleLoadItem}
          />
          )}
        </div>
      </Sidebar>

      <MapView containerRef={containerRef} />

      {pickFlow !== 'idle' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 bg-white dark:bg-gray-800 shadow-xl rounded-full pl-4 pr-2 py-2 border border-gray-200 dark:border-gray-700">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-100">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {pickFlow === 'center'
              ? 'Click the map to set your Search Center'
              : 'Now click the map to set your Workplace'}
          </span>
          <button
            onClick={cancelPickFlow}
            className="text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-full px-3 py-1"
          >
            Cancel
          </button>
        </div>
      )}

      <InfoFooter />

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onForceReload={() => handlePoiLoad(true)}
      />
    </div>
  );
}
