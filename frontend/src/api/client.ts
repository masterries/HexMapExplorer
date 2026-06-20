import type { BBox, CacheStats, MapRequest, Poi, SaveMapPayload } from '../types';

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
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
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

// --- Admin: cache management ---

export async function getCacheStats(): Promise<CacheStats> {
  const res = await fetch('/api/admin/stats');
  if (!res.ok) throw new Error(`Request to /api/admin/stats failed: ${res.status}`);
  return res.json() as Promise<CacheStats>;
}

export function clearDrivingCache(): Promise<{ deleted: number }> {
  return postJson('/api/admin/driving/clear', {});
}

export function deletePoiCache(key?: string): Promise<{ deleted: number }> {
  return postJson('/api/admin/poi/delete', key ? { key } : {});
}
