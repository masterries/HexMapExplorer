import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as turf from '@turf/turf';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapContainer } from './components/Map/MapContainer';
import { HexLayerManager } from './components/Map/HexLayer';
import { useMap } from './hooks/useMap';
import { usePathfinding } from './hooks/usePathfinding';
import './styles/index.css';

/**
 * Main Application Component
 */
function App() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hexManagerRef = useRef(null);

  // Map state
  const {
    centerCoords,
    destCoords,
    gridSettings,
    colorRange,
    showLabels,
    pickMode,
    isDarkMode,
    mapRef,
    markersRef,
    hexLayerGroupRef,
    updateCenter,
    updateDestination,
    updateRadius,
    updateHexSize,
    updateColorRange,
    setShowLabels,
    toggleDarkMode,
    enablePickMode,
    handleMapClick,
    getHexCount,
    loadConfig,
    getConfig
  } = useMap();

  // Pathfinding state
  const {
    isRunning,
    stats,
    progress,
    statusMessage,
    speed,
    runPathfinding,
    stopPathfinding,
    resetPathfinding,
    setSpeed
  } = usePathfinding();

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Initialize hex manager when map is ready
  useEffect(() => {
    if (mapRef.current && hexLayerGroupRef.current && !hexManagerRef.current) {
      hexManagerRef.current = new HexLayerManager(
        mapRef.current,
        hexLayerGroupRef.current,
        {
          colorMin: colorRange.min,
          colorMax: colorRange.max,
          showLabels: showLabels,
          hexSizeKm: gridSettings.hexSize
        }
      );

      // Add zoom listener for label visibility
      mapRef.current.on('zoomend', () => {
        if (hexManagerRef.current) {
          hexManagerRef.current.updateLabels(showLabels, mapRef.current.getZoom());
        }
      });
    }
  }, [mapRef.current, hexLayerGroupRef.current]);

  // Update hex manager options when settings change
  useEffect(() => {
    if (hexManagerRef.current) {
      hexManagerRef.current.setOptions({
        colorMin: colorRange.min,
        colorMax: colorRange.max,
        showLabels: showLabels,
        hexSizeKm: gridSettings.hexSize
      });
    }
  }, [colorRange, showLabels, gridSettings.hexSize]);

  // Handle hex update from pathfinding
  const handleHexUpdate = useCallback((q, r, state, drivingTime, gCost) => {
    if (!hexManagerRef.current || !mapRef.current) return;

    const hexSizeMeters = gridSettings.hexSize * 1000;
    const centerPt = turf.point([centerCoords.lon, centerCoords.lat]);
    const centerMerc = turf.toMercator(centerPt).geometry.coordinates;

    hexManagerRef.current.addHex(q, r, state, drivingTime, gCost, hexSizeMeters, centerMerc);
  }, [gridSettings.hexSize, centerCoords]);

  // Generate map handler
  const handleGenerate = useCallback(async () => {
    if (isRunning) return;

    // Clear existing hexes
    if (hexManagerRef.current) {
      hexManagerRef.current.clear();
    }

    // Reset pathfinding state
    resetPathfinding();

    // Run pathfinding
    await runPathfinding({
      centerLat: centerCoords.lat,
      centerLon: centerCoords.lon,
      destLat: destCoords.lat,
      destLon: destCoords.lon,
      radius: gridSettings.radius,
      hexSizeKm: gridSettings.hexSize,
      onHexUpdate: handleHexUpdate
    });
  }, [
    isRunning,
    centerCoords,
    destCoords,
    gridSettings,
    handleHexUpdate,
    resetPathfinding,
    runPathfinding
  ]);

  // Handle loading config from history
  const handleLoadConfig = useCallback((config) => {
    loadConfig(config);

    // Update map view
    if (mapRef.current) {
      mapRef.current.setView([config.center_lat, config.center_lon], 11);
    }

    // Auto-generate after short delay
    setTimeout(() => {
      handleGenerate();
    }, 100);
  }, [loadConfig, handleGenerate]);

  // Handle map click for pick mode
  const handleMapClickWithPick = useCallback((latlng) => {
    if (pickMode) {
      handleMapClick(latlng);
    }
  }, [pickMode, handleMapClick]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans text-gray-800">
      <Sidebar
        // Location state
        centerCoords={centerCoords}
        destCoords={destCoords}
        onCenterChange={updateCenter}
        onDestChange={updateDestination}
        onPickCenter={() => enablePickMode('center')}
        onPickDest={() => enablePickMode('dest')}

        // Grid settings
        radius={gridSettings.radius}
        hexSize={gridSettings.hexSize}
        hexCount={getHexCount()}
        showLabels={showLabels}
        colorMin={colorRange.min}
        colorMax={colorRange.max}
        onRadiusChange={updateRadius}
        onHexSizeChange={updateHexSize}
        onShowLabelsChange={setShowLabels}
        onColorRangeChange={updateColorRange}

        // Algorithm state
        isRunning={isRunning}
        stats={stats}
        progress={progress}
        statusMessage={statusMessage}
        speed={speed}
        onSpeedChange={setSpeed}
        onGenerate={handleGenerate}
        onStop={stopPathfinding}

        // Theme
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}

        // History
        onLoadConfig={handleLoadConfig}
        getConfig={getConfig}

        // Mobile
        isMobileOpen={isMobileOpen}
        onMobileToggle={() => setIsMobileOpen(!isMobileOpen)}
      />

      <MapContainer
        centerCoords={centerCoords}
        destCoords={destCoords}
        isDarkMode={isDarkMode}
        pickMode={pickMode}
        onMapClick={handleMapClickWithPick}
        onCenterDrag={updateCenter}
        onDestDrag={updateDestination}
        mapRef={mapRef}
        markersRef={markersRef}
        hexLayerGroupRef={hexLayerGroupRef}
      />
    </div>
  );
}

export default App;
