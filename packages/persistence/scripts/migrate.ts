import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "../src/database.js";

const connection = createDatabase();

try {
  await migrate(connection.database, { migrationsFolder: "db/migrations" });
} finally {
  await connection.close();
}
