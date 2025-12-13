import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Main map container component
 */
export function MapContainer({
  centerCoords,
  destCoords,
  isDarkMode,
  pickMode,
  onMapClick,
  onCenterDrag,
  onDestDrag,
  mapRef,
  markersRef,
  hexLayerGroupRef
}) {
  const containerRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false })
      .setView([centerCoords.lat, centerCoords.lon], 11);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer
    tileLayerRef.current = L.tileLayer(
      isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; CartoDB &copy; OSRM' }
    ).addTo(map);

    // Create markers
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

    markersRef.current.center = L.marker([centerCoords.lat, centerCoords.lon], {
      draggable: true,
      icon: centerIcon
    }).addTo(map);

    markersRef.current.dest = L.marker([destCoords.lat, destCoords.lon], {
      draggable: true,
      icon: destIcon
    }).addTo(map);

    // Marker drag handlers
    markersRef.current.center.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onCenterDrag(pos.lat, pos.lng);
    });

    markersRef.current.dest.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onDestDrag(pos.lat, pos.lng);
    });

    // Map click handler
    map.on('click', (e) => {
      onMapClick(e.latlng);
    });

    // Create hex layer group
    hexLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Only run once

  // Update tile layer on dark mode change
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    mapRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(
      isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '&copy; CartoDB &copy; OSRM' }
    ).addTo(mapRef.current);
  }, [isDarkMode]);

  // Update marker positions
  useEffect(() => {
    if (markersRef.current.center) {
      markersRef.current.center.setLatLng([centerCoords.lat, centerCoords.lon]);
    }
  }, [centerCoords]);

  useEffect(() => {
    if (markersRef.current.dest) {
      markersRef.current.dest.setLatLng([destCoords.lat, destCoords.lon]);
    }
  }, [destCoords]);

  // Update cursor for pick mode
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.cursor = pickMode ? 'crosshair' : '';
  }, [pickMode]);

  return (
    <div className="flex-grow z-10 relative">
      <div ref={containerRef} id="map" className="h-screen w-full" />
    </div>
  );
}

export default MapContainer;
