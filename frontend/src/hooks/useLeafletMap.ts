import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  axialToMerc,
  getColor,
  hexKey,
  hexPolygonLatLng,
  toMercator,
  toWgs84,
  type MercatorXY,
} from '../services/hexGeo';
import {
  countNearbyPois,
  NEARBY_RADIUS_M,
  POI_COLORS,
  POI_LABELS,
} from '../services/poi';
import { liveabilityScore, scoreColor } from '../services/liveability';
import type { ColorMode, HexState, PointKind, Poi, RankedHex } from '../types';

export interface ScoreConfig {
  mode: ColorMode;
  commuteWeight: number;
  categories: string[];
  categoryWeights: Record<string, number>;
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
}

interface UseLeafletMapOptions {
  onPick(kind: PointKind, lat: number, lon: number): void;
  onMarkerDrag(kind: PointKind, lat: number, lon: number): void;
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
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!pickMode) return;
      const kind = pickMode;
      const { lat, lng } = e.latlng;
      if (kind === 'center') centerMarker.setLatLng(e.latlng);
      else destMarker.setLatLng(e.latlng);
      // Reset before onPick so a follow-up enablePick() (pick-both flow) sticks.
      pickMode = null;
      map.getContainer().style.cursor = '';
      optionsRef.current.onPick(kind, lat, lng);
    });

    // --- Hex rendering state (imperative, outside React) ---
    const hexLayerGroup = L.layerGroup().addTo(map);
    const hexLayers: Record<string, L.Polygon> = {};

    // POI markers live in their own layer, independent of the hex grid.
    const poiLayerGroup = L.layerGroup().addTo(map);
    let currentPois: Poi[] = [];

    // Per-hex data kept for re-coloring and ranking by liveability score.
    const hexData: Record<
      string,
      { q: number; r: number; hLat: number; hLon: number; time: number | null }
    > = {};
    let scoreCfg: ScoreConfig = {
      mode: 'commute',
      commuteWeight: 0.6,
      categories: [],
      categoryWeights: {},
    };

    let renderConfig: RenderConfig = {
      centerLat: INITIAL_VIEW[0],
      centerLon: INITIAL_VIEW[1],
      hexSize: 0.4,
      colorMin: 5,
      colorMax: 70,
      showLabels: true,
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

    /** Fill color for a hex, depending on the current color mode. */
    function fillFor(time: number | null, hLat: number, hLon: number): string {
      if (scoreCfg.mode === 'commute') {
        return getColor(time, renderConfig.colorMin, renderConfig.colorMax);
      }
      return scoreColor(
        liveabilityScore(time, currentPois, hLat, hLon, scoreParams()).score,
      );
    }

    /** On-hex number: commute minutes, or the liveability score (0-100). */
    function labelFor(time: number | null, hLat: number, hLon: number): string {
      if (scoreCfg.mode === 'liveability') {
        const s = liveabilityScore(time, currentPois, hLat, hLon, scoreParams()).score;
        return String(Math.round(s * 100));
      }
      return time != null ? String(Math.round(time)) : '';
    }

    /** Re-apply fill colors and labels to all drawn hexes (mode/POI change). */
    function recolorAll(): void {
      for (const key of Object.keys(hexData)) {
        const h = hexData[key];
        const layer = hexLayers[key];
        if (!layer) continue;
        layer.setStyle({ fillColor: fillFor(h.time, h.hLat, h.hLon) });
        if (layer.getTooltip()) layer.setTooltipContent(labelFor(h.time, h.hLat, h.hLon));
      }
    }

    function labelsVisible(): boolean {
      const largeHex = renderConfig.hexSize >= 1.0;
      return renderConfig.showLabels && (map.getZoom() >= 12 || largeHex);
    }

    function refreshLabels(): void {
      const visible = labelsVisible();
      map
        .getContainer()
        .querySelectorAll<HTMLElement>('.hex-label')
        .forEach((el) => {
          el.style.opacity = visible ? '1' : '0';
        });
    }
    map.on('zoomend', refreshLabels);

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
          const sc = liveabilityScore(drivingTime, currentPois, hLat, hLon, scoreParams());
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
            const counts = countNearbyPois(currentPois, hLat, hLon, NEARBY_RADIUS_M);
            const lines = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => `${POI_LABELS[cat] ?? cat}: ${n}`);
            html +=
              `<hr class="my-1 border-gray-200">` +
              `<b>Nearby (${NEARBY_RADIUS_M / 1000} km):</b><br>` +
              (lines.length ? lines.join('<br>') : 'none');
          }
          return html + `</div>`;
        });
        layer.addTo(hexLayerGroup);
        hexLayers[key] = layer;
        if (state === 'done') hexData[key] = { q, r, hLat, hLon, time: drivingTime };

        if (state === 'done') {
          const visibilityClass = labelsVisible() ? 'opacity-100' : 'opacity-0';
          layer.bindTooltip(labelFor(drivingTime, hLat, hLon), {
            permanent: true,
            direction: 'center',
            className: `hex-label ${visibilityClass} transition-opacity duration-300 font-bold text-gray-700 pointer-events-none`,
          });
        }
      },
      refreshLabels,
      setPois(pois) {
        currentPois = pois;
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
      },
      clearPois() {
        currentPois = [];
        poiLayerGroup.clearLayers();
        recolorAll();
      },
      setScoreConfig(cfg) {
        scoreCfg = { ...scoreCfg, ...cfg };
        recolorAll();
      },
      getRanking(limit) {
        const ranked: RankedHex[] = Object.values(hexData).map((h) => {
          const s = liveabilityScore(h.time, currentPois, h.hLat, h.hLon, scoreParams());
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
        const h = hexData[hexKey(q, r)];
        if (!h) return;
        map.setView([h.hLat, h.hLon], Math.max(map.getZoom(), 14));
        hexLayers[hexKey(q, r)]?.openPopup();
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
