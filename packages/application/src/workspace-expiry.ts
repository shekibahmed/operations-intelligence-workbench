import type { WorkspaceRepositoryPort } from "./ports.js";
import { WorkspaceService } from "./workspace-service.js";

export interface WorkspaceExpirySweepResult {
  cutoff: string;
  deletedWorkspaceIds: string[];
}

/** Explicit application entrypoint for a scheduler/CLI; only expired public-demo workspaces are eligible. */
export class WorkspaceExpirySweep {
  constructor(
    private readonly workspaces: WorkspaceRepositoryPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async run(cutoff = this.clock().toISOString()): Promise<WorkspaceExpirySweepResult> {
    const timestamp = Date.parse(cutoff);
    if (!Number.isFinite(timestamp)) {
      throw new Error("Workspace expiry cutoff must be an ISO 8601 timestamp");
    }
    const canonicalCutoff = new Date(timestamp).toISOString();
    const deletedWorkspaceIds = await new WorkspaceService(this.workspaces, { clock: this.clock })
      .cleanupExpiredGuestWorkspaces(canonicalCutoff);
    return { cutoff: canonicalCutoff, deletedWorkspaceIds };
  }
}
