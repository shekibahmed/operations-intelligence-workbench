import type { AuditEntry } from "@oiw/contracts";

import {
  approvalIds,
  artifactIds,
  auditEntryHashes,
  auditEntryIds,
  caseIds,
  decisionIds,
  observationIds,
  signalIds,
  workspaceId,
} from "@/lib/stub/ids";

function hashAt(index: number): string {
  const hash = auditEntryHashes[index];
  if (hash === undefined) throw new Error(`Missing audit hash at index ${index}`);
  return hash;
}

function idAt(index: number): string {
  const id = auditEntryIds[index];
  if (id === undefined) throw new Error(`Missing audit id at index ${index}`);
  return id;
}

export const stubAuditEntries: AuditEntry[] = [
  {
    id: idAt(0),
    workspaceId,
    occurredAt: "2026-08-31T09:12:00.000Z",
    action: "artifact-ingested",
    actor: { type: "system", id: "ingestion-pipeline" },
    subject: { type: "artifact", id: artifactIds.informal },
    cause: "Artifact received from Field report channel",
    data: { artifactType: "field-message" },
    previousEntryHash: null,
    entryHash: hashAt(0),
  },
  {
    id: idAt(1),
    workspaceId,
    occurredAt: "2026-08-31T09:13:05.000Z",
    action: "extraction-completed",
    actor: { type: "provider", id: "fixture-intelligence-provider@1.0.0" },
    subject: { type: "artifact", id: artifactIds.informal },
    cause: "Process action triggered from Artifact Inbox",
    data: { observationCount: 3 },
    previousEntryHash: hashAt(0),
    entryHash: hashAt(1),
  },
  {
    id: idAt(2),
    workspaceId,
    occurredAt: "2026-08-31T09:14:20.000Z",
    action: "observation-accepted",
    actor: { type: "human", id: "r.petrova" },
    subject: { type: "observation", id: observationIds.assetId },
    cause: "Reviewer accepted the extracted asset identifier in the Review Queue",
    data: { schemaKey: "asset-id" },
    previousEntryHash: hashAt(1),
    entryHash: hashAt(2),
  },
  {
    id: idAt(3),
    workspaceId,
    occurredAt: "2026-08-31T09:14:45.000Z",
    action: "rule-executed",
    actor: { type: "system", id: "repeat-fault-safety-hold@1.0.0" },
    subject: { type: "signal", id: signalIds.repeatFault },
    cause: "Fault-reported event evaluated against the repeat-fault-safety-hold rule",
    data: { outcome: "signal-created" },
    previousEntryHash: hashAt(2),
    entryHash: hashAt(3),
  },
  {
    id: idAt(4),
    workspaceId,
    occurredAt: "2026-08-31T09:14:50.000Z",
    action: "case-created",
    actor: { type: "system", id: "repeat-fault-safety-hold@1.0.0" },
    subject: { type: "case", id: caseIds.open },
    cause: "Repeat-fault signal exceeded case-creation threshold",
    data: { caseType: "reliability" },
    previousEntryHash: hashAt(3),
    entryHash: hashAt(4),
  },
  {
    id: idAt(5),
    workspaceId,
    occurredAt: "2026-08-31T09:14:55.000Z",
    action: "decision-proposed",
    actor: { type: "system", id: "repeat-fault-safety-hold@1.0.0" },
    subject: { type: "decision", id: decisionIds.holdFromService },
    cause: "Rule action propose-decision fired for the repeat-fault signal",
    data: { riskLevel: "high" },
    previousEntryHash: hashAt(4),
    entryHash: hashAt(5),
  },
  {
    id: idAt(6),
    workspaceId,
    occurredAt: "2026-06-06T11:00:00.000Z",
    action: "decision-approved",
    actor: { type: "human", id: "j.alvarez" },
    subject: { type: "approval", id: approvalIds.holdFromService },
    cause: "Approver reviewed the sensor recalibration decision in Decision Centre",
    data: { decisionId: decisionIds.approvedExample },
    previousEntryHash: hashAt(5),
    entryHash: hashAt(6),
  },
  {
    id: idAt(7),
    workspaceId,
    occurredAt: "2026-06-11T08:00:00.000Z",
    action: "case-closed",
    actor: { type: "human", id: "m.okafor" },
    subject: { type: "case", id: caseIds.closed },
    cause: "All closure requirements satisfied",
    data: { closureRequirementIds: ["observation-reviewed"] },
    previousEntryHash: hashAt(6),
    entryHash: hashAt(7),
  },
];

export function auditEntriesForSubject(subjectId: string): AuditEntry[] {
  return stubAuditEntries.filter((entry) => entry.subject.id === subjectId);
}
