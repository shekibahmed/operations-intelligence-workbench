import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  AuditEntry,
  JsonValue,
  Observation,
  Source,
  Workspace,
} from "@oiw/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FormatAdapterRegistry, IngestionService } from "../../ingestion/src/index.js";
import {
  ConfidenceAbstentionPolicy,
  FixtureIntelligenceProvider,
  StructuredOutputValidator,
} from "../../intelligence/src/index.js";
import { createDatabase, defaultDatabaseUrl } from "../../persistence/src/database.js";
import { createPostgresRepositories } from "../../persistence/src/postgres-repositories.js";
import { RuleEngine } from "../../rules/src/index.js";
import {
  buildPackRegistry,
  loadFixtureSet,
  type LoadedFixtureArtifact,
  type LoadedScenarioPack,
  type PackRegistryEntry,
} from "../../scenario-sdk/src/index.js";
import { ArtifactAdvancementService } from "../src/artifact-advancement.js";
import { ArtifactProcessingService } from "../src/artifact-processing.js";
import { ApprovalService, DecisionService } from "../src/decisions.js";
import { prepareOperationalAudit } from "../src/operational-audit.js";
import { SeedService } from "../src/seed-service.js";
import { WorkspaceService } from "../src/workspace-service.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const migrationsDirectory = resolve(repositoryRoot, "db/migrations");
const scenarioPacksDirectory = resolve(repositoryRoot, "scenario-packs");
const databaseName = `oiw701_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const baseDatabaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const testDatabaseUrl = new URL(baseDatabaseUrl);
testDatabaseUrl.pathname = `/${databaseName}`;
const timestamp = "2026-09-01T12:00:00.000Z";

interface GoldObservation {
  schemaKey: string;
  status: "extracted" | "insufficient-evidence" | "negated";
  value: JsonValue | null;
}

interface GoldExpectation {
  fixtureId: string;
  expectedObservations: GoldObservation[];
  expectedEventType: string | null;
  expectedSignals: string[];
  expectedEntities: string[];
  expectedCaseLinkage: boolean;
  expectedDecision: {
    ruleId: string;
    approvalRequired: boolean;
    riskLevel: string;
  } | null;
}

interface FixtureRun {
  fixture: LoadedFixtureArtifact;
  eventId: string | null;
}

const registry = await buildPackRegistry(scenarioPacksDirectory);
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
  expect(registry.invalid).toEqual([]);
  expect(registry.skipped).toEqual([]);
  expect(registry.loaded.map(({ id }) => id)).toEqual([
    "asset-reliability",
    "document-assurance",
    "process-exceptions",
  ]);
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

async function fixtureArtifacts(
  pack: LoadedScenarioPack,
  setName: "smoke" | "demo" | "edge-cases",
): Promise<LoadedFixtureArtifact[]> {
  const result = await loadFixtureSet(pack, setName);
  if (result.status !== "loaded") {
    throw new Error(`${pack.manifest.id}/${setName} fixtures did not load`);
  }
  return result.fixtureSet.artifacts;
}

async function goldExpectations(
  entry: PackRegistryEntry,
  setName: "smoke" | "demo" | "edge-cases",
): Promise<GoldExpectation[]> {
  return JSON.parse(
    await readFile(resolve(entry.directory, `evaluations/${setName}.gold.json`), "utf8"),
  ) as GoldExpectation[];
}

async function createSeededWorkspace(
  pack: LoadedScenarioPack,
  label: string,
): Promise<Workspace> {
  const workspace = await new WorkspaceService(repositories.workspaces, {
    clock: () => new Date(timestamp),
  }).createGuestWorkspace(pack.manifest.id, {
    slug: `oiw-701-${pack.manifest.id}-${label}-${randomUUID().slice(0, 8)}`,
  });
  await new SeedService(repositories, () => new Date(timestamp)).seed(
    workspace,
    pack,
    loadFixtureSet,
  );
  return workspace;
}

async function createSource(
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
): Promise<Source> {
  return repositories.sources.insert(workspaceId, {
    id: randomUUID(),
    workspaceId,
    sourceType: fixture.artifactType,
    name: String(fixture.sourceMetadata["narrativeSource"] ?? fixture.artifactType),
    configuration: fixture.sourceMetadata,
    createdAt: timestamp,
  });
}

async function ingestFixture(
  pack: LoadedScenarioPack,
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
  fixtureSet: string,
) {
  const source = await createSource(workspaceId, fixture);
  return new IngestionService(
    repositories,
    new FormatAdapterRegistry(),
    () => new Date(timestamp),
  ).ingest({
    workspaceId,
    sourceId: source.id,
    artifactType: fixture.artifactType,
    mimeType: fixture.mimeType,
    content: fixture.content,
    rawReference: `fixture://${pack.manifest.id}/${fixtureSet}/${fixture.id}`,
    metadata: {
      ...fixture.sourceMetadata,
      fixtureId: fixture.id,
      fixtureSet,
      packId: pack.manifest.id,
      packVersion: pack.manifest.version,
      synthetic: true,
    },
    receivedAt: timestamp,
  });
}

function expectedReviewStatus(pack: LoadedScenarioPack, proposal: LoadedFixtureArtifact["extraction"]["observations"][number]) {
  if (proposal.status === "insufficient-evidence") return "pending";
  const threshold = pack.observationSchemas.get(proposal.schemaKey)?.confidenceThreshold ?? 0.75;
  return proposal.confidence < threshold ? "pending" : "not-required";
}

async function expectExtractionParity(
  pack: LoadedScenarioPack,
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
  observations: readonly Observation[],
): Promise<void> {
  expect(
    observations,
    `${fixture.id}: persisted ${observations.map(({ schemaKey }) => schemaKey).join(", ")}`,
  ).toHaveLength(fixture.extraction.observations.length);
  for (const [index, proposal] of fixture.extraction.observations.entries()) {
    const observation = observations[index];
    expect(observation, `${fixture.id}/observation-${index}`).toMatchObject({
      schemaKey: proposal.schemaKey,
      value: proposal.value,
      normalisedValue: proposal.normalisedValue,
      confidence: proposal.confidence,
      evidenceStatus: proposal.status === "extracted" ? "supported" : proposal.status,
      reviewStatus: expectedReviewStatus(pack, proposal),
    });
    const expectedEvidence = proposal.evidence[0];
    if (expectedEvidence === undefined) {
      expect(observation?.evidenceSegmentId, `${fixture.id}/evidence-${index}`).toBeNull();
    } else {
      const segment = await repositories.artifactSegments.findById(
        workspaceId,
        observation!.evidenceSegmentId!,
      );
      expect(segment, `${fixture.id}/evidence-${index}`).toMatchObject({
        locator: expectedEvidence.locator,
        excerpt: expectedEvidence.excerpt,
      });
    }
  }
}

function expectGoldExtraction(
  fixture: LoadedFixtureArtifact,
  expectation: GoldExpectation,
): void {
  expect(
    fixture.extraction.observations.map(({ schemaKey, status, value }) => ({
      schemaKey,
      status,
      value,
    })),
    `${fixture.id}/gold-observations`,
  ).toEqual(expectation.expectedObservations);
}

async function acceptPending(
  workspaceId: string,
  observations: readonly Observation[],
): Promise<void> {
  for (const observation of observations) {
    if (observation.reviewStatus !== "pending" || observation.value === null) continue;
    const reviewed: Observation = {
      ...observation,
      reviewStatus: "accepted",
      reviewedBy: "oiw-701-test-reviewer",
      reviewedAt: timestamp,
    };
    const audit = await prepareOperationalAudit(repositories.auditEntries, {
      workspaceId,
      occurredAt: timestamp,
      action: "observation-accepted",
      actorId: "oiw-701-test-reviewer",
      subject: { type: "observation", id: observation.id },
      cause: "Common lifecycle test accepted a supported fixture Observation",
      data: { previousReviewStatus: observation.reviewStatus },
    });
    await repositories.observations.correct(workspaceId, observation.id, reviewed, audit);
  }
}

async function processAndAdvance(
  pack: LoadedScenarioPack,
  provider: FixtureIntelligenceProvider,
  workspaceId: string,
  fixture: LoadedFixtureArtifact,
  fixtureSet: string,
  assertExtraction = true,
) {
  const ingested = await ingestFixture(pack, workspaceId, fixture, fixtureSet);
  const processed = await new ArtifactProcessingService(
    repositories,
    new FormatAdapterRegistry(),
    provider,
    new StructuredOutputValidator(),
    new ConfidenceAbstentionPolicy(),
    { resolve: () => pack },
    () => new Date(timestamp),
  ).processArtifact(workspaceId, ingested.artifact.id);
  if (assertExtraction) {
    expect(processed.providerWarnings, `${fixture.id}/provider-warnings`).toEqual(
      fixture.extraction.warnings,
    );
    expect(processed.processingTrace, `${fixture.id}/processing-trace`).toEqual(
      fixture.extraction.processingTrace,
    );
    await expectExtractionParity(pack, workspaceId, fixture, processed.observations);
  }
  await acceptPending(workspaceId, processed.observations);
  const advancement = await new ArtifactAdvancementService(
    repositories,
    { resolve: () => pack },
    new RuleEngine(),
    [],
    () => new Date(timestamp),
  ).advanceArtifact(workspaceId, ingested.artifact.id);
  return { ingested, processed, advancement };
}

async function linkedExternalReferences(
  workspaceId: string,
  entityIds: readonly string[],
): Promise<(string | null | undefined)[]> {
  const entities = await Promise.all(
    entityIds.map((entityId) => repositories.entities.findById(workspaceId, entityId)),
  );
  return entities.map((entity) => entity?.externalReference);
}

async function runDemoLifecycle(
  entry: PackRegistryEntry,
  workspace: Workspace,
  provider: FixtureIntelligenceProvider,
  stopAtFirstDecision = false,
): Promise<{ gold: GoldExpectation[]; runs: Map<string, FixtureRun> }> {
  const [fixtures, gold] = await Promise.all([
    fixtureArtifacts(entry.pack, "demo"),
    goldExpectations(entry, "demo"),
  ]);
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const runs = new Map<string, FixtureRun>();
  for (const expectation of gold) {
    const fixture = fixtureById.get(expectation.fixtureId)!;
    expectGoldExtraction(fixture, expectation);
    const result = await processAndAdvance(
      entry.pack,
      provider,
      workspace.id,
      fixture,
      "demo",
      false,
    );
    expect(result.advancement.eventAssembly.event?.eventType ?? null, fixture.id).toBe(
      expectation.expectedEventType,
    );
    const linkedEntities = await linkedExternalReferences(
      workspace.id,
      result.advancement.eventAssembly.event?.entityIds ?? [],
    );
    expect(
      linkedEntities.every((reference) => expectation.expectedEntities.includes(reference ?? "")),
      `${fixture.id}/unexpected-entity`,
    ).toBe(true);
    if (expectation.expectedEntities.length > 0) {
      expect(linkedEntities.length, `${fixture.id}/entity-linkage`).toBeGreaterThan(0);
    }
    runs.set(fixture.id, {
      fixture,
      eventId: result.advancement.eventAssembly.event?.id ?? null,
    });
    if (stopAtFirstDecision && expectation.expectedDecision?.approvalRequired) break;
  }
  return { gold, runs };
}

describe.each(registry.loaded)("$id registry lifecycle", (entry) => {
  it("processes every smoke fixture with extraction and operational gold parity", async () => {
    const pack = entry.pack;
    const workspace = await createSeededWorkspace(pack, "smoke");
    const provider = await FixtureIntelligenceProvider.fromPack(pack);
    const [fixtures, gold] = await Promise.all([
      fixtureArtifacts(pack, "smoke"),
      goldExpectations(entry, "smoke"),
    ]);
    expect(fixtures).toHaveLength(gold.length);
    const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
    for (const expectation of gold) {
      const fixture = fixtureById.get(expectation.fixtureId)!;
      expectGoldExtraction(fixture, expectation);
      const result = await processAndAdvance(
        pack,
        provider,
        workspace.id,
        fixture,
        "smoke",
      );
      expect(result.processed.artifact.processingStatus, fixture.id).toBe("processed");
      expect(result.advancement.eventAssembly.event?.eventType ?? null, fixture.id).toBe(
        expectation.expectedEventType,
      );
      expect(
        await linkedExternalReferences(
          workspace.id,
          result.advancement.eventAssembly.event?.entityIds ?? [],
        ),
        `${fixture.id}/entities`,
      ).toEqual(expectation.expectedEntities);
      const eventId = result.advancement.eventAssembly.event?.id;
      const linkedCases = (await repositories.cases.list(workspace.id)).filter((caseRecord) =>
        eventId === undefined ? false : caseRecord.relatedEventIds.includes(eventId),
      );
      expect(linkedCases.length > 0, `${fixture.id}/case-linkage`).toBe(
        expectation.expectedCaseLinkage,
      );
      expect(
        (await repositories.signals.list(workspace.id))
          .filter((signal) => eventId !== undefined && signal.eventIds.includes(eventId))
          .map(({ rule }) => rule.id),
        `${fixture.id}/signals`,
      ).toEqual(expectation.expectedSignals);
    }
  }, 60_000);

  it("runs the configured demo lifecycle to a human-gated Decision", async () => {
    const pack = entry.pack;
    const workspace = await createSeededWorkspace(pack, "decision");
    const provider = await FixtureIntelligenceProvider.fromPack(pack);
    const { gold, runs } = await runDemoLifecycle(entry, workspace, provider, true);
    const decisionExpectations = gold.filter(({ expectedDecision }) =>
      Boolean(expectedDecision?.approvalRequired),
    );
    expect(decisionExpectations.length, `${entry.id}/approval-gold`).toBeGreaterThan(0);

    const signals = await repositories.signals.list(workspace.id);
    const cases = await repositories.cases.list(workspace.id);
    for (const expectation of gold) {
      if (!runs.has(expectation.fixtureId)) continue;
      for (const ruleId of expectation.expectedSignals) {
        expect(
          signals.some((signal) => signal.rule.id === ruleId),
          `${expectation.fixtureId}/${ruleId}`,
        ).toBe(true);
      }
    }
    expect(
      cases.length,
      `${entry.id}/cases-from-gold-lifecycle`,
    ).toBeGreaterThanOrEqual(
      gold.some(
        (expectation) =>
          runs.has(expectation.fixtureId) && expectation.expectedCaseLinkage,
      )
        ? 1
        : 0,
    );

    const decisions = await repositories.decisions.list(workspace.id);
    expect(decisions.some(({ status }) => status === "approved")).toBe(false);
    const decision = decisions.find(({ status }) => status === "awaiting-approval");
    expect(decision, `${entry.id}/awaiting-approval`).toBeDefined();
    expect(["high", "critical"]).toContain(decision?.riskLevel);
    expect(await repositories.approvals.list(workspace.id)).toEqual([]);
    await expect(
      new DecisionService(repositories, () => new Date(timestamp)).attemptStatusBypass(
        workspace.id,
        decision!.id,
        "approved",
      ),
    ).rejects.toThrow("recorded human Approval");
  }, 120_000);

  it("suppresses its byte-identical edge duplicate and preserves abstention", async () => {
    const pack = entry.pack;
    const workspace = await createSeededWorkspace(pack, "edges");
    const provider = await FixtureIntelligenceProvider.fromPack(pack);
    const [smoke, demo, edges, edgeGold] = await Promise.all([
      fixtureArtifacts(pack, "smoke"),
      fixtureArtifacts(pack, "demo"),
      fixtureArtifacts(pack, "edge-cases"),
      goldExpectations(entry, "edge-cases"),
    ]);
    const duplicate = edges.find((fixture) =>
      [...smoke, ...demo].some((candidate) => candidate.sha256 === fixture.sha256),
    );
    expect(duplicate, `${entry.id}/duplicate-edge`).toBeDefined();
    const original = [...smoke, ...demo].find(
      (fixture) => fixture.sha256 === duplicate!.sha256,
    )!;
    const first = await processAndAdvance(
      pack,
      provider,
      workspace.id,
      original,
      original.id.includes("-smoke-") ? "smoke" : "demo",
      false,
    );
    const secondIngest = await ingestFixture(
      pack,
      workspace.id,
      duplicate!,
      "edge-cases",
    );
    expect(secondIngest).toMatchObject({
      inserted: false,
      duplicateOfArtifactId: first.ingested.artifact.id,
    });
    const second = await new ArtifactAdvancementService(
      repositories,
      { resolve: () => pack },
      new RuleEngine(),
      [],
      () => new Date(timestamp),
    ).advanceArtifact(workspace.id, secondIngest.artifact.id);
    expect(second.eventAssembly).toMatchObject({
      idempotent: true,
      duplicateSuppressed: true,
    });
    const duplicateAudits = (await repositories.auditEntries.list(workspace.id)).filter(
      ({ action }) => action === "duplicate-event-suppressed",
    );
    expect(duplicateAudits.at(-1) as AuditEntry).toMatchObject({
      data: { eventId: first.advancement.eventAssembly.event?.id },
    });

    const abstentionGold = edgeGold.filter(({ expectedObservations }) =>
      expectedObservations.some(({ status }) => status === "insufficient-evidence"),
    );
    expect(abstentionGold.length, `${entry.id}/abstention-edges`).toBeGreaterThan(0);
    for (const expectation of abstentionGold) {
      const abstentionFixture = edges.find(({ id }) => id === expectation.fixtureId)!;
      expectGoldExtraction(abstentionFixture, expectation);
      const abstention = await processAndAdvance(
        pack,
        provider,
        workspace.id,
        abstentionFixture,
        "edge-cases",
      );
      expect(
        abstention.processed.observations.some(
          ({ evidenceStatus, value, reviewStatus }) =>
            evidenceStatus === "insufficient-evidence" &&
            value === null &&
            reviewStatus === "pending",
        ),
        `${abstentionFixture.id}/abstention`,
      ).toBe(true);
    }
    expect(await repositories.approvals.list(workspace.id)).toEqual([]);
  }, 120_000);
});

describe.each([
  {
    packId: "process-exceptions",
    decisionType: "hold-affected-output",
    approvalPolicyId: "supervisor-qc-hold-approval",
    approver: "supervisor-qc-session",
  },
  {
    packId: "document-assurance",
    decisionType: "accept-exception",
    approvalPolicyId: "authorised-reviewer-approval",
    approver: "authorised-reviewer-session",
  },
])("$packId primary storyline", ({ packId, decisionType, approvalPolicyId, approver }) => {
  it("ends awaiting approval and survives the recorded human approve path", async () => {
    const entry = registry.loaded.find(({ id }) => id === packId)!;
    const workspace = await createSeededWorkspace(entry.pack, "primary-storyline");
    const provider = await FixtureIntelligenceProvider.fromPack(entry.pack);
    await runDemoLifecycle(entry, workspace, provider);

    const decision = (await repositories.decisions.list(workspace.id)).find(
      (candidate) => candidate.decisionType === decisionType,
    );
    expect(decision).toMatchObject({
      decisionType,
      approvalPolicyId,
      riskLevel: "high",
      status: "awaiting-approval",
    });
    expect(await repositories.approvals.list(workspace.id)).toEqual([]);

    const result = await new ApprovalService(
      repositories,
      () => new Date("2026-09-01T13:00:00.000Z"),
    ).apply(workspace.id, decision!.id, {
      identity: { type: "human", id: approver },
      outcome: "approved",
      comment: `Approved ${decisionType} after reviewing the fixture evidence.`,
    });
    expect(result.approval).toMatchObject({ approver, outcome: "approved" });
    expect(result.decision).toMatchObject({ status: "approved" });
    expect(await repositories.approvals.list(workspace.id)).toHaveLength(1);
  }, 120_000);
});
