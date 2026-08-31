/**
 * Shape of the label data a Scenario Pack manifest supplies (UX_SPEC §8.2).
 * This is an `apps/web`-local type, not a frozen contract: `packages/contracts`
 * only records the *path* to a pack's labels file
 * (`ScenarioPackManifestSchema.labels`), not the label document's shape. Wave 2
 * pack-registry wiring will read real label files against a schema like this
 * one; until then, `apps/web` renders from typed stub label objects so no
 * generic component ever hard-codes domain vocabulary (AGENTS.md Product Rule,
 * UX_SPEC §8.1).
 */
export interface PackLabels {
  packId: string;
  packName: string;
  packDescription: string;
  entityTypes: Record<string, { singular: string; plural: string }>;
  eventTypes: Record<string, string>;
  signalTypes: Record<string, string>;
  caseTypes: Record<string, string>;
  actionTypes: Record<string, string>;
  decisionTypes: Record<string, string>;
  workflowStates: Record<string, string>;
}

const GENERIC_FALLBACK: Record<keyof Omit<PackLabels, "packId" | "packName" | "packDescription">, string> = {
  entityTypes: "Entity",
  eventTypes: "Event",
  signalTypes: "Signal",
  caseTypes: "Case",
  actionTypes: "Action",
  decisionTypes: "Decision",
  workflowStates: "State",
};

/**
 * Resolve a pack-supplied domain noun by generic key, falling back to a
 * generic English label rather than a blank string or raw key (UX_SPEC §8.1).
 */
export function resolveLabel(
  labels: PackLabels,
  category: keyof typeof GENERIC_FALLBACK,
  key: string,
): string {
  const table = labels[category] as Record<string, string | { singular: string; plural: string }>;
  const entry = table[key];
  if (entry === undefined) {
    return GENERIC_FALLBACK[category];
  }
  return typeof entry === "string" ? entry : entry.singular;
}
