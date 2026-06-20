import { useCallback, useEffect, useState } from 'react';
import {
  clearDrivingCache,
  deletePoiCache,
  getCacheStats,
  setAdminToken,
} from '../api/client';
import type { CacheStats } from '../types';

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  /** Re-fetch POIs for the current area, bypassing the cache. */
  onForceReload: () => Promise<void>;
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminPanel({ open, onClose, onForceReload }: AdminPanelProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needAuth, setNeedAuth] = useState(false);
  const [password, setPassword] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await getCacheStats());
      setNeedAuth(false);
    } catch (e) {
      if ((e as Error).message === 'UNAUTHORIZED') setNeedAuth(true);
      else setError('Failed to load cache stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const unlock = useCallback(() => {
    setAdminToken(password.trim());
    setPassword('');
    void loadStats();
  }, [password, loadStats]);

  useEffect(() => {
    if (open) void loadStats();
  }, [open, loadStats]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        await loadStats();
      } catch {
        setError('Action failed');
      } finally {
        setBusy(false);
      }
    },
    [loadStats],
  );

  if (!open) return null;

  const drivingCount = stats?.drivingTime.count ?? 0;
  const poiEntries = stats?.poi.entries ?? [];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Cache Admin</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadStats()}
              className="text-xs font-semibold text-blue-500 hover:underline"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700"
              aria-label="Close"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {needAuth ? (
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Enter the admin password to manage caches.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') unlock();
                }}
                placeholder="Admin password"
                className="flex-grow p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={unlock}
                className="px-4 py-2 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                Unlock
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Default: <code>admin</code> (set <code>ADMIN_TOKEN</code> to change).
            </p>
          </div>
        ) : (
          <>
        {/* Driving-time cache */}
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Driving-time cache</h3>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
            <span className="text-sm text-gray-700 dark:text-gray-200">
              <b>{drivingCount}</b> cached route{drivingCount === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => {
                if (confirm(`Clear all ${drivingCount} cached driving times?`))
                  void run(clearDrivingCache);
              }}
              disabled={busy || drivingCount === 0}
              className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
        </section>

        {/* POI cache */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase text-gray-400">
              POI cache ({stats?.poi.count ?? 0})
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void run(onForceReload)}
                disabled={busy}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
              >
                Force-reload area
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear ALL POI cache entries?')) void run(() => deletePoiCache());
                }}
                disabled={busy || poiEntries.length === 0}
                className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          </div>

          {poiEntries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
              No POI cache entries
            </p>
          ) : (
            <ul className="space-y-2">
              {poiEntries.map((e) => (
                <li
                  key={e.cacheKey}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2"
                >
                  <div className="flex-grow min-w-0">
                    <div
                      className="text-[11px] font-mono text-gray-700 dark:text-gray-200 truncate"
                      title={e.cacheKey}
                    >
                      {e.cacheKey}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {e.count} POIs · {relativeAge(e.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => void run(() => deletePoiCache(e.cacheKey))}
                    disabled={busy}
                    className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
                    aria-label="Delete entry"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  );
}
