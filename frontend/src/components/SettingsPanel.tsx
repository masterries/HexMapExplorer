interface SettingsPanelProps {
  performanceMode: boolean;
  onPerformanceModeChange: (v: boolean) => void;
}

/** App settings. Performance mode drops the per-hex number labels — the
 *  slowest part on large grids — for smoother panning/zooming. */
export function SettingsPanel({ performanceMode, onPerformanceModeChange }: SettingsPanelProps) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase text-gray-400 mb-2 ml-1">Settings</h3>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="text-sm font-bold text-gray-700">Performance mode</label>
            <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
              Hides the numbers inside the hexes. Those per-hex labels are the slowest part
              on large grids, so turning this on makes panning and zooming smoother. Colors,
              the popup and the detail view still work.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={performanceMode}
            onClick={() => onPerformanceModeChange(!performanceMode)}
            className={`shrink-0 mt-1 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              performanceMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                performanceMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
