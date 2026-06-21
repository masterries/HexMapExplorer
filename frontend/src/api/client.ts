import type { BBox, CacheStats, LuPrices, MapRequest, Poi, SaveMapPayload } from '../types';

/**
 * Thin API client. All requests are same-origin relative /api/* URLs:
 * in dev the Vite proxy forwards them to the backend; in prod nginx does.
 * Content-Type: application/json is required — Fastify won't parse the body
 * otherwise (the old PHP read the raw body and didn't care).
 */
async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
    signal,
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// --- Admin auth (simple shared password sent as x-admin-token) ---

const ADMIN_TOKEN_KEY = 'hexmap.adminToken';
export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
}
export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
function adminHeaders(): Record<string, string> {
  return { 'x-admin-token': getAdminToken() };
}

export function getCache(
  keys: string[],
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  return postJson('/api/cache/get', { keys }, signal);
}

export function setCache(
  data: Record<string, number>,
  signal?: AbortSignal,
): Promise<{ status: string; count: number }> {
  return postJson('/api/cache/set', { data }, signal);
}

export function saveMap(
  payload: SaveMapPayload,
): Promise<{ status: string; id: number }> {
  return postJson('/api/maps', payload);
}

export async function getHistory(): Promise<MapRequest[]> {
  const res = await fetch('/api/maps');
  if (!res.ok) throw new Error(`Request to /api/maps failed: ${res.status}`);
  return res.json() as Promise<MapRequest[]>;
}

export function getPois(
  bbox: BBox,
  categories: string[],
  force = false,
  signal?: AbortSignal,
): Promise<{ pois: Poi[]; cached: boolean }> {
  return postJson('/api/poi', { ...bbox, categories, force }, signal);
}

/** Luxembourg commune-level asking-price series (cached + parsed by backend). */
export async function getLuPrices(force = false): Promise<LuPrices> {
  const res = await fetch(`/api/prices/lu${force ? '?force=1' : ''}`);
  if (!res.ok) throw new Error(`Request to /api/prices/lu failed: ${res.status}`);
  return res.json() as Promise<LuPrices>;
}

// --- Admin: cache management ---

export async function getCacheStats(): Promise<CacheStats> {
  const res = await fetch('/api/admin/stats', { headers: adminHeaders() });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) throw new Error(`Request to /api/admin/stats failed: ${res.status}`);
  return res.json() as Promise<CacheStats>;
}

export function clearDrivingCache(): Promise<{ deleted: number }> {
  return postJson('/api/admin/driving/clear', {}, undefined, adminHeaders());
}

export function deletePoiCache(key?: string): Promise<{ deleted: number }> {
  return postJson('/api/admin/poi/delete', key ? { key } : {}, undefined, adminHeaders());
}
