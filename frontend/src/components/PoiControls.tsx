import { POI_CATEGORIES } from '../services/poi';

interface PoiControlsProps {
  selected: string[];
  onToggleCategory: (key: string) => void;
  onLoad: () => void;
  onClear: () => void;
  loading: boolean;
  status: string;
}

export function PoiControls({
  selected,
  onToggleCategory,
  onLoad,
  onClear,
  loading,
  status,
}: PoiControlsProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Points of Interest</h3>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {POI_CATEGORIES.map((cat) => (
            <label key={cat.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(cat.key)}
                onChange={() => onToggleCategory(cat.key)}
                className="w-4 h-4 rounded border-gray-300 focus:ring-blue-500"
              />
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: cat.color }}
              />
              <span className="text-xs text-gray-700 truncate">{cat.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onLoad}
            disabled={loading || selected.length === 0}
            className="flex-grow py-2 px-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading…' : 'Load POIs'}
          </button>
          <button
            onClick={onClear}
            className="py-2 px-3 text-sm font-semibold rounded-lg text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>

        <p className="text-[11px] text-gray-500 text-center h-4">{status}</p>
        <p className="text-[10px] text-gray-400 leading-tight">
          Amenities from OpenStreetMap for the search area — also loaded automatically
          when you generate. Click a hex to see what's within 1 km.
        </p>
      </div>
    </div>
  );
}
