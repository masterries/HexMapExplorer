import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { env } from '../env.js';

// pg is CommonJS; destructure the default export for reliable ESM interop.
const { Pool } = pg;

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type DB = typeof db;
