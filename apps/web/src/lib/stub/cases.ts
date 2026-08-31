import type { ActionItem, Case } from "@oiw/contracts";

import {
  actionItemIds,
  caseIds,
  entityIds,
  eventIds,
  segmentIds,
  signalIds,
  workspaceId,
} from "@/lib/stub/ids";

export const stubCases: Case[] = [
  {
    id: caseIds.open,
    workspaceId,
    caseType: "reliability",
    title: "Repeat brake-assembly fault — AR-1042",
    status: "in-progress",
    priority: "urgent",
    severity: "critical",
    owner: "J. Alvarez",
    dueAt: "2026-09-02T17:00:00.000Z",
    relatedEntityIds: [entityIds.assetPrimary, entityIds.location],
    relatedEventIds: [eventIds.faultReported, eventIds.maintenanceRecorded],
    relatedSignalIds: [signalIds.repeatFault],
    closureRequirementIds: ["inspection-completed", "decision-approved", "observation-reviewed"],
    reEvaluationStatus: "current",
    createdAt: "2026-08-31T09:14:45.000Z",
    updatedAt: "2026-08-31T09:20:00.000Z",
  },
  {
    id: caseIds.openSecondary,
    workspaceId,
    caseType: "reliability",
    title: "Scheduled inspection follow-up — AR-2071",
    status: "open",
    priority: "normal",
    severity: "low",
    owner: "M. Okafor",
    dueAt: "2026-09-10T17:00:00.000Z",
    relatedEntityIds: [entityIds.assetTertiary],
    relatedEventIds: [],
    relatedSignalIds: [],
    closureRequirementIds: ["inspection-completed"],
    reEvaluationStatus: "current",
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: caseIds.closed,
    workspaceId,
    caseType: "reliability",
    title: "Sensor calibration drift — AR-1042",
    status: "closed",
    priority: "low",
    severity: "info",
    owner: "M. Okafor",
    dueAt: null,
    relatedEntityIds: [entityIds.assetPrimary],
    relatedEventIds: [],
    relatedSignalIds: [],
    closureRequirementIds: ["observation-reviewed"],
    reEvaluationStatus: "completed",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-11T08:00:00.000Z",
  },
];

export const stubActionItems: ActionItem[] = [
  {
    id: actionItemIds.inspect,
    workspaceId,
    caseId: caseIds.open,
    actionType: "inspect",
    title: "Physically inspect brake assembly on AR-1042",
    assignee: "R. Petrova",
    status: "in-progress",
    dueAt: "2026-09-01T17:00:00.000Z",
    completionEvidenceSegmentIds: [],
    completedAt: null,
    createdAt: "2026-08-31T09:15:00.000Z",
  },
  {
    id: actionItemIds.replace,
    workspaceId,
    caseId: caseIds.open,
    actionType: "replace",
    title: "Replace brake assembly component if wear confirmed",
    assignee: "R. Petrova",
    status: "open",
    dueAt: "2026-09-02T17:00:00.000Z",
    completionEvidenceSegmentIds: [],
    completedAt: null,
    createdAt: "2026-08-31T09:15:00.000Z",
  },
  {
    id: actionItemIds.confirm,
    workspaceId,
    caseId: caseIds.open,
    actionType: "confirm",
    title: "Confirm resolution and clear the hold-from-service decision",
    assignee: "J. Alvarez",
    status: "completed",
    dueAt: "2026-08-31T18:00:00.000Z",
    completionEvidenceSegmentIds: [segmentIds.inspectionPage],
    completedAt: "2026-08-31T09:22:00.000Z",
    createdAt: "2026-08-31T09:15:00.000Z",
  },
];

export function findCaseById(id: string): Case | undefined {
  return stubCases.find((entry) => entry.id === id);
}

export function actionItemsForCase(caseId: string): ActionItem[] {
  return stubActionItems.filter((item) => item.caseId === caseId);
}

export function casesForEntity(entityId: string, status: "open" | "closed"): Case[] {
  return stubCases.filter(
    (entry) => entry.relatedEntityIds.includes(entityId) && (status === "closed" ? entry.status === "closed" : entry.status !== "closed"),
  );
}
