import { resolve } from "node:path";

import { runCommand, type CommandRunner } from "./command.js";

export const PACK_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface OiwServerOptions {
  /** Repository root. Defaults to `OIW_REPO_ROOT`, else three levels above this module. */
  repositoryRoot?: string;
  /** Pack directory. Defaults to `SCENARIO_PACKS_DIR`, else `<repositoryRoot>/scenario-packs`. */
  scenarioPacksDirectory?: string;
  /** Enables `scaffold_pack`. Defaults to `OIW_MCP_ALLOW_WRITE === "1"`. */
  allowWrite?: boolean;
  /** Replaceable process runner; the default spawns without a shell. */
  commandRunner?: CommandRunner;
  /** Environment used for the defaults above. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
}

export interface OiwServerConfig {
  repositoryRoot: string;
  scenarioPacksDirectory: string;
  allowWrite: boolean;
  commandRunner: CommandRunner;
  env: Record<string, string | undefined>;
}

export function resolveConfig(options: OiwServerOptions = {}): OiwServerConfig {
  const env = options.env ?? process.env;
  const repositoryRoot = resolve(
    options.repositoryRoot ?? env.OIW_REPO_ROOT ?? resolve(import.meta.dirname, "..", "..", ".."),
  );
  return {
    repositoryRoot,
    scenarioPacksDirectory: resolve(
      options.scenarioPacksDirectory ?? env.SCENARIO_PACKS_DIR ?? resolve(repositoryRoot, "scenario-packs"),
    ),
    allowWrite: options.allowWrite ?? env.OIW_MCP_ALLOW_WRITE === "1",
    commandRunner: options.commandRunner ?? runCommand,
    env,
  };
}
