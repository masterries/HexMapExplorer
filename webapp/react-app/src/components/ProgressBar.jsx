export function ProgressBar({ progress, status, isGenerating }) {
  const { current, total, ring, maxRing } = progress;
  const percentage = total > 0 ? (current / total) * 100 : 0;

  if (!isGenerating && total === 0) return null;

  return (
    <div className="space-y-2 animate-slide-in">
      {/* Status text */}
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500 font-medium truncate max-w-[200px]">
          {status}
        </span>
        {isGenerating && (
          <span className="text-blue-600 font-mono font-bold">
            Ring {ring}/{maxRing}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isGenerating ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{current} / {total} hexagons</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
