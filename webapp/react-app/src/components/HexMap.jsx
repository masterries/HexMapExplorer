import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getDrivingTimeColor } from '../utils/geo';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color, size = 12) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: ${color};
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2]
});

const centerIcon = createIcon('#3b82f6', 14);
const destIcon = createIcon('#ef4444', 16);

// Map click handler component
function MapClickHandler({ pickMode, onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (pickMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Map view updater
function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Draggable marker component
function DraggableMarker({ position, icon, onDragEnd }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(pos.lat, pos.lng);
      }
    }
  }), [onDragEnd]);

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      icon={icon}
      ref={markerRef}
    />
  );
}

export function HexMap({
  hexagons,
  centerPos,
  destPos,
  onCenterChange,
  onDestChange,
  pickMode,
  onMapClick
}) {
  // Convert hexagons to GeoJSON feature collection
  const geoJsonData = useMemo(() => {
    if (!hexagons || hexagons.length === 0) return null;

    return {
      type: 'FeatureCollection',
      features: hexagons.map((hex, idx) => ({
        type: 'Feature',
        properties: {
          id: idx,
          drivingTime: hex.time,
          ring: hex.ring
        },
        geometry: {
          type: 'Polygon',
          coordinates: [hex.polygon]
        }
      }))
    };
  }, [hexagons]);

  // Style function for hexagons
  const hexStyle = (feature) => ({
    fillColor: getDrivingTimeColor(feature.properties.drivingTime),
    weight: 1,
    opacity: 0.9,
    color: 'white',
    fillOpacity: 0.65
  });

  // Popup on each hexagon
  const onEachFeature = (feature, layer) => {
    const time = feature.properties.drivingTime;
    const ring = feature.properties.ring;
    layer.bindPopup(`
      <div class="text-sm">
        <div class="font-bold text-slate-700">
          ${time !== null ? time.toFixed(1) + ' min' : 'N/A'}
        </div>
        <div class="text-xs text-slate-400">Ring ${ring}</div>
      </div>
    `);
  };

  return (
    <MapContainer
      center={centerPos}
      zoom={11}
      className="w-full h-full"
      zoomControl={false}
      style={{ cursor: pickMode ? 'crosshair' : '' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CartoDB</a> &copy; OSRM'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapClickHandler pickMode={pickMode} onMapClick={onMapClick} />
      <MapViewUpdater center={centerPos} />

      {/* Hex layer */}
      {geoJsonData && (
        <GeoJSON
          key={hexagons.length} // Force re-render when hexagons change
          data={geoJsonData}
          style={hexStyle}
          onEachFeature={onEachFeature}
        />
      )}

      {/* Markers */}
      <DraggableMarker
        position={centerPos}
        icon={centerIcon}
        onDragEnd={onCenterChange}
      />
      <DraggableMarker
        position={destPos}
        icon={destIcon}
        onDragEnd={onDestChange}
      />

      {/* Zoom control */}
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control leaflet-bar">
          <ZoomControl />
        </div>
      </div>
    </MapContainer>
  );
}

function ZoomControl() {
  const map = useMap();

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden m-3">
      <button
        onClick={() => map.zoomIn()}
        className="p-2 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="p-2 hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
        </svg>
      </button>
    </div>
  );
}
