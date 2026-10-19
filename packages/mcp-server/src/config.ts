import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { runCommand, type CommandRunner } from "./command.js";
import { TOOL_NAMES, type ToolName } from "./tools.js";

export const PACK_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface OiwServerOptions {
  /** Repository root. Defaults to `OIW_REPO_ROOT`, else a checkout or the directory shipped with this package. */
  repositoryRoot?: string;
  /** Pack directory. Defaults to `SCENARIO_PACKS_DIR`, else `<repositoryRoot>/scenario-packs`. */
  scenarioPacksDirectory?: string;
  /** Enables `scaffold_pack`. Defaults to `OIW_MCP_ALLOW_WRITE === "1"`. */
  allowWrite?: boolean;
  /**
   * Tools to register. Defaults to every tool, which is the stdio behaviour.
   * The HTTP entrypoint passes the read-only set unless write and eval are opted in.
   */
  enabledTools?: readonly string[];
  /** Replaceable process runner; the default spawns without a shell. */
  commandRunner?: CommandRunner;
  /** Environment used for the defaults above. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
}

export interface OiwServerConfig {
  repositoryRoot: string;
  scenarioPacksDirectory: string;
  allowWrite: boolean;
  enabledTools: ReadonlySet<ToolName>;
  commandRunner: CommandRunner;
  env: Record<string, string | undefined>;
}

/**
 * A checkout has `pnpm-workspace.yaml` three levels above this module
 * (`src/` in tests, `dist/` when built). A published package ships
 * `scenario-packs` next to `dist/`.
 */
export function discoverPackRoots(moduleDirectory: string = import.meta.dirname): {
  repositoryRoot: string;
  scenarioPacksDirectory: string;
} {
  const monorepoRoot = resolve(moduleDirectory, "..", "..", "..");
  const packageRoot = resolve(moduleDirectory, "..");
  if (existsSync(join(monorepoRoot, "pnpm-workspace.yaml")) && existsSync(join(monorepoRoot, "scenario-packs"))) {
    return { repositoryRoot: monorepoRoot, scenarioPacksDirectory: join(monorepoRoot, "scenario-packs") };
  }
  const shipped = join(packageRoot, "scenario-packs");
  if (existsSync(shipped)) {
    return { repositoryRoot: packageRoot, scenarioPacksDirectory: shipped };
  }
  return { repositoryRoot: monorepoRoot, scenarioPacksDirectory: join(monorepoRoot, "scenario-packs") };
}

function enabledToolSet(names: readonly string[] | undefined): ReadonlySet<ToolName> {
  if (names === undefined) return new Set(TOOL_NAMES);
  const unknown = names.filter((name) => !TOOL_NAMES.includes(name as ToolName));
  if (unknown.length > 0) {
    throw new Error(`Unknown tool ${unknown.map((name) => JSON.stringify(name)).join(", ")}. Known tools: ${TOOL_NAMES.join(", ")}.`);
  }
  return new Set(names as ToolName[]);
}

export function resolveConfig(options: OiwServerOptions = {}): OiwServerConfig {
  const env = options.env ?? process.env;
  const discovered = options.repositoryRoot === undefined && env.OIW_REPO_ROOT === undefined ? discoverPackRoots() : undefined;
  const repositoryRoot = resolve(options.repositoryRoot ?? env.OIW_REPO_ROOT ?? (discovered ?? discoverPackRoots()).repositoryRoot);
  return {
    repositoryRoot,
    scenarioPacksDirectory: resolve(
      options.scenarioPacksDirectory ?? env.SCENARIO_PACKS_DIR ?? discovered?.scenarioPacksDirectory ?? resolve(repositoryRoot, "scenario-packs"),
    ),
    allowWrite: options.allowWrite ?? env.OIW_MCP_ALLOW_WRITE === "1",
    enabledTools: enabledToolSet(options.enabledTools),
    commandRunner: options.commandRunner ?? runCommand,
    env,
  };
}
