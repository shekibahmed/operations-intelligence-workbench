import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, defaultDatabaseUrl } from "../../persistence/src/database.js";
import { createPostgresRepositories } from "../../persistence/src/postgres-repositories.js";
import { loadFixtureSet } from "../../scenario-sdk/src/fixtures.js";
import { loadPackFromDirectory } from "../../scenario-sdk/src/loader.js";
import { ResetService } from "../src/reset-service.js";
import { SeedService } from "../src/seed-service.js";
import { WorkspaceService } from "../src/workspace-service.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const migrationsDirectory = resolve(repositoryRoot, "db/migrations");
const packDirectory = resolve(repositoryRoot, "scenario-packs/asset-reliability");
const databaseName = `oiw105_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const baseDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;

const adminConnection = createDatabase(baseDatabaseUrl);
let testConnection: ReturnType<typeof createDatabase>;
let repositories: ReturnType<typeof createPostgresRepositories>;

async function migrateIsolatedDatabase(): Promise<void> {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of migrationFiles) {
    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await testConnection.client.unsafe(statement);
    }
  }
}

beforeAll(async () => {
  await adminConnection.client.unsafe(`CREATE DATABASE "${databaseName}"`);
  testConnection = createDatabase(testDatabaseUrl.toString());
  await migrateIsolatedDatabase();
  repositories = createPostgresRepositories(testConnection.database);
});

afterAll(async () => {
  if (testConnection !== undefined) await testConnection.close();
  await adminConnection.client.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminConnection.close();
});

async function operationalSnapshot(workspaceId: string) {
  return {
    sources: await repositories.sources.list(workspaceId),
    artifacts: await repositories.artifacts.list(workspaceId),
    segments: await repositories.artifactSegments.list(workspaceId),
    entities: await repositories.entities.list(workspaceId),
    observations: await repositories.observations.list(workspaceId),
    events: await repositories.operationalEvents.list(workspaceId),
    signals: await repositories.signals.list(workspaceId),
    cases: await repositories.cases.list(workspaceId),
    actions: await repositories.actionItems.list(workspaceId),
    decisions: await repositories.decisions.list(workspaceId),
    approvals: await repositories.approvals.list(workspaceId),
  };
}

async function normalizedSeedSnapshot(workspaceId: string) {
  const sources = await repositories.sources.list(workspaceId);
  const sourceNames = new Map(
    sources.map((source) => [
      source.id,
      JSON.stringify({
        sourceType: source.sourceType,
        name: source.name,
        configuration: source.configuration,
        createdAt: source.createdAt,
      }),
    ]),
  );

  return {
    sources: [...sourceNames.values()].sort(),
    artifacts: (await repositories.artifacts.list(workspaceId))
      .map((artifact) => ({
        source: sourceNames.get(artifact.sourceId),
        artifactType: artifact.artifactType,
        mimeType: artifact.mimeType,
        receivedAt: artifact.receivedAt,
        occurredAt: artifact.occurredAt,
        rawReference: artifact.rawReference,
        rawText: artifact.rawText,
        checksum: artifact.checksum,
        metadata: artifact.metadata,
        processingStatus: artifact.processingStatus,
      }))
      .sort((left, right) => left.rawReference.localeCompare(right.rawReference)),
  };
}

describe("asset-reliability guest seed and reset", () => {
  it("is deterministic, reset-equal and isolated across workspaces", async () => {
    const packResult = await loadPackFromDirectory(packDirectory);
    expect(packResult.status).toBe("loaded");
    if (packResult.status !== "loaded") throw new Error("Asset Reliability pack did not load");
    const pack = packResult.pack;

    const workspaceService = new WorkspaceService(repositories.workspaces, {
      clock: () => new Date("2026-08-31T10:00:00.000Z"),
    });
    const seedService = new SeedService(repositories, () => new Date("2026-08-31T10:01:00.000Z"));
    const resetService = new ResetService(repositories, seedService, {
      clock: () => new Date("2026-08-31T11:00:00.000Z"),
    });

    const workspaceA = await workspaceService.createGuestWorkspace(pack.manifest.id, {
      slug: `asset-demo-a-${randomUUID().slice(0, 8)}`,
    });
    const workspaceB = await workspaceService.createGuestWorkspace(pack.manifest.id, {
      slug: `asset-demo-b-${randomUUID().slice(0, 8)}`,
    });

    const seededB = await seedService.seed(workspaceB, pack, loadFixtureSet);
    expect(seededB.artifactCount).toBe(25);
    const beforeSeedingA = await operationalSnapshot(workspaceB.id);

    const seededA = await seedService.seed(workspaceA, pack, loadFixtureSet);
    expect(seededA).toMatchObject({ fixtureSet: "demo", artifactCount: 25, warnings: [] });
    expect(await operationalSnapshot(workspaceB.id)).toEqual(beforeSeedingA);

    expect(await normalizedSeedSnapshot(workspaceA.id)).toEqual(
      await normalizedSeedSnapshot(workspaceB.id),
    );
    const initialA = await operationalSnapshot(workspaceA.id);

    await repositories.sources.insert(workspaceA.id, {
      id: randomUUID(),
      workspaceId: workspaceA.id,
      sourceType: "manual-entry",
      name: "Post-seed mutation",
      configuration: { synthetic: true },
      createdAt: "2026-08-31T10:30:00.000Z",
    });
    expect((await repositories.sources.list(workspaceA.id)).length).toBe(
      initialA.sources.length + 1,
    );

    const reset = await resetService.reset(workspaceA, pack, loadFixtureSet);
    expect(reset).toMatchObject({ fixtureSet: "demo", artifactCount: 25 });
    expect(await operationalSnapshot(workspaceA.id)).toEqual(initialA);
    expect(await operationalSnapshot(workspaceB.id)).toEqual(beforeSeedingA);

    const audits = await repositories.auditEntries.list(workspaceA.id);
    expect(audits.map((entry) => entry.action)).toEqual([
      "workspace-seeded",
      "workspace-reset",
      "workspace-seeded",
    ]);
    expect(audits[1]!.previousEntryHash).toBe(audits[0]!.entryHash);
    expect(audits[2]!.previousEntryHash).toBe(audits[1]!.entryHash);
    expect(reset.workspace.resetAt).toBe("2026-08-31T11:00:00.000Z");
  });
});
