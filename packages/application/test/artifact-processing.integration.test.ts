import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { Artifact, ExtractionResult, Observation, Source, Workspace } from "@oiw/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FormatAdapterRegistry, IngestionService } from "../../ingestion/src/index.js";
import {
  ConfidenceAbstentionPolicy,
  FixtureIntelligenceProvider,
  FixtureLookupError,
  StructuredOutputValidator,
} from "../../intelligence/src/index.js";
import { createDatabase, defaultDatabaseUrl } from "../../persistence/src/database.js";
import { createPostgresRepositories } from "../../persistence/src/postgres-repositories.js";
import {
  loadFixtureSet,
  loadPackFromDirectory,
  type LoadedFixtureArtifact,
  type LoadedScenarioPack,
} from "../../scenario-sdk/src/index.js";
import { ArtifactProcessingService } from "../src/artifact-processing.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const migrationsDirectory = resolve(repositoryRoot, "db/migrations");
const packDirectory = resolve(repositoryRoot, "scenario-packs/asset-reliability");
const databaseName = `oiw301_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const baseDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;

const adminConnection = createDatabase(baseDatabaseUrl);
let testConnection: ReturnType<typeof createDatabase>;
let repositories: ReturnType<typeof createPostgresRepositories>;
let pack: LoadedScenarioPack;
let provider: FixtureIntelligenceProvider;
let smokeFixtures: LoadedFixtureArtifact[];
let demoFixtures: LoadedFixtureArtifact[];
let edgeFixtures: LoadedFixtureArtifact[];

const timestamp = "2026-08-31T12:00:00.000Z";

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

async function loadFixtureArtifacts(setName: "smoke" | "demo" | "edge-cases") {
  const result = await loadFixtureSet(pack, setName);
  if (result.status !== "loaded") throw new Error(`${setName} fixture set did not load`);
  return result.fixtureSet.artifacts;
}

beforeAll(async () => {
  await adminConnection.client.unsafe(`CREATE DATABASE "${databaseName}"`);
  testConnection = createDatabase(testDatabaseUrl.toString());
  await migrateIsolatedDatabase();
  repositories = createPostgresRepositories(testConnection.database);

  const loaded = await loadPackFromDirectory(packDirectory);
  if (loaded.status !== "loaded") throw new Error("Asset Reliability pack did not load");
  pack = loaded.pack;
  [smokeFixtures, demoFixtures, edgeFixtures] = await Promise.all([
    loadFixtureArtifacts("smoke"),
    loadFixtureArtifacts("demo"),
    loadFixtureArtifacts("edge-cases"),
  ]);
  provider = await FixtureIntelligenceProvider.fromPack(pack);
});

afterAll(async () => {
  if (testConnection !== undefined) await testConnection.close();
  await adminConnection.client.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await adminConnection.close();
});

async function createWorkspace(label: string): Promise<Workspace> {
  const workspace: Workspace = {
    id: randomUUID(),
    name: `OIW-301 ${label}`,
    slug: `oiw-301-${label}-${randomUUID().slice(0, 8)}`.toLowerCase(),
    activePackId: pack.manifest.id,
    mode: "fixture",
    createdAt: timestamp,
    resetAt: null,
    expiresAt: null,
  };
  return repositories.workspaces.insert(workspace);
}

async function createSource(workspaceId: string, fixture: LoadedFixtureArtifact): Promise<Source> {
  return repositories.sources.insert(workspaceId, {
    id: randomUUID(),
    workspaceId,
    sourceType: fixture.artifactType,
    name: String(fixture.sourceMetadata["narrativeSource"] ?? fixture.artifactType),
    configuration: fixture.sourceMetadata,
    createdAt: timestamp,
  });
}

function processingService(
  intelligenceProvider: { extract(request: Parameters<FixtureIntelligenceProvider["extract"]>[0]): Promise<ExtractionResult> } = provider,
) {
  return new ArtifactProcessingService(
    repositories,
    new FormatAdapterRegistry(),
    intelligenceProvider,
    new StructuredOutputValidator(),
    new ConfidenceAbstentionPolicy(),
    { resolve: () => pack },
    () => new Date(timestamp),
  );
}

async function ingestFixture(
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
  referenceSet: string,
) {
  const source = await createSource(workspaceId, fixture);
  const ingestion = new IngestionService(
    repositories,
    new FormatAdapterRegistry(),
    () => new Date(timestamp),
  );
  return ingestion.ingest({
    workspaceId,
    sourceId: source.id,
    artifactType: fixture.artifactType,
    mimeType: fixture.mimeType,
    content: fixture.content,
    rawReference: `fixture://${pack.manifest.id}/${referenceSet}/${fixture.id}`,
    metadata: {
      ...fixture.sourceMetadata,
      fixtureId: fixture.id,
      fixtureSet: referenceSet,
      packId: pack.manifest.id,
      packVersion: pack.manifest.version,
      synthetic: true,
    },
    receivedAt: timestamp,
  });
}

function expectedReviewStatus(fixture: LoadedFixtureArtifact, schemaKey: string) {
  const proposal = fixture.extraction.observations.find(
    (observation) => observation.schemaKey === schemaKey,
  )!;
  if (proposal.status === "insufficient-evidence") return "pending";
  const threshold = pack.observationSchemas.get(schemaKey)?.confidenceThreshold ?? 0.75;
  return proposal.confidence < threshold ? "pending" : "not-required";
}

async function expectExtractionParity(
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
  observations: Observation[],
): Promise<void> {
  expect(observations).toHaveLength(fixture.extraction.observations.length);
  for (const proposal of fixture.extraction.observations) {
    const observation = observations.find(({ schemaKey }) => schemaKey === proposal.schemaKey);
    expect(observation, `missing ${fixture.id}/${proposal.schemaKey}`).toBeDefined();
    expect(observation).toMatchObject({
      schemaKey: proposal.schemaKey,
      value: proposal.value,
      normalisedValue: proposal.normalisedValue,
      confidence: proposal.confidence,
      evidenceStatus: proposal.status === "extracted" ? "supported" : proposal.status,
      reviewStatus: expectedReviewStatus(fixture, proposal.schemaKey),
    });
    if (proposal.status === "extracted" && proposal.alternativeCandidates !== undefined) {
      expect(observation?.alternativeCandidates).toEqual(proposal.alternativeCandidates);
    }
    const expectedEvidence = proposal.evidence[0];
    if (expectedEvidence === undefined) {
      expect(observation?.evidenceSegmentId).toBeNull();
    } else {
      const segment = await repositories.artifactSegments.findById(
        workspaceId,
        observation!.evidenceSegmentId!,
      );
      expect(segment).toMatchObject({
        locator: expectedEvidence.locator,
        excerpt: expectedEvidence.excerpt,
      });
    }
  }
}

describe("artifact ingestion and processing", () => {
  it("ingests and processes every smoke fixture with exact extraction parity", async () => {
    const workspace = await createWorkspace("smoke");
    const processor = processingService();

    for (const fixture of smokeFixtures) {
      const ingested = await ingestFixture(workspace.id, fixture, "smoke");
      expect(ingested).toMatchObject({ inserted: true, duplicateOfArtifactId: null });
      expect(ingested.artifact.checksum).toBe(fixture.sha256);

      const processed = await processor.processArtifact(workspace.id, ingested.artifact.id);
      expect(
        processed.artifact.processingStatus,
        `${fixture.id}: ${processed.validationIssues.join("; ")}`,
      ).toBe("processed");
      expect(processed.providerWarnings).toEqual(fixture.extraction.warnings);
      expect(processed.processingTrace).toEqual(fixture.extraction.processingTrace);
      await expectExtractionParity(workspace.id, fixture, processed.observations);

      const count = (await repositories.observations.listByArtifact(workspace.id, ingested.artifact.id))
        .length;
      const repeated = await processor.processArtifact(workspace.id, ingested.artifact.id);
      expect(repeated.idempotent).toBe(true);
      expect(await repositories.observations.listByArtifact(workspace.id, ingested.artifact.id)).toHaveLength(
        count,
      );
    }
    const audits = await repositories.auditEntries.list(workspace.id);
    expect(audits.map(({ action }) => action)).toContain("artifact-received");
    expect(audits.map(({ action }) => action)).toContain("artifact-processing-started");
    expect(audits.map(({ action }) => action)).toContain("artifact-processing-completed");
    audits.slice(1).forEach((entry, index) => {
      expect(entry.previousEntryHash).toBe(audits[index]!.entryHash);
    });
  });

  it("routes abstention and ambiguity, preserves negation, and keeps injection text inert", async () => {
    const workspace = await createWorkspace("edge-routing");
    const processor = processingService();
    const fixtures = new Map(edgeFixtures.map((fixture) => [fixture.id, fixture]));

    const insufficientFixture = fixtures.get("asset-reliability-edge-001")!;
    const insufficientIngest = await ingestFixture(workspace.id, insufficientFixture, "edge-cases");
    const insufficient = await processor.processArtifact(
      workspace.id,
      insufficientIngest.artifact.id,
    );
    const abstention = insufficient.observations.find(
      ({ evidenceStatus }) => evidenceStatus === "insufficient-evidence",
    );
    expect(abstention).toMatchObject({
      value: null,
      reviewStatus: "pending",
      insufficiencyReason:
        "No asset identifier stated; \"the forklift by dock 3\" is not a documented asset location and must not be guessed.",
    });
    expect(insufficient.artifact.processingStatus).toBe("needs-review");

    const ambiguousFixture = fixtures.get("asset-reliability-edge-003")!;
    const ambiguousIngest = await ingestFixture(workspace.id, ambiguousFixture, "edge-cases");
    const ambiguous = await processor.processArtifact(workspace.id, ambiguousIngest.artifact.id);
    expect(ambiguous.observations.find(({ schemaKey }) => schemaKey === "asset-identifier")).toMatchObject({
      confidence: 0.5,
      reviewStatus: "pending",
      alternativeCandidates: [{ value: "A-140", confidence: 0.45 }],
    });

    const negatedFixture = fixtures.get("asset-reliability-edge-004")!;
    const negatedIngest = await ingestFixture(workspace.id, negatedFixture, "edge-cases");
    const negated = await processor.processArtifact(workspace.id, negatedIngest.artifact.id);
    expect(negated.observations.find(({ schemaKey }) => schemaKey === "inspection-finding")).toMatchObject({
      value: null,
      evidenceStatus: "negated",
      reviewStatus: "not-required",
    });

    const injectionFixture = fixtures.get("asset-reliability-edge-006")!;
    const injectionIngest = await ingestFixture(workspace.id, injectionFixture, "edge-cases");
    const injection = await processor.processArtifact(workspace.id, injectionIngest.artifact.id);
    await expectExtractionParity(workspace.id, injectionFixture, injection.observations);
    expect(injection.providerWarnings.map(({ code }) => code)).toContain(
      "suspicious-content-detected",
    );
    expect(injection.observations.map(({ schemaKey }) => schemaKey)).toEqual([
      "asset-identifier",
      "requested-action",
    ]);
    expect(await repositories.approvals.list(workspace.id)).toEqual([]);
    expect(await repositories.decisions.list(workspace.id)).toEqual([]);
  });

  it("links and flags the byte-identical edge duplicate without a second ingest", async () => {
    const workspace = await createWorkspace("duplicate");
    const original = demoFixtures.find(({ id }) => id === "asset-reliability-demo-001")!;
    const duplicate = edgeFixtures.find(({ id }) => id === "asset-reliability-edge-005")!;
    expect(original.sha256).toBe(duplicate.sha256);

    const first = await ingestFixture(workspace.id, original, "demo");
    const second = await ingestFixture(workspace.id, duplicate, "edge-cases");
    expect(second).toMatchObject({
      inserted: false,
      duplicateOfArtifactId: first.artifact.id,
    });
    expect(second.artifact.id).toBe(first.artifact.id);
    expect(await repositories.artifacts.list(workspace.id)).toHaveLength(1);
    expect((await repositories.auditEntries.list(workspace.id)).at(-1)).toMatchObject({
      action: "artifact-duplicate-detected",
      subject: { id: first.artifact.id },
      data: { duplicateOfArtifactId: first.artifact.id },
    });
  });

  it("persists a schema-invalid value only as pending review", async () => {
    const workspace = await createWorkspace("invalid-output");
    const source = await repositories.sources.insert(workspace.id, {
      id: randomUUID(),
      workspaceId: workspace.id,
      sourceType: "manual-entry",
      name: "Synthetic invalid-output source",
      configuration: { synthetic: true },
      createdAt: timestamp,
    });
    const ingested = await new IngestionService(repositories).ingest({
      workspaceId: workspace.id,
      sourceId: source.id,
      artifactType: "message",
      mimeType: "text/plain",
      content: "R-1",
      rawReference: "manual://invalid-output",
      metadata: { synthetic: true },
      receivedAt: timestamp,
    });
    const invalidProvider = {
      async extract(request: { artifact: Pick<Artifact, "checksum"> }): Promise<ExtractionResult> {
        return {
          artifactChecksum: request.artifact.checksum,
          observations: [
            {
              status: "extracted",
              schemaKey: "asset-identifier",
              value: 42,
              normalisedValue: 42,
              confidence: 0.99,
              evidence: [
                { locator: { kind: "text-range", start: 0, end: 3 }, excerpt: "R-1" },
              ],
            },
          ],
          warnings: [],
          provider: {
            providerId: "fixture-intelligence-provider",
            providerVersion: "1.0.0",
            model: null,
            deterministic: true,
          },
          processingTrace: {
            startedAt: timestamp,
            completedAt: timestamp,
            durationMs: 0,
            steps: [{ name: "extraction", status: "completed", detail: "Invalid fixture." }],
          },
        };
      },
    };
    const result = await processingService(invalidProvider).processArtifact(
      workspace.id,
      ingested.artifact.id,
    );
    expect(result.artifact.processingStatus).toBe("needs-review");
    expect(result.validationIssues.join(" ")).toContain("Expected a string");
    expect(result.observations[0]).toMatchObject({ value: 42, reviewStatus: "pending" });
  });

  it("fails loudly and records a terminal state when a fixture checksum is missing", async () => {
    const workspace = await createWorkspace("missing-fixture");
    const source = await repositories.sources.insert(workspace.id, {
      id: randomUUID(),
      workspaceId: workspace.id,
      sourceType: "manual-entry",
      name: "Synthetic unmapped source",
      configuration: { synthetic: true },
      createdAt: timestamp,
    });
    const ingested = await new IngestionService(repositories).ingest({
      workspaceId: workspace.id,
      sourceId: source.id,
      artifactType: "message",
      mimeType: "text/plain",
      content: "No fixture extraction is registered for this synthetic input.",
      rawReference: "manual://missing-fixture",
      metadata: { synthetic: true },
      receivedAt: timestamp,
    });

    await expect(
      processingService().processArtifact(workspace.id, ingested.artifact.id),
    ).rejects.toBeInstanceOf(FixtureLookupError);
    expect(await repositories.artifacts.findById(workspace.id, ingested.artifact.id)).toMatchObject({
      processingStatus: "failed-terminal",
    });
    expect((await repositories.auditEntries.list(workspace.id)).at(-1)).toMatchObject({
      action: "artifact-processing-failed",
      data: { retryable: false },
    });
  });
});
