export function Legend() {
  return (
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Fast (0 min)
        </span>
        <span className="flex items-center gap-1">
          Slow (60+ min)
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
        </span>
      </div>
      <div className="legend-gradient shadow-inner"></div>
      <div className="flex justify-center mt-2">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Star-Expand: Center first, then outward rings
        </span>
      </div>
    </div>
  );
}
