"use server";

import type { ActionItem, AuditEntry } from "@oiw/contracts";

import { toActionFailure, type ActionFailure, UserFacingActionError } from "@/lib/server/action-error";
import { buildAuditEntry } from "@/lib/server/audit";
import { getRepositories } from "@/lib/server/db";
import { readSessionPayload } from "@/lib/server/session";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { requireWorkspace } from "@/lib/server/workspace";

export type ActionItemToggleResult = { ok: true; actionItem: ActionItem } | ActionFailure;
export type CaseNoteResult = { ok: true; note: AuditEntry } | ActionFailure;

async function currentActorId(): Promise<string> {
  const payload = await readSessionPayload();
  if (payload === null) {
    throw new UserFacingActionError("Your session has expired — reload the page and start a new guided demo.");
  }
  return payload.sessionId;
}

/** Case Detail's action-item checklist (UX_SPEC §5.8 Actions: "Add/complete action item"). */
export async function toggleActionItemAction(
  slug: string,
  actionItemId: string,
  completed: boolean,
): Promise<ActionItemToggleResult> {
  try {
    const workspace = await requireWorkspace(slug);
    await enforceGuestRateLimit("case-action", workspace);
    const actorId = await currentActorId();
    const repositories = getRepositories();

    const current = await repositories.actionItems.findById(workspace.id, actionItemId);
    if (current === null) return { ok: false, message: "This action item could not be found." };

    const occurredAt = new Date().toISOString();
    const updated: ActionItem = {
      ...current,
      status: completed ? "completed" : "open",
      completedAt: completed ? occurredAt : null,
    };
    const result = await repositories.actionItems.update(workspace.id, actionItemId, updated);
    if (result === null) return { ok: false, message: "This action item could not be found." };

    const auditEntry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action: completed ? "action-item-completed" : "action-item-reopened",
      actor: { type: "human", id: actorId },
      subject: { type: "action-item", id: actionItemId },
      cause: completed ? `Marked "${current.title}" complete` : `Reopened "${current.title}"`,
      data: { caseId: current.caseId, previousStatus: current.status, status: result.status },
    });
    await repositories.auditEntries.insert(workspace.id, auditEntry);

    return { ok: true, actionItem: result };
  } catch (error) {
    return toActionFailure(error, "Could not update this action item.");
  }
}

/** Case Detail's "add case note" action (UX_SPEC §5.8 Actions), mirroring the Review Queue's reviewer note. */
export async function addCaseNoteAction(slug: string, caseId: string, note: string): Promise<CaseNoteResult> {
  const trimmed = note.trim();
  if (trimmed.length === 0) return { ok: false, message: "Enter a note before saving." };
  try {
    const workspace = await requireWorkspace(slug);
    await enforceGuestRateLimit("case-action", workspace);
    const actorId = await currentActorId();
    const repositories = getRepositories();

    const current = await repositories.cases.findById(workspace.id, caseId);
    if (current === null) return { ok: false, message: "This case could not be found." };

    const occurredAt = new Date().toISOString();
    const auditEntry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action: "case-note-added",
      actor: { type: "human", id: actorId },
      subject: { type: "case", id: caseId },
      cause: trimmed,
      data: { note: trimmed },
    });
    const inserted = await repositories.auditEntries.insert(workspace.id, auditEntry);
    return { ok: true, note: inserted };
  } catch (error) {
    return toActionFailure(error, "Could not save this note.");
  }
}

/** Read-only: every human note recorded against this Case, oldest first. */
export async function getCaseNotes(slug: string, caseId: string): Promise<AuditEntry[]> {
  const workspace = await requireWorkspace(slug);
  const repositories = getRepositories();
  const entries = await repositories.auditEntries.list(workspace.id);
  return entries
    .filter((entry) => entry.action === "case-note-added" && entry.subject.type === "case" && entry.subject.id === caseId)
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}
