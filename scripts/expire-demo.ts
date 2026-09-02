import { WorkspaceExpirySweep } from "../packages/application/src/index.js";
import { createDatabase } from "../packages/persistence/src/database.js";
import { createPostgresRepositories } from "../packages/persistence/src/postgres-repositories.js";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const connection = createDatabase();

try {
  const repositories = createPostgresRepositories(connection.database);
  const sweep = new WorkspaceExpirySweep(repositories.workspaces);
  const cutoff = option("--before");
  const result = await sweep.run(cutoff);
  console.log(`Expired ${String(result.deletedWorkspaceIds.length)} guest workspace(s) before ${result.cutoff}.`);
  for (const workspaceId of result.deletedWorkspaceIds) console.log(workspaceId);
} finally {
  await connection.close();
}
