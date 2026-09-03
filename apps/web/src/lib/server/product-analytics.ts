import {
  ProductAnalyticsService,
  type ProductAnalyticsEventContext,
  type ProductAnalyticsEventName,
} from "@oiw/application";
import { createProductAnalyticsRepository } from "@oiw/persistence";
import type { Workspace } from "@oiw/contracts";

import { getOrCreateAnalyticsSessionId } from "@/lib/server/analytics-session";
import { getPersistenceDatabase, getRepositories } from "@/lib/server/db";
import { readSessionPayload } from "@/lib/server/session";

export async function activeAnalyticsWorkspace(): Promise<Workspace | null> {
  const payload = await readSessionPayload();
  if (payload === null) return null;
  const workspace = await getRepositories().workspaces.findById(payload.workspaceId);
  if (workspace === null) return null;
  if (workspace.expiresAt !== null && Date.parse(workspace.expiresAt) <= Date.now()) return null;
  return workspace;
}

export async function recordProductAnalyticsEvent(input: {
  id?: string | undefined;
  workspace?: Workspace | null | undefined;
  sessionId?: string | undefined;
  name: ProductAnalyticsEventName;
  context?: ProductAnalyticsEventContext | undefined;
}): Promise<void> {
  const sessionId = input.sessionId ?? (await getOrCreateAnalyticsSessionId());
  const workspace = input.workspace === undefined ? await activeAnalyticsWorkspace() : input.workspace;
  const context = {
    ...input.context,
    ...(workspace?.activePackId === null || workspace?.activePackId === undefined
      ? {}
      : { scenarioId: workspace.activePackId }),
  };
  await new ProductAnalyticsService(createProductAnalyticsRepository(getPersistenceDatabase())).record({
    ...(input.id === undefined ? {} : { id: input.id }),
    workspaceId: workspace?.id ?? null,
    sessionId,
    name: input.name,
    context,
  });
}

/** Analytics must never make an otherwise-successful product mutation fail. */
export async function tryRecordProductAnalyticsEvent(
  input: Parameters<typeof recordProductAnalyticsEvent>[0],
): Promise<void> {
  try {
    await recordProductAnalyticsEvent(input);
  } catch (error) {
    console.error("Could not record product analytics event", {
      name: input.name,
      error: error instanceof Error ? error.message : "Unknown analytics error",
    });
  }
}
