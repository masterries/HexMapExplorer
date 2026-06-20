import type { FastifyInstance } from 'fastify';
import { inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { drivingTimeCache } from '../db/schema.js';

/**
 * Driving-time cache endpoints (ports cache_layer.php).
 * Keys are opaque "slat_slon_dlat_dlon" strings; values are minutes.
 */
export async function cacheRoutes(app: FastifyInstance): Promise<void> {
  // GET batch: { keys: string[] } -> { [cacheKey]: durationMinutes }
  app.post(
    '/cache/get',
    {
      schema: {
        body: {
          type: 'object',
          required: ['keys'],
          additionalProperties: false,
          properties: {
            keys: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request) => {
      const { keys } = request.body as { keys: string[] };
      if (keys.length === 0) return {};

      const rows = await db
        .select({
          cacheKey: drivingTimeCache.cacheKey,
          duration: drivingTimeCache.duration,
        })
        .from(drivingTimeCache)
        .where(inArray(drivingTimeCache.cacheKey, keys));

      const result: Record<string, number> = {};
      for (const row of rows) result[row.cacheKey] = row.duration;
      return result;
    },
  );

  // SET batch: { data: { [cacheKey]: durationMinutes } } -> { status, count }
  app.post(
    '/cache/set',
    {
      schema: {
        body: {
          type: 'object',
          required: ['data'],
          additionalProperties: false,
          properties: {
            data: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
          },
        },
      },
    },
    async (request) => {
      const { data } = request.body as { data: Record<string, number> };
      const entries = Object.entries(data);
      if (entries.length === 0) return { status: 'success', count: 0 };

      const values = entries.map(([cacheKey, duration]) => ({
        cacheKey,
        duration,
      }));

      // Single multi-row upsert (Postgres equivalent of MySQL's
      // INSERT ... ON DUPLICATE KEY UPDATE).
      await db
        .insert(drivingTimeCache)
        .values(values)
        .onConflictDoUpdate({
          target: drivingTimeCache.cacheKey,
          set: {
            duration: sql`excluded.duration`,
            updatedAt: sql`now()`,
          },
        });

      return { status: 'success', count: entries.length };
    },
  );
}
