import { describe, expect, it } from "vitest";

import { mapArtifactsToInboxRows } from "@/lib/inbox-mapping";
import { stubArtifacts, stubSources } from "@/lib/stub";

describe("mapArtifactsToInboxRows", () => {
  it("resolves each artifact's source name and technical-inspector href", () => {
    const rows = mapArtifactsToInboxRows(stubArtifacts, stubSources, "/w/demo-asset-reliability");

    expect(rows).toHaveLength(stubArtifacts.length);
    const first = rows[0]!;
    const expectedSource = stubSources.find((source) => source.id === stubArtifacts[0]!.sourceId)!;
    expect(first.sourceName).toBe(expectedSource.name);
    expect(first.technicalHref).toBe(`/w/demo-asset-reliability/technical/artifacts/${stubArtifacts[0]!.id}`);
  });

  it("falls back to the raw source ID when no matching source exists", () => {
    const [rows] = [mapArtifactsToInboxRows([{ ...stubArtifacts[0]!, sourceId: "missing-source" }], stubSources, "/w/x")];
    expect(rows[0]!.sourceName).toBe("missing-source");
  });

  it("leaves linked-entity/observation/review columns real-empty rather than fabricated (no processing engine yet)", () => {
    const [row] = mapArtifactsToInboxRows([stubArtifacts[0]!], [], "/w/x");
    expect(row!.linkedEntity).toBeNull();
    expect(row!.observationsFound).toBe(0);
    expect(row!.reviewRequired).toBe(false);
    expect(row!.relatedCaseTitle).toBeNull();
  });

  it("caps the row count per UX_SPEC §5.5's pagination/cap NFR", () => {
    const manyArtifacts = Array.from({ length: 5 }, (_, index) => ({ ...stubArtifacts[0]!, id: `artifact-${index}` }));
    const rows = mapArtifactsToInboxRows(manyArtifacts, stubSources, "/w/x", 2);
    expect(rows).toHaveLength(2);
  });
});
