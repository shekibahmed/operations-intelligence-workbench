import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { formatEvaluationResult, runEvaluation } from "./runner.js";

export interface EvalCliOptions {
  help: boolean;
  packIds: string[];
  provider: "fixture";
}

export function parseEvalArgs(argv: readonly string[]): EvalCliOptions {
  const packIds: string[] = [];
  let provider = "fixture";
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--pack") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("-")) throw new Error("--pack requires a pack ID");
      packIds.push(value);
      index += 1;
    } else if (argument.startsWith("--pack=")) {
      const value = argument.slice("--pack=".length);
      if (value.length === 0) throw new Error("--pack requires a pack ID");
      packIds.push(value);
    } else if (argument === "--provider") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("-")) throw new Error("--provider requires a value");
      provider = value;
      index += 1;
    } else if (argument.startsWith("--provider=")) {
      provider = argument.slice("--provider=".length);
    } else {
      throw new Error(`Unknown evaluation argument: ${argument}`);
    }
  }
  if (provider !== "fixture") {
    throw new Error(`Unsupported provider ${JSON.stringify(provider)}; only "fixture" is available`);
  }
  return { help, packIds: [...new Set(packIds)], provider };
}

export const evalUsage = `Usage: pnpm eval [--pack <id>] [--provider fixture]

Runs deterministic gold evaluation against one pack or every registered pack.`;

export async function runEvalCli(input: {
  argv: readonly string[];
  repositoryRoot: string;
  resultPath: string;
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}): Promise<number> {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;
  try {
    const options = parseEvalArgs(input.argv);
    if (options.help) {
      stdout(evalUsage);
      return 0;
    }
    const result = await runEvaluation({
      repositoryRoot: input.repositoryRoot,
      packIds: options.packIds,
      provider: options.provider,
    });
    await mkdir(dirname(input.resultPath), { recursive: true });
    await writeFile(input.resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    stdout(formatEvaluationResult(result));
    stdout(`\nMachine-readable results: ${input.resultPath}`);
    return result.passed ? 0 : 1;
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
