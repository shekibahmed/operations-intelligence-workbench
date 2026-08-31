import type {
  Artifact,
  AuditEntry,
  EventDefinition,
  JsonValue,
  Observation,
  OperationalEvent,
} from "@oiw/contracts";
import { describe, expect, it } from "vitest";

import { EventAssemblyService } from "./event-assembly.js";

const workspaceId = "10000000-0000-4000-8000-000000000001";
const artifactId = "20000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-01T00:00:00.000Z";

const artifact: Artifact = {
  id: artifactId,
  workspaceId,
  sourceId: "30000000-0000-4000-8000-000000000001",
  artifactType: "message",
  mimeType: "text/plain",
  receivedAt: timestamp,
  occurredAt: null,
  rawReference: "fixture/document-assurance",
  rawText: "Synthetic document review record.",
  checksum: "a".repeat(64),
  metadata: {},
  processingStatus: "processed",
};

const clarificationRequested: EventDefinition = {
  eventType: "clarification-requested",
  displayName: "Clarification Requested",
  description:
    "A reviewer requested clarification from a party contact by correspondence; the thread may resolve cleanly, resolve partially, or remain unresolved.",
  requiredObservations: ["review-status"],
  requiredObservationValues: { "review-status": ["resolved", "unresolved"] },
  optionalObservations: ["document-reference"],
  occurredAt: { observationSchemaKey: null, fallback: "artifact-received-at" },
  primaryEntity: { observationSchemaKey: "document-reference" },
};

const reviewerSignoffRecorded: EventDefinition = {
  eventType: "reviewer-signoff-recorded",
  displayName: "Reviewer Sign-off Recorded",
  description: "An internal reviewer recorded a routine sign-off note with no escalation required.",
  requiredObservations: ["review-status"],
  requiredObservationValues: { "review-status": ["no-escalation-needed"] },
  optionalObservations: ["document-reference"],
  occurredAt: { observationSchemaKey: null, fallback: "artifact-received-at" },
  primaryEntity: { observationSchemaKey: "document-reference" },
};

function observation(
  index: number,
  schemaKey: string,
  value: JsonValue | null,
  normalisedValue: JsonValue | null,
): Observation {
  return {
    id: `40000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
    artifactId,
    entityId: null,
    schemaKey,
    value,
    normalisedValue,
    derivation: "human",
    evidenceStatus: "supported",
    evidenceSegmentId: "50000000-0000-4000-8000-000000000001",
    confidence: 1,
    extractor: null,
    insufficiencyReason: null,
    reviewStatus: "accepted",
    reviewedBy: "reviewer",
    reviewedAt: timestamp,
    createdAt: timestamp,
  };
}

function memoryHarness() {
  const events: OperationalEvent[] = [];
  const audits: AuditEntry[] = [];
  const service = new EventAssemblyService(
    {
      operationalEvents: {
        async insert(_workspaceId, value) {
          events.push(value);
          return value;
        },
        async findById(_workspaceId, eventId) {
          return events.find(({ id }) => id === eventId) ?? null;
        },
        async list() {
          return [...events];
        },
      },
      auditEntries: {
        async insert(_workspaceId, value) {
          audits.push(value);
          return value;
        },
        async list() {
          return [...audits];
        },
      },
    },
    () => new Date(timestamp),
  );
  return { audits, events, service };
}

describe("EventAssemblyService value discriminators", () => {
  it.each([
    {
      label: "normalised reviewer sign-off",
      definitions: [clarificationRequested, reviewerSignoffRecorded],
      value: "No escalation needed",
      normalisedValue: "no-escalation-needed",
      expectedEventType: "reviewer-signoff-recorded",
    },
    {
      label: "original clarification status",
      definitions: [reviewerSignoffRecorded, clarificationRequested],
      value: "resolved",
      normalisedValue: null,
      expectedEventType: "clarification-requested",
    },
  ])("selects the $label definition regardless of candidate order", async (fixture) => {
    const { service } = memoryHarness();
    const definitions = new Map(
      fixture.definitions.map((definition) => [definition.eventType, definition]),
    );

    const result = await service.assemble(
      workspaceId,
      artifact,
      [observation(1, "review-status", fixture.value, fixture.normalisedValue)],
      definitions,
    );

    expect(result.event?.eventType).toBe(fixture.expectedEventType);
  });

  it("excludes a candidate when a present discriminator has no accepted value", async () => {
    const { audits, events, service } = memoryHarness();

    const result = await service.assemble(
      workspaceId,
      artifact,
      [observation(1, "review-status", "escalation-required", null)],
      new Map([[reviewerSignoffRecorded.eventType, reviewerSignoffRecorded]]),
    );

    expect(result.event).toBeNull();
    expect(events).toEqual([]);
    expect(audits).toEqual([
      expect.objectContaining({
        action: "event-assembly-deferred",
        cause: expect.stringContaining("value constraints"),
      }),
    ]);
  });

  it("abstains and audits when the discriminator Observation is missing", async () => {
    const { audits, service } = memoryHarness();
    const definitions = new Map(
      [clarificationRequested, reviewerSignoffRecorded].map((definition) => [
        definition.eventType,
        definition,
      ]),
    );

    const result = await service.assemble(
      workspaceId,
      artifact,
      [observation(2, "document-reference", "DOC-001", "DOC-001")],
      definitions,
    );

    expect(result.event).toBeNull();
    expect(audits.map(({ action }) => action)).toEqual(["event-assembly-deferred"]);
  });

  it("compares structured discriminator values with deterministic JSON equality", async () => {
    const definition: EventDefinition = {
      eventType: "structured-review-recorded",
      displayName: "Structured review recorded",
      description: "A neutral structured discriminator fixture.",
      requiredObservations: ["review-status"],
      requiredObservationValues: {
        "review-status": [{ result: "resolved", checks: ["identity", "evidence"] }],
      },
      optionalObservations: [],
      occurredAt: { observationSchemaKey: null, fallback: "artifact-received-at" },
      primaryEntity: null,
    };
    const { service } = memoryHarness();

    const result = await service.assemble(
      workspaceId,
      artifact,
      [
        observation(
          1,
          "review-status",
          { checks: ["identity", "evidence"], result: "resolved" },
          null,
        ),
      ],
      new Map([[definition.eventType, definition]]),
    );

    expect(result.event?.eventType).toBe("structured-review-recorded");
  });
});
