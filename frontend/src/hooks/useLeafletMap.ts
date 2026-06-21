import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  axialToMerc,
  getColor,
  hexCount,
  hexKey,
  hexPolygonLatLng,
  toMercator,
  toWgs84,
  type MercatorXY,
} from '../services/hexGeo';
import {
  approxDistMeters,
  buildPoiIndex,
  NEARBY_RADIUS_M,
  POI_COLORS,
  POI_LABELS,
  type PoiIndex,
} from '../services/poi';
import { liveabilityScore, scoreColor, type HexScore } from '../services/liveability';
import {
  firstValue,
  indexPricesByCommune,
  latestValue,
  normName,
  seriesFor,
  sparklineSvg,
  type CommuneIndex,
} from '../services/realEstate';
import { nearestDeTown } from '../services/germanPrices';

/** Above this hex count, permanent labels are skipped (too dense + slow). */
const LABEL_CAP = 800;
import type {
  ColorMode,
  CommunePrices,
  HexDetail,
  HexState,
  LuPrices,
  PointKind,
  Poi,
  PriceMetric,
  RankedHex,
  ViewMode,
} from '../types';

export interface ScoreConfig {
  mode: ColorMode;
  commuteWeight: number;
  categories: string[];
  categoryWeights: Record<string, number>;
  /** Radius (meters) within which amenities count. */
  nearbyRadiusM: number;
}

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIB = '&copy; CartoDB &copy; OSRM';
const INITIAL_VIEW: [number, number] = [49.8734, 6.1727];

/** Geometry + styling context for hex rendering, set at generation start. */
export interface RenderConfig {
  centerLat: number;
  centerLon: number;
  hexSize: number; // km
  colorMin: number;
  colorMax: number;
  showLabels: boolean;
  radius: number;
}

/** Imperative handle over the Leaflet map. Stable for the map's lifetime. */
export interface MapApi {
  setMarker(kind: PointKind, lat: number, lon: number): void;
  flyTo(lat: number, lon: number, zoom?: number): void;
  enablePick(kind: PointKind): void;
  cancelPick(): void;
  setDark(isDark: boolean): void;
  setRenderConfig(cfg: RenderConfig): void;
  clearHexes(): void;
  addHex(q: number, r: number, state: HexState, drivingTime: number | null): void;
  refreshLabels(): void;
  setPois(pois: Poi[]): void;
  clearPois(): void;
  setScoreConfig(cfg: Partial<ScoreConfig>): void;
  getRanking(limit: number): RankedHex[];
  focusHex(q: number, r: number): void;
  setViewMode(mode: ViewMode): void;
  setPriceData(prices: LuPrices, index: CommuneIndex): void;
  clearPriceData(): void;
  setPriceMetric(metric: PriceMetric): void;
  /** Performance mode: drop on-hex labels entirely (frees their DOM). */
  setPerformanceMode(on: boolean): void;
}

interface UseLeafletMapOptions {
  onPick(kind: PointKind, lat: number, lon: number): void;
  onMarkerDrag(kind: PointKind, lat: number, lon: number): void;
  /** Fired when a hex is clicked (detail) or deselected (null). */
  onHexSelect(detail: HexDetail | null): void;
}

const DEST_PIN_HTML =
  '<svg viewBox="0 0 24 24" width="26" height="26" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M12 0C7 0 3 4 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9z" fill="#ef4444" stroke="white" stroke-width="1.5"/>' +
  '<circle cx="12" cy="9" r="3" fill="white"/></svg>';

const CENTER_DOT_HTML =
  "<div style='background-color:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);'></div>";

/**
 * Creates and owns the Leaflet map once (guarded against React StrictMode's
 * double-invoke). Returns a container ref to attach to the map div and an
 * apiRef exposing imperative methods. React never owns individual hex layers.
 */
export function useLeafletMap(options: UseLeafletMapOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<MapApi | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Guard StrictMode double-init: cleanup nulls apiRef + removes the map.
    if (!containerRef.current || apiRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView(
      INITIAL_VIEW,
      11,
    );
    L.control.zoom({ position: 'topright' }).addTo(map);
    let tileLayer = L.tileLayer(LIGHT_TILES, { attribution: TILE_ATTRIB }).addTo(map);

    const centerIcon = L.divIcon({
      className: 'custom-div-icon',
      html: CENTER_DOT_HTML,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    const destIcon = L.divIcon({
      className: 'custom-div-icon',
      html: DEST_PIN_HTML,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    const centerMarker = L.marker(INITIAL_VIEW, {
      draggable: true,
      icon: centerIcon,
    }).addTo(map);
    const destMarker = L.marker(INITIAL_VIEW, {
      draggable: true,
      icon: destIcon,
    }).addTo(map);

    centerMarker.on('dragend', (e) => {
      const p = (e.target as L.Marker).getLatLng();
      optionsRef.current.onMarkerDrag('center', p.lat, p.lng);
    });
    destMarker.on('dragend', (e) => {
      const p = (e.target as L.Marker).getLatLng();
      optionsRef.current.onMarkerDrag('dest', p.lat, p.lng);
    });

    let pickMode: PointKind | null = null;
    let viewMode: ViewMode = 'all';
    let selectedKey: string | null = null;
    let selectionCircle: L.Circle | null = null;
    let emphasisApplied = false; // are hexes/POIs currently faded for navigate?
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickMode) {
        const kind = pickMode;
        const { lat, lng } = e.latlng;
        if (kind === 'center') centerMarker.setLatLng(e.latlng);
        else destMarker.setLatLng(e.latlng);
        // Reset before onPick so a follow-up enablePick() (pick-both) sticks.
        pickMode = null;
        map.getContainer().style.cursor = '';
        optionsRef.current.onPick(kind, lat, lng);
        return;
      }
      // Background click in navigate mode clears the focused hex.
      if (viewMode === 'navigate' && selectedKey != null) {
        selectedKey = null;
        map.closePopup();
        emphasize();
        optionsRef.current.onHexSelect(null);
      }
    });

    // --- Hex rendering state (imperative, outside React) ---
    const hexLayerGroup = L.layerGroup().addTo(map);
    const hexLayers: Record<string, L.Polygon> = {};

    // POI markers live in their own layer, independent of the hex grid.
    const poiLayerGroup = L.layerGroup().addTo(map);
    let currentPois: Poi[] = [];
    let poiIndex: PoiIndex | null = null;

    // --- Real-estate price layer (commune-level asking prices) ---
    let priceData: LuPrices | null = null;
    let priceByCommune = new Map<string, CommunePrices>();
    let communeIndex: CommuneIndex | null = null;
    let priceMetric: PriceMetric = 'apartment';
    let priceMin = 0;
    let priceMax = 1;
    // hexKey -> containing commune display name (or null if outside Luxembourg).
    const hexCommune: Record<string, string | null> = {};
    // Performance mode: skip the permanent on-hex labels (the costly part).
    let performanceMode = false;

    // Per-hex data kept for re-coloring and ranking by liveability score.
    const hexData: Record<
      string,
      { q: number; r: number; hLat: number; hLon: number; time: number | null }
    > = {};
    // Cached per-hex score from the last recolor, reused by getRanking/labels.
    const hexScore: Record<string, HexScore> = {};
    let scoreCfg: ScoreConfig = {
      mode: 'commute',
      commuteWeight: 0.6,
      categories: [],
      categoryWeights: {},
      nearbyRadiusM: NEARBY_RADIUS_M,
    };

    let renderConfig: RenderConfig = {
      centerLat: INITIAL_VIEW[0],
      centerLon: INITIAL_VIEW[1],
      hexSize: 0.4,
      colorMin: 5,
      colorMax: 70,
      showLabels: true,
      radius: 6,
    };
    let centerMerc: MercatorXY = toMercator([renderConfig.centerLon, renderConfig.centerLat]);
    let hexSizeMeters = renderConfig.hexSize * 1000;

    const scoreParams = () => ({
      commuteWeight: scoreCfg.commuteWeight,
      categories: scoreCfg.categories,
      categoryWeights: scoreCfg.categoryWeights,
      colorMin: renderConfig.colorMin,
      colorMax: renderConfig.colorMax,
    });

    const countsFor = (hLat: number, hLon: number): Record<string, number> =>
      poiIndex ? poiIndex.query(hLat, hLon, scoreCfg.nearbyRadiusM) : {};

    // --- Price helpers (Luxembourg commune, with a German-border fallback) ---
    /** Latest €/m² for an LU commune's active metric (real data), or null. */
    function luPriceForCommune(commune: string | null): number | null {
      if (!commune || !priceData) return null;
      const c = priceByCommune.get(normName(commune));
      return c ? latestValue(seriesFor(c, priceMetric)) : null;
    }
    /** €/m² for a point: LU commune price, else an indicative German-border
     *  value for hexes outside Luxembourg. Active once prices are loaded. */
    function priceValueAt(hLat: number, hLon: number): number | null {
      if (!priceData) return null;
      const lu = communeIndex ? communeIndex.locate(hLat, hLon) : null;
      if (lu) return luPriceForCommune(lu);
      return nearestDeTown(hLat, hLon)?.perM2 ?? null;
    }
    /** Same as priceValueAt, keyed by an already-located hex (uses caches). */
    function priceValueForKey(key: string): number | null {
      if (!priceData) return null;
      const commune = hexCommune[key];
      if (commune) return luPriceForCommune(commune);
      const h = hexData[key];
      return h ? (nearestDeTown(h.hLat, h.hLon)?.perM2 ?? null) : null;
    }
    /** Fit the price color ramp to the values present in the grid. */
    function computePriceRamp(): void {
      let min = Infinity;
      let max = -Infinity;
      for (const key of Object.keys(hexData)) {
        const v = priceValueForKey(key);
        if (v == null) continue;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (min === Infinity) {
        priceMin = 0;
        priceMax = 1;
      } else if (min === max) {
        priceMin = min * 0.9;
        priceMax = max * 1.1 || 1;
      } else {
        priceMin = min;
        priceMax = max;
      }
    }
    /** On-hex price label: €/m² in thousands (e.g. 8236 -> "8.2"). */
    const kEur = (v: number): string => (v / 1000).toFixed(1);

    /** Price breakdown for the hex popup: apartment + house trend sparklines. */
    function pricePopupHtml(commune: string, c: CommunePrices): string {
      const yrs = priceData!.years;
      const range = `${yrs[0]}–${yrs[yrs.length - 1]}`;
      const row = (lbl: string, series: (number | null)[], color: string): string => {
        const last = latestValue(series);
        if (last == null) return '';
        const first = firstValue(series);
        const pct = first ? Math.round(((last - first) / first) * 100) : null;
        const pctHtml =
          pct != null
            ? ` <span style="color:${pct >= 0 ? '#16a34a' : '#dc2626'}">${pct >= 0 ? '+' : ''}${pct}%</span>`
            : '';
        return (
          `<div style="margin-top:4px">` +
          `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">` +
          `<span style="font-weight:600">${lbl}</span>` +
          `<span style="font-family:monospace;font-size:11px">${Math.round(last).toLocaleString('de-DE')}&nbsp;€/m²${pctHtml}</span>` +
          `</div>${sparklineSvg(series, { stroke: color })}</div>`
        );
      };
      return (
        `<hr class="my-1 border-gray-200">` +
        `<b>${commune}</b> <span style="font-size:10px;color:#6b7280">${range} · Angebotspreise</span>` +
        row('Wohnung', c.apartment, '#2563eb') +
        row('Haus', c.house, '#ea580c')
      );
    }

    /** Fill color for a hex, depending on the current color mode. */
    function fillFor(time: number | null, hLat: number, hLon: number): string {
      if (scoreCfg.mode === 'commute') {
        return getColor(time, renderConfig.colorMin, renderConfig.colorMax);
      }
      if (scoreCfg.mode === 'price') {
        return getColor(priceValueAt(hLat, hLon), priceMin, priceMax);
      }
      return scoreColor(
        liveabilityScore(time, countsFor(hLat, hLon), scoreParams()).score,
      );
    }

    /** On-hex number: commute minutes, or the liveability score (0-100). */
    function labelFor(time: number | null, hLat: number, hLon: number): string {
      if (scoreCfg.mode === 'liveability') {
        const s = liveabilityScore(time, countsFor(hLat, hLon), scoreParams()).score;
        return String(Math.round(s * 100));
      }
      if (scoreCfg.mode === 'price') {
        const v = priceValueAt(hLat, hLon);
        return v != null ? kEur(v) : '';
      }
      return time != null ? String(Math.round(time)) : '';
    }

    /** Recompute scores (cached) + re-apply fill colors and labels. */
    function recolorAll(): void {
      const params = scoreParams();
      const mode = scoreCfg.mode;
      for (const key of Object.keys(hexData)) {
        const h = hexData[key];
        // Always keep the liveability score fresh so ranking works in any mode.
        const sc = liveabilityScore(h.time, countsFor(h.hLat, h.hLon), params);
        hexScore[key] = sc;
        let fill: string;
        let label: string;
        if (mode === 'commute') {
          fill = getColor(h.time, renderConfig.colorMin, renderConfig.colorMax);
          label = h.time != null ? String(Math.round(h.time)) : '';
        } else if (mode === 'price') {
          const v = priceValueForKey(key);
          fill = getColor(v, priceMin, priceMax);
          label = v != null ? kEur(v) : '';
        } else {
          fill = scoreColor(sc.score);
          label = String(Math.round(sc.score * 100));
        }
        const layer = hexLayers[key];
        layer?.setStyle({ fillColor: fill });
        // Use a space for empty labels — setTooltipContent('') is a no-op in
        // Leaflet, which would leave a stale number on no-data hexes.
        if (layer?.getTooltip()) layer.setTooltipContent(label || ' ');
      }
    }

    function labelsVisible(): boolean {
      const largeHex = renderConfig.hexSize >= 1.0;
      return renderConfig.showLabels && (map.getZoom() >= 12 || largeHex);
    }

    function refreshLabels(): void {
      const visible = labelsVisible();
      const navigating = viewMode === 'navigate' && selectedKey != null;
      for (const key of Object.keys(hexLayers)) {
        const el = hexLayers[key].getTooltip()?.getElement();
        if (!el) continue;
        el.style.opacity = navigating && key !== selectedKey ? '0' : visible ? '1' : '0';
      }
    }

    /** Bind the permanent on-hex label for a done hex, unless performance mode,
     *  labels-off, or the large-grid cap says to skip it. Idempotent. */
    function bindHexLabel(key: string): void {
      const layer = hexLayers[key];
      const h = hexData[key];
      if (!layer || !h || layer.getTooltip()) return;
      if (performanceMode || !renderConfig.showLabels) return;
      const cap = renderConfig.hexSize >= 1.0 ? 2500 : LABEL_CAP;
      if (hexCount(renderConfig.radius) > cap) return;
      const visibilityClass = labelsVisible() ? 'opacity-100' : 'opacity-0';
      layer.bindTooltip(labelFor(h.time, h.hLat, h.hLon), {
        permanent: true,
        direction: 'center',
        className: `hex-label ${visibilityClass} transition-opacity duration-300 font-bold text-gray-700 pointer-events-none`,
      });
    }
    map.on('zoomend', refreshLabels);

    /** Navigate-mode emphasis: fade non-selected hexes + far POIs. */
    function emphasize(): void {
      const navigating = viewMode === 'navigate' && selectedKey != null;
      // Fast path: nothing is faded and nothing needs fading. Avoids thousands
      // of redundant setStyle calls on every score/radius change (large grids).
      if (!navigating && !emphasisApplied) {
        if (selectionCircle) {
          map.removeLayer(selectionCircle);
          selectionCircle = null;
        }
        refreshLabels();
        return;
      }
      for (const key of Object.keys(hexData)) {
        const layer = hexLayers[key];
        if (!layer) continue;
        if (!navigating) {
          layer.setStyle({ color: '#ffffff', weight: 1, opacity: 1, fillOpacity: 0.55 });
        } else if (key === selectedKey) {
          layer.setStyle({ color: '#1e293b', weight: 3, opacity: 1, fillOpacity: 0.85 });
        } else {
          layer.setStyle({ color: '#94a3b8', weight: 0.5, opacity: 0.2, fillOpacity: 0.08 });
        }
      }
      const sel = navigating && selectedKey ? hexData[selectedKey] : null;
      const radiusM = scoreCfg.nearbyRadiusM;
      poiLayerGroup.eachLayer((m) => {
        const cm = m as L.CircleMarker;
        if (typeof cm.getLatLng !== 'function' || typeof cm.setStyle !== 'function') return;
        if (!sel) {
          cm.setStyle({ opacity: 1, fillOpacity: 0.9 });
        } else {
          const ll = cm.getLatLng();
          const near = approxDistMeters(sel.hLat, sel.hLon, ll.lat, ll.lng) <= radiusM;
          // Far POIs are dimmed but kept faintly visible (not fully hidden).
          cm.setStyle({ opacity: near ? 1 : 0.35, fillOpacity: near ? 0.95 : 0.18 });
        }
      });
      // Catchment circle around the focused hex (shows which POIs count).
      if (selectionCircle) {
        map.removeLayer(selectionCircle);
        selectionCircle = null;
      }
      if (sel) {
        selectionCircle = L.circle([sel.hLat, sel.hLon], {
          radius: radiusM,
          color: '#2563eb',
          weight: 1.5,
          dashArray: '6 6',
          fill: false,
          interactive: false,
        }).addTo(map);
      }
      refreshLabels();
      emphasisApplied = navigating;
    }

    /** Re-render the currently open hex popup (after a scoring/radius change). */
    function refreshOpenPopup(): void {
      for (const key of Object.keys(hexLayers)) {
        const layer = hexLayers[key];
        if (layer.isPopupOpen()) {
          layer.getPopup()?.update();
          return;
        }
      }
    }

    /** Build the full detail payload for a hex (for the sidebar detail view). */
    function buildHexDetail(key: string): HexDetail | null {
      const h = hexData[key];
      if (!h) return null;
      const counts = countsFor(h.hLat, h.hLon);
      const sc = liveabilityScore(h.time, counts, scoreParams());
      const luCommune =
        hexCommune[key] ?? (communeIndex ? communeIndex.locate(h.hLat, h.hLon) : null);
      const c = luCommune ? priceByCommune.get(normName(luCommune)) : null;
      // German-border fallback: an indicative single value for hexes outside LU.
      const de = !luCommune && priceData ? nearestDeTown(h.hLat, h.hLon) : null;
      const commune = luCommune ?? (de ? `${de.name} (DE)` : null);
      // Actual nearby POIs (with names + distance) inside the amenity radius.
      const nearbyPois = currentPois
        .map((p) => ({
          category: p.category,
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          distM: Math.round(approxDistMeters(h.hLat, h.hLon, p.lat, p.lon)),
          website: p.website,
          openingHours: p.openingHours,
        }))
        .filter((p) => p.distM <= scoreCfg.nearbyRadiusM)
        .sort((a, b) => a.distM - b.distM);
      return {
        q: h.q,
        r: h.r,
        lat: h.hLat,
        lon: h.hLon,
        time: h.time,
        score: sc.score,
        commuteScore: sc.commuteScore,
        poiScore: sc.poiScore,
        commuteWeight: scoreCfg.commuteWeight,
        nearbyRadiusM: scoreCfg.nearbyRadiusM,
        counts,
        nearbyPois,
        commune,
        years: c && priceData ? priceData.years : null,
        apartment: de ? [de.perM2] : c ? c.apartment : null,
        house: de ? [de.perM2] : c ? c.house : null,
        priceSource: priceData ? priceData.source : null,
        priceApprox: de != null,
      };
    }

    const api: MapApi = {
      setMarker(kind, lat, lon) {
        if (kind === 'center') centerMarker.setLatLng([lat, lon]);
        else destMarker.setLatLng([lat, lon]);
      },
      flyTo(lat, lon, zoom) {
        map.setView([lat, lon], zoom ?? map.getZoom());
      },
      enablePick(kind) {
        pickMode = kind;
        map.getContainer().style.cursor = 'crosshair';
      },
      cancelPick() {
        pickMode = null;
        map.getContainer().style.cursor = '';
      },
      setDark(isDark) {
        map.removeLayer(tileLayer);
        tileLayer = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
          attribution: TILE_ATTRIB,
        }).addTo(map);
      },
      setRenderConfig(cfg) {
        renderConfig = cfg;
        centerMerc = toMercator([cfg.centerLon, cfg.centerLat]);
        hexSizeMeters = cfg.hexSize * 1000;
      },
      clearHexes() {
        hexLayerGroup.clearLayers();
        for (const k of Object.keys(hexLayers)) delete hexLayers[k];
        for (const k of Object.keys(hexData)) delete hexData[k];
        for (const k of Object.keys(hexScore)) delete hexScore[k];
        for (const k of Object.keys(hexCommune)) delete hexCommune[k];
        selectedKey = null;
        if (selectionCircle) {
          map.removeLayer(selectionCircle);
          selectionCircle = null;
        }
      },
      addHex(q, r, state, drivingTime) {
        const key = hexKey(q, r);
        const [mx, my] = axialToMerc(q, r, centerMerc, hexSizeMeters);
        const verts = hexPolygonLatLng(mx, my, hexSizeMeters);

        if (hexLayers[key]) hexLayerGroup.removeLayer(hexLayers[key]);

        const [hLon, hLat] = toWgs84([mx, my]);
        const styles: Record<HexState, L.PathOptions> = {
          // faint placeholder shown while the hex is still being routed
          pending: { color: '#94a3b8', weight: 1, fillColor: '#cbd5e1', fillOpacity: 0.18 },
          // final hex colored by commute time or liveability score (per color mode)
          done: {
            color: '#ffffff',
            weight: 1,
            fillColor: fillFor(drivingTime, hLat, hLon),
            fillOpacity: 0.55,
          },
        };

        const layer = L.polygon(verts, styles[state]);
        // Popup is built lazily so it reflects POIs loaded after the hex.
        layer.bindPopup(() => {
          const counts = countsFor(hLat, hLon);
          const sc = liveabilityScore(drivingTime, counts, scoreParams());
          const cw = scoreCfg.commuteWeight;
          let html =
            `<div class="text-sm">` +
            `<b>Hex:</b> (${q}, ${r})<br>` +
            `<b>Drive to workplace:</b> ${drivingTime != null ? drivingTime.toFixed(1) + ' min' : 'N/A'}<br>` +
            `<b>Liveability:</b> ${Math.round(sc.score * 100)}/100<br>` +
            `<span style="font-size:11px;color:#6b7280">` +
            `${Math.round(cw * 100)}% commute (${sc.commuteScore.toFixed(2)}) + ` +
            `${Math.round((1 - cw) * 100)}% amenities (${sc.poiScore.toFixed(2)})` +
            `</span>`;
          if (!currentPois.length) {
            html += `<br><span style="font-size:11px;color:#d97706">Load POIs to score amenities</span>`;
          }
          if (currentPois.length) {
            const radiusM = scoreCfg.nearbyRadiusM;
            const lines = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => `${POI_LABELS[cat] ?? cat}: ${n}`);
            html +=
              `<hr class="my-1 border-gray-200">` +
              `<b>Nearby (${radiusM / 1000} km):</b><br>` +
              (lines.length ? lines.join('<br>') : 'none');
          }
          if (priceData) {
            const commune =
              hexCommune[key] ?? (communeIndex ? communeIndex.locate(hLat, hLon) : null);
            const c = commune ? priceByCommune.get(normName(commune)) : null;
            if (c) html += pricePopupHtml(commune as string, c);
            else if (commune)
              html +=
                `<hr class="my-1 border-gray-200"><b>${commune}</b><br>` +
                `<span style="font-size:11px;color:#9ca3af">no price data for this commune</span>`;
          }
          return html + `</div>`;
        });
        layer.addTo(hexLayerGroup);
        hexLayers[key] = layer;
        if (state === 'done') {
          hexData[key] = { q, r, hLat, hLon, time: drivingTime };
          if (communeIndex) hexCommune[key] = communeIndex.locate(hLat, hLon);
        }

        if (state === 'done') {
          bindHexLabel(key);
          // Clicking a hex opens its detail view (and focuses it in navigate).
          layer.on('click', (e) => {
            optionsRef.current.onHexSelect(buildHexDetail(key));
            if (viewMode === 'navigate') {
              L.DomEvent.stopPropagation(e);
              selectedKey = key;
              emphasize();
            }
          });
        }
      },
      refreshLabels,
      setPois(pois) {
        currentPois = pois;
        poiIndex = buildPoiIndex(pois);
        poiLayerGroup.clearLayers();
        for (const p of pois) {
          const marker = L.circleMarker([p.lat, p.lon], {
            radius: 4,
            color: '#ffffff',
            weight: 1,
            fillColor: POI_COLORS[p.category] ?? '#6b7280',
            fillOpacity: 0.9,
          });
          marker.bindTooltip(
            `${POI_LABELS[p.category] ?? p.category}${p.name ? ': ' + p.name : ''}`,
          );
          marker.addTo(poiLayerGroup);
        }
        recolorAll();
        emphasize();
      },
      clearPois() {
        currentPois = [];
        poiIndex = null;
        poiLayerGroup.clearLayers();
        recolorAll();
        emphasize();
      },
      setScoreConfig(cfg) {
        scoreCfg = { ...scoreCfg, ...cfg };
        recolorAll();
        emphasize();
        refreshOpenPopup();
      },
      getRanking(limit) {
        const params = scoreParams();
        const ranked: RankedHex[] = Object.values(hexData).map((h) => {
          const s =
            hexScore[hexKey(h.q, h.r)] ??
            liveabilityScore(h.time, countsFor(h.hLat, h.hLon), params);
          return {
            q: h.q,
            r: h.r,
            lat: h.hLat,
            lon: h.hLon,
            time: h.time,
            score: s.score,
            commuteScore: s.commuteScore,
            poiScore: s.poiScore,
          };
        });
        ranked.sort((a, b) => b.score - a.score);
        return ranked.slice(0, limit);
      },
      focusHex(q, r) {
        const key = hexKey(q, r);
        const h = hexData[key];
        if (!h) return;
        map.setView([h.hLat, h.hLon], Math.max(map.getZoom(), 14));
        if (viewMode === 'navigate') {
          selectedKey = key;
          emphasize();
        }
        optionsRef.current.onHexSelect(buildHexDetail(key));
        hexLayers[key]?.openPopup();
      },
      setViewMode(mode) {
        viewMode = mode;
        if (mode === 'all') {
          selectedKey = null;
          map.closePopup();
        }
        emphasize();
      },
      setPriceData(prices, index) {
        priceData = prices;
        priceByCommune = indexPricesByCommune(prices);
        communeIndex = index;
        for (const key of Object.keys(hexData)) {
          const h = hexData[key];
          hexCommune[key] = index.locate(h.hLat, h.hLon);
        }
        computePriceRamp();
        recolorAll();
        emphasize();
        refreshOpenPopup();
      },
      clearPriceData() {
        priceData = null;
        priceByCommune = new Map();
        communeIndex = null;
        for (const k of Object.keys(hexCommune)) delete hexCommune[k];
        recolorAll();
        refreshOpenPopup();
      },
      setPriceMetric(metric) {
        priceMetric = metric;
        computePriceRamp();
        recolorAll();
        refreshOpenPopup();
      },
      setPerformanceMode(on) {
        performanceMode = on;
        if (on) {
          // Free the label DOM entirely (the actual perf cost), not just hide it.
          for (const key of Object.keys(hexLayers)) hexLayers[key].unbindTooltip();
        } else {
          for (const key of Object.keys(hexData)) bindHexLabel(key);
          refreshLabels();
        }
      },
    };

    apiRef.current = api;

    return () => {
      map.remove();
      apiRef.current = null;
    };
  }, []);

  return { containerRef, apiRef };
}
