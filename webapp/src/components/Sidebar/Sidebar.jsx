import React, { useState } from 'react';
import { ThemeToggle } from '../UI/ThemeToggle';
import { ProgressBar } from '../UI/ProgressBar';
import { LocationInput } from './LocationInput';
import { GridControls } from './GridControls';
import { AlgorithmPanel } from './AlgorithmPanel';
import { HistoryPanel } from './HistoryPanel';

/**
 * Main sidebar component containing all controls
 */
export function Sidebar({
  // Location state
  centerCoords,
  destCoords,
  onCenterChange,
  onDestChange,
  onPickCenter,
  onPickDest,

  // Grid settings
  radius,
  hexSize,
  hexCount,
  showLabels,
  colorMin,
  colorMax,
  onRadiusChange,
  onHexSizeChange,
  onShowLabelsChange,
  onColorRangeChange,

  // Algorithm state
  isRunning,
  stats,
  progress,
  statusMessage,
  speed,
  onSpeedChange,
  onGenerate,
  onStop,

  // Theme
  isDarkMode,
  onToggleDarkMode,

  // History
  onLoadConfig,
  getConfig,

  // Mobile
  isMobileOpen,
  onMobileToggle
}) {
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn fixed top-4 left-4 z-[999] bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg md:hidden"
        onClick={onMobileToggle}
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Backdrop */}
      <div
        className={`mobile-backdrop fixed inset-0 bg-black/50 z-[9998] transition-opacity md:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileToggle}
      />

      {/* Sidebar */}
      <div
        className={`glass-panel w-1/4 min-w-[380px] z-20 flex flex-col p-6 overflow-y-auto relative
          fixed md:relative top-0 left-0 h-screen
          transition-transform md:transform-none
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {/* Mobile Close Button */}
            <button
              className="md:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={onMobileToggle}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              HexMap <span className="font-light text-gray-500">Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleDarkMode} />
            <span className="px-2 py-1 text-xs font-bold text-indigo-100 bg-indigo-600 rounded shadow-sm">
              A*
            </span>
          </div>
        </div>

        <div className="space-y-6 flex-grow">
          {/* Location Inputs */}
          <div className="space-y-4">
            <LocationInput
              type="start"
              lat={centerCoords.lat}
              lon={centerCoords.lon}
              onCoordinatesChange={onCenterChange}
              onPickClick={onPickCenter}
            />
            <LocationInput
              type="dest"
              lat={destCoords.lat}
              lon={destCoords.lon}
              onCoordinatesChange={onDestChange}
              onPickClick={onPickDest}
            />
          </div>

          {/* Grid Controls */}
          <GridControls
            radius={radius}
            hexSize={hexSize}
            hexCount={hexCount}
            showLabels={showLabels}
            colorMin={colorMin}
            colorMax={colorMax}
            onRadiusChange={onRadiusChange}
            onHexSizeChange={onHexSizeChange}
            onShowLabelsChange={onShowLabelsChange}
            onColorRangeChange={onColorRangeChange}
          />

          {/* Generate Button */}
          <div>
            <div className="flex gap-2">
              <button
                onClick={onGenerate}
                disabled={isRunning}
                className="flex-grow group relative flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isRunning ? 'Running A*...' : 'Generate Map'}
              </button>
              {isRunning && (
                <button
                  onClick={onStop}
                  className="py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg transition-all transform active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status Text */}
            <div className="text-xs text-gray-500 text-center mt-2 h-4 font-medium transition-all">
              {statusMessage}
            </div>

            {/* Progress Bar */}
            <ProgressBar progress={progress} visible={isRunning} />

            {/* Legend */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                <span>Fast (&lt;{colorMin}m)</span>
                <span>Slow (&gt;{colorMax}m)</span>
              </div>
              <div
                className="h-2 w-full rounded shadow-inner"
                style={{
                  background: 'linear-gradient(to right, rgb(0, 255, 0) 0%, rgb(255, 255, 0) 50%, rgb(255, 0, 0) 100%)'
                }}
              />
            </div>
          </div>

          <hr className="border-dashed border-gray-300" />

          {/* Algorithm Panel */}
          <AlgorithmPanel
            stats={stats}
            speed={speed}
            onSpeedChange={onSpeedChange}
            isOpen={isRunning}
          />

          <hr className="border-dashed border-gray-300" />

          {/* History Panel */}
          <HistoryPanel
            currentConfig={getConfig()}
            onLoadConfig={onLoadConfig}
          />
        </div>

        {/* Info Button */}
        <InfoButton />
      </div>
    </>
  );
}

/**
 * Info button with popover
 */
function InfoButton() {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] group">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:scale-110 transition-transform text-blue-500 hover:text-blue-600 dark:text-blue-400">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Popover */}
      <div className="absolute bottom-14 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none group-hover:pointer-events-auto">
        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Coming Soon (Phase 3)
        </h4>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">*</span>
            <span><b>Real Estate Prices:</b> Calculate property values for every hexagon.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500 font-bold">*</span>
            <span><b>Quality of Life Index:</b> Comprehensive score based on amenities and data.</span>
          </li>
        </ul>
        <div className="mt-3 text-[10px] text-gray-400 text-center border-t border-gray-100 dark:border-gray-700 pt-2">
          Roadmap 2025
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
