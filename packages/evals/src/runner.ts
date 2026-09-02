import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DecisionService } from "@oiw/application";
import { JsonValueSchema, type JsonValue } from "@oiw/contracts";
import { FixtureIntelligenceProvider } from "@oiw/intelligence";
import {
  buildPackRegistry,
  type FixtureSetName,
  type LoadedFixtureArtifact,
  type LoadedScenarioPack,
  type PackRegistryEntry,
} from "@oiw/scenario-sdk";
import {
  LifecyclePipeline,
  type LifecycleGoldExpectation,
  type LifecycleGoldObservation,
} from "@oiw/test-support";

import {
  aggregateMetricResults,
  metricsPass,
  scoreEvaluationSamples,
} from "./scoring.js";
import {
  metricNames,
  type DecisionAssessment,
  type DuplicateEvaluationSample,
  type EvaluationResult,
  type EvaluationSample,
  type MetricName,
  type PackEvaluationResult,
  type ScoredObservation,
} from "./types.js";

const fixtureSets: FixtureSetName[] = ["smoke", "demo", "edge-cases"];

export interface EvaluationRunnerOptions {
  repositoryRoot: string;
  databaseUrl?: string;
  packIds?: string[];
  provider?: "fixture";
  thresholds?: Partial<Record<MetricName, number>>;
  generatedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${path} must be a string`);
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

function requireStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((entry, index) => requireString(entry, `${path}[${index}]`));
}

function parseGoldObservation(value: unknown, path: string): LifecycleGoldObservation {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  const status = requireString(value["status"], `${path}.status`);
  if (status !== "extracted" && status !== "insufficient-evidence" && status !== "negated") {
    throw new Error(`${path}.status has unsupported value ${JSON.stringify(status)}`);
  }
  const parsedValue = JsonValueSchema.safeParse(value["value"]);
  if (!parsedValue.success) throw new Error(`${path}.value must be valid JSON data`);
  return {
    schemaKey: requireString(value["schemaKey"], `${path}.schemaKey`),
    status,
    value: parsedValue.data,
  };
}

function parseGoldExpectation(value: unknown, path: string): LifecycleGoldExpectation {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  if (!Array.isArray(value["expectedObservations"])) {
    throw new Error(`${path}.expectedObservations must be an array`);
  }
  const eventType = value["expectedEventType"];
  if (eventType !== null && typeof eventType !== "string") {
    throw new Error(`${path}.expectedEventType must be a string or null`);
  }
  const decisionValue = value["expectedDecision"];
  let expectedDecision: LifecycleGoldExpectation["expectedDecision"] = null;
  if (decisionValue !== null) {
    if (!isRecord(decisionValue)) throw new Error(`${path}.expectedDecision must be an object or null`);
    expectedDecision = {
      ruleId: requireString(decisionValue["ruleId"], `${path}.expectedDecision.ruleId`),
      approvalRequired: requireBoolean(
        decisionValue["approvalRequired"],
        `${path}.expectedDecision.approvalRequired`,
      ),
      riskLevel: requireString(
        decisionValue["riskLevel"],
        `${path}.expectedDecision.riskLevel`,
      ),
    };
  }
  return {
    fixtureId: requireString(value["fixtureId"], `${path}.fixtureId`),
    expectedObservations: value["expectedObservations"].map((entry, index) =>
      parseGoldObservation(entry, `${path}.expectedObservations[${index}]`),
    ),
    expectedEventType: eventType,
    expectedSignals: requireStringArray(value["expectedSignals"], `${path}.expectedSignals`),
    expectedEntities: requireStringArray(value["expectedEntities"], `${path}.expectedEntities`),
    expectedCaseLinkage: requireBoolean(
      value["expectedCaseLinkage"],
      `${path}.expectedCaseLinkage`,
    ),
    expectedDecision,
    ...(typeof value["notes"] === "string" ? { notes: value["notes"] } : {}),
  };
}

async function loadGold(
  entry: PackRegistryEntry,
  setName: FixtureSetName,
): Promise<LifecycleGoldExpectation[]> {
  const relativePath = `evaluations/${setName}.gold.json`;
  const path = resolve(entry.directory, relativePath);
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!Array.isArray(value)) throw new Error(`${entry.id}/${relativePath} must contain an array`);
  return value.map((item, index) =>
    parseGoldExpectation(item, `${entry.id}/${relativePath}[${index}]`),
  );
}

function categoricalSchemaKeys(pack: LoadedScenarioPack): string[] {
  return [...pack.observationSchemas.values()]
    .filter(
      (definition) =>
        definition.jsonSchema.type === "string" &&
        Array.isArray(definition.jsonSchema.enum),
    )
    .map(({ schemaKey }) => schemaKey)
    .sort();
}

function sameJson(left: JsonValue | null, right: JsonValue | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function expectedObservations(
  fixture: LoadedFixtureArtifact,
  gold: LifecycleGoldExpectation,
): ScoredObservation[] {
  const proposals = [...fixture.extraction.observations];
  return gold.expectedObservations.map((expected, index) => {
    const proposal = proposals[index];
    if (
      proposal === undefined ||
      proposal.schemaKey !== expected.schemaKey ||
      proposal.status !== expected.status ||
      !sameJson(proposal.value, expected.value)
    ) {
      throw new Error(
        `${fixture.id}/${expected.schemaKey}: gold observation does not align with its checksum-validated expected extraction`,
      );
    }
    return {
      ...expected,
      evidenceLocator: proposal.evidence[0]?.locator ?? null,
    };
  });
}

function providerObservations(fixture: LoadedFixtureArtifact): ScoredObservation[] {
  return fixture.extraction.observations.map((observation) => ({
    schemaKey: observation.schemaKey,
    status: observation.status,
    value: observation.value,
    evidenceLocator: observation.evidence[0]?.locator ?? null,
  }));
}

async function decisionAssessment(
  pipeline: LifecyclePipeline,
  workspaceId: string,
  result: Awaited<ReturnType<LifecyclePipeline["processAndAdvance"]>>,
): Promise<DecisionAssessment | null> {
  let actionResultIndex = 0;
  for (const trace of result.advancement.ruleTraces) {
    for (const action of trace.firedActions) {
      const actionResult = result.advancement.actionResults[actionResultIndex];
      actionResultIndex += 1;
      if (action.type !== "propose-decision" || actionResult?.subjectId === null || actionResult === undefined) {
        continue;
      }
      const decision = await pipeline.repositories.decisions.findById(
        workspaceId,
        actionResult.subjectId,
      );
      if (decision === null) continue;
      const approvals = (await pipeline.repositories.approvals.list(workspaceId)).filter(
        ({ decisionId }) => decisionId === decision.id,
      );
      let bypassProtected = false;
      try {
        await new DecisionService(pipeline.repositories).attemptStatusBypass(
          workspaceId,
          decision.id,
          "approved",
        );
      } catch (error) {
        bypassProtected = error instanceof Error && error.message.includes("recorded human Approval");
      }
      return {
        ruleId: trace.ruleId,
        riskLevel: decision.riskLevel,
        approvalRequired: decision.approvalPolicyId.length > 0,
        status: decision.status,
        approvalCount: approvals.length,
        bypassProtected,
      };
    }
  }
  return null;
}

async function evaluateFixture(
  pipeline: LifecyclePipeline,
  pack: LoadedScenarioPack,
  provider: FixtureIntelligenceProvider,
  workspaceId: string,
  setName: FixtureSetName,
  fixture: LoadedFixtureArtifact,
  gold: LifecycleGoldExpectation,
): Promise<{
  sample: EvaluationSample;
  decision: DecisionAssessment | null;
  operational: {
    eventType: string | null;
    entities: string[];
    signals: string[];
    caseStates: string[];
  };
}> {
  const result = await pipeline.processAndAdvance(pack, provider, workspaceId, fixture, setName);
  const decision = await decisionAssessment(pipeline, workspaceId, result);
  const event = result.advancement.eventAssembly.event;
  const eventId = event?.id;
  const [entities, signals, cases] = await Promise.all([
    pipeline.linkedExternalReferences(workspaceId, event?.entityIds ?? []),
    pipeline.repositories.signals.list(workspaceId),
    pipeline.repositories.cases.list(workspaceId),
  ]);
  return {
    sample: {
      fixtureId: fixture.id,
      enabledMetrics: [
        "fieldPrecision",
        "fieldRecall",
        "classificationAccuracy",
        "evidenceSpanCorrectness",
        "abstentionPrecision",
        "abstentionRecall",
      ],
      artifactText: new TextDecoder().decode(fixture.content),
      expectedObservations: expectedObservations(fixture, gold),
      actualObservations: providerObservations(fixture),
      categoricalSchemaKeys: categoricalSchemaKeys(pack),
      expectedEventType: null,
      actualEventType: null,
      expectedEntities: [],
      actualEntities: [],
      expectedSignals: [],
      actualSignals: [],
      expectedDecision: null,
      actualDecision: null,
      expectedCaseLinkage: false,
      actualCaseStates: [],
      validCaseStates: [],
    },
    decision,
    operational: {
      eventType: event?.eventType ?? null,
      entities,
      signals: signals
        .filter((signal) => eventId !== undefined && signal.eventIds.includes(eventId))
        .map(({ rule }) => rule.id),
      caseStates: cases
        .filter(
          (caseRecord) =>
            eventId !== undefined && caseRecord.relatedEventIds.includes(eventId),
        )
        .map(({ status }) => status),
    },
  };
}

interface FixtureCatalogueEntry {
  fixture: LoadedFixtureArtifact;
  setName: FixtureSetName;
}

function duplicatePairs(catalogue: readonly FixtureCatalogueEntry[]) {
  const primaryByChecksum = new Map<string, FixtureCatalogueEntry>();
  const pairs: Array<{ original: FixtureCatalogueEntry; duplicate: FixtureCatalogueEntry }> = [];
  for (const entry of catalogue) {
    const existing = primaryByChecksum.get(entry.fixture.sha256);
    if (existing === undefined) {
      primaryByChecksum.set(entry.fixture.sha256, entry);
    } else if (entry.setName === "edge-cases") {
      pairs.push({ original: existing, duplicate: entry });
    }
  }
  return pairs;
}

async function evaluateDuplicate(
  pipeline: LifecyclePipeline,
  pack: LoadedScenarioPack,
  provider: FixtureIntelligenceProvider,
  original: FixtureCatalogueEntry,
  duplicate: FixtureCatalogueEntry,
): Promise<DuplicateEvaluationSample> {
  const workspace = await pipeline.createSeededWorkspace(
    pack,
    `duplicate-${duplicate.fixture.id}`,
    original.setName,
  );
  const first = await pipeline.processAndAdvance(
    pack,
    provider,
    workspace.id,
    original.fixture,
    original.setName,
  );
  const before = {
    events: (await pipeline.repositories.operationalEvents.list(workspace.id)).length,
    signals: (await pipeline.repositories.signals.list(workspace.id)).length,
    cases: (await pipeline.repositories.cases.list(workspace.id)).length,
  };
  const secondIngest = await pipeline.ingestFixture(
    pack,
    workspace.id,
    duplicate.fixture,
    duplicate.setName,
  );
  const second = await pipeline.processAndAdvance(
    pack,
    provider,
    workspace.id,
    duplicate.fixture,
    duplicate.setName,
  );
  const after = {
    events: (await pipeline.repositories.operationalEvents.list(workspace.id)).length,
    signals: (await pipeline.repositories.signals.list(workspace.id)).length,
    cases: (await pipeline.repositories.cases.list(workspace.id)).length,
  };
  return {
    fixtureId: duplicate.fixture.id,
    originalFixtureId: original.fixture.id,
    inserted: secondIngest.inserted,
    duplicateOfArtifactId: secondIngest.duplicateOfArtifactId,
    originalArtifactId: first.ingested.artifact.id,
    eventCountBefore: before.events,
    eventCountAfter: after.events,
    signalCountBefore: before.signals,
    signalCountAfter: after.signals,
    caseCountBefore: before.cases,
    caseCountAfter: after.cases,
    idempotent: second.advancement.eventAssembly.idempotent,
    duplicateSuppressed: second.advancement.eventAssembly.duplicateSuppressed,
  };
}

async function evaluatePack(
  pipeline: LifecyclePipeline,
  entry: PackRegistryEntry,
  thresholds: Partial<Record<MetricName, number>>,
): Promise<PackEvaluationResult> {
  const provider = await FixtureIntelligenceProvider.fromPack(entry.pack);
  const loaded = await Promise.all(
    fixtureSets.map(async (setName) => ({
      setName,
      fixtures: await pipeline.fixtureArtifacts(entry.pack, setName),
      gold: await loadGold(entry, setName),
    })),
  );
  const catalogue = loaded.flatMap(({ setName, fixtures }) =>
    fixtures.map((fixture) => ({ setName, fixture })),
  );
  const pairs = duplicatePairs(catalogue);
  const duplicateFixtureIds = new Set(pairs.map(({ duplicate }) => duplicate.fixture.id));
  const samples: EvaluationSample[] = [];
  let evaluatedFixtureCount = 0;

  for (const { setName, fixtures, gold } of loaded) {
    const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
    if (fixtures.length !== gold.length) {
      throw new Error(
        `${entry.id}/${setName}: ${fixtures.length} fixtures do not match ${gold.length} gold entries`,
      );
    }
    const workspace = await pipeline.createSeededWorkspace(entry.pack, setName, setName);
    const runs: Array<{
      expectation: LifecycleGoldExpectation;
      decision: DecisionAssessment | null;
      operational: {
        eventType: string | null;
        entities: string[];
        signals: string[];
        caseStates: string[];
      };
    }> = [];
    for (const expectation of gold) {
      const fixture = fixtureById.get(expectation.fixtureId);
      if (fixture === undefined) {
        throw new Error(`${entry.id}/${setName}: gold references missing fixture ${expectation.fixtureId}`);
      }
      if (duplicateFixtureIds.has(fixture.id)) continue;
      const evaluated = await evaluateFixture(
        pipeline,
        entry.pack,
        provider,
        workspace.id,
        setName,
        fixture,
        expectation,
      );
      samples.push(evaluated.sample);
      runs.push({
        expectation,
        decision: evaluated.decision,
        operational: evaluated.operational,
      });
      evaluatedFixtureCount += 1;
    }

    const cases = await pipeline.repositories.cases.list(workspace.id);
    const validCaseStates = Object.values(entry.pack.workflows).flatMap((workflow) =>
      workflow.states.map(({ id }) => id),
    );
    if (setName === "smoke") {
      for (const { expectation, operational } of runs) {
        samples.push({
          fixtureId: expectation.fixtureId,
          enabledMetrics: [
            "classificationAccuracy",
            "entityResolutionAccuracy",
            "ruleExecutionCorrectness",
            "caseStateCorrectness",
          ],
          artifactText: null,
          expectedObservations: [],
          actualObservations: [],
          categoricalSchemaKeys: [],
          expectedEventType: expectation.expectedEventType,
          actualEventType: operational.eventType,
          expectedEntities: expectation.expectedEntities,
          actualEntities: operational.entities,
          expectedSignals: expectation.expectedSignals,
          actualSignals: operational.signals,
          expectedDecision: null,
          actualDecision: null,
          expectedCaseLinkage: expectation.expectedCaseLinkage,
          actualCaseStates: operational.caseStates,
          validCaseStates,
        });
      }
    } else if (setName === "demo") {
      samples.push({
        fixtureId: `${entry.id}/${setName}/workflow-state`,
        enabledMetrics: ["caseStateCorrectness"],
        artifactText: null,
        expectedObservations: [],
        actualObservations: [],
        categoricalSchemaKeys: [],
        expectedEventType: null,
        actualEventType: null,
        expectedEntities: [],
        actualEntities: [],
        expectedSignals: [],
        actualSignals: [],
        expectedDecision: null,
        actualDecision: null,
        expectedCaseLinkage: runs.some(({ expectation }) => expectation.expectedCaseLinkage),
        actualCaseStates: cases.map(({ status }) => status),
        validCaseStates,
      });
    }

    for (const { expectation } of runs.filter(
      ({ expectation }) => expectation.expectedDecision !== null,
    )) {
      samples.push({
        fixtureId: expectation.fixtureId,
        enabledMetrics: ["approvalPolicyCorrectness"],
        artifactText: null,
        expectedObservations: [],
        actualObservations: [],
        categoricalSchemaKeys: [],
        expectedEventType: null,
        actualEventType: null,
        expectedEntities: [],
        actualEntities: [],
        expectedSignals: [],
        actualSignals: [],
        expectedDecision: expectation.expectedDecision,
        actualDecision:
          runs.find(
            ({ decision }) => decision?.ruleId === expectation.expectedDecision?.ruleId,
          )?.decision ?? null,
        expectedCaseLinkage: false,
        actualCaseStates: [],
        validCaseStates: [],
      });
    }
  }

  const duplicates: DuplicateEvaluationSample[] = [];
  for (const { original, duplicate } of pairs) {
    duplicates.push(await evaluateDuplicate(pipeline, entry.pack, provider, original, duplicate));
  }
  const metrics = scoreEvaluationSamples(samples, duplicates, thresholds);
  return {
    packId: entry.id,
    passed: metricsPass(metrics),
    fixtureCount: evaluatedFixtureCount,
    duplicateFixtureCount: duplicates.length,
    metrics,
  };
}

export async function runEvaluation(options: EvaluationRunnerOptions): Promise<EvaluationResult> {
  const provider = options.provider ?? "fixture";
  const registry = await buildPackRegistry(resolve(options.repositoryRoot, "scenario-packs"));
  if (registry.invalid.length > 0) {
    throw new Error(
      `Pack registry is not evaluation-ready: ${registry.invalid.length} invalid`,
    );
  }
  const requested = new Set(options.packIds ?? []);
  const entries =
    requested.size === 0
      ? registry.loaded
      : registry.loaded.filter(({ id }) => requested.has(id));
  const missing = [...requested].filter((id) => !registry.loaded.some((entry) => entry.id === id));
  if (missing.length > 0) throw new Error(`Unknown pack: ${missing.join(", ")}`);
  if (entries.length === 0) throw new Error("No packs selected for evaluation");

  const pipeline = await LifecyclePipeline.create({
    migrationsDirectory: resolve(options.repositoryRoot, "db/migrations"),
    ...(options.databaseUrl === undefined ? {} : { databaseUrl: options.databaseUrl }),
  });
  try {
    const packs: PackEvaluationResult[] = [];
    for (const entry of entries) {
      packs.push(await evaluatePack(pipeline, entry, options.thresholds ?? {}));
    }
    const aggregate = aggregateMetricResults(packs.map(({ metrics }) => metrics));
    return {
      schemaVersion: "1.0",
      provider,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      passed: packs.every(({ passed }) => passed) && metricsPass(aggregate),
      packs,
      aggregate,
    };
  } finally {
    await pipeline.close();
  }
}

export function formatEvaluationResult(result: EvaluationResult): string {
  const lines = [
    `Fixture evaluation: ${result.passed ? "PASS" : "FAIL"}`,
    "",
    `${"Pack".padEnd(24)} ${"Dimension".padEnd(30)} ${"Score".padStart(7)}  Result`,
    `${"-".repeat(24)} ${"-".repeat(30)} ${"-".repeat(7)}  ${"-".repeat(6)}`,
  ];
  for (const pack of result.packs) {
    for (const [index, name] of metricNames.entries()) {
      const metric = pack.metrics[name];
      lines.push(
        `${(index === 0 ? pack.packId : "").padEnd(24)} ${name.padEnd(30)} ${metric.score.toFixed(3).padStart(7)}  ${metric.score >= metric.threshold ? "PASS" : "FAIL"}`,
      );
      for (const failure of metric.failures) lines.push(`  - ${failure}`);
    }
  }
  lines.push("", "Aggregate");
  for (const name of metricNames) {
    const metric = result.aggregate[name];
    lines.push(
      `  ${name.padEnd(30)} ${metric.score.toFixed(3)} (${metric.passed}/${metric.total}, threshold ${metric.threshold.toFixed(3)})`,
    );
  }
  return lines.join("\n");
}
