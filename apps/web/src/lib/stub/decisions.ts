import type { Approval, Decision } from "@oiw/contracts";

import {
  approvalIds,
  caseIds,
  decisionIds,
  segmentIds,
  workspaceId,
} from "@/lib/stub/ids";

export const stubDecisions: Decision[] = [
  {
    id: decisionIds.holdFromService,
    workspaceId,
    caseId: caseIds.open,
    decisionType: "hold-from-service",
    proposal: "Hold AR-1042 from service until the brake assembly is inspected and, if needed, replaced.",
    rationale:
      "A repeat fault was detected on the same component within 30 days, and the field report contains a safety indicator (grinding noise).",
    evidenceSegmentIds: [segmentIds.informalSymptom, segmentIds.maintenanceRow],
    riskLevel: "high",
    approvalPolicyId: "single-approver-high-risk",
    status: "awaiting-approval",
    createdAt: "2026-08-31T09:14:50.000Z",
    decidedAt: null,
  },
  {
    id: decisionIds.approvedExample,
    workspaceId,
    caseId: caseIds.closed,
    decisionType: "hold-from-service",
    proposal: "Recalibrate AR-1042 sensor before returning to service.",
    rationale: "Sensor drift observation exceeded the calibration tolerance threshold.",
    evidenceSegmentIds: [segmentIds.inspectionPage],
    riskLevel: "low",
    approvalPolicyId: "single-approver-standard",
    status: "approved",
    createdAt: "2026-06-05T09:00:00.000Z",
    decidedAt: "2026-06-06T11:00:00.000Z",
  },
];

export const stubApprovals: Approval[] = [
  {
    id: approvalIds.holdFromService,
    workspaceId,
    decisionId: decisionIds.approvedExample,
    approver: "J. Alvarez",
    outcome: "approved",
    comment: "Sensor drift confirmed against calibration log; approved for recalibration.",
    approvedAt: "2026-06-06T11:00:00.000Z",
  },
];

export function findDecisionById(id: string): Decision | undefined {
  return stubDecisions.find((decision) => decision.id === id);
}

export function decisionsForCase(caseId: string): Decision[] {
  return stubDecisions.filter((decision) => decision.caseId === caseId);
}

export function approvalsForDecision(decisionId: string): Approval[] {
  return stubApprovals.filter((approval) => approval.decisionId === decisionId);
}
