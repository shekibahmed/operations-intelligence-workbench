import type { Signal } from "@oiw/contracts";

import { entityIds, eventIds, ruleId, segmentIds, signalIds, workspaceId } from "@/lib/stub/ids";

export const stubSignals: Signal[] = [
  {
    id: signalIds.repeatFault,
    workspaceId,
    signalType: "repeat-fault",
    severity: "critical",
    eventIds: [eventIds.faultReported, eventIds.maintenanceRecorded],
    evidenceSegmentIds: [segmentIds.informalSymptom, segmentIds.maintenanceRow],
    rule: ruleId,
    rationale:
      "A related fault on the same component was recorded within the last 30 days and the current report contains a safety indicator.",
    createdAt: "2026-08-31T09:14:45.000Z",
  },
];

export function signalsForEntity(entityId: string): Signal[] {
  return stubSignals.filter((signal) =>
    signal.eventIds.some((eventId) => eventId === eventIds.faultReported && entityId === entityIds.assetPrimary),
  );
}
