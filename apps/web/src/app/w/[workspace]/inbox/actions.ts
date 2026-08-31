"use server";

import type { Artifact } from "@oiw/contracts";

import { processArtifactForWorkspace } from "@/lib/server/artifact-processing";
import { toActionErrorMessage } from "@/lib/server/action-error";
import { requireWorkspace } from "@/lib/server/workspace";

export type ProcessArtifactActionResult =
  | { ok: true; status: Artifact["processingStatus"]; observationCount: number }
  | { ok: false; message: string };

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
    const result = await processArtifactForWorkspace(workspace, artifactId);
    return {
      ok: true,
      status: result.artifact.processingStatus,
      observationCount: result.observations.length,
    };
  } catch (error) {
    return { ok: false, message: toActionErrorMessage(error, "Processing failed unexpectedly.") };
  }
}
