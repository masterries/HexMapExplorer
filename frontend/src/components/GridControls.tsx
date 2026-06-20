import { hexCount } from '../services/hexGeo';

interface GridControlsProps {
  radius: number;
  hexSize: number;
  showLabels: boolean;
  colorMin: number;
  colorMax: number;
  onRadiusChange: (v: number) => void;
  onHexSizeChange: (v: number) => void;
  onShowLabelsChange: (v: boolean) => void;
  onColorMinChange: (v: number) => void;
  onColorMaxChange: (v: number) => void;
}

export function GridControls({
  radius,
  hexSize,
  showLabels,
  colorMin,
  colorMax,
  onRadiusChange,
  onHexSizeChange,
  onShowLabelsChange,
  onColorMinChange,
  onColorMaxChange,
}: GridControlsProps) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
      {/* Radius */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm font-bold text-gray-700">Grid Radius</label>
          <input
            type="number"
            value={radius}
            min={2}
            max={30}
            onChange={(e) => onRadiusChange(parseInt(e.target.value) || 0)}
            className="w-20 text-right text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-transparent focus:border-blue-300 outline-none transition-colors"
          />
        </div>
        <input
          type="range"
          min={2}
          max={30}
          value={radius}
          onChange={(e) => onRadiusChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Small</span>
          <span>Points: {hexCount(radius)}</span>
          <span>Large</span>
        </div>
      </div>

      {/* Hex size */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-sm font-bold text-gray-700">Hex Size (km)</label>
          <input
            type="number"
            value={hexSize}
            step={0.1}
            onChange={(e) => onHexSizeChange(parseFloat(e.target.value) || 0)}
            className="w-20 text-right text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-transparent focus:border-indigo-300 outline-none transition-colors"
          />
        </div>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={hexSize}
          onChange={(e) => onHexSizeChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>High Res</span>
          <span>Low Res</span>
        </div>

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

      {/* Color thresholds */}
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-2">Color Gradient Range</label>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1">
            <label className="text-[10px] text-green-600 block">Min (Green)</label>
            <div className="flex items-center">
              <input
                type="number"
                value={colorMin}
                onChange={(e) => onColorMinChange(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => onColorMaxChange(parseFloat(e.target.value) || 0)}
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
