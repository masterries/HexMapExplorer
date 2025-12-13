import { useState } from 'react';

export function CoordinateInput({
  label,
  lat,
  lon,
  onChange,
  onPick,
  isPicking,
  colorClass = 'blue'
}) {
  const bgColor = colorClass === 'red' ? 'bg-red-50' : 'bg-blue-50';
  const textColor = colorClass === 'red' ? 'text-red-600' : 'text-blue-600';
  const ringColor = colorClass === 'red' ? 'ring-red-500' : 'ring-blue-500';
  const pickColor = colorClass === 'red' ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700';

  return (
    <div className="relative group">
      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 ml-1 tracking-wide">
        {label}
      </label>
      <div className={`flex gap-2 p-2.5 bg-white rounded-xl shadow-sm border border-slate-100
        focus-within:ring-2 ${ringColor} transition-all duration-200 ${isPicking ? 'ring-2 ' + ringColor : ''}`}>
        <div className={`p-2 ${bgColor} rounded-lg ${textColor} self-center`}>
          {colorClass === 'red' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <div className="flex-grow grid grid-cols-2 gap-2">
          <input
            type="number"
            value={lat}
            step="0.0001"
            placeholder="Latitude"
            onChange={(e) => onChange(parseFloat(e.target.value), lon)}
            className="w-full text-sm bg-transparent outline-none font-mono text-slate-700 placeholder:text-slate-300"
          />
          <input
            type="number"
            value={lon}
            step="0.0001"
            placeholder="Longitude"
            onChange={(e) => onChange(lat, parseFloat(e.target.value))}
            className="w-full text-sm bg-transparent outline-none font-mono text-slate-700 text-right placeholder:text-slate-300"
          />
        </div>
        <button
          onClick={onPick}
          className={`text-xs ${pickColor} px-2 font-bold transition-colors ${isPicking ? 'animate-pulse' : ''}`}
        >
          {isPicking ? 'CLICK MAP' : 'PICK'}
        </button>
      </div>
    </div>
  );
}
