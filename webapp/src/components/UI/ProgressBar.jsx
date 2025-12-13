import React from 'react';

/**
 * Progress bar component for algorithm visualization
 */
export function ProgressBar({ progress, visible = true }) {
  if (!visible) return null;

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
      <div
        className="bg-blue-500 h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

export default ProgressBar;
