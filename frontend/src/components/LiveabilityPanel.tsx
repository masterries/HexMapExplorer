import type { ColorMode, RankedHex } from '../types';

interface LiveabilityPanelProps {
  colorMode: ColorMode;
  commuteWeight: number; // 0..1
  ranking: RankedHex[];
  onColorModeChange: (m: ColorMode) => void;
  onCommuteWeightChange: (w: number) => void; // 0..1
  onFocusHex: (q: number, r: number) => void;
}

export function LiveabilityPanel({
  colorMode,
  commuteWeight,
  ranking,
  onColorModeChange,
  onCommuteWeightChange,
  onFocusHex,
}: LiveabilityPanelProps) {
  const commutePct = Math.round(commuteWeight * 100);

  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Liveability</h3>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        {/* Color mode toggle */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Color hexes by</label>
          <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
            {(['commute', 'liveability'] as ColorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onColorModeChange(m)}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                  colorMode === m
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'commute' ? 'Commute' : 'Liveability'}
              </button>
            ))}
          </div>
        </div>

        {/* Weight slider */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-bold text-gray-700">Weighting</label>
            <span className="text-[11px] font-mono text-gray-500">
              Commute {commutePct}% · Amenities {100 - commutePct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={commutePct}
            onChange={(e) => onCommuteWeightChange(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[10px] text-gray-400 leading-tight mt-1">
            Score blends commute time with nearby-amenity coverage. Amenities load
            automatically when you generate (or load/refresh them in the <b>POIs</b> tab).
          </p>
        </div>

        {/* Best spots */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-2">Best locations</label>
          {ranking.length === 0 ? (
            <p className="text-[11px] text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
              Generate the heatmap (and load POIs) to rank hexes.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {ranking.map((h, i) => (
                <li key={`${h.q},${h.r}`}>
                  <button
                    onClick={() => onFocusHex(h.q, h.r)}
                    className="w-full flex items-center gap-2 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition-colors group"
                  >
                    <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                    <div className="shrink-0 w-11 text-center">
                      <div className="text-base font-bold text-blue-600 font-mono leading-none">
                        {Math.round(h.score * 100)}
                      </div>
                      <div className="text-[9px] text-gray-400 leading-none">/100</div>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[11px] text-gray-600">
                        {h.time != null ? `${Math.round(h.time)} min commute` : '— commute'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {Math.round(h.poiScore * 100)}% amenities
                      </div>
                    </div>
                    <svg
                      className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
