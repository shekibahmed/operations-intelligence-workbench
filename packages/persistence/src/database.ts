import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export const defaultDatabaseUrl = "postgresql://postgres:postgres@localhost:5432/oiw";

export type PersistenceDatabase = ReturnType<typeof createDatabase>["database"];

export function createDatabase(databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl) {
  const client = postgres(databaseUrl, { max: 10, onnotice: () => undefined });
  const database = drizzle(client, { schema });

  return {
    client,
    database,
    async close(): Promise<void> {
      await client.end();
    },
  };
}
