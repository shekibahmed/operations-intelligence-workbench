import { cache } from "react";
import type { Workspace } from "@oiw/contracts";

import type { PackLabels } from "@/lib/pack-labels";
import { getWorkspacePackLabels } from "@/lib/server/pack-registry";
import { requireWorkspace } from "@/lib/server/workspace";

export interface WorkspaceContext {
  workspace: Workspace;
  labels: PackLabels;
}

/** Session-validated workspace + its pack labels, deduped per request via `cache()`. */
export const getWorkspaceContext = cache(async (slug: string): Promise<WorkspaceContext> => {
  const workspace = await requireWorkspace(slug);
  const labels = await getWorkspacePackLabels(workspace);
  return { workspace, labels };
});
