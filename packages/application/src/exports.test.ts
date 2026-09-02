import { describe, expect, it } from "vitest";
import type { ActionItem, Approval, AuditEntry, Case, Decision, Signal } from "@oiw/contracts";

import {
  escapeCsvCell,
  ExportWorkspaceScopeError,
  neutralizeSpreadsheetCell,
  SYNTHETIC_DATA_NOTICE,
  WorkspaceExportService,
  type ExportRepositories,
} from "./exports.js";

const workspaceId = "10000000-0000-4000-8000-000000000001";
const caseId = "20000000-0000-4000-8000-000000000001";
const signalId = "30000000-0000-4000-8000-000000000001";
const actionId = "40000000-0000-4000-8000-000000000001";
const decisionId = "50000000-0000-4000-8000-000000000001";
const approvalId = "60000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-02T00:00:00.000Z";

const caseRecord: Case = {
  id: caseId,
  workspaceId,
  caseType: "exception-case",
  title: '=SUM(1,1)\n"Quoted case"',
  status: "open",
  priority: "urgent",
  severity: "critical",
  owner: "+spreadsheet-command",
  dueAt: timestamp,
  relatedEntityIds: [],
  relatedEventIds: [],
  relatedSignalIds: [signalId],
  closureRequirementIds: ["review-complete"],
  reEvaluationStatus: "current",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const signal: Signal = {
  id: signalId,
  workspaceId,
  signalType: "attention-required",
  severity: "critical",
  eventIds: ["70000000-0000-4000-8000-000000000001"],
  evidenceSegmentIds: ["80000000-0000-4000-8000-000000000001"],
  rule: { id: "attention-rule", version: "1.0.0" },
  rationale: "Synthetic rationale",
  createdAt: timestamp,
};

const actionItem: ActionItem = {
  id: actionId,
  workspaceId,
  caseId,
  actionType: "review",
  title: "Review evidence",
  assignee: "Synthetic operator",
  status: "open",
  dueAt: timestamp,
  completionEvidenceSegmentIds: [],
  completedAt: null,
  createdAt: timestamp,
};

const decision: Decision = {
  id: decisionId,
  workspaceId,
  caseId,
  decisionType: "controlled-action",
  proposal: "Review before proceeding",
  rationale: "High-risk decisions require approval",
  evidenceSegmentIds: ["80000000-0000-4000-8000-000000000001"],
  riskLevel: "critical",
  approvalPolicyId: "human-required",
  status: "approved",
  createdAt: timestamp,
  decidedAt: timestamp,
};

const approval: Approval = {
  id: approvalId,
  workspaceId,
  decisionId,
  approver: "Synthetic reviewer",
  outcome: "approved",
  comment: "Evidence checked",
  approvedAt: timestamp,
};

const auditEntry: AuditEntry = {
  id: "90000000-0000-4000-8000-000000000001",
  workspaceId,
  occurredAt: timestamp,
  action: "export",
  actor: { type: "human", id: "synthetic-session" },
  subject: { type: "workspace", id: workspaceId },
  cause: "@spreadsheet-command",
  data: { z: "last", a: "first" },
  previousEntryHash: null,
  entryHash: "a".repeat(64),
};

function repositories(overrides: Partial<ExportRepositories> = {}): ExportRepositories {
  return {
    cases: { list: async () => [caseRecord] },
    signals: { list: async () => [signal] },
    actionItems: { list: async () => [actionItem] },
    decisions: { list: async () => [decision] },
    approvals: { list: async () => [approval] },
    auditEntries: { list: async () => [auditEntry] },
    ...overrides,
  };
}

function content(chunks: Iterable<string>): string {
  return [...chunks].join("");
}

describe("workspace exports", () => {
  it("exports deterministic case JSON with related operational summaries and a synthetic-data notice", async () => {
    const service = new WorkspaceExportService(repositories());

    const first = content((await service.exportCases(workspaceId, "json")).chunks);
    const second = content((await service.exportCases(workspaceId, "json")).chunks);
    const parsed = JSON.parse(first) as {
      syntheticDataNotice: string;
      records: Array<{ signals: unknown[]; actionItems: unknown[]; decisions: unknown[]; approvals: unknown[] }>;
    };

    expect(second).toBe(first);
    expect(parsed.syntheticDataNotice).toBe(SYNTHETIC_DATA_NOTICE);
    expect(parsed.records[0]).toMatchObject({
      signals: [{ id: signalId }],
      actionItems: [{ id: actionId }],
      decisions: [{ id: decisionId }],
      approvals: [{ id: approvalId }],
    });
  });

  it("uses RFC 4180 quoting and neutralises formula-like CSV cells", async () => {
    const csv = content((await new WorkspaceExportService(repositories()).exportCases(workspaceId, "csv")).chunks);

    expect(csv).toContain('"syntheticDataNotice","id","workspaceId"');
    expect(csv).toContain(`"${SYNTHETIC_DATA_NOTICE}"`);
    expect(csv).toContain('"\'=SUM(1,1)\n""Quoted case"""');
    expect(csv).toContain('"\'+spreadsheet-command"');
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(neutralizeSpreadsheetCell("  -2+3")).toBe("'  -2+3");
    expect(neutralizeSpreadsheetCell("safe text")).toBe("safe text");
    expect(escapeCsvCell('comma, quote " and\nnewline')).toBe('"comma, quote "" and\nnewline"');
  });

  it("exports the chronological append-only audit chain with both hash fields", async () => {
    const service = new WorkspaceExportService(repositories());
    const json = JSON.parse(content((await service.exportAudit(workspaceId, "json")).chunks)) as {
      syntheticDataNotice: string;
      records: AuditEntry[];
    };
    const csv = content((await service.exportAudit(workspaceId, "csv")).chunks);

    expect(json.syntheticDataNotice).toBe(SYNTHETIC_DATA_NOTICE);
    expect(json.records[0]).toMatchObject({
      previousEntryHash: null,
      entryHash: "a".repeat(64),
      data: { a: "first", z: "last" },
    });
    expect(csv).toContain('"previousEntryHash","entryHash"');
    expect(csv).toContain('"\'@spreadsheet-command"');
  });

  it("fails closed if a repository returns a record from another workspace", async () => {
    const service = new WorkspaceExportService(
      repositories({
        cases: { list: async () => [{ ...caseRecord, workspaceId: "10000000-0000-4000-8000-000000000002" }] },
      }),
    );

    await expect(service.exportCases(workspaceId, "json")).rejects.toBeInstanceOf(ExportWorkspaceScopeError);
  });
});
