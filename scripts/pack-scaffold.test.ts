import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scratchPackId = "scaffold-test-scratch";
const scratchDirectory = join(repositoryRoot, "scenario-packs", scratchPackId);

function scaffold(args: string[]) {
  return spawnSync("pnpm", ["exec", "tsx", "scripts/pack-scaffold.ts", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

afterEach(() => {
  rmSync(scratchDirectory, { recursive: true, force: true });
});

describe("pack scaffold argument safety", () => {
  it.each([
    ["an option-like name", ["--name", "-x", "--description", "ok"], "--name"],
    ["an option-like description", ["--name", "Ok", "--description", "--force"], "--description"],
    ["a swallowed flag as the name", ["--name", "--description", "--description", "ok"], "--name"],
    ["a newline in the name", ["--name", "Line\nBreak", "--description", "ok"], "control characters"],
    ["an escape character in the description", ["--name", "Ok", "--description", "a\u001bb"], "control characters"],
  ])("rejects %s without creating a pack", (_label, args, expected) => {
    const result = scaffold([scratchPackId, ...args]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(expected);
    expect(existsSync(scratchDirectory)).toBe(false);
  });

  it("writes a quoted, colon-bearing name as a valid manifest that pack validation accepts", () => {
    const name = 'Scratch "Quoted": Pack \\ $& end';
    const result = scaffold([scratchPackId, "--name", name, "--description", "Scratch description: with a colon"]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const manifest = readFileSync(join(scratchDirectory, "manifest.yaml"), "utf8");
    expect(manifest).toContain(`\nname: ${JSON.stringify(name)}\n`);

    const validation = spawnSync("pnpm", ["run", "validate:packs"], { cwd: repositoryRoot, encoding: "utf8" });
    expect(validation.stdout + validation.stderr).toContain(scratchPackId);
    expect(validation.status).toBe(0);
  }, 120_000);
});
