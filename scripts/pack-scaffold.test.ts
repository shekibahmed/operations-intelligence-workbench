import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadPackFromDirectory } from "../packages/scenario-sdk/src/index.js";
import { validatePackDirectories } from "./validate-packs.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scratchPackId = "scaffold-test-scratch";

// The scaffold writes into a private temporary directory, never into the live
// `scenario-packs/` tree, so suites that scan that tree cannot observe a
// half-written scratch pack.
let outputDirectory: string;
let scratchDirectory: string;

beforeEach(() => {
  outputDirectory = mkdtempSync(join(tmpdir(), "oiw-scaffold-test-"));
  scratchDirectory = join(outputDirectory, scratchPackId);
});

afterEach(() => {
  rmSync(outputDirectory, { recursive: true, force: true });
});

function scaffold(args: string[]) {
  return spawnSync("pnpm", ["exec", "tsx", "scripts/pack-scaffold.ts", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, OIW_SCAFFOLD_OUTPUT_DIR: outputDirectory },
  });
}

describe("pack scaffold argument safety", () => {
  it.each([
    ["an option-like name", ["--name", "-x", "--description", "ok"], "--name"],
    ["an option-like description", ["--name", "Ok", "--description", "--force"], "--description"],
    ["a swallowed flag as the name", ["--name", "--description", "--description", "ok"], "--name"],
    ["an empty name", ["--name", "", "--description", "ok"], "--name must not be empty"],
    ["a whitespace-only name", ["--name", "   ", "--description", "ok"], "--name must not be empty"],
    ["an empty description", ["--name", "Ok", "--description", ""], "--description must not be empty"],
    ["a newline in the name", ["--name", "Line\nBreak", "--description", "ok"], "control characters"],
    ["a tab in the name", ["--name", "a\tb", "--description", "ok"], "control characters"],
    ["an escape character in the description", ["--name", "Ok", "--description", "a\u001bb"], "control characters"],
    ["a C1 control character in the name", ["--name", "a\u009bb", "--description", "ok"], "control characters"],
    ["a trailing --name with no value", ["--description", "ok", "--name"], "expected <pack-id>"],
    ["a trailing --description with no value", ["--name", "Ok", "--description"], "expected <pack-id>"],
    ["a missing --description", ["--name", "Ok"], "expected <pack-id>"],
  ])("rejects %s without creating a pack", (_label, args, expected) => {
    const result = scaffold([scratchPackId, ...args]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
    expect(existsSync(scratchDirectory)).toBe(false);
  });

  it("writes a quoted, colon-bearing name as a valid manifest that pack validation accepts", async () => {
    const name = 'Scratch "Quoted": Pack \\ $& end';
    const result = scaffold([scratchPackId, "--name", name, "--description", "Scratch description: with a colon"]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    // The real loader parses the YAML: the name must round-trip exactly.
    const loaded = await loadPackFromDirectory(scratchDirectory);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") expect(loaded.pack.manifest.name).toBe(name);

    const lines: string[] = [];
    const exitCode = await validatePackDirectories(outputDirectory, {
      log: (message) => lines.push(message),
      error: (message) => lines.push(message),
    });
    expect(lines.join("\n")).toMatch(new RegExp(`^OK    .*${scratchPackId} \\(${scratchPackId}@`, "m"));
    expect(exitCode).toBe(0);
  }, 120_000);
});
