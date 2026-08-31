import type { ReactNode } from "react";

import { requireWorkspace } from "@/lib/server/workspace";

/**
 * Runs before every `/w/[workspace]/*` page (ADR-007): validates the guest
 * session cookie against the requested workspace slug and redirects to
 * `/demo` on any mismatch, so no route under this segment is reachable
 * without a session bound to that exact workspace.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  await requireWorkspace(workspace);
  return children;
}
