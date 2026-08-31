import { cache } from "react";
import { redirect } from "next/navigation";
import type { Workspace } from "@oiw/contracts";

import { getRepositories } from "@/lib/server/db";
import { readSessionPayload } from "@/lib/server/session";

/**
 * ADR-007: every `/w/[workspace]/*` request must resolve its session cookie
 * to the exact workspace the URL names, never trust the URL slug alone. A
 * missing/invalid cookie, a slug that does not match the session's bound
 * workspace, or an expired workspace all redirect to `/demo` rather than
 * leaking whether the slug exists. `cache()` de-dupes the lookup across the
 * layout guard and any page that needs the resolved record in one request.
 */
export const requireWorkspace = cache(async (slug: string): Promise<Workspace> => {
  const payload = await readSessionPayload();
  if (payload === null) {
    redirect("/demo");
  }

  const repositories = getRepositories();
  const workspace = await repositories.workspaces.findBySlug(slug);
  if (workspace === null || workspace.id !== payload.workspaceId) {
    redirect("/demo");
  }
  if (workspace.expiresAt !== null && new Date(workspace.expiresAt).getTime() <= Date.now()) {
    redirect("/demo");
  }

  return workspace;
});
