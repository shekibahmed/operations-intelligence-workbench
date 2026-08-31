import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase, defaultDatabaseUrl } from "../src/database.js";

const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const parsedUrl = new URL(databaseUrl);
const isLocal = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

if (!isLocal && process.env.OIW_ALLOW_DATABASE_RESET !== "true") {
  throw new Error(
    "Refusing to reset a non-local database. Set OIW_ALLOW_DATABASE_RESET=true only for an isolated test database.",
  );
}

const connection = createDatabase(databaseUrl);

try {
  await connection.client.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await connection.client.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await connection.client.unsafe("CREATE SCHEMA public");
  await migrate(connection.database, { migrationsFolder: "db/migrations" });
} finally {
  await connection.close();
}
