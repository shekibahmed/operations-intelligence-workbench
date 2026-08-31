import { resolve } from "node:path";

import { ResetService, SeedService } from "../packages/application/src/index.js";
import { createDatabase } from "../packages/persistence/src/database.js";
import { createPostgresRepositories } from "../packages/persistence/src/postgres-repositories.js";
import { loadFixtureSet } from "../packages/scenario-sdk/src/fixtures.js";
import { buildPackRegistry } from "../packages/scenario-sdk/src/registry.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const workspaceSlug = option("--workspace");
if (workspaceSlug === undefined) {
  throw new Error("Usage: pnpm demo:reset --workspace <slug>");
}

const connection = createDatabase();

try {
  const repositories = createPostgresRepositories(connection.database);
  const workspace = await repositories.workspaces.findBySlug(workspaceSlug);
  if (workspace === null) throw new Error(`Workspace not found: ${workspaceSlug}`);
  if (workspace.activePackId === null) {
    throw new Error(`Workspace has no active Scenario Pack: ${workspaceSlug}`);
  }

  const registry = await buildPackRegistry(resolve(repositoryRoot, "scenario-packs"));
  const entry = registry.list().find((candidate) => candidate.id === workspace.activePackId);
  if (entry === undefined) {
    throw new Error(`Active Scenario Pack is not installed: ${workspace.activePackId}`);
  }

  const seedService = new SeedService(repositories);
  const result = await new ResetService(repositories, seedService).reset(
    workspace,
    entry.pack,
    loadFixtureSet,
  );
  console.log(`Reset workspace ${workspace.slug} (${workspace.id}).`);
  console.log(`Fixture set: ${result.fixtureSet}; ${result.sourceCount} sources, ${result.artifactCount} artifacts.`);
  if (result.warnings.length > 0) console.warn(`${result.warnings.length} fixture warning(s) reported.`);
} finally {
  await connection.close();
}
