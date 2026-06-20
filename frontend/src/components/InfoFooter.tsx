export function InfoFooter() {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] group">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:scale-110 transition-transform text-blue-500 hover:text-blue-600 dark:text-blue-400">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div className="absolute bottom-14 right-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none group-hover:pointer-events-auto">
        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-2">About HexMap Pro</h4>
        <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-500 font-bold">•</span>
            <span>Set your <b>workplace</b> and a search area, then generate a <b>commute-time heatmap</b>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500 font-bold">•</span>
            <span>Each hex is colored by its <b>driving time</b> to the workplace (OSRM, cached).</span>
          </li>
        </ul>
        <div className="mt-3 text-[10px] text-gray-400 text-center border-t border-gray-100 dark:border-gray-700 pt-2">
          React · Fastify · PostgreSQL
        </div>
      </div>
    </div>
  );
}
