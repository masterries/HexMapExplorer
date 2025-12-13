import React, { useState } from 'react';
import { searchLocation } from '../../services/geocoding';

/**
 * Location input component with search and coordinate inputs
 */
export function LocationInput({
  type,
  lat,
  lon,
  onCoordinatesChange,
  onPickClick
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const isStart = type === 'start';
  const label = isStart ? 'Start Point' : 'Destination';
  const colorClass = isStart ? 'blue' : 'red';

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await searchLocation(searchQuery);
      if (result) {
        onCoordinatesChange(result.lat, result.lon);
      } else {
        alert('Location not found');
      }
    } catch (error) {
      alert('Error searching location');
    }
    setIsSearching(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative group">
      <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">
        {label}
      </label>
      <div className={`flex gap-2 p-2 bg-white rounded-xl shadow-sm border border-gray-100 focus-within:ring-2 ring-${colorClass}-500 transition-all`}>
        {/* Icon */}
        <div className={`p-2 bg-${colorClass}-50 rounded-lg text-${colorClass}-600 self-center`}>
          {isStart ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 21a2 2 0 01-2-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13a2 2 0 100-4h14a2 2 0 100 4" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13v-6a4 4 0 10-8 0v6" />
            </svg>
          )}
        </div>

        {/* Inputs */}
        <div className="flex-grow flex flex-col gap-1">
          {/* Search */}
          <div className="flex relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search Place..."
              className="w-full text-xs border-b border-gray-100 pb-1 outline-none bg-transparent font-medium"
            />
            <button
              onClick={handleSearch}
              className={`absolute right-0 text-gray-400 hover:text-${colorClass}-500`}
              disabled={isSearching}
            >
              {isSearching ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                </svg>
              )}
            </button>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={lat}
              onChange={(e) => onCoordinatesChange(parseFloat(e.target.value), lon)}
              step="0.0001"
              placeholder="Lat"
              className="w-full text-[10px] bg-transparent outline-none font-mono text-gray-500"
            />
            <input
              type="number"
              value={lon}
              onChange={(e) => onCoordinatesChange(lat, parseFloat(e.target.value))}
              step="0.0001"
              placeholder="Lon"
              className="w-full text-[10px] bg-transparent outline-none font-mono text-gray-500 text-right"
            />
          </div>
        </div>

        {/* Pick Button */}
        <button
          onClick={onPickClick}
          className="text-xs text-blue-500 hover:text-blue-700 px-1 font-semibold border-l border-gray-100 pl-2"
        >
          PICK
        </button>
      </div>
    </div>
  );
}

export default LocationInput;
