import L from 'leaflet';
import * as turf from '@turf/turf';
import { getHexStyle } from '../../utils/colors';
import { axialToMercator, getHexPolygon, hexKey } from '../../utils/hexGrid';

/**
 * Hex layer manager for visualizing hexagonal grid on map
 * This is not a React component but a utility class
 */
export class HexLayerManager {
  constructor(map, layerGroup, options = {}) {
    this.map = map;
    this.layerGroup = layerGroup;
    this.hexLayers = new Map();
    this.hexData = new Map();
    this.options = {
      colorMin: options.colorMin || 5,
      colorMax: options.colorMax || 70,
      showLabels: options.showLabels !== false,
      hexSizeKm: options.hexSizeKm || 0.4
    };
  }

  /**
   * Update options
   */
  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clear all hexes
   */
  clear() {
    this.layerGroup.clearLayers();
    this.hexLayers.clear();
    this.hexData.clear();
  }

  /**
   * Add or update a hex on the map
   * @param {number} q - Axial q coordinate
   * @param {number} r - Axial r coordinate
   * @param {string} state - Hex state (queued, exploring, visited, path)
   * @param {number|null} drivingTime - Driving time in minutes
   * @param {number|null} gCost - G cost from A*
   * @param {number} hexSizeMeters - Hex size in meters
   * @param {number[]} centerMerc - Center in Mercator coordinates
   */
  addHex(q, r, state, drivingTime, gCost, hexSizeMeters, centerMerc) {
    const key = hexKey(q, r);
    const [mx, my] = axialToMercator(q, r, hexSizeMeters, centerMerc);
    const vertices = getHexPolygon(mx, my, hexSizeMeters);

    // Remove existing layer if present
    if (this.hexLayers.has(key)) {
      this.layerGroup.removeLayer(this.hexLayers.get(key));
    }

    // Get style based on state
    const style = getHexStyle(state, drivingTime, this.options.colorMin, this.options.colorMax);

    // Create polygon
    const layer = L.polygon(vertices, style);

    // Add popup
    const popupContent = `
      <div class="text-sm">
        <b>Hex:</b> (${q}, ${r})<br>
        <b>State:</b> ${state}<br>
        <b>Cost(g):</b> ${gCost !== null ? gCost : 'N/A'}<br>
        <b>Driving Time:</b> ${drivingTime ? drivingTime.toFixed(1) + ' min' : 'N/A'}<br>
        <hr class="my-1 border-gray-200">
        <span class="text-xs text-indigo-500 font-semibold">Future Phase 3 Metrics:</span><br>
        <span class="text-xs text-gray-400">Real Estate: <i>Calculated in Ph3</i></span><br>
        <span class="text-xs text-gray-400">Quality of Life: <i>Calculated in Ph3</i></span>
      </div>
    `;
    layer.bindPopup(popupContent);

    // Add label if driving time is available
    if (drivingTime !== null && this.options.showLabels) {
      const label = Math.round(drivingTime);
      const zoom = this.map.getZoom();
      const largeHex = this.options.hexSizeKm >= 1.0;
      const isVisible = zoom >= 12 || largeHex;

      layer.bindTooltip(`${label}`, {
        permanent: true,
        direction: 'center',
        className: `hex-label ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 font-bold text-gray-700 pointer-events-none`
      });
    }

    // Add to layer group
    layer.addTo(this.layerGroup);
    this.hexLayers.set(key, layer);
    this.hexData.set(key, { q, r, state, drivingTime, gCost });
  }

  /**
   * Update label visibility based on zoom level
   */
  updateLabels(showLabels, zoom) {
    const largeHex = this.options.hexSizeKm >= 1.0;
    const visible = showLabels && (zoom >= 12 || largeHex);

    document.querySelectorAll('.hex-label').forEach(label => {
      label.style.opacity = visible ? '1' : '0';
    });
  }

  /**
   * Get hex data by key
   */
  getHexData(q, r) {
    return this.hexData.get(hexKey(q, r));
  }

  /**
   * Get all hex data
   */
  getAllHexData() {
    return Object.fromEntries(this.hexData);
  }
}

export default HexLayerManager;
