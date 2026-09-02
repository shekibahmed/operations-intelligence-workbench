"use server";

import { redirect } from "next/navigation";
import { ResetService, SeedService } from "@oiw/application";
import { loadFixtureSet } from "@oiw/scenario-sdk";

import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";
import { enforceGuestRateLimit } from "@/lib/server/rate-limit";
import { requireWorkspace } from "@/lib/server/workspace";

/**
 * Workspace menu "Reset demo" action (UX_SPEC §1.2): restores the
 * workspace's seeded fixture set to its original post-seed state.
 * `requireWorkspace` re-validates the session cookie against `slug` before
 * any destructive work runs.
 */
export async function resetWorkspace(slug: string): Promise<void> {
  const workspace = await requireWorkspace(slug);
  await enforceGuestRateLimit("reset", workspace);
  if (workspace.activePackId === null) {
    throw new Error(`Workspace ${workspace.id} has no active pack to reset against`);
  }

  const packEntry = await findPackEntry(workspace.activePackId);
  if (packEntry === undefined) {
    throw new Error(`Scenario Pack not found: ${workspace.activePackId}`);
  }

  const repositories = getRepositories();
  const resetService = new ResetService(repositories, new SeedService(repositories));
  const result = await resetService.reset(workspace, packEntry.pack, loadFixtureSet);

  redirect(`/w/${result.workspace.slug}/overview?lens=leadership`);
}
