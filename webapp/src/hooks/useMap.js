/**
 * React hook for managing Leaflet map state
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing map configuration and markers
 * @param {Object} initialConfig
 * @returns {Object} Map state and actions
 */
export function useMap(initialConfig = {}) {
  const [centerCoords, setCenterCoords] = useState({
    lat: initialConfig.centerLat || 49.8734,
    lon: initialConfig.centerLon || 6.1727
  });

  const [destCoords, setDestCoords] = useState({
    lat: initialConfig.destLat || 49.8734,
    lon: initialConfig.destLon || 6.1727
  });

  const [gridSettings, setGridSettings] = useState({
    radius: initialConfig.radius || 6,
    hexSize: initialConfig.hexSize || 0.4
  });

  const [colorRange, setColorRange] = useState({
    min: initialConfig.colorMin || 5,
    max: initialConfig.colorMax || 70
  });

  const [showLabels, setShowLabels] = useState(true);
  const [pickMode, setPickMode] = useState(null); // 'center' | 'dest' | null
  const [isDarkMode, setIsDarkMode] = useState(false);

  const mapRef = useRef(null);
  const markersRef = useRef({ center: null, dest: null });
  const hexLayerGroupRef = useRef(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  /**
   * Update center coordinates
   */
  const updateCenter = useCallback((lat, lon) => {
    setCenterCoords({ lat, lon });
  }, []);

  /**
   * Update destination coordinates
   */
  const updateDestination = useCallback((lat, lon) => {
    setDestCoords({ lat, lon });
  }, []);

  /**
   * Update grid radius
   */
  const updateRadius = useCallback((radius) => {
    setGridSettings(prev => ({ ...prev, radius: parseInt(radius) }));
  }, []);

  /**
   * Update hex size
   */
  const updateHexSize = useCallback((hexSize) => {
    setGridSettings(prev => ({ ...prev, hexSize: parseFloat(hexSize) }));
  }, []);

  /**
   * Update color range
   */
  const updateColorRange = useCallback((min, max) => {
    setColorRange({ min, max });
  }, []);

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  /**
   * Enable pick mode for coordinate selection
   */
  const enablePickMode = useCallback((mode) => {
    setPickMode(mode);
  }, []);

  /**
   * Handle map click for coordinate picking
   */
  const handleMapClick = useCallback((latlng) => {
    if (pickMode === 'center') {
      updateCenter(latlng.lat, latlng.lng);
    } else if (pickMode === 'dest') {
      updateDestination(latlng.lat, latlng.lng);
    }
    setPickMode(null);
  }, [pickMode, updateCenter, updateDestination]);

  /**
   * Calculate hex count for current radius
   */
  const getHexCount = useCallback(() => {
    const r = gridSettings.radius;
    return 3 * r * (r + 1) + 1;
  }, [gridSettings.radius]);

  /**
   * Load configuration from history item
   */
  const loadConfig = useCallback((config) => {
    setCenterCoords({ lat: config.center_lat, lon: config.center_lon });
    setDestCoords({ lat: config.dest_lat, lon: config.dest_lon });
    setGridSettings({
      radius: config.radius,
      hexSize: config.hex_size || 0.4
    });
  }, []);

  /**
   * Get current configuration for saving
   */
  const getConfig = useCallback(() => {
    return {
      center_lat: centerCoords.lat,
      center_lon: centerCoords.lon,
      dest_lat: destCoords.lat,
      dest_lon: destCoords.lon,
      radius: gridSettings.radius,
      hex_size: gridSettings.hexSize
    };
  }, [centerCoords, destCoords, gridSettings]);

  return {
    // State
    centerCoords,
    destCoords,
    gridSettings,
    colorRange,
    showLabels,
    pickMode,
    isDarkMode,

    // Refs
    mapRef,
    markersRef,
    hexLayerGroupRef,

    // Actions
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
  };
}

export default useMap;
