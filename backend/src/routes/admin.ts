import type { FastifyInstance } from 'fastify';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { drivingTimeCache, poiCache } from '../db/schema.js';

/**
 * Cache administration: inspect and clear the driving-time and POI caches.
 *
 * NOTE: these endpoints are unauthenticated, consistent with the rest of this
 * self-hosted app. Put the deployment behind reverse-proxy auth (or a VPN) if
 * it is exposed publicly.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Cache overview.
  app.get('/admin/stats', async () => {
    const [{ count: drivingCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(drivingTimeCache);
    const [{ count: poiCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(poiCache);
    const entries = await db
      .select({
        cacheKey: poiCache.cacheKey,
        count: sql<number>`jsonb_array_length(${poiCache.data})::int`,
        updatedAt: poiCache.updatedAt,
      })
      .from(poiCache)
      .orderBy(desc(poiCache.updatedAt))
      .limit(200);

    return {
      drivingTime: { count: drivingCount },
      poi: { count: poiCount, entries },
    };
  });

  // Clear the entire driving-time cache.
  app.post('/admin/driving/clear', async () => {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(drivingTimeCache);
    await db.delete(drivingTimeCache);
    return { deleted: count };
  });

  // Delete one POI cache entry by key, or all if no key given.
  app.post(
    '/admin/poi/delete',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { key: { type: 'string' } },
        },
      },
    },
    async (request) => {
      const { key } = (request.body ?? {}) as { key?: string };
      const rows = key
        ? await db
            .delete(poiCache)
            .where(eq(poiCache.cacheKey, key))
            .returning({ k: poiCache.cacheKey })
        : await db.delete(poiCache).returning({ k: poiCache.cacheKey });
      return { deleted: rows.length };
    },
  );
}
