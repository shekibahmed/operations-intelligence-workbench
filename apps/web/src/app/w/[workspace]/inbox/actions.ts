"use server";

import type { Artifact } from "@oiw/contracts";

import { fixtureArtifactId } from "@/lib/fixture-artifact";
import { tryAdvanceArtifact } from "@/lib/server/artifact-advancement";
import { processArtifactForWorkspace } from "@/lib/server/artifact-processing";
import { toActionFailure, type ActionFailure } from "@/lib/server/action-error";
import { getRepositories } from "@/lib/server/db";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { requireWorkspace } from "@/lib/server/workspace";

export type ProcessArtifactActionResult =
  | { ok: true; status: Artifact["processingStatus"]; observationCount: number }
  | ActionFailure;

/**
 * Inbox "Process" row action (UX_SPEC §5.5, NFR §16.1): synchronously runs
 * `processArtifact` (OIW-301) for the session-validated workspace and
 * reports failure rather than throwing, so the client can render a real
 * failed-state-with-retry instead of a generic server-action error.
 */
export async function processArtifactAction(
  slug: string,
  artifactId: string,
): Promise<ProcessArtifactActionResult> {
  try {
    const workspace = await requireWorkspace(slug);
    await enforceGuestRateLimit("artifact-process", workspace);
    const result = await processArtifactForWorkspace(workspace, artifactId);
    if (result.artifact.processingStatus === "processed" || result.artifact.processingStatus === "needs-review") {
      await tryAdvanceArtifact(workspace, artifactId);
    }
    return {
      ok: true,
      status: result.artifact.processingStatus,
      observationCount: result.observations.length,
    };
  } catch (error) {
    return toActionFailure(error, "Processing failed unexpectedly.");
  }
}

/**
 * Guided tour convenience action (UX_SPEC §4, one tour per pack): each
 * pack's tour pins one artifact for the visitor to Process by hand, then —
 * real, not fabricated — processes a small set of other real fixture
 * artifacts from that pack's own storyline (by their stable fixture id,
 * `lib/fixture-artifact.ts`, named per-step in `lib/tour/steps.ts`) through
 * the exact same `processArtifactForWorkspace`/`tryAdvanceArtifact` path a
 * manual click would use, so the pattern the rest of the tour walks through
 * is real, real-processed data rather than something only a many-row manual
 * hunt-and-click could produce. Idempotent: already-processed fixtures are
 * skipped.
 */
export async function processFixtureArtifacts(
  slug: string,
  fixtureIds: readonly string[],
): Promise<{ ok: true } | ActionFailure> {
  try {
    const workspace = await requireWorkspace(slug);
    await enforceGuestRateLimit("artifact-process", workspace, Math.max(1, fixtureIds.length));
    const repositories = getRepositories();
    const artifacts = await repositories.artifacts.list(workspace.id);
    const targets = artifacts.filter((artifact) => {
      const fixtureId = fixtureArtifactId(artifact);
      return fixtureId !== null && fixtureIds.includes(fixtureId) && artifact.processingStatus === "received";
    });
    for (const artifact of targets) {
      const result = await processArtifactForWorkspace(workspace, artifact.id);
      if (result.artifact.processingStatus === "processed" || result.artifact.processingStatus === "needs-review") {
        await tryAdvanceArtifact(workspace, artifact.id);
      }
    }
    return { ok: true };
  } catch (error) {
    return toActionFailure(error, "Processing failed unexpectedly.");
  }
}
