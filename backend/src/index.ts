import { env } from './env.js';
import { buildApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { pool } from './db/client.js';
import { startLuPriceScheduler } from './routes/prices.js';

async function main(): Promise<void> {
  // 1. Ensure the schema is up to date before serving any request.
  await runMigrations();

  // 2. Build and start the server.
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // host 0.0.0.0 is mandatory inside Docker (default 127.0.0.1 is unreachable
  // from the nginx container).
  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  // Keep the Luxembourg price cache warm + up to date in the background.
  startLuPriceScheduler(app.log);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
