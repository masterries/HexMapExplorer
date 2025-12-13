import { CoordinateInput } from './CoordinateInput';
import { RangeSlider } from './RangeSlider';
import { ProgressBar } from './ProgressBar';
import { Legend } from './Legend';
import { HistoryPanel } from './HistoryPanel';
import { getHexCount } from '../utils/geo';

export function Sidebar({
  centerLat,
  centerLon,
  destLat,
  destLon,
  radius,
  hexSize,
  onCenterChange,
  onDestChange,
  onRadiusChange,
  onHexSizeChange,
  onPickCenter,
  onPickDest,
  pickMode,
  onGenerate,
  onAbort,
  isGenerating,
  progress,
  status,
  onLoadConfig
}) {
  const hexCount = getHexCount(radius);

  const currentConfig = {
    center_lat: centerLat,
    center_lon: centerLon,
    dest_lat: destLat,
    dest_lon: destLon,
    radius,
    hex_size: hexSize
  };

  return (
    <div className="w-96 min-w-[380px] glass-panel z-20 flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            HexMap
          </span>
          <span className="font-light text-slate-400 ml-1">Pro</span>
        </h1>
        <span className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm">
          React
        </span>
      </div>

      {/* Main Controls */}
      <div className="space-y-6 flex-grow">
        {/* Coordinate Inputs */}
        <div className="space-y-4">
          <CoordinateInput
            label="Start Point"
            lat={centerLat}
            lon={centerLon}
            onChange={onCenterChange}
            onPick={onPickCenter}
            isPicking={pickMode === 'center'}
            colorClass="blue"
          />

          <CoordinateInput
            label="Destination"
            lat={destLat}
            lon={destLon}
            onChange={onDestChange}
            onPick={onPickDest}
            isPicking={pickMode === 'dest'}
            colorClass="red"
          />
        </div>

        {/* Grid Controls */}
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 space-y-5">
          <RangeSlider
            label="Grid Radius"
            value={radius}
            min={2}
            max={30}
            onChange={onRadiusChange}
            leftLabel="Small"
            rightLabel={`${hexCount} points`}
          />

          <RangeSlider
            label="Hex Size"
            value={hexSize}
            min={0.1}
            max={2.0}
            step={0.1}
            onChange={onHexSizeChange}
            unit=" km"
            colorClass="indigo"
            leftLabel="High Res"
            rightLabel="Low Res"
          />
        </div>

        {/* Generate Button */}
        <div className="space-y-3">
          <button
            onClick={isGenerating ? onAbort : onGenerate}
            disabled={false}
            className={`w-full group relative flex justify-center items-center gap-2 py-3.5 px-4
              text-sm font-bold rounded-xl text-white shadow-lg transition-all duration-200
              transform active:scale-[0.98] ${
                isGenerating
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {isGenerating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Stop Generation
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Generate Map
              </>
            )}
          </button>

          {/* Progress */}
          <ProgressBar
            progress={progress}
            status={status}
            isGenerating={isGenerating}
          />

          {/* Legend */}
          <Legend />
        </div>

        <hr className="border-dashed border-slate-200" />

        {/* History */}
        <HistoryPanel
          onLoadConfig={onLoadConfig}
          currentConfig={currentConfig}
        />
      </div>

      {/* Footer */}
      <div className="text-[10px] text-slate-300 text-center mt-6 pt-4 border-t border-slate-100">
        Powered by OSRM & React-Leaflet
      </div>
    </div>
  );
}
