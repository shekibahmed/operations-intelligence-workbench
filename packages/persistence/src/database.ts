import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/oiw";

export type PersistenceDatabase = ReturnType<typeof createDatabase>["database"];

/**
 * Pool size is environment-configurable (`DATABASE_POOL_MAX`): serverless
 * and container hosts need to bound it below the database's own connection
 * ceiling (tracked deployment prerequisite in SESSION.md).
 */
function resolvePoolMax(raw: string | undefined): number {
  if (raw === undefined || raw.trim().length === 0) return 10;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("DATABASE_POOL_MAX must be a positive integer");
  }
  return value;
}

export function createDatabase(databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl) {
  const client = postgres(databaseUrl, {
    max: resolvePoolMax(process.env.DATABASE_POOL_MAX),
    onnotice: () => undefined,
  });
  const database = drizzle(client, { schema });

  return {
    client,
    database,
    async close(): Promise<void> {
      await client.end();
    },
  };
}
