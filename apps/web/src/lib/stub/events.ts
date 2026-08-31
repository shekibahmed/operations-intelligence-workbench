import type { OperationalEvent } from "@oiw/contracts";

import { entityIds, eventIds, observationIds, workspaceId } from "@/lib/stub/ids";
import { maintenanceActionObservation } from "@/lib/stub/observations";

const assembly = { assemblerId: "deterministic-event-assembler", assemblerVersion: "1.0.0" } as const;

export const stubEvents: OperationalEvent[] = [
  {
    id: eventIds.faultReported,
    workspaceId,
    eventType: "fault-reported",
    occurredAt: "2026-08-31T09:10:00.000Z",
    recordedAt: "2026-08-31T09:14:30.000Z",
    entityIds: [entityIds.assetPrimary],
    observationIds: [observationIds.assetId, observationIds.symptom, observationIds.severity],
    attributes: { symptom: "grinding-noise", severitySuggestion: "critical" },
    assembly,
    reEvaluationStatus: "current",
  },
  {
    id: eventIds.maintenanceRecorded,
    workspaceId,
    eventType: "maintenance-recorded",
    occurredAt: "2026-08-15T14:00:00.000Z",
    recordedAt: "2026-08-31T09:06:20.000Z",
    entityIds: [entityIds.assetPrimary],
    observationIds: [maintenanceActionObservation],
    attributes: { component: "brake-assembly", action: "replaced-pad" },
    assembly,
    reEvaluationStatus: "current",
  },
  {
    id: eventIds.inspectionCompleted,
    workspaceId,
    eventType: "inspection-completed",
    occurredAt: "2026-08-30T16:00:00.000Z",
    recordedAt: "2026-08-31T09:19:15.000Z",
    entityIds: [entityIds.assetPrimary],
    observationIds: [observationIds.condition],
    attributes: { component: "brake-assembly" },
    assembly,
    reEvaluationStatus: "current",
  },
];

export function eventsForEntity(entityId: string): OperationalEvent[] {
  return stubEvents
    .filter((event) => event.entityIds.includes(entityId))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
