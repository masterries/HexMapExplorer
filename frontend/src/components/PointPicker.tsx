import { useState } from 'react';
import type { PointKind } from '../types';

interface PointPickerProps {
  kind: PointKind;
  label: string;
  lat: number;
  lon: number;
  onLatChange: (v: number) => void;
  onLonChange: (v: number) => void;
  onSearch: (query: string) => Promise<boolean>;
  onPick: () => void;
}

const StartIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DestIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v1m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

function num(value: string, fallback: number): number {
  const v = parseFloat(value);
  return Number.isFinite(v) ? v : fallback;
}

export function PointPicker({
  kind,
  label,
  lat,
  lon,
  onLatChange,
  onLonChange,
  onSearch,
  onPick,
}: PointPickerProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [ok, setOk] = useState(false);

  const isStart = kind === 'center';
  const ring = isStart ? 'ring-blue-500' : 'ring-red-500';
  const iconWrap = isStart ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600';
  const hover = isStart ? 'hover:text-blue-500' : 'hover:text-red-500';

  const runSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setOk(false);
    try {
      const found = await onSearch(query.trim());
      if (found) {
        setOk(true);
        window.setTimeout(() => setOk(false), 2000);
      } else {
        alert('Location not found');
      }
    } catch {
      alert('Error searching location');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative group">
      <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">{label}</label>
      <div className={`flex gap-2 p-2 bg-white rounded-xl shadow-sm border border-gray-100 focus-within:ring-2 ${ring} transition-all`}>
        <div className={`p-2 rounded-lg self-center ${iconWrap}`}>{isStart ? StartIcon : DestIcon}</div>
        <div className="flex-grow flex flex-col gap-1">
          <div className="flex relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runSearch();
              }}
              placeholder="Search Place..."
              className="w-full text-xs border-b border-gray-100 pb-1 outline-none bg-transparent font-medium"
            />
            <button
              onClick={() => void runSearch()}
              className={`absolute right-0 ${ok ? 'text-green-500' : 'text-gray-400'} ${hover}`}
              aria-label="Search"
            >
              {searching ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                </svg>
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => onLatChange(num(e.target.value, lat))}
              placeholder="Lat"
              className="w-full text-[10px] bg-transparent outline-none font-mono text-gray-500"
            />
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={(e) => onLonChange(num(e.target.value, lon))}
              placeholder="Lon"
              className="w-full text-[10px] bg-transparent outline-none font-mono text-gray-500 text-right"
            />
          </div>
        </div>
        <button
          onClick={onPick}
          className="text-xs text-blue-500 hover:text-blue-700 px-1 font-semibold border-l border-gray-100 pl-2"
        >
          PICK
        </button>
      </div>
    </div>
  );
}
