"use server";

import { redirect } from "next/navigation";
import { WorkspaceService, SeedService } from "@oiw/application";
import { loadFixtureSet } from "@oiw/scenario-sdk";

import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { setSessionCookie } from "@/lib/server/session";

export type StartEntry = "tour" | "free";

/**
 * Guided Scenario Start (UX_SPEC §5.3): creates and seeds a real guest
 * workspace for `packId`, binds the guest session cookie to it, then
 * redirects per entry intent. Any failure after workspace creation deletes
 * the partial workspace first, so a retry never accumulates orphaned rows.
 */
export async function startGuestWorkspace(packId: string, entry: StartEntry): Promise<void> {
  await enforceGuestRateLimit("workspace-create");
  const packEntry = await findPackEntry(packId);
  if (packEntry === undefined) {
    throw new Error(`Scenario Pack not found: ${packId}`);
  }

  const repositories = getRepositories();
  const workspace = await new WorkspaceService(repositories.workspaces).createGuestWorkspace(packEntry.id, {
    name: `${packEntry.pack.manifest.name} Demo`,
  });

  try {
    await new SeedService(repositories).seed(workspace, packEntry.pack, loadFixtureSet);
  } catch (error) {
    await repositories.workspaces.delete(workspace.id);
    throw error;
  }

  await setSessionCookie(workspace.id);

  const base = `/w/${workspace.slug}`;
  redirect(entry === "tour" ? `${base}/inbox?lens=operations&tour=1` : `${base}/overview?lens=leadership`);
}
