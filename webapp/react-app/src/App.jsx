import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { HexMap } from './components/HexMap';
import { useHexGrid } from './hooks/useHexGrid';
import './index.css';

function App() {
  // Coordinates state
  const [centerLat, setCenterLat] = useState(49.8734);
  const [centerLon, setCenterLon] = useState(6.1727);
  const [destLat, setDestLat] = useState(49.8734);
  const [destLon, setDestLon] = useState(6.1727);

  // Grid settings
  const [radius, setRadius] = useState(6);
  const [hexSize, setHexSize] = useState(0.4);

  // Pick mode for clicking map
  const [pickMode, setPickMode] = useState(null);

  // Hex grid hook with star-expand algorithm
  const {
    hexagons,
    isGenerating,
    progress,
    status,
    generateGrid,
    abort,
    clear
  } = useHexGrid();

  // Handlers
  const handleCenterChange = useCallback((lat, lon) => {
    if (!isNaN(lat)) setCenterLat(lat);
    if (!isNaN(lon)) setCenterLon(lon);
  }, []);

  const handleDestChange = useCallback((lat, lon) => {
    if (!isNaN(lat)) setDestLat(lat);
    if (!isNaN(lon)) setDestLon(lon);
  }, []);

  const handleMapClick = useCallback((lat, lng) => {
    if (pickMode === 'center') {
      setCenterLat(parseFloat(lat.toFixed(4)));
      setCenterLon(parseFloat(lng.toFixed(4)));
    } else if (pickMode === 'dest') {
      setDestLat(parseFloat(lat.toFixed(4)));
      setDestLon(parseFloat(lng.toFixed(4)));
    }
    setPickMode(null);
  }, [pickMode]);

  const handleGenerate = useCallback(() => {
    clear();
    generateGrid({
      centerLat,
      centerLon,
      destLat,
      destLon,
      radius,
      hexSize
    });
  }, [centerLat, centerLon, destLat, destLon, radius, hexSize, generateGrid, clear]);

  const handleLoadConfig = useCallback((config) => {
    setCenterLat(parseFloat(config.center_lat));
    setCenterLon(parseFloat(config.center_lon));
    setDestLat(parseFloat(config.dest_lat));
    setDestLon(parseFloat(config.dest_lon));
    setRadius(parseInt(config.radius));
    if (config.hex_size) {
      setHexSize(parseFloat(config.hex_size));
    }
    clear();
  }, [clear]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      <Sidebar
        centerLat={centerLat}
        centerLon={centerLon}
        destLat={destLat}
        destLon={destLon}
        radius={radius}
        hexSize={hexSize}
        onCenterChange={handleCenterChange}
        onDestChange={handleDestChange}
        onRadiusChange={setRadius}
        onHexSizeChange={setHexSize}
        onPickCenter={() => setPickMode('center')}
        onPickDest={() => setPickMode('dest')}
        pickMode={pickMode}
        onGenerate={handleGenerate}
        onAbort={abort}
        isGenerating={isGenerating}
        progress={progress}
        status={status}
        onLoadConfig={handleLoadConfig}
      />

      <div className="flex-grow z-10 relative">
        <HexMap
          hexagons={hexagons}
          centerPos={[centerLat, centerLon]}
          destPos={[destLat, destLon]}
          onCenterChange={handleCenterChange}
          onDestChange={handleDestChange}
          pickMode={pickMode}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
}

export default App;
