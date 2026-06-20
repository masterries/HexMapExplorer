import type { FastifyInstance } from 'fastify';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { drivingTimeCache, poiCache } from '../db/schema.js';
import { env } from '../env.js';

/**
 * Cache administration: inspect and clear the driving-time and POI caches.
 *
 * Gated by a simple shared password (the `ADMIN_TOKEN` env var, default
 * "admin") sent as the `x-admin-token` header. For a public deployment, set a
 * strong ADMIN_TOKEN and/or put it behind reverse-proxy auth.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Applies only to this encapsulated plugin (the /admin routes).
  app.addHook('onRequest', async (request, reply) => {
    if (request.headers['x-admin-token'] !== env.ADMIN_TOKEN) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

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
