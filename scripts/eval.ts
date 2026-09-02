import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface EvalCliModule {
  runEvalCli(input: {
    argv: readonly string[];
    repositoryRoot: string;
    resultPath: string;
  }): Promise<number>;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
await new Promise<void>((resolvePromise, reject) => {
  const child = spawn("pnpm", ["--filter", "@oiw/evals...", "run", "build"], {
    cwd: repositoryRoot,
    stdio: "inherit",
  });
  child.once("error", reject);
  child.once("exit", (code) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`Evaluation package build failed with exit code ${String(code)}`));
  });
});

const modulePath = resolve(repositoryRoot, "packages/evals/dist/index.js");
const { runEvalCli } = (await import(pathToFileURL(modulePath).href)) as EvalCliModule;
process.exitCode = await runEvalCli({
  argv: process.argv.slice(2),
  repositoryRoot,
  resultPath: resolve(repositoryRoot, "packages/evals/eval-results.json"),
});
