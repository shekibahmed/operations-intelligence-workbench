import { createHash, randomUUID } from "node:crypto";

import type { AuditEntryRecord, JsonValue } from "./ports.js";

export function deterministicUuid(workspaceId: string, key: string): string {
  const hex = createHash("sha256").update(`${workspaceId}:${key}`).digest("hex").slice(0, 32);
  const versioned = `${hex.slice(0, 12)}5${hex.slice(13)}`;
  const variant = (Number.parseInt(versioned[16]!, 16) & 0x3) | 0x8;
  const uuidHex = `${versioned.slice(0, 16)}${variant.toString(16)}${versioned.slice(17)}`;
  return `${uuidHex.slice(0, 8)}-${uuidHex.slice(8, 12)}-${uuidHex.slice(12, 16)}-${uuidHex.slice(16, 20)}-${uuidHex.slice(20)}`;
}

export function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;

  const entries = Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`);
  return `{${entries.join(",")}}`;
}

export function createAuditEntry(input: {
  workspaceId: string;
  occurredAt: string;
  action: string;
  cause: string;
  data: Record<string, JsonValue>;
  previousEntryHash: string | null;
}): AuditEntryRecord {
  const entryWithoutHash = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    occurredAt: input.occurredAt,
    action: input.action,
    actor: { type: "system" as const, id: "demo-lifecycle" },
    subject: { type: "workspace", id: input.workspaceId },
    cause: input.cause,
    data: input.data,
    previousEntryHash: input.previousEntryHash,
  };

  return {
    ...entryWithoutHash,
    entryHash: createHash("sha256")
      .update(stableJson(entryWithoutHash as unknown as JsonValue))
      .digest("hex"),
  };
}

export function latestAuditHash(entries: AuditEntryRecord[]): string | null {
  return entries.at(-1)?.entryHash ?? null;
}
