import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { db, pool } from './client.js';

const here = dirname(fileURLToPath(import.meta.url));
// The committed migrations live at <package root>/drizzle.
// dev:  <root>/src/db/migrate.ts  -> ../../drizzle
// prod: <root>/dist/db/migrate.js -> ../../drizzle
const migrationsFolder = resolve(here, '../../drizzle');

/**
 * Applies all pending migrations. Idempotent — Drizzle records applied
 * migrations in a `__drizzle_migrations` table. Retries on connection failure
 * to survive the container start-up race where Postgres is still booting even
 * though the compose healthcheck has begun.
 */
export async function runMigrations(): Promise<void> {
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await migrate(db, { migrationsFolder });
      console.log('✅ Database migrations applied');
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      console.warn(
        `⏳ Database not ready (attempt ${attempt}/${maxAttempts}), retrying in 2s...`,
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// Support running standalone via `npm run db:migrate`.
const invokedDirectly =
  !!process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
