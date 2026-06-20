import { defineConfig } from 'drizzle-kit';

// Used by `drizzle-kit generate` (reads the schema; no DB connection needed)
// and the optional `drizzle-kit` push/studio commands.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://hexmap:hexmap@localhost:5432/hexa_app',
  },
});
