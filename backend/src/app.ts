import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { cacheRoutes } from './routes/cache.js';
import { mapRoutes } from './routes/maps.js';
import { poiRoutes } from './routes/poi.js';
import { adminRoutes } from './routes/admin.js';

/**
 * Builds the Fastify app: CORS, health check, and all /api routes.
 * Kept separate from the server bootstrap (index.ts) so it can be imported
 * by tests or tooling without binding a port.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  });

  // Everything the SPA talks to is under /api (matches the nginx + Vite proxy).
  await app.register(
    async (api) => {
      api.get('/health', async () => ({ status: 'ok' }));
      await api.register(cacheRoutes);
      await api.register(mapRoutes);
      await api.register(poiRoutes);
      await api.register(adminRoutes);
    },
    { prefix: '/api' },
  );

  // Uniform JSON error envelope (mirrors the old PHP { error } responses).
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode =
      error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.status(statusCode).send({ error: error.message });
  });

  return app;
}
