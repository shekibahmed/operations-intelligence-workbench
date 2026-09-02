import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ArtifactAdvancementService,
  ArtifactProcessingService,
  SeedService,
  WorkspaceService,
  prepareOperationalAudit,
} from "@oiw/application";
import type { JsonValue, Observation, Source, Workspace } from "@oiw/contracts";
import { FormatAdapterRegistry, IngestionService } from "@oiw/ingestion";
import {
  ConfidenceAbstentionPolicy,
  StructuredOutputValidator,
} from "@oiw/intelligence";
import type { FixtureIntelligenceProvider } from "@oiw/intelligence";
import {
  createDatabase,
  createPostgresRepositories,
  defaultDatabaseUrl,
} from "@oiw/persistence";
import { RuleEngine } from "@oiw/rules";
import {
  loadFixtureSet,
  type FixtureSetName,
  type LoadedFixtureArtifact,
  type LoadedScenarioPack,
} from "@oiw/scenario-sdk";

const evaluationTimestamp = "2026-09-01T12:00:00.000Z";

export interface LifecycleGoldObservation {
  schemaKey: string;
  status: "extracted" | "insufficient-evidence" | "negated";
  value: JsonValue | null;
}

export interface LifecycleGoldExpectation {
  fixtureId: string;
  expectedObservations: LifecycleGoldObservation[];
  expectedEventType: string | null;
  expectedSignals: string[];
  expectedEntities: string[];
  expectedCaseLinkage: boolean;
  expectedDecision: {
    ruleId: string;
    approvalRequired: boolean;
    riskLevel: string;
  } | null;
  notes?: string;
}

export interface LifecyclePipelineOptions {
  databaseUrl?: string;
  migrationsDirectory: string;
}

export class LifecyclePipeline {
  readonly repositories;

  private constructor(
    private readonly adminConnection: ReturnType<typeof createDatabase>,
    private readonly testConnection: ReturnType<typeof createDatabase>,
    private readonly databaseName: string,
  ) {
    this.repositories = createPostgresRepositories(testConnection.database);
  }

  static async create(options: LifecyclePipelineOptions): Promise<LifecyclePipeline> {
    const baseDatabaseUrl = options.databaseUrl ?? process.env.DATABASE_URL ?? defaultDatabaseUrl;
    const adminConnection = createDatabase(baseDatabaseUrl);
    const databaseName = `oiw_eval_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
    const testDatabaseUrl = new URL(baseDatabaseUrl);
    testDatabaseUrl.pathname = `/${databaseName}`;

    try {
      await adminConnection.client.unsafe(`CREATE DATABASE "${databaseName}"`);
      const testConnection = createDatabase(testDatabaseUrl.toString());
      const pipeline = new LifecyclePipeline(adminConnection, testConnection, databaseName);
      await pipeline.migrate(options.migrationsDirectory);
      return pipeline;
    } catch (error) {
      await adminConnection.client.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await adminConnection.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.testConnection.close();
    await this.adminConnection.client.unsafe(
      `DROP DATABASE IF EXISTS "${this.databaseName}" WITH (FORCE)`,
    );
    await this.adminConnection.close();
  }

  async fixtureArtifacts(
    pack: LoadedScenarioPack,
    setName: FixtureSetName,
  ): Promise<LoadedFixtureArtifact[]> {
    const result = await loadFixtureSet(pack, setName);
    if (result.status !== "loaded") {
      const detail = result.errors.map((error) => error.message).join("; ");
      throw new Error(`${pack.manifest.id}/${setName} fixtures did not load: ${detail}`);
    }
    return result.fixtureSet.artifacts;
  }

  async createSeededWorkspace(
    pack: LoadedScenarioPack,
    label: string,
    fixtureSet: FixtureSetName = pack.manifest.defaultFixtureSet,
  ): Promise<Workspace> {
    const workspace = await new WorkspaceService(this.repositories.workspaces, {
      clock: () => new Date(evaluationTimestamp),
    }).createGuestWorkspace(pack.manifest.id, {
      slug: `eval-${pack.manifest.id}-${label}-${randomUUID().slice(0, 8)}`,
    });
    await new SeedService(this.repositories, () => new Date(evaluationTimestamp)).seed(
      workspace,
      pack,
      loadFixtureSet,
      { fixtureSet },
    );
    return workspace;
  }

  async ingestFixture(
    pack: LoadedScenarioPack,
    workspaceId: string,
    fixture: LoadedFixtureArtifact,
    fixtureSet: FixtureSetName,
  ) {
    const source = await this.createSource(workspaceId, fixture);
    return new IngestionService(
      this.repositories,
      new FormatAdapterRegistry(),
      () => new Date(evaluationTimestamp),
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
      receivedAt: evaluationTimestamp,
    });
  }

  async processAndAdvance(
    pack: LoadedScenarioPack,
    provider: FixtureIntelligenceProvider,
    workspaceId: string,
    fixture: LoadedFixtureArtifact,
    fixtureSet: FixtureSetName,
  ) {
    const ingested = await this.ingestFixture(pack, workspaceId, fixture, fixtureSet);
    const processed = await new ArtifactProcessingService(
      this.repositories,
      new FormatAdapterRegistry(),
      provider,
      new StructuredOutputValidator(),
      new ConfidenceAbstentionPolicy(),
      { resolve: () => pack },
      () => new Date(evaluationTimestamp),
    ).processArtifact(workspaceId, ingested.artifact.id);
    await this.acceptPending(workspaceId, processed.observations);
    const advancement = await new ArtifactAdvancementService(
      this.repositories,
      { resolve: () => pack },
      new RuleEngine(),
      [],
      () => new Date(evaluationTimestamp),
    ).advanceArtifact(workspaceId, ingested.artifact.id);
    return { ingested, processed, advancement };
  }

  async linkedExternalReferences(
    workspaceId: string,
    entityIds: readonly string[],
  ): Promise<string[]> {
    const entities = await Promise.all(
      entityIds.map((entityId) => this.repositories.entities.findById(workspaceId, entityId)),
    );
    return entities
      .map((entity) => entity?.externalReference)
      .filter((reference): reference is string => reference !== null && reference !== undefined);
  }

  private async migrate(migrationsDirectory: string): Promise<void> {
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));
    for (const file of migrationFiles) {
      const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
      for (const statement of sql.split("--> statement-breakpoint")) {
        if (statement.trim().length > 0) await this.testConnection.client.unsafe(statement);
      }
    }
  }

  private async createSource(
    workspaceId: string,
    fixture: LoadedFixtureArtifact,
  ): Promise<Source> {
    return this.repositories.sources.insert(workspaceId, {
      id: randomUUID(),
      workspaceId,
      sourceType: fixture.artifactType,
      name: String(fixture.sourceMetadata["narrativeSource"] ?? fixture.artifactType),
      configuration: fixture.sourceMetadata,
      createdAt: evaluationTimestamp,
    });
  }

  private async acceptPending(
    workspaceId: string,
    observations: readonly Observation[],
  ): Promise<void> {
    for (const observation of observations) {
      if (observation.reviewStatus !== "pending" || observation.value === null) continue;
      const reviewed: Observation = {
        ...observation,
        reviewStatus: "accepted",
        reviewedBy: "evaluation-runner",
        reviewedAt: evaluationTimestamp,
      };
      const audit = await prepareOperationalAudit(this.repositories.auditEntries, {
        workspaceId,
        occurredAt: evaluationTimestamp,
        action: "observation-accepted",
        actorId: "evaluation-runner",
        subject: { type: "observation", id: observation.id },
        cause: "Evaluation runner accepted a supported fixture Observation",
        data: { previousReviewStatus: observation.reviewStatus },
      });
      await this.repositories.observations.correct(workspaceId, observation.id, reviewed, audit);
    }
  }
}
