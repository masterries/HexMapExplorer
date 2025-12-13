import React, { useState } from 'react';

/**
 * Collapsible algorithm visualization panel
 */
export function AlgorithmPanel({
  stats,
  speed,
  onSpeedChange,
  isOpen = false
}) {
  const [open, setOpen] = useState(isOpen);

  return (
    <div id="algo_panel">
      {/* Header */}
      <div
        className={`collapsible-header cursor-pointer flex justify-between items-center ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-xs font-bold uppercase text-gray-400 ml-1">
          A* Algorithm Visualization
        </h3>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Content */}
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="algo-stats mt-2 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl p-3 text-white">
          {/* Stats */}
          <div className="space-y-1">
            <StatItem label="Current Step" value={stats.step} />
            <StatItem label="Queue Size" value={stats.queueSize} />
            <StatItem label="Visited" value={stats.visitedCount} />
            <StatItem label="Path Length" value={stats.pathLength} />
            <StatItem label="Status" value={stats.status} isStatus />
          </div>

          {/* State Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <LegendItem color="#93c5fd" borderColor="#3b82f6" label="Queued" />
            <LegendItem color="#fbbf24" borderColor="#f59e0b" borderWidth={2} label="Exploring" />
            <LegendItem color="#22c55e" label="Visited" />
            <LegendItem color="#22c55e" borderColor="#dc2626" borderWidth={3} label="Path" />
          </div>

          {/* Speed Control */}
          <div className="mt-3">
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs text-indigo-200">Animation Speed</label>
              <span className="text-xs font-mono text-white">{speed}ms</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={speed}
              onChange={(e) => onSpeedChange(parseInt(e.target.value))}
              className="w-full h-1 bg-indigo-900 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat item row
 */
function StatItem({ label, value, isStatus = false }) {
  return (
    <div className="flex justify-between py-1 border-b border-white/10 last:border-0">
      <span className="text-[11px] text-indigo-200">{label}</span>
      <span className={`text-sm font-bold font-mono ${isStatus ? 'text-green-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Legend item
 */
function LegendItem({ color, borderColor, borderWidth = 1, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded"
        style={{
          background: color,
          border: borderColor ? `${borderWidth}px solid ${borderColor}` : 'none'
        }}
      />
      <span className="text-gray-300">{label}</span>
    </div>
  );
}

export default AlgorithmPanel;
