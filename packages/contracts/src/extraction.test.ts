import { describe, expect, it } from "vitest";

import { ExtractionResultSchema } from "./extraction.js";

const extractionResult = {
  artifactChecksum: "b".repeat(64),
  observations: [
    {
      status: "extracted",
      schemaKey: "reference-code",
      value: "REF-2",
      normalisedValue: "REF-2",
      confidence: 0.98,
      evidence: [{ locator: { kind: "text-range", start: 0, end: 5 }, excerpt: "REF-2" }],
    },
    {
      status: "insufficient-evidence",
      schemaKey: "due-date",
      value: null,
      normalisedValue: null,
      confidence: 0.1,
      evidence: [],
      reason: "The source has no due date.",
    },
  ],
  warnings: [],
  provider: {
    providerId: "fixture-provider",
    providerVersion: "1.0.0",
    model: null,
    deterministic: true,
  },
  processingTrace: {
    startedAt: "2026-08-31T00:00:00.000Z",
    completedAt: "2026-08-31T00:00:00.001Z",
    durationMs: 1,
    steps: [{ name: "fixture-lookup", status: "completed", detail: "Matched by checksum." }],
  },
} as const;

describe("ExtractionResult contract", () => {
  it("round-trips a checksum-keyed deterministic result", () => {
    const parsed = ExtractionResultSchema.parse(extractionResult);
    expect(ExtractionResultSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it("rejects extracted values without evidence", () => {
    const result = ExtractionResultSchema.safeParse({
      ...extractionResult,
      observations: [{ ...extractionResult.observations[0], evidence: [] }],
    });
    expect(result.success).toBe(false);
  });
});
