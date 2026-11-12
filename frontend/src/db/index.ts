import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __cropConnectPool?: Pool;
};

// Supabase requires TLS. Serverless functions open many short-lived
// instances, so keep each pool tiny and go through Supabase's pooler.
const isLocal = /localhost|127\.0\.0\.1/.test(databaseUrl);

export const pool =
  globalForDb.__cropConnectPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

globalForDb.__cropConnectPool = pool;

export const db = drizzle(pool);
