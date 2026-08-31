import { describe, expect, it } from "vitest";
import type { Observation } from "@oiw/contracts";

import { mapArtifactsToInboxRows } from "@/lib/inbox-mapping";
import { stubArtifacts, stubObservations, stubSources } from "@/lib/stub";

function observationFor(artifactId: string, reviewStatus: Observation["reviewStatus"]): Observation {
  return { ...stubObservations[0]!, id: `${stubObservations[0]!.id}-${reviewStatus}`, artifactId, reviewStatus };
}

describe("mapArtifactsToInboxRows", () => {
  it("resolves each artifact's source name and technical-inspector href", () => {
    const rows = mapArtifactsToInboxRows(stubArtifacts, stubSources, [], "/w/demo-asset-reliability");

    expect(rows).toHaveLength(stubArtifacts.length);
    const first = rows[0]!;
    const expectedSource = stubSources.find((source) => source.id === stubArtifacts[0]!.sourceId)!;
    expect(first.sourceName).toBe(expectedSource.name);
    expect(first.technicalHref).toBe(`/w/demo-asset-reliability/technical/artifacts/${stubArtifacts[0]!.id}`);
  });

  it("falls back to the raw source ID when no matching source exists", () => {
    const [rows] = [mapArtifactsToInboxRows([{ ...stubArtifacts[0]!, sourceId: "missing-source" }], stubSources, [], "/w/x")];
    expect(rows[0]!.sourceName).toBe("missing-source");
  });

  it("leaves linked-entity/related-case columns real-empty (no entity resolution or case engine)", () => {
    const [row] = mapArtifactsToInboxRows([stubArtifacts[0]!], [], [], "/w/x");
    expect(row!.linkedEntity).toBeNull();
    expect(row!.relatedCaseTitle).toBeNull();
  });

  it("counts an unprocessed artifact's observations as a real zero", () => {
    const [row] = mapArtifactsToInboxRows([stubArtifacts[0]!], [], [], "/w/x");
    expect(row!.observationsFound).toBe(0);
    expect(row!.reviewRequired).toBe(false);
  });

  it("counts real observations per artifact and flags review-required from pending/conflicting status", () => {
    const artifactId = stubArtifacts[0]!.id;
    const observations = [
      observationFor(artifactId, "not-required"),
      observationFor(artifactId, "pending"),
      observationFor("some-other-artifact", "pending"),
    ];
    const [row] = mapArtifactsToInboxRows([stubArtifacts[0]!], [], observations, "/w/x");
    expect(row!.observationsFound).toBe(2);
    expect(row!.reviewRequired).toBe(true);
  });

  it("does not flag review-required when every observation is accepted/not-required", () => {
    const artifactId = stubArtifacts[0]!.id;
    const observations = [observationFor(artifactId, "not-required"), observationFor(artifactId, "accepted")];
    const [row] = mapArtifactsToInboxRows([stubArtifacts[0]!], [], observations, "/w/x");
    expect(row!.reviewRequired).toBe(false);
  });

  it("caps the row count per UX_SPEC §5.5's pagination/cap NFR", () => {
    const manyArtifacts = Array.from({ length: 5 }, (_, index) => ({ ...stubArtifacts[0]!, id: `artifact-${index}` }));
    const rows = mapArtifactsToInboxRows(manyArtifacts, stubSources, [], "/w/x", 2);
    expect(rows).toHaveLength(2);
  });
});
