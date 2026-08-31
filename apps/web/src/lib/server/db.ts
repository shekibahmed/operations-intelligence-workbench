import { createDatabase, createPostgresRepositories, type PersistenceRepositories } from "@oiw/persistence";

/**
 * `next dev` reloads route modules on every request in some configurations;
 * stashing the connection on `globalThis` keeps one `postgres` connection
 * pool alive across reloads instead of leaking a new one per request.
 */
declare global {
  var __oiwDbConnection: ReturnType<typeof createDatabase> | undefined;
}

function getConnection() {
  globalThis.__oiwDbConnection ??= createDatabase();
  return globalThis.__oiwDbConnection;
}

export function getRepositories(): PersistenceRepositories {
  return createPostgresRepositories(getConnection().database);
}
