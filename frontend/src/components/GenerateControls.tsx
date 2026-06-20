import type { ColorMode } from '../types';

interface GenerateControlsProps {
  isRunning: boolean;
  statusText: string;
  progress: number;
  progressVisible: boolean;
  colorMin: number;
  colorMax: number;
  colorMode: ColorMode;
  onGenerate: () => void;
  onStop: () => void;
}

export function GenerateControls({
  isRunning,
  statusText,
  progress,
  progressVisible,
  colorMin,
  colorMax,
  colorMode,
  onGenerate,
  onStop,
}: GenerateControlsProps) {
  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={isRunning}
          className="flex-grow group relative flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Computing…' : 'Generate Heatmap'}
        </button>
        {isRunning && (
          <button
            onClick={onStop}
            className="py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-all transform active:scale-95"
            aria-label="Stop"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </button>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center mt-2 h-4 font-medium transition-all">
        {statusText}
      </div>

      {progressVisible && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
          {colorMode === 'liveability' ? (
            <>
              <span>Best</span>
              <span>Worst</span>
            </>
          ) : (
            <>
              <span>{`Fast (<${colorMin}m)`}</span>
              <span>{`Slow (>${colorMax}m)`}</span>
            </>
          )}
        </div>
        <div className="legend-gradient shadow-inner" />
      </div>
    </div>
  );
}
