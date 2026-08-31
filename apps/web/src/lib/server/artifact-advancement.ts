import {
  ArtifactAdvancementService,
  type ArtifactAdvancementPackResolver,
  type ArtifactAdvancementResult,
} from "@oiw/application";
import type { Workspace } from "@oiw/contracts";
import { RuleEngine } from "@oiw/rules";

import { ActivePackNotFoundError } from "@/lib/server/artifact-processing";
import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";

/**
 * Consumes `@oiw/application`'s public `ArtifactAdvancementService` (OIW-501)
 * against this workspace's active pack: exact/alias Entity resolution,
 * Event assembly and fact-catalogue rule evaluation, using the real
 * `@oiw/persistence` repositories and `@oiw/rules`' pure evaluator. This is
 * the "reviewed half" of the pipeline `processArtifactForWorkspace` starts —
 * callers run it once an Artifact's Observations have settled enough to
 * compose an Event (an Observation reaching `not-required`/`accepted`/
 * `corrected` is sufficient; the service itself decides whether that is
 * enough for any Event definition).
 */
export async function advanceArtifactForWorkspace(
  workspace: Workspace,
  artifactId: string,
): Promise<ArtifactAdvancementResult> {
  if (workspace.activePackId === null) throw new ActivePackNotFoundError(workspace.id);
  const entry = await findPackEntry(workspace.activePackId);
  if (entry === undefined) throw new ActivePackNotFoundError(workspace.id);

  const packResolver: ArtifactAdvancementPackResolver = { resolve: () => entry.pack };
  const service = new ArtifactAdvancementService(getRepositories(), packResolver, new RuleEngine());
  return service.advanceArtifact(workspace.id, artifactId);
}

/**
 * Best-effort wrapper for the Inbox/Review call sites: advancement is a
 * downstream consequence of processing/review, not the primary action those
 * callers perform, and it is idempotent (safe to call repeatedly as more of
 * an Artifact's Observations resolve). A failure here (e.g. no Event
 * definition yet matches the available Observations) must not surface as a
 * failure of the Process/Review action itself.
 */
export async function tryAdvanceArtifact(workspace: Workspace, artifactId: string): Promise<void> {
  try {
    await advanceArtifactForWorkspace(workspace, artifactId);
  } catch (error) {
    console.error(`Artifact advancement did not complete for "${artifactId}":`, error);
  }
}
