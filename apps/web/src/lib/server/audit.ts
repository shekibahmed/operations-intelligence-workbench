import { createHash, randomUUID } from "node:crypto";

import type { AuditEntry, JsonValue } from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";

/**
 * Canonical (sorted-key) JSON, mirroring the hashing scheme
 * `@oiw/application`'s internal audit helper uses (not part of that
 * package's public API) so entries this route appends extend the same
 * tamper-evident hash chain as processing/seed/reset audit entries.
 */
function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`);
  return `{${entries.join(",")}}`;
}

/** Builds (but does not persist) the next hash-linked AuditEntry for a workspace, per PRD §9.15. */
export async function buildAuditEntry(
  repositories: Pick<PersistenceRepositories, "auditEntries">,
  input: {
    workspaceId: string;
    occurredAt: string;
    action: string;
    actor: AuditEntry["actor"];
    subject: AuditEntry["subject"];
    cause: string;
    data: Record<string, JsonValue>;
  },
): Promise<AuditEntry> {
  const entries = await repositories.auditEntries.list(input.workspaceId);
  const latest = entries.at(-1) ?? null;
  const occurredAt =
    latest !== null && Date.parse(input.occurredAt) <= Date.parse(latest.occurredAt)
      ? new Date(Date.parse(latest.occurredAt) + 1).toISOString()
      : input.occurredAt;

  const withoutHash: Omit<AuditEntry, "entryHash"> = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    occurredAt,
    action: input.action,
    actor: input.actor,
    subject: input.subject,
    cause: input.cause,
    data: input.data,
    previousEntryHash: latest?.entryHash ?? null,
  };

  return {
    ...withoutHash,
    entryHash: createHash("sha256").update(stableJson(withoutHash as unknown as JsonValue)).digest("hex"),
  };
}
