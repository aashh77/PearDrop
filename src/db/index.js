import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Reuse the pool across hot-reloads in development so we don't leak
// connections every time a file is edited.
const globalForDb = globalThis;

export const pool =
  globalForDb.__localDropPgPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__localDropPgPool = pool;
}

export const db = drizzle(pool);
