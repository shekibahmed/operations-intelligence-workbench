"use server";

import type { JsonValue, Observation, ObservationSchemaDefinition } from "@oiw/contracts";
import type { PersistenceRepositories } from "@oiw/persistence";
import { validateObservationValue } from "@oiw/scenario-sdk";

import { toActionErrorMessage, UserFacingActionError } from "@/lib/server/action-error";
import { buildAuditEntry } from "@/lib/server/audit";
import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";
import { readSessionPayload } from "@/lib/server/session";
import { requireWorkspace } from "@/lib/server/workspace";

export type ReviewActionResult =
  | { ok: true; observation: Observation }
  | { ok: false; message: string };

async function currentReviewerId(): Promise<string> {
  const payload = await readSessionPayload();
  if (payload === null) {
    throw new UserFacingActionError("Your session has expired — reload the page and start a new guided demo.");
  }
  return payload.sessionId;
}

const QUEUE_STATUSES: ReadonlySet<Observation["reviewStatus"]> = new Set(["pending", "conflicting"]);

/**
 * `processArtifact` (OIW-301) sets an Artifact to `needs-review` once, at
 * processing time; nothing downstream re-checks it. Once every Observation
 * this artifact produced has left the review queue, this flips the Artifact
 * back to `processed` so the Inbox doesn't show a permanently stuck
 * needs-review row after its last pending item is resolved.
 */
async function syncArtifactProcessingStatus(
  repositories: PersistenceRepositories,
  workspaceId: string,
  artifactId: string,
): Promise<void> {
  const artifact = await repositories.artifacts.findById(workspaceId, artifactId);
  if (artifact === null || artifact.processingStatus !== "needs-review") return;

  const observations = await repositories.observations.listByArtifact(workspaceId, artifactId);
  const stillQueued = observations.some((observation) => QUEUE_STATUSES.has(observation.reviewStatus));
  if (!stillQueued) {
    await repositories.artifacts.updateProcessingStatus(workspaceId, artifactId, "processed");
  }
}

/**
 * Shared apply/audit path for every review action: re-validates the ADR-007
 * session against `slug`, records the ADR-007 guest session ID as the human
 * reviewer, and writes through `ObservationRepository.correct` — which
 * already implements ADR-006 (revision snapshot + downstream re-evaluation
 * marking) and A3 in one transaction. No action here rewrites history in
 * place; each is a new reviewed state appended on top of the original.
 */
async function runReviewAction(
  slug: string,
  observationId: string,
  action: string,
  cause: string,
  mutate: (current: Observation, reviewerId: string, occurredAt: string) => Observation,
): Promise<ReviewActionResult> {
  try {
    const workspace = await requireWorkspace(slug);
    const reviewerId = await currentReviewerId();
    const repositories = getRepositories();

    const current = await repositories.observations.findById(workspace.id, observationId);
    if (current === null) return { ok: false, message: "This observation could not be found." };

    const occurredAt = new Date().toISOString();
    const updated = mutate(current, reviewerId, occurredAt);
    const auditEntry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action,
      actor: { type: "human", id: reviewerId },
      subject: { type: "observation", id: observationId },
      cause,
      data: {
        schemaKey: current.schemaKey,
        previousReviewStatus: current.reviewStatus,
        reviewStatus: updated.reviewStatus,
      },
    });

    const result = await repositories.observations.correct(workspace.id, observationId, updated, auditEntry);
    if (result === null) return { ok: false, message: "This observation could not be found." };
    await syncArtifactProcessingStatus(repositories, workspace.id, result.artifactId);
    return { ok: true, observation: result };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error, "Could not save this review action.") };
  }
}

/** Read-only: ADR-006's "original preserved and shown as history" — prior revisions snapshotted by `ObservationRepository.correct`. */
export async function getObservationRevisions(slug: string, observationId: string): Promise<Observation[]> {
  const workspace = await requireWorkspace(slug);
  const repositories = getRepositories();
  return repositories.observations.listRevisions(workspace.id, observationId);
}

export interface CandidateSelection {
  value: JsonValue;
  normalisedValue: JsonValue;
  confidence: number;
}

/** Accept commits the currently proposed value, or a selected alternative candidate, as reviewed truth. */
export async function acceptObservation(
  slug: string,
  observationId: string,
  selection?: CandidateSelection,
): Promise<ReviewActionResult> {
  return runReviewAction(
    slug,
    observationId,
    "observation-accepted",
    selection !== undefined ? "Reviewer accepted an alternative candidate" : "Reviewer accepted the proposed value",
    (current, reviewerId, occurredAt) => ({
      ...current,
      ...(selection !== undefined
        ? { value: selection.value, normalisedValue: selection.normalisedValue, confidence: selection.confidence }
        : {}),
      reviewStatus: "accepted",
      reviewedBy: reviewerId,
      reviewedAt: occurredAt,
    }),
  );
}

export async function rejectObservation(slug: string, observationId: string, reason?: string): Promise<ReviewActionResult> {
  return runReviewAction(
    slug,
    observationId,
    "observation-rejected",
    reason !== undefined && reason.trim().length > 0 ? reason.trim() : "Reviewer rejected the proposed observation",
    (current, reviewerId, occurredAt) => ({
      ...current,
      reviewStatus: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: occurredAt,
    }),
  );
}

export async function markInsufficientEvidence(
  slug: string,
  observationId: string,
  reason: string,
): Promise<ReviewActionResult> {
  if (reason.trim().length === 0) {
    return { ok: false, message: "A reason is required to mark this observation as insufficient evidence." };
  }
  return runReviewAction(
    slug,
    observationId,
    "observation-marked-insufficient-evidence",
    "Reviewer determined the source lacks sufficient evidence for this field",
    (current, reviewerId, occurredAt) => ({
      ...current,
      value: null,
      normalisedValue: null,
      evidenceStatus: "insufficient-evidence",
      insufficiencyReason: reason.trim(),
      reviewStatus: "corrected",
      reviewedBy: reviewerId,
      reviewedAt: occurredAt,
    }),
  );
}

function coerceValue(valueType: ObservationSchemaDefinition["valueType"], raw: string): JsonValue {
  switch (valueType) {
    case "string":
      return raw;
    case "number": {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) throw new Error("Expected a number.");
      return parsed;
    }
    case "boolean": {
      if (raw === "true") return true;
      if (raw === "false") return false;
      throw new Error('Expected "true" or "false".');
    }
    case "object":
      try {
        return JSON.parse(raw) as JsonValue;
      } catch {
        throw new Error("Expected valid JSON for this field.");
      }
  }
}

/**
 * Correct edits the extracted value (ADR-006: "corrections made before Event
 * assembly feed normally into assembly"). The corrected value is validated
 * against the pack's observation-schema catalogue (per AGENTS.md: structured
 * output — human or machine — is schema-validated before persistence) and
 * `derivation` moves to `human`, since the persisted value is now a human
 * assertion rather than a raw extraction; the original machine value remains
 * readable through `listRevisions`.
 */
export async function correctObservation(
  slug: string,
  observationId: string,
  rawValue: string,
): Promise<ReviewActionResult> {
  try {
    const workspace = await requireWorkspace(slug);
    const reviewerId = await currentReviewerId();
    if (workspace.activePackId === null) {
      return { ok: false, message: "This workspace has no active Scenario Pack." };
    }

    const repositories = getRepositories();
    const current = await repositories.observations.findById(workspace.id, observationId);
    if (current === null) return { ok: false, message: "This observation could not be found." };

    const packEntry = await findPackEntry(workspace.activePackId);
    const definition = packEntry?.pack.observationSchemas.get(current.schemaKey);
    if (definition === undefined) {
      return { ok: false, message: `Unknown observation schema "${current.schemaKey}".` };
    }

    let value: JsonValue;
    try {
      value = coerceValue(definition.valueType, rawValue);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Could not parse the corrected value." };
    }
    const validation = validateObservationValue(definition, value);
    if (!validation.ok) {
      return { ok: false, message: validation.issues.map((issue) => issue.message).join("; ") };
    }

    const occurredAt = new Date().toISOString();
    const updated: Observation = {
      ...current,
      value,
      normalisedValue: value,
      derivation: "human",
      evidenceStatus: "supported",
      insufficiencyReason: null,
      reviewStatus: "corrected",
      reviewedBy: reviewerId,
      reviewedAt: occurredAt,
    };
    const auditEntry = await buildAuditEntry(repositories, {
      workspaceId: workspace.id,
      occurredAt,
      action: "observation-corrected",
      actor: { type: "human", id: reviewerId },
      subject: { type: "observation", id: observationId },
      cause: "Reviewer corrected the extracted value",
      data: {
        schemaKey: current.schemaKey,
        previousValue: current.value,
        correctedValue: value,
        previousReviewStatus: current.reviewStatus,
        reviewStatus: "corrected",
      },
    });

    const result = await repositories.observations.correct(workspace.id, observationId, updated, auditEntry);
    if (result === null) return { ok: false, message: "This observation could not be found." };
    await syncArtifactProcessingStatus(repositories, workspace.id, result.artifactId);
    return { ok: true, observation: result };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error, "Could not save this correction.") };
  }
}
