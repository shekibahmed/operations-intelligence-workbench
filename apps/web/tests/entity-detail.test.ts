import type { Artifact, Case, Entity, Observation, OperationalEvent, Signal } from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { buildEntityDetailView } from "@/lib/entity-detail";
import { fakeRepositories } from "./support/fake-repositories";

const WORKSPACE_ID = "workspace-1";

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "entity-1",
    workspaceId: WORKSPACE_ID,
    entityType: "asset",
    displayName: "A-140",
    externalReference: "A-140",
    aliases: [],
    attributes: { location: "Bay 3" },
    status: "operational",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<OperationalEvent> = {}): OperationalEvent {
  return {
    id: "event-1",
    workspaceId: WORKSPACE_ID,
    eventType: "fault-reported",
    occurredAt: "2026-05-01T00:00:00.000Z",
    recordedAt: "2026-05-01T00:00:00.000Z",
    entityIds: ["entity-1"],
    observationIds: ["obs-1"],
    attributes: {},
    assembly: { assemblerId: "event-assembly", assemblerVersion: "1.0.0" },
    reEvaluationStatus: "current",
    ...overrides,
  };
}

describe("buildEntityDetailView", () => {
  it("returns null for an entity that does not exist", async () => {
    const repositories = fakeRepositories({ entities: [] });
    expect(await buildEntityDetailView(repositories, WORKSPACE_ID, "missing")).toBeNull();
  });

  it("splits related Cases into open and closed", async () => {
    const openCase: Case = {
      id: "case-open",
      workspaceId: WORKSPACE_ID,
      caseType: "reliability-case",
      title: "Open case",
      status: "open",
      priority: "high",
      severity: "high",
      owner: null,
      dueAt: null,
      relatedEntityIds: ["entity-1"],
      relatedEventIds: [],
      relatedSignalIds: [],
      closureRequirementIds: [],
      reEvaluationStatus: "current",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
    const closedCase: Case = { ...openCase, id: "case-closed", title: "Closed case", status: "closed" };

    const repositories = fakeRepositories({ entities: [entity()], cases: [openCase, closedCase], operationalEvents: [], signals: [] });
    const view = await buildEntityDetailView(repositories, WORKSPACE_ID, "entity-1");

    expect(view?.openCases.map((c) => c.id)).toEqual(["case-open"]);
    expect(view?.closedCases.map((c) => c.id)).toEqual(["case-closed"]);
  });

  it("orders event history chronologically and finds related artifacts via observations", async () => {
    const earlier = event({ id: "event-earlier", occurredAt: "2026-04-01T00:00:00.000Z" });
    const later = event({ id: "event-later", occurredAt: "2026-05-01T00:00:00.000Z" });
    const observation: Observation = {
      id: "obs-1",
      artifactId: "artifact-1",
      entityId: "entity-1",
      schemaKey: "symptom",
      value: "grinding noise",
      normalisedValue: "grinding noise",
      derivation: "machine",
      evidenceStatus: "supported",
      evidenceSegmentId: null,
      confidence: 0.9,
      extractor: { id: "fixture", version: "1.0.0" },
      insufficiencyReason: null,
      reviewStatus: "accepted",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: "2026-04-01T00:00:00.000Z",
    };
    const artifact: Artifact = {
      id: "artifact-1",
      workspaceId: WORKSPACE_ID,
      sourceId: "source-1",
      artifactType: "chat-message",
      mimeType: "text/plain",
      receivedAt: "2026-04-01T00:00:00.000Z",
      occurredAt: null,
      rawReference: "ref",
      rawText: "grinding noise when I brake",
      checksum: "abc",
      metadata: {},
      processingStatus: "processed",
    };

    const repositories = fakeRepositories({
      entities: [entity()],
      operationalEvents: [later, earlier],
      cases: [],
      signals: [],
      observations: [observation],
      artifacts: [artifact],
    });

    const view = await buildEntityDetailView(repositories, WORKSPACE_ID, "entity-1");
    expect(view?.events.map((e) => e.id)).toEqual(["event-earlier", "event-later"]);
    expect(view?.relatedArtifacts.map((a) => a.id)).toEqual(["artifact-1"]);
  });

  it("surfaces a Signal with more than one contributing event as a repeated pattern", async () => {
    const signalPattern: Signal = {
      id: "signal-1",
      workspaceId: WORKSPACE_ID,
      signalType: "repeated-fault",
      severity: "critical",
      eventIds: ["event-1", "event-2"],
      evidenceSegmentIds: ["segment-1"],
      rule: { id: "repeated-fault-escalation", version: "1.0.0" },
      rationale: "Two related faults",
      createdAt: "2026-05-01T00:00:00.000Z",
    };
    const singleEventSignal: Signal = { ...signalPattern, id: "signal-2", eventIds: ["event-1"] };

    const repositories = fakeRepositories({
      entities: [entity()],
      operationalEvents: [event()],
      cases: [],
      signals: [signalPattern, singleEventSignal],
    });

    const view = await buildEntityDetailView(repositories, WORKSPACE_ID, "entity-1");
    expect(view?.patternSignals.map((s) => s.id)).toEqual(["signal-1"]);
  });

  it("finds related entities that share an Event", async () => {
    const other = entity({ id: "entity-2", displayName: "A-141" });
    const sharedEvent = event({ entityIds: ["entity-1", "entity-2"] });

    const repositories = fakeRepositories({ entities: [entity(), other], operationalEvents: [sharedEvent], cases: [], signals: [] });
    const view = await buildEntityDetailView(repositories, WORKSPACE_ID, "entity-1");

    expect(view?.relatedEntities.map((e) => e.id)).toEqual(["entity-2"]);
  });
});
