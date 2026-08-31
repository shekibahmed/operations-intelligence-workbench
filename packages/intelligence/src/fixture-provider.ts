import {
  ExtractionRequestSchema,
  ExtractionResultSchema,
  type ClassificationRequest,
  type ClassificationResult,
  type ExtractionRequest,
  type ExtractionResult,
  type SummaryRequest,
  type SummaryResult,
} from "@oiw/contracts";
import {
  loadFixtureSet,
  type FixtureSetName,
  type LoadedScenarioPack,
} from "@oiw/scenario-sdk";

import type { IntelligenceProvider } from "./provider.js";

export class FixtureLookupError extends Error {
  readonly retryable = false;

  constructor(checksum: string) {
    super(`No fixture extraction is registered for artifact checksum "${checksum}"`);
    this.name = "FixtureLookupError";
  }
}

export class UnsupportedIntelligenceOperationError extends Error {
  readonly retryable = false;

  constructor(operation: string) {
    super(`FixtureIntelligenceProvider does not implement ${operation}`);
    this.name = "UnsupportedIntelligenceOperationError";
  }
}

export class FixtureIntelligenceProvider implements IntelligenceProvider {
  private constructor(
    private readonly packId: string,
    private readonly packVersion: string,
    private readonly extractions: ReadonlyMap<string, ExtractionResult>,
  ) {}

  static async fromPack(
    pack: LoadedScenarioPack,
    fixtureSets: readonly FixtureSetName[] = ["smoke", "demo", "edge-cases"],
  ): Promise<FixtureIntelligenceProvider> {
    const extractions = new Map<string, ExtractionResult>();
    for (const setName of fixtureSets) {
      const loaded = await loadFixtureSet(pack, setName);
      if (loaded.status === "invalid") {
        throw new Error(
          `Fixture set "${setName}" is invalid: ${loaded.errors
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("; ")}`,
        );
      }
      for (const artifact of loaded.fixtureSet.artifacts) {
        if (!artifact.extraction.provider.deterministic) {
          throw new Error(
            `Fixture extraction for checksum "${artifact.sha256}" is not marked deterministic`,
          );
        }
        if (artifact.extraction.processingTrace.steps.length === 0) {
          throw new Error(
            `Fixture extraction for checksum "${artifact.sha256}" has an empty processing trace`,
          );
        }
        const existing = extractions.get(artifact.sha256);
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(artifact.extraction)) {
          throw new Error(
            `Fixture checksum "${artifact.sha256}" maps to conflicting extraction results`,
          );
        }
        extractions.set(artifact.sha256, artifact.extraction);
      }
    }
    return new FixtureIntelligenceProvider(
      pack.manifest.id,
      pack.manifest.version,
      extractions,
    );
  }

  async extract(untrustedRequest: ExtractionRequest): Promise<ExtractionResult> {
    const request = ExtractionRequestSchema.parse(untrustedRequest);
    if (
      request.context.packId !== this.packId ||
      request.context.packVersion !== this.packVersion
    ) {
      throw new Error(
        `Extraction context ${request.context.packId}@${request.context.packVersion} does not match provider pack ${this.packId}@${this.packVersion}`,
      );
    }
    const result = this.extractions.get(request.artifact.checksum);
    if (result === undefined) throw new FixtureLookupError(request.artifact.checksum);
    return ExtractionResultSchema.parse(result);
  }

  async classify(_request: ClassificationRequest): Promise<ClassificationResult> {
    throw new UnsupportedIntelligenceOperationError("classification");
  }

  async summarise(_request: SummaryRequest): Promise<SummaryResult> {
    throw new UnsupportedIntelligenceOperationError("summarisation");
  }
}
