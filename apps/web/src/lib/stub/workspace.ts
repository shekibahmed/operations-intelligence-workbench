import type { Workspace } from "@oiw/contracts";

import { workspaceId } from "@/lib/stub/ids";

export const stubWorkspace: Workspace = {
  id: workspaceId,
  name: "Asset Reliability — Demo",
  slug: "demo-asset-reliability",
  activePackId: "asset-reliability",
  mode: "fixture",
  createdAt: "2026-08-31T09:00:00.000Z",
  resetAt: null,
  expiresAt: "2026-08-31T21:00:00.000Z",
};

/**
 * P0 has no real workspace-creation backend (OIW-201 non-goal). Every
 * `/w/[workspace]/*` route renders this fixture regardless of the `workspace`
 * URL segment's value — see `apps/web/README.md`.
 */
export const SESSION_MINUTES_REMAINING = 45;
