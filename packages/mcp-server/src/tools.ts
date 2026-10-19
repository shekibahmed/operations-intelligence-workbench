/** Tools this server can register. Order is the order clients see. */
export const TOOL_NAMES = [
  "list_packs",
  "get_pack_manifest",
  "list_fixtures",
  "get_casebook",
  "validate_packs",
  "run_eval",
  "scaffold_pack",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/**
 * Tools that do not write pack files and do not run the evaluation.
 * `validate_packs` is included: it runs the repository validator and does not write.
 */
export const READ_ONLY_TOOL_NAMES: readonly ToolName[] = [
  "list_packs",
  "get_pack_manifest",
  "list_fixtures",
  "get_casebook",
  "validate_packs",
];

const TOOL_NAME_SET = new Set<string>(TOOL_NAMES);

export interface ToolSelection {
  /** `all` is the stdio default. `read-only` is the HTTP default. */
  profile: "all" | "read-only";
  /** Adds `scaffold_pack`, which creates a pack directory. */
  allowWrite: boolean;
  /** Adds `run_eval`, which writes to the database named by `DATABASE_URL`. */
  allowEval: boolean;
  /**
   * When set, the result is this list intersected with the tools the profile
   * and flags enable. An unknown name, or a name the flags have not enabled,
   * is a startup error so a typo does not silently drop a tool.
   */
  allowedTools?: readonly string[];
}

export function resolveEnabledTools(selection: ToolSelection): ToolName[] {
  const enabled = new Set<ToolName>(selection.profile === "all" ? TOOL_NAMES : READ_ONLY_TOOL_NAMES);
  if (selection.allowWrite) enabled.add("scaffold_pack");
  if (selection.allowEval) enabled.add("run_eval");

  if (selection.allowedTools === undefined) {
    return TOOL_NAMES.filter((name) => enabled.has(name));
  }

  const requested: ToolName[] = [];
  const unknown: string[] = [];
  for (const raw of selection.allowedTools) {
    const name = raw.trim();
    if (name.length === 0) continue;
    if (!TOOL_NAME_SET.has(name)) unknown.push(name);
    else requested.push(name as ToolName);
  }
  if (unknown.length > 0) {
    throw new Error(`Unknown tool ${unknown.map((name) => JSON.stringify(name)).join(", ")}. Known tools: ${TOOL_NAMES.join(", ")}.`);
  }
  if (requested.length === 0) {
    throw new Error("The tool allow list is empty. Pass at least one tool name, or omit --allowed-tools.");
  }
  const refused = requested.filter((name) => !enabled.has(name));
  if (refused.length > 0) {
    throw new Error(
      `These tools are not enabled: ${refused.join(", ")}. ` +
        "run_eval needs --allow-eval or OIW_MCP_ALLOW_EVAL=1. " +
        "scaffold_pack needs --allow-write or OIW_MCP_ALLOW_WRITE=1. " +
        "The HTTP transport starts with the read-only set.",
    );
  }
  return TOOL_NAMES.filter((name) => requested.includes(name));
}
