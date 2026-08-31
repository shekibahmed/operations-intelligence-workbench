import { relative, resolve } from "node:path";

import { SeedService, WorkspaceService } from "../packages/application/src/index.js";
import { createDatabase } from "../packages/persistence/src/database.js";
import { createPostgresRepositories } from "../packages/persistence/src/postgres-repositories.js";
import { buildPackRegistry } from "../packages/scenario-sdk/src/registry.js";
import { loadFixtureSet } from "../packages/scenario-sdk/src/fixtures.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const packId = option("--pack");
if (packId === undefined) {
  throw new Error("Usage: pnpm demo:seed --pack <id> [--workspace <slug>]");
}

const registry = await buildPackRegistry(resolve(repositoryRoot, "scenario-packs"));
const entry = registry.list().find((candidate) => candidate.id === packId);
if (entry === undefined) {
  const available = registry.list().map((candidate) => candidate.id).join(", ") || "none";
  throw new Error(`Scenario Pack not found: ${packId}. Available packs: ${available}`);
}

const connection = createDatabase();
const repositories = createPostgresRepositories(connection.database);
let workspaceId: string | undefined;

try {
  const workspaceService = new WorkspaceService(repositories.workspaces);
  const requestedSlug = option("--workspace");
  const workspace = await workspaceService.createGuestWorkspace(entry.id, {
    ...(requestedSlug === undefined ? {} : { slug: requestedSlug }),
    name: `${entry.pack.manifest.name} Demo`,
  });
  workspaceId = workspace.id;

  const result = await new SeedService(repositories).seed(
    workspace,
    entry.pack,
    loadFixtureSet,
  );
  console.log(`Seeded ${entry.id}@${entry.version} from ${relative(repositoryRoot, entry.directory)}.`);
  console.log(`Workspace: ${workspace.slug} (${workspace.id})`);
  console.log(
    `Fixture set: ${result.fixtureSet}; ${result.sourceCount} sources, ${result.artifactCount} artifacts, ${result.entityCount} entities.`,
  );
  if (result.warnings.length > 0) console.warn(`${result.warnings.length} fixture warning(s) reported.`);
} catch (error) {
  if (workspaceId !== undefined) await repositories.workspaces.delete(workspaceId);
  throw error;
} finally {
  await connection.close();
}
