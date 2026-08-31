import { resolve } from "node:path";

import type {
  ExtractionRequest,
  ExtractionResult,
  ObservationSchemaDefinition,
  ProposedObservation,
} from "@oiw/contracts";
import { loadFixtureSet, loadPackFromDirectory } from "@oiw/scenario-sdk";
import { describe, expect, it } from "vitest";

import { FixtureIntelligenceProvider, FixtureLookupError } from "../src/fixture-provider.js";
import {
  ConfidenceAbstentionPolicy,
  DEFAULT_CONFIDENCE_THRESHOLD,
  StructuredOutputValidator,
} from "../src/validation.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const packDirectory = resolve(repositoryRoot, "scenario-packs/asset-reliability");

function definition(overrides: Partial<ObservationSchemaDefinition> = {}): ObservationSchemaDefinition {
  return {
    schemaKey: "record-id",
    displayName: "Record ID",
    valueType: "string",
    description: "Synthetic record identifier.",
    jsonSchema: { type: "string", pattern: "^R-[0-9]+$" },
    evidenceRequired: true,
    ...overrides,
  };
}

function proposal(overrides: Partial<ProposedObservation> = {}): ProposedObservation {
  return {
    status: "extracted",
    schemaKey: "record-id",
    value: "R-1",
    normalisedValue: "R-1",
    confidence: 0.9,
    evidence: [
      { locator: { kind: "text-range", start: 0, end: 3 }, excerpt: "R-1" },
    ],
    ...overrides,
  } as ProposedObservation;
}

function extraction(observation: ProposedObservation): ExtractionResult {
  return {
    artifactChecksum: "a".repeat(64),
    observations: [observation],
    warnings: [],
    provider: {
      providerId: "fixture-intelligence-provider",
      providerVersion: "1.0.0",
      model: null,
      deterministic: true,
    },
    processingTrace: {
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:00:00Z",
      durationMs: 0,
      steps: [{ name: "extraction", status: "completed", detail: "Synthetic lookup." }],
    },
  };
}

describe("fixture intelligence provider", () => {
  it("loads checksum-keyed deterministic results through scenario-sdk", async () => {
    const loadedPack = await loadPackFromDirectory(packDirectory);
    if (loadedPack.status !== "loaded") throw new Error("Asset Reliability pack did not load");
    const smoke = await loadFixtureSet(loadedPack.pack, "smoke");
    if (smoke.status !== "loaded") throw new Error("Smoke fixtures did not load");
    const fixture = smoke.fixtureSet.artifacts[0]!;
    const provider = await FixtureIntelligenceProvider.fromPack(loadedPack.pack);
    const request: ExtractionRequest = {
      artifact: {
        checksum: fixture.sha256,
        artifactType: fixture.artifactType,
        mimeType: fixture.mimeType,
        rawText: new TextDecoder().decode(fixture.content),
        rawReference: `fixture://${fixture.id}`,
        metadata: fixture.sourceMetadata,
      },
      observationSchema: {},
      context: {
        packId: loadedPack.pack.manifest.id,
        packVersion: loadedPack.pack.manifest.version,
        locale: "en",
        values: {},
      },
    };

    await expect(provider.extract(request)).resolves.toEqual(fixture.extraction);
    await expect(
      provider.extract({
        ...request,
        artifact: { ...request.artifact, checksum: "f".repeat(64) },
      }),
    ).rejects.toBeInstanceOf(FixtureLookupError);
  });
});

describe("structured validation and confidence routing", () => {
  const validator = new StructuredOutputValidator();
  const catalogue = new Map([["record-id", definition()]]);

  it("rejects unknown keys and schema-invalid values while preserving a reviewable proposal", () => {
    const invalidValue = validator.validate(
      extraction(proposal({ value: "invalid", normalisedValue: "invalid" })),
      "a".repeat(64),
      catalogue,
    );
    expect(invalidValue.validResult).toBe(true);
    if (!invalidValue.validResult) throw new Error("Expected a parsed extraction result");
    expect(invalidValue.observations[0]).toMatchObject({ valid: false });
    expect(invalidValue.issues[0]).toContain("record-id");

    const unknown = validator.validate(
      extraction(proposal({ schemaKey: "unknown-key" })),
      "a".repeat(64),
      catalogue,
    );
    expect(unknown.validResult && unknown.observations[0]?.valid).toBe(false);
  });

  it("rejects a malformed result or mismatched checksum as a whole", () => {
    expect(validator.validate({ observations: [] }, "a".repeat(64), catalogue).validResult).toBe(
      false,
    );
    expect(
      validator.validate(extraction(proposal()), "b".repeat(64), catalogue).validResult,
    ).toBe(false);
  });

  it("uses schema thresholds, the default, and explicit abstention semantics", () => {
    const policy = new ConfidenceAbstentionPolicy();
    expect(DEFAULT_CONFIDENCE_THRESHOLD).toBe(0.75);
    expect(policy.reviewStatus(proposal({ confidence: 0.74 }), definition(), true)).toBe("pending");
    expect(policy.reviewStatus(proposal({ confidence: 0.75 }), definition(), true)).toBe(
      "not-required",
    );
    expect(
      policy.reviewStatus(proposal({ confidence: 0.8 }), definition({ confidenceThreshold: 0.9 }), true),
    ).toBe("pending");
    expect(
      policy.reviewStatus(
        proposal({
          status: "insufficient-evidence",
          value: null,
          normalisedValue: null,
          evidence: [],
          reason: "Not present.",
          confidence: 0.9,
        }),
        definition(),
        true,
      ),
    ).toBe("pending");
    expect(
      policy.reviewStatus(
        proposal({
          status: "negated",
          value: null,
          normalisedValue: null,
          reason: "Explicitly ruled out.",
          confidence: 0.7,
        }),
        definition(),
        true,
      ),
    ).toBe("pending");
    expect(policy.reviewStatus(proposal(), definition(), false)).toBe("pending");
  });
});
