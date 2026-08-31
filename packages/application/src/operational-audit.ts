import { createHash, randomUUID } from "node:crypto";

import type { AuditEntry, JsonValue } from "@oiw/contracts";

import { stableJson } from "./records.js";

export interface OperationalAuditRepository {
  insert(workspaceId: string, value: AuditEntry): Promise<AuditEntry>;
  list(workspaceId: string): Promise<AuditEntry[]>;
}

function nextTimestamp(requested: string, entries: readonly AuditEntry[]): string {
  const latest = entries.at(-1)?.occurredAt;
  if (latest === undefined || Date.parse(requested) > Date.parse(latest)) return requested;
  return new Date(Date.parse(latest) + 1).toISOString();
}

function entryHash(value: Omit<AuditEntry, "entryHash">): string {
  return createHash("sha256").update(stableJson(value as unknown as JsonValue)).digest("hex");
}

export async function prepareOperationalAudit(
  repository: OperationalAuditRepository,
  input: {
    workspaceId: string;
    occurredAt: string;
    action: string;
    actorId: string;
    subject: AuditEntry["subject"];
    cause: string;
    data: Record<string, JsonValue>;
  },
): Promise<AuditEntry> {
  const entries = await repository.list(input.workspaceId);
  const withoutHash: Omit<AuditEntry, "entryHash"> = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    occurredAt: nextTimestamp(input.occurredAt, entries),
    action: input.action,
    actor: { type: "system", id: input.actorId },
    subject: input.subject,
    cause: input.cause,
    data: input.data,
    previousEntryHash: entries.at(-1)?.entryHash ?? null,
  };
  return { ...withoutHash, entryHash: entryHash(withoutHash) };
}

export async function appendOperationalAudit(
  repository: OperationalAuditRepository,
  input: Parameters<typeof prepareOperationalAudit>[1],
): Promise<AuditEntry> {
  return repository.insert(input.workspaceId, await prepareOperationalAudit(repository, input));
}

export async function appendOperationalAuditOnce(
  repository: OperationalAuditRepository,
  input: Parameters<typeof prepareOperationalAudit>[1] & { idempotencyKey: string },
): Promise<AuditEntry | null> {
  const existing = (await repository.list(input.workspaceId)).find(
    (entry) =>
      entry.action === input.action && entry.data["idempotencyKey"] === input.idempotencyKey,
  );
  if (existing !== undefined) return null;
  return appendOperationalAudit(repository, {
    ...input,
    data: { ...input.data, idempotencyKey: input.idempotencyKey },
  });
}

export function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
