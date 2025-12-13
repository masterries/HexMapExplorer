import React from 'react';

/**
 * Grid control sliders for radius and hex size
 */
export function GridControls({
  radius,
  hexSize,
  hexCount,
  showLabels,
  colorMin,
  colorMax,
  onRadiusChange,
  onHexSizeChange,
  onShowLabelsChange,
  onColorRangeChange
}) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      {/* Radius Slider */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm font-bold text-gray-700">Grid Radius</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => onRadiusChange(parseInt(e.target.value) || 2)}
            min="2"
            max="30"
            className="w-20 text-right text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-transparent focus:border-blue-300 outline-none transition-colors"
          />
        </div>
        <input
          type="range"
          min="2"
          max="30"
          value={radius}
          onChange={(e) => onRadiusChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Small</span>
          <span>Points: <span className="font-mono">{hexCount}</span></span>
          <span>Large</span>
        </div>
      </div>

      {/* Hex Size Slider */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm font-bold text-gray-700">Hex Size (km)</label>
          <input
            type="number"
            value={hexSize}
            onChange={(e) => onHexSizeChange(parseFloat(e.target.value) || 0.1)}
            min="0.1"
            max="2.0"
            step="0.1"
            className="w-20 text-right text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-transparent focus:border-indigo-300 outline-none transition-colors"
          />
        </div>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={hexSize}
          onChange={(e) => onHexSizeChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>High Res</span>
          <span>Low Res</span>
        </div>

        {/* Label Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="show_labels"
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="show_labels" className="text-xs font-bold text-gray-700">
            Show Time Labels (Zoom In)
          </label>
        </div>
      </div>

      {/* Color Thresholds */}
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-2">Color Gradient Range</label>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1">
            <label className="text-[10px] text-green-600 block">Min (Green)</label>
            <div className="flex items-center">
              <input
                type="number"
                value={colorMin}
                onChange={(e) => onColorRangeChange(parseInt(e.target.value) || 0, colorMax)}
                className="w-full text-right text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded border border-transparent focus:border-green-300 outline-none transition-colors"
              />
              <span className="text-[10px] text-gray-400 ml-1">m</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-red-500 block">Max (Red)</label>
            <div className="flex items-center">
              <input
                type="number"
                value={colorMax}
                onChange={(e) => onColorRangeChange(colorMin, parseInt(e.target.value) || 100)}
                className="w-full text-right text-xs font-mono text-red-500 bg-red-50 px-2 py-1 rounded border border-transparent focus:border-red-300 outline-none transition-colors"
              />
              <span className="text-[10px] text-gray-400 ml-1">m</span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 leading-tight">
          Driving times interpolate from Green to Red between these values.
        </p>
      </div>
    </div>
  );
}

export default GridControls;
