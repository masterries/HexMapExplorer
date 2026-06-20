import type { FastifyInstance } from 'fastify';
import { desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { mapRequests } from '../db/schema.js';

interface SaveMapBody {
  name?: string;
  centerLat: number;
  centerLon: number;
  destLat: number;
  destLon: number;
  radius: number;
  hexSize?: number;
}

const saveBodySchema = {
  type: 'object',
  required: ['centerLat', 'centerLon', 'destLat', 'destLon', 'radius'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    centerLat: { type: 'number' },
    centerLon: { type: 'number' },
    destLat: { type: 'number' },
    destLon: { type: 'number' },
    radius: { type: 'integer' },
    hexSize: { type: 'number' },
  },
} as const;

/**
 * Saved map configurations (ports save_map.php + get_history.php).
 * Request and response bodies are camelCase.
 */
export async function mapRoutes(app: FastifyInstance): Promise<void> {
  // History: last 50 saved configs, newest first.
  app.get('/maps', async () => {
    return db
      .select()
      .from(mapRequests)
      .orderBy(desc(mapRequests.createdAt))
      .limit(50);
  });

  // Save a configuration -> { status, id }.
  app.post('/maps', { schema: { body: saveBodySchema } }, async (request) => {
    const body = request.body as SaveMapBody;
    const [inserted] = await db
      .insert(mapRequests)
      .values({
        name: body.name ?? 'My Map',
        centerLat: body.centerLat,
        centerLon: body.centerLon,
        destLat: body.destLat,
        destLon: body.destLon,
        radius: body.radius,
        hexSize: body.hexSize ?? 0.4,
      })
      .returning({ id: mapRequests.id });

    return { status: 'success', id: inserted.id };
  });
}
