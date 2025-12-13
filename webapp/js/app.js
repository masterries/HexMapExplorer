/**
 * HexMap Pro - Main Application
 */
const App = {
  // State
  map: null,
  markers: { center: null, dest: null },
  hexLayerGroup: null,
  hexLayers: {},
  pickMode: null,
  isRunning: false,
  darkTileLayer: null,
  lightTileLayer: null,

  /**
   * Initialize the application
   */
  init() {
    this.initMap();
    this.initMarkers();
    this.initEventListeners();
    this.loadHistory();
    this.loadDarkMode();
    this.updateCounts();
  },

  /**
   * Initialize Leaflet map
   */
  initMap() {
    this.map = L.map('map', { zoomControl: false }).setView([49.8734, 6.1727], 11);
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OSRM'
    }).addTo(this.map);

    this.hexLayerGroup = L.layerGroup().addTo(this.map);

    // Map click handler
    this.map.on('click', (e) => this.handleMapClick(e));
    this.map.on('zoomend', () => this.updateLabels());
  },

  /**
   * Initialize markers
   */
  initMarkers() {
    const centerIcon = L.divIcon({
      className: 'custom-div-icon',
      html: "<div style='background-color:#3b82f6; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);'></div>",
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    const destIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    this.markers.center = L.marker([49.8734, 6.1727], { draggable: true, icon: centerIcon }).addTo(this.map);
    this.markers.dest = L.marker([49.8734, 6.1727], { draggable: true, icon: destIcon }).addTo(this.map);

    // Marker drag handlers
    this.markers.center.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      document.getElementById('center_lat').value = pos.lat.toFixed(4);
      document.getElementById('center_lon').value = pos.lng.toFixed(4);
    });

    this.markers.dest.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      document.getElementById('dest_lat').value = pos.lat.toFixed(4);
      document.getElementById('dest_lon').value = pos.lng.toFixed(4);
    });
  },

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Slider sync
    document.getElementById('radius').oninput = (e) => this.syncInput('radius', e.target.value);
    document.getElementById('hex_size').oninput = (e) => this.syncInput('hex_size', e.target.value);
    document.getElementById('algo_speed').oninput = (e) => {
      document.getElementById('speed_val').innerText = e.target.value + 'ms';
    };
  },

  /**
   * Handle map click
   */
  handleMapClick(e) {
    if (this.pickMode) {
      if (this.pickMode === 'center') {
        document.getElementById('center_lat').value = e.latlng.lat.toFixed(4);
        document.getElementById('center_lon').value = e.latlng.lng.toFixed(4);
        this.markers.center.setLatLng(e.latlng);
      } else if (this.pickMode === 'dest') {
        document.getElementById('dest_lat').value = e.latlng.lat.toFixed(4);
        document.getElementById('dest_lon').value = e.latlng.lng.toFixed(4);
        this.markers.dest.setLatLng(e.latlng);
      }
      this.pickMode = null;
      document.querySelector('.leaflet-container').style.cursor = '';
    }
  },

  /**
   * Enable pick mode
   */
  enablePick(mode) {
    this.pickMode = mode;
    document.querySelector('.leaflet-container').style.cursor = 'crosshair';
  },

  /**
   * Sync slider to input
   */
  syncSlider(id, val) {
    const slider = document.getElementById(id);
    if (val >= parseFloat(slider.min) && val <= parseFloat(slider.max)) {
      slider.value = val;
    }
    this.updateCounts();
  },

  /**
   * Sync input to slider
   */
  syncInput(id, val) {
    document.getElementById(id + '_input').value = val;
    this.updateCounts();
  },

  /**
   * Update hex count display
   */
  updateCounts() {
    const r = parseInt(document.getElementById('radius_input').value) || 0;
    const count = HexGrid.calculateHexCount(r);
    document.getElementById('hex_count').innerText = count;
  },

  /**
   * Update legend labels
   */
  updateLegend() {
    const minVal = parseFloat(document.getElementById('color_min_input').value) || 5;
    const maxVal = parseFloat(document.getElementById('color_max_input').value) || 70;
    document.getElementById('legend_fast_label').innerText = `Fast (<${minVal}m)`;
    document.getElementById('legend_slow_label').innerText = `Slow (>${maxVal}m)`;
  },

  /**
   * Add hex to map visualization
   */
  addHexToMap(q, r, state, drivingTime, gCost, hexSizeMeters, centerMerc, colorMin, colorMax) {
    const key = HexGrid.hexKey(q, r);
    const [mx, my] = HexGrid.axialToMercator(q, r, hexSizeMeters, centerMerc);
    const vertices = HexGrid.getHexPolygon(mx, my, hexSizeMeters);

    // Remove existing
    if (this.hexLayers[key]) {
      this.hexLayerGroup.removeLayer(this.hexLayers[key]);
    }

    const style = Colors.getHexStyle(state, drivingTime, colorMin, colorMax);
    const layer = L.polygon(vertices, style);

    // Popup
    layer.bindPopup(`
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
    `);

    // Label
    if (drivingTime !== null) {
      const showLabels = document.getElementById('show_labels').checked;
      const zoom = this.map.getZoom();
      const hexSize = parseFloat(document.getElementById('hex_size_input').value);
      const largeHex = hexSize >= 1.0;
      const isVisible = showLabels && (zoom >= 12 || largeHex);

      layer.bindTooltip(`${Math.round(drivingTime)}`, {
        permanent: true,
        direction: 'center',
        className: `hex-label ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 font-bold text-gray-700 pointer-events-none`
      });
    }

    layer.addTo(this.hexLayerGroup);
    this.hexLayers[key] = layer;
  },

  /**
   * Update label visibility
   */
  updateLabels() {
    const show = document.getElementById('show_labels').checked;
    const zoom = this.map.getZoom();
    const hexSize = parseFloat(document.getElementById('hex_size_input').value);
    const largeHex = hexSize >= 1.0;
    const visible = show && (zoom >= 12 || largeHex);

    document.querySelectorAll('.hex-label').forEach(l => {
      l.style.opacity = visible ? '1' : '0';
    });
  },

  /**
   * Generate the hex grid map
   */
  async generateGrid() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Clear existing
    this.hexLayerGroup.clearLayers();
    this.hexLayers = {};

    // UI updates
    const btn = document.getElementById('calcBtn');
    btn.disabled = true;
    btn.innerText = 'Running A*...';
    document.getElementById('stopBtn').classList.remove('hidden');
    document.getElementById('progress').classList.remove('hidden');
    document.getElementById('progress_bar').style.width = '0%';

    // Expand algo panel
    document.querySelector('#algo_panel .collapsible-header').classList.add('open');
    document.getElementById('algo_content').classList.add('open');

    // Get config
    const config = {
      centerLat: parseFloat(document.getElementById('center_lat').value),
      centerLon: parseFloat(document.getElementById('center_lon').value),
      destLat: parseFloat(document.getElementById('dest_lat').value),
      destLon: parseFloat(document.getElementById('dest_lon').value),
      radius: parseInt(document.getElementById('radius_input').value),
      hexSizeKm: parseFloat(document.getElementById('hex_size_input').value),
      colorMin: parseFloat(document.getElementById('color_min_input').value) || 5,
      colorMax: parseFloat(document.getElementById('color_max_input').value) || 70
    };

    // Run pathfinding
    await Pathfinding.run(config, {
      onHexUpdate: (q, r, state, drivingTime, gCost, hexSizeMeters, centerMerc, colorMin, colorMax) => {
        this.addHexToMap(q, r, state, drivingTime, gCost, hexSizeMeters, centerMerc, colorMin, colorMax);
      },
      onStatsUpdate: (stats) => {
        document.getElementById('stat_step').innerText = stats.step;
        document.getElementById('stat_queue').innerText = stats.queueSize;
        document.getElementById('stat_visited').innerText = stats.visited;
        document.getElementById('stat_path').innerText = stats.pathLength;
        document.getElementById('stat_status').innerText = stats.status;
      },
      onStatusUpdate: (msg) => {
        document.getElementById('status_text').innerText = msg;
      },
      onProgress: (pct) => {
        document.getElementById('progress_bar').style.width = pct + '%';
      },
      getSpeed: () => parseInt(document.getElementById('algo_speed').value)
    });

    // Finish
    btn.disabled = false;
    btn.innerText = 'Generate Map';
    document.getElementById('stopBtn').classList.add('hidden');
    setTimeout(() => document.getElementById('progress').classList.add('hidden'), 3000);
    this.updateLabels();
    this.isRunning = false;
  },

  /**
   * Stop generation
   */
  stopGeneration() {
    Pathfinding.stop();
    document.getElementById('stat_status').innerText = 'Stopping...';
    document.getElementById('status_text').innerText = 'Stopping generation...';
  },

  /**
   * Search location
   */
  async searchLocation(type) {
    const inputId = type === 'start' ? 'start_search' : 'dest_search';
    const latId = type === 'start' ? 'center_lat' : 'dest_lat';
    const lonId = type === 'start' ? 'center_lon' : 'dest_lon';

    const query = document.getElementById(inputId).value;
    if (!query) return;

    const result = await API.searchLocation(query);
    if (result) {
      document.getElementById(latId).value = result.lat.toFixed(4);
      document.getElementById(lonId).value = result.lon.toFixed(4);

      const marker = type === 'start' ? this.markers.center : this.markers.dest;
      marker.setLatLng([result.lat, result.lon]);
      this.map.setView([result.lat, result.lon], 13);
    } else {
      alert('Location not found');
    }
  },

  /**
   * Save configuration
   */
  async saveConfig() {
    const config = {
      name: document.getElementById('save_name').value || 'Unnamed',
      center_lat: parseFloat(document.getElementById('center_lat').value),
      center_lon: parseFloat(document.getElementById('center_lon').value),
      dest_lat: parseFloat(document.getElementById('dest_lat').value),
      dest_lon: parseFloat(document.getElementById('dest_lon').value),
      radius: parseInt(document.getElementById('radius_input').value),
      hex_size: parseFloat(document.getElementById('hex_size_input').value)
    };

    const btn = document.querySelector('button[onclick="App.saveConfig()"]');
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';

    const result = await API.saveConfig(config);
    if (result.status === 'success') {
      btn.innerText = 'Saved!';
      btn.classList.add('bg-green-700');
      this.loadHistory();
    } else {
      alert('Error: ' + result.message);
    }

    setTimeout(() => {
      btn.innerText = originalText;
      btn.classList.remove('bg-green-700');
    }, 2000);
  },

  /**
   * Load history
   */
  async loadHistory() {
    const list = document.getElementById('history_list');
    list.innerHTML = '<li class="text-xs text-gray-400 text-center animate-pulse">Loading...</li>';

    const data = await API.loadHistory();
    list.innerHTML = '';

    if (data.length === 0) {
      list.innerHTML = '<li class="text-xs text-gray-400 text-center">No history found</li>';
      return;
    }

    data.forEach(item => {
      const li = document.createElement('li');
      li.className = 'group p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-400 cursor-pointer shadow-sm transition-all hover:shadow-md';
      li.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <span class="font-bold text-gray-700 text-sm group-hover:text-blue-600 truncate">${item.name}</span>
          <span class="text-[10px] text-gray-400 font-mono">${new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <div class="flex gap-2 text-[10px] text-gray-400">
          <span class="bg-gray-100 px-1.5 rounded">R: ${item.radius}</span>
          <span class="bg-gray-100 px-1.5 rounded">Size: ${item.hex_size || '0.4'}km</span>
        </div>
      `;
      li.onclick = () => this.loadConfigItem(item);
      list.appendChild(li);
    });
  },

  /**
   * Load config item from history
   */
  loadConfigItem(item) {
    document.getElementById('center_lat').value = item.center_lat;
    document.getElementById('center_lon').value = item.center_lon;
    document.getElementById('dest_lat').value = item.dest_lat;
    document.getElementById('dest_lon').value = item.dest_lon;
    document.getElementById('radius').value = item.radius;
    document.getElementById('radius_input').value = item.radius;
    if (item.hex_size) {
      document.getElementById('hex_size').value = item.hex_size;
      document.getElementById('hex_size_input').value = item.hex_size;
    }

    this.updateCounts();
    this.markers.center.setLatLng([item.center_lat, item.center_lon]);
    this.markers.dest.setLatLng([item.dest_lat, item.dest_lon]);
    this.map.setView([item.center_lat, item.center_lon], 11);

    this.generateGrid();
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');

    document.getElementById('sunIcon').classList.toggle('hidden', !isDark);
    document.getElementById('moonIcon').classList.toggle('hidden', isDark);

    if (isDark) {
      if (this.lightTileLayer) this.map.removeLayer(this.lightTileLayer);
      this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OSRM'
      }).addTo(this.map);
    } else {
      if (this.darkTileLayer) this.map.removeLayer(this.darkTileLayer);
      this.lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OSRM'
      }).addTo(this.map);
    }

    localStorage.setItem('darkMode', isDark);
  },

  /**
   * Load dark mode from localStorage
   */
  loadDarkMode() {
    if (localStorage.getItem('darkMode') === 'true') {
      this.toggleDarkMode();
    }
  },

  /**
   * Toggle algorithm panel
   */
  toggleAlgoPanel() {
    const header = document.querySelector('#algo_panel .collapsible-header');
    const content = document.getElementById('algo_content');
    header.classList.toggle('open');
    content.classList.toggle('open');
  },

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobileBackdrop').classList.toggle('open');
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
