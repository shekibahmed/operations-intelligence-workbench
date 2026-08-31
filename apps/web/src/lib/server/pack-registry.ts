import { resolve } from "node:path";
import { cache } from "react";
import { buildPackRegistry, type PackRegistry, type PackRegistryEntry } from "@oiw/scenario-sdk";
import type { Workspace } from "@oiw/contracts";

import type { PackLabels } from "@/lib/pack-labels";

/**
 * `next dev`/`next start` run with `process.cwd()` set to `apps/web`
 * (two directories below the repository root); `SCENARIO_PACKS_DIR` lets a
 * deployment override this if the working directory ever differs.
 */
function scenarioPacksDirectory(): string {
  return process.env.SCENARIO_PACKS_DIR ?? resolve(process.cwd(), "..", "..", "scenario-packs");
}

export const loadPackRegistry = cache(async (): Promise<PackRegistry> => {
  return buildPackRegistry(scenarioPacksDirectory());
});

export async function findPackEntry(packId: string): Promise<PackRegistryEntry | undefined> {
  const registry = await loadPackRegistry();
  return registry.list().find((entry) => entry.id === packId);
}

const FALLBACK_LABELS: PackLabels = {
  packId: "unknown",
  packName: "Unknown pack",
  packDescription: "This workspace's Scenario Pack could not be loaded from the registry.",
  entityTypes: {},
  eventTypes: {},
  signalTypes: {},
  caseTypes: {},
  actionTypes: {},
  decisionTypes: {},
  workflowStates: {},
  approvalPolicies: {},
};

function asLabelMap<T>(raw: Record<string, unknown>, key: string): Record<string, T> {
  const value = raw[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, T>)
    : {};
}

function mapPackLabels(entry: PackRegistryEntry): PackLabels {
  const raw = entry.pack.labels;
  return {
    packId: entry.pack.manifest.id,
    packName: entry.pack.manifest.name,
    packDescription: entry.pack.manifest.description,
    entityTypes: asLabelMap(raw, "entityTypes"),
    eventTypes: asLabelMap(raw, "eventTypes"),
    signalTypes: asLabelMap(raw, "signalTypes"),
    caseTypes: asLabelMap(raw, "caseTypes"),
    actionTypes: asLabelMap(raw, "actionTypes"),
    decisionTypes: asLabelMap(raw, "decisionTypes"),
    workflowStates: asLabelMap(raw, "workflowStates"),
    approvalPolicies: asLabelMap(raw, "approvalPolicies"),
  };
}

/** Real replacement for the Wave 1 `getPackLabels()` stub — resolves a workspace's active pack through the registry (UX_SPEC §8, PLAN_AMENDMENTS A9). */
export async function getWorkspacePackLabels(workspace: Workspace): Promise<PackLabels> {
  if (workspace.activePackId === null) return FALLBACK_LABELS;
  const entry = await findPackEntry(workspace.activePackId);
  return entry === undefined ? FALLBACK_LABELS : mapPackLabels(entry);
}
