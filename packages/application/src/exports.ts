import type { ActionItem, Approval, AuditEntry, Case, Decision, JsonValue, Signal } from "@oiw/contracts";

import { stableJson } from "./records.js";

export const SYNTHETIC_DATA_NOTICE =
  "Synthetic demo data only. This export contains no real organisation or customer data.";

export type ExportFormat = "csv" | "json";
export type ExportDataset = "audit" | "cases";

interface ListRepository<T> {
  list(workspaceId: string): Promise<T[]>;
}

export interface ExportRepositories {
  cases: ListRepository<Case>;
  signals: ListRepository<Signal>;
  actionItems: ListRepository<ActionItem>;
  decisions: ListRepository<Decision>;
  approvals: ListRepository<Approval>;
  auditEntries: ListRepository<AuditEntry>;
}

export interface ExportDocument {
  dataset: ExportDataset;
  format: ExportFormat;
  contentType: string;
  extension: ExportFormat;
  chunks: Iterable<string>;
}

export class ExportWorkspaceScopeError extends Error {
  constructor() {
    super("Export repository returned data outside the requested workspace");
    this.name = "ExportWorkspaceScopeError";
  }
}

function assertWorkspaceScope(workspaceId: string, records: ReadonlyArray<{ workspaceId: string }>): void {
  if (records.some((record) => record.workspaceId !== workspaceId)) {
    throw new ExportWorkspaceScopeError();
  }
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function jsonChunks(dataset: ExportDataset, records: readonly JsonValue[]): Iterable<string> {
  return {
    *[Symbol.iterator]() {
      yield `{"syntheticDataNotice":${JSON.stringify(SYNTHETIC_DATA_NOTICE)},"dataset":${JSON.stringify(dataset)},"records":[`;
      for (let index = 0; index < records.length; index += 1) {
        if (index > 0) yield ",";
        yield stableJson(records[index]!);
      }
      yield "]}\n";
    },
  };
}

/**
 * Quoting does not stop spreadsheet applications from evaluating formulas.
 * Prefix potentially executable text with an apostrophe before RFC 4180
 * escaping, including formula markers hidden behind leading whitespace.
 */
export function neutralizeSpreadsheetCell(value: string): string {
  return /^(?:[\t\r\n ]*[=+\-@]|[\t\r])/u.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: JsonValue | undefined): string {
  let text: string;
  if (value === null || value === undefined) text = "";
  else if (typeof value === "object") text = stableJson(value);
  else text = String(value);
  const safe = neutralizeSpreadsheetCell(text);
  return `"${safe.replaceAll('"', '""')}"`;
}

function csvChunks(headers: readonly string[], rows: readonly (readonly JsonValue[])[]): Iterable<string> {
  return {
    *[Symbol.iterator]() {
      yield `${headers.map((header) => escapeCsvCell(header)).join(",")}\r\n`;
      for (const row of rows) yield `${row.map((cell) => escapeCsvCell(cell)).join(",")}\r\n`;
    },
  };
}

function document(
  dataset: ExportDataset,
  format: ExportFormat,
  records: readonly JsonValue[],
  headers: readonly string[],
  rows: readonly (readonly JsonValue[])[],
): ExportDocument {
  return {
    dataset,
    format,
    contentType: format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
    extension: format,
    chunks: format === "csv" ? csvChunks(headers, rows) : jsonChunks(dataset, records),
  };
}

const CASE_HEADERS = [
  "syntheticDataNotice",
  "id",
  "workspaceId",
  "caseType",
  "title",
  "status",
  "priority",
  "severity",
  "owner",
  "dueAt",
  "relatedEntityIds",
  "relatedEventIds",
  "relatedSignalIds",
  "closureRequirementIds",
  "reEvaluationStatus",
  "createdAt",
  "updatedAt",
  "signalCount",
  "signalsSummary",
  "actionItemCount",
  "actionItemsSummary",
  "decisionCount",
  "decisionsSummary",
  "approvalCount",
  "approvalsSummary",
] as const;

const AUDIT_HEADERS = [
  "syntheticDataNotice",
  "id",
  "workspaceId",
  "occurredAt",
  "action",
  "actorType",
  "actorId",
  "subjectType",
  "subjectId",
  "cause",
  "data",
  "previousEntryHash",
  "entryHash",
] as const;

export class WorkspaceExportService {
  constructor(private readonly repositories: ExportRepositories) {}

  async exportCases(workspaceId: string, format: ExportFormat): Promise<ExportDocument> {
    const [cases, signals, actionItems, decisions, approvals] = await Promise.all([
      this.repositories.cases.list(workspaceId),
      this.repositories.signals.list(workspaceId),
      this.repositories.actionItems.list(workspaceId),
      this.repositories.decisions.list(workspaceId),
      this.repositories.approvals.list(workspaceId),
    ]);
    for (const records of [cases, signals, actionItems, decisions, approvals]) {
      assertWorkspaceScope(workspaceId, records);
    }

    const records = [...cases].sort(byId).map((caseRecord) => {
      const caseSignalIds = new Set(caseRecord.relatedSignalIds);
      const relatedSignals = signals
        .filter((signal) => caseSignalIds.has(signal.id))
        .sort(byId)
        .map((signal) => ({
          id: signal.id,
          signalType: signal.signalType,
          severity: signal.severity,
          ruleId: signal.rule.id,
          ruleVersion: signal.rule.version,
        }));
      const relatedActions = actionItems
        .filter((action) => action.caseId === caseRecord.id)
        .sort(byId)
        .map((action) => ({
          id: action.id,
          actionType: action.actionType,
          title: action.title,
          assignee: action.assignee,
          status: action.status,
          dueAt: action.dueAt,
          completedAt: action.completedAt,
        }));
      const relatedDecisions = decisions
        .filter((decision) => decision.caseId === caseRecord.id)
        .sort(byId)
        .map((decision) => ({
          id: decision.id,
          decisionType: decision.decisionType,
          proposal: decision.proposal,
          riskLevel: decision.riskLevel,
          approvalPolicyId: decision.approvalPolicyId,
          status: decision.status,
          decidedAt: decision.decidedAt,
        }));
      const decisionIds = new Set(relatedDecisions.map((decision) => decision.id));
      const relatedApprovals = approvals
        .filter((approval) => decisionIds.has(approval.decisionId))
        .sort(byId)
        .map((approval) => ({
          id: approval.id,
          decisionId: approval.decisionId,
          approver: approval.approver,
          outcome: approval.outcome,
          comment: approval.comment,
          approvedAt: approval.approvedAt,
        }));

      return {
        id: caseRecord.id,
        workspaceId: caseRecord.workspaceId,
        caseType: caseRecord.caseType,
        title: caseRecord.title,
        status: caseRecord.status,
        priority: caseRecord.priority,
        severity: caseRecord.severity,
        owner: caseRecord.owner,
        dueAt: caseRecord.dueAt,
        relatedEntityIds: [...caseRecord.relatedEntityIds].sort(),
        relatedEventIds: [...caseRecord.relatedEventIds].sort(),
        relatedSignalIds: [...caseRecord.relatedSignalIds].sort(),
        closureRequirementIds: [...caseRecord.closureRequirementIds].sort(),
        reEvaluationStatus: caseRecord.reEvaluationStatus,
        createdAt: caseRecord.createdAt,
        updatedAt: caseRecord.updatedAt,
        signals: relatedSignals,
        actionItems: relatedActions,
        decisions: relatedDecisions,
        approvals: relatedApprovals,
      } satisfies JsonValue;
    });

    const rows = records.map((record) => [
      SYNTHETIC_DATA_NOTICE,
      record.id,
      record.workspaceId,
      record.caseType,
      record.title,
      record.status,
      record.priority,
      record.severity,
      record.owner,
      record.dueAt,
      record.relatedEntityIds,
      record.relatedEventIds,
      record.relatedSignalIds,
      record.closureRequirementIds,
      record.reEvaluationStatus,
      record.createdAt,
      record.updatedAt,
      record.signals.length,
      record.signals,
      record.actionItems.length,
      record.actionItems,
      record.decisions.length,
      record.decisions,
      record.approvals.length,
      record.approvals,
    ] satisfies JsonValue[]);
    return document("cases", format, records, CASE_HEADERS, rows);
  }

  async exportAudit(workspaceId: string, format: ExportFormat): Promise<ExportDocument> {
    const entries = await this.repositories.auditEntries.list(workspaceId);
    assertWorkspaceScope(workspaceId, entries);
    const records = [...entries]
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || byId(left, right))
      .map((entry) => ({
        id: entry.id,
        workspaceId: entry.workspaceId,
        occurredAt: entry.occurredAt,
        action: entry.action,
        actor: entry.actor,
        subject: entry.subject,
        cause: entry.cause,
        data: entry.data,
        previousEntryHash: entry.previousEntryHash,
        entryHash: entry.entryHash,
      }) satisfies JsonValue);
    const rows = records.map((record) => [
      SYNTHETIC_DATA_NOTICE,
      record.id,
      record.workspaceId,
      record.occurredAt,
      record.action,
      record.actor.type,
      record.actor.id,
      record.subject.type,
      record.subject.id,
      record.cause,
      record.data,
      record.previousEntryHash,
      record.entryHash,
    ] satisfies JsonValue[]);
    return document("audit", format, records, AUDIT_HEADERS, rows);
  }
}
