import { describe, expect, it } from "vitest";

import { parseEvalArgs } from "./cli.js";
import { evidenceLocatorsMatch, metricsPass, scoreEvaluationSamples } from "./scoring.js";
import {
  metricNames,
  type DuplicateEvaluationSample,
  type EvaluationSample,
  type MetricName,
} from "./types.js";

function syntheticGoldSample(): EvaluationSample {
  return {
    fixtureId: "synthetic-gold-001",
    artifactText: "status: urgent\nidentifier: E-100\n",
    expectedObservations: [
      {
        schemaKey: "classification",
        status: "extracted",
        value: "urgent",
        evidenceLocator: { kind: "text-range", start: 8, end: 14 },
      },
      {
        schemaKey: "missing-field",
        status: "insufficient-evidence",
        value: null,
        evidenceLocator: null,
      },
    ],
    actualObservations: [
      {
        schemaKey: "classification",
        status: "extracted",
        value: "urgent",
        evidenceLocator: { kind: "text-range", start: 8, end: 14 },
      },
      {
        schemaKey: "missing-field",
        status: "insufficient-evidence",
        value: null,
        evidenceLocator: null,
      },
    ],
    categoricalSchemaKeys: ["classification"],
    expectedEventType: "exception-recorded",
    actualEventType: "exception-recorded",
    expectedEntities: ["E-100"],
    actualEntities: ["E-100"],
    expectedSignals: ["urgent-exception"],
    actualSignals: ["urgent-exception"],
    expectedDecision: {
      ruleId: "human-gate",
      approvalRequired: true,
      riskLevel: "high",
    },
    actualDecision: {
      ruleId: "human-gate",
      approvalRequired: true,
      riskLevel: "high",
      status: "awaiting-approval",
      approvalCount: 0,
      bypassProtected: true,
    },
    expectedCaseLinkage: true,
    actualCaseStates: ["open"],
    validCaseStates: ["open", "closed"],
  };
}

function syntheticDuplicate(): DuplicateEvaluationSample {
  return {
    fixtureId: "synthetic-gold-duplicate",
    originalFixtureId: "synthetic-gold-001",
    inserted: false,
    duplicateOfArtifactId: "artifact-1",
    originalArtifactId: "artifact-1",
    eventCountBefore: 1,
    eventCountAfter: 1,
    signalCountBefore: 1,
    signalCountAfter: 1,
    caseCountBefore: 1,
    caseCountAfter: 1,
    idempotent: true,
    duplicateSuppressed: true,
  };
}

function sabotage(
  dimension: MetricName,
): { samples: EvaluationSample[]; duplicates: DuplicateEvaluationSample[] } {
  const sample = structuredClone(syntheticGoldSample());
  const duplicate = structuredClone(syntheticDuplicate());
  if (dimension === "fieldPrecision") {
    sample.actualObservations.push({
      schemaKey: "invented-field",
      status: "extracted",
      value: "invented",
      evidenceLocator: { kind: "text-range", start: 0, end: 6 },
    });
  } else if (dimension === "fieldRecall") {
    sample.actualObservations = sample.actualObservations.filter(
      ({ schemaKey }) => schemaKey !== "classification",
    );
  } else if (dimension === "classificationAccuracy") {
    sample.actualObservations[0]!.value = "routine";
  } else if (dimension === "evidenceSpanCorrectness") {
    sample.actualObservations[0]!.evidenceLocator = { kind: "text-range", start: 20, end: 26 };
  } else if (dimension === "entityResolutionAccuracy") {
    sample.actualEntities = ["E-999"];
  } else if (dimension === "abstentionPrecision") {
    sample.actualObservations.push({
      schemaKey: "answerable-field",
      status: "insufficient-evidence",
      value: null,
      evidenceLocator: null,
    });
  } else if (dimension === "abstentionRecall") {
    sample.actualObservations = sample.actualObservations.filter(
      ({ schemaKey }) => schemaKey !== "missing-field",
    );
  } else if (dimension === "ruleExecutionCorrectness") {
    sample.actualSignals = ["wrong-rule"];
  } else if (dimension === "approvalPolicyCorrectness") {
    sample.actualDecision!.bypassProtected = false;
  } else if (dimension === "duplicateEventPrevention") {
    duplicate.duplicateSuppressed = false;
    duplicate.eventCountAfter = 2;
  } else if (dimension === "caseStateCorrectness") {
    sample.actualCaseStates = ["invented-state"];
  }
  return { samples: [sample], duplicates: [duplicate] };
}

describe("evaluation scoring", () => {
  it("passes a complete synthetic gold fixture", () => {
    const result = scoreEvaluationSamples([syntheticGoldSample()], [syntheticDuplicate()]);
    expect(metricsPass(result)).toBe(true);
    for (const name of metricNames) expect(result[name].score, name).toBe(1);
  });

  it.each(metricNames)("detects and precisely reports %s sabotage", (dimension) => {
    const broken = sabotage(dimension);
    const result = scoreEvaluationSamples(broken.samples, broken.duplicates);
    expect(result[dimension].score).toBeLessThan(1);
    expect(result[dimension].failures.join("\n")).toContain("synthetic-gold");
    expect(metricsPass(result)).toBe(false);
  });

  it("applies text tolerance only on the same line and requires structured locators exactly", () => {
    expect(
      evidenceLocatorsMatch(
        { kind: "text-range", start: 8, end: 14 },
        { kind: "text-range", start: 10, end: 16 },
        "status: urgent\nidentifier: E-100",
      ),
    ).toBe(true);
    expect(
      evidenceLocatorsMatch(
        { kind: "text-range", start: 8, end: 12 },
        { kind: "text-range", start: 12, end: 16 },
        "first line\nsecond line",
      ),
    ).toBe(false);
    expect(
      evidenceLocatorsMatch(
        { kind: "json-path", path: "$.status" },
        { kind: "json-path", path: "$.state" },
        null,
      ),
    ).toBe(false);
  });
});

describe("evaluation CLI arguments", () => {
  it("accepts the PRD command surface", () => {
    expect(parseEvalArgs(["--pack", "asset-reliability", "--provider=fixture"])).toEqual({
      help: false,
      packIds: ["asset-reliability"],
      provider: "fixture",
    });
  });

  it("rejects unknown providers and arguments", () => {
    expect(() => parseEvalArgs(["--provider", "live"])).toThrow("only \"fixture\"");
    expect(() => parseEvalArgs(["--unknown"])).toThrow("Unknown evaluation argument");
  });
});
