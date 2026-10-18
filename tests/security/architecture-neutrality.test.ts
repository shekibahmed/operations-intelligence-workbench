import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  architectureViolations,
  compileNeutralityViolations,
  loadScenarioPackIdentities,
  packIdsInText,
  packRemovalViolations,
} from "../../scripts/architecture-check.js";

/**
 * OIW-918: proves the neutrality half of `pnpm architecture:check` is real.
 * Each rule is shown to (1) pass on this repository's tree and (2) fail on a
 * planted violation in a throwaway tree, so a green check cannot mean the
 * rule silently matches nothing. No pack ID is hard-coded: the real IDs are
 * read from the manifests, and the planted pack is generated per run.
 */

const repositoryRoot = resolve(import.meta.dirname, "../..");
const plantedPackId = `planted-pack-${Math.random().toString(36).slice(2, 8)}`;
let scratch: string;
let treeCounter = 0;

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), "oiw-918-architecture-"));
});

afterAll(async () => {
  await rm(scratch, { recursive: true, force: true });
});

async function put(root: string, path: string, content: string): Promise<void> {
  const absolute = join(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

/** Smallest tree `architectureViolations` accepts: core package dirs, write-back files, one planted pack. */
async function skeleton(files: Record<string, string> = {}): Promise<string> {
  const root = join(scratch, `tree-${(treeCounter += 1)}`);
  await put(root, "packages/domain/src/index.ts", "export const neutral = 1;\n");
  await put(root, "packages/rules/src/index.ts", "export const rules = 1;\n");
  await put(root, "packages/application/src/decisions.ts", "export const decisions = 1;\n");
  await put(root, "packages/application/src/operational-outcome-executors.ts", "export const executors = 1;\n");
  await put(root, "packages/application/src/rule-execution.ts", "export const execution = 1;\n");
  await put(root, "scenario-packs/_template/manifest.yaml", "id: template\n");
  await put(root, "scenario-packs/example/manifest.yaml", `id: ${plantedPackId}\nversion: 1.0.0\n`);
  for (const [path, content] of Object.entries(files)) await put(root, path, content);
  return root;
}

describe("pack identities are read from manifests, never hard-coded", () => {
  it("returns the id of every pack manifest and ignores underscore-prefixed scaffolding", async () => {
    const root = await skeleton();
    await put(root, "scenario-packs/_scratch/manifest.yaml", "id: should-be-ignored\n");
    await put(root, "scenario-packs/narrative-only/README.md", "no manifest here\n");
    await put(root, "scenario-packs/quoted/manifest.yaml", 'id: "quoted-pack" # trailing comment\n');
    const identities = await loadScenarioPackIdentities(join(root, "scenario-packs"));
    expect(identities.map(({ id }) => id).sort()).toEqual([plantedPackId, "quoted-pack"].sort());
  });

  it("fails closed when a pack manifest has no id", async () => {
    const root = await skeleton({ "scenario-packs/broken/manifest.yaml": "version: 1.0.0\n" });
    await expect(loadScenarioPackIdentities(join(root, "scenario-packs"))).rejects.toThrow(/no top-level "id:"/u);
  });

  it("fails closed when an existing manifest cannot be read (not just missing)", async () => {
    // A directory named manifest.yaml makes readFile fail with EISDIR, not ENOENT.
    const root = await skeleton();
    await mkdir(join(root, "scenario-packs/unreadable/manifest.yaml"), { recursive: true });
    await expect(loadScenarioPackIdentities(join(root, "scenario-packs"))).rejects.toThrow(/EISDIR/u);
  });

  it("finds every real pack in this repository", async () => {
    const identities = await loadScenarioPackIdentities(join(repositoryRoot, "scenario-packs"));
    expect(identities.length).toBeGreaterThanOrEqual(3);
    for (const identity of identities) expect(identity.id).toMatch(/^[a-z][a-z0-9-]*$/u);
  });
});

describe("pack ID matching", () => {
  const identities = [{ directory: "example", id: "some-pack" }];

  it("matches a pack ID or directory name that stands alone", () => {
    expect(packIdsInText('const pack = "some-pack";', identities)).toEqual(["some-pack"]);
    expect(packIdsInText("if (id === 'some-pack') {}", identities)).toEqual(["some-pack"]);
    expect(packIdsInText("see scenario-packs/example/rules", identities)).toEqual(["example"]);
  });

  it("does not match a longer identifier that merely contains the ID", () => {
    expect(packIdsInText("const x = 'my-some-pack-extra';", identities)).toEqual([]);
    expect(packIdsInText("some-packs", identities)).toEqual([]);
  });
});

describe("(d) core sources must not name a loaded Scenario Pack", () => {
  it("passes a clean skeleton tree", async () => {
    const root = await skeleton();
    expect(await architectureViolations(root, { skipNeutralityCompile: true })).toEqual([]);
  });

  it("fails when a core source file names a loaded pack ID", async () => {
    const root = await skeleton({
      "packages/application/src/leak.ts": `export const special = "${plantedPackId}";\n`,
    });
    const violations = await architectureViolations(root, { skipNeutralityCompile: true });
    expect(violations).toContain(
      `packages/application/src/leak.ts: core source names Scenario Pack "${plantedPackId}"`,
    );
  });

  it("fails for any package, including ones the original hand-written list omitted", async () => {
    const root = await skeleton({
      "packages/ui/src/leak.ts": `export const label = "${plantedPackId}";\n`,
    });
    const violations = await architectureViolations(root, { skipNeutralityCompile: true });
    expect(violations.some((violation) => violation.startsWith("packages/ui/src/leak.ts"))).toBe(true);
  });

  it("allows test files to name packs as fixtures", async () => {
    const root = await skeleton({
      "packages/application/src/leak.test.ts": `export const id = "${plantedPackId}";\n`,
      "packages/application/test/fixture.ts": `export const id = "${plantedPackId}";\n`,
    });
    expect(await architectureViolations(root, { skipNeutralityCompile: true })).toEqual([]);
  });

  it("still enforces the pre-existing industry-term rule", async () => {
    const root = await skeleton({ "packages/domain/src/leak.ts": "export const x = 'hospital';\n" });
    const violations = await architectureViolations(root, { skipNeutralityCompile: true });
    expect(violations).toContain('packages/domain/src/leak.ts: prohibited industry term "hospital"');
  });
});

describe("(e) compiling and loading never depend on one specific pack", () => {
  const tsconfig = JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", noEmit: true, allowJs: false },
    include: ["scripts/**/*.ts"],
  });

  it("passes when no TypeScript project compiles a pack file", async () => {
    const root = await skeleton({
      "tsconfig.tools.json": tsconfig,
      "scripts/clean.ts": "export const clean = 1;\n",
    });
    expect(await compileNeutralityViolations(root)).toEqual([]);
  });

  it("fails when a project imports a file that lives inside a pack directory", async () => {
    const root = await skeleton({
      "tsconfig.tools.json": tsconfig,
      "scripts/leaky.ts": 'import { value } from "../scenario-packs/example/hook.js";\nexport const leaked = value;\n',
      "scenario-packs/example/hook.ts": "export const value = 1;\n",
    });
    const violations = await compileNeutralityViolations(root);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("scenario-packs/example/hook.ts");
  });

  it("fails closed when a tree has no pack manifests to exercise", async () => {
    const root = join(scratch, "no-manifests");
    await put(root, "scenario-packs/_template/manifest.yaml", "id: template\n");
    const violations = await packRemovalViolations(root);
    expect(violations).toEqual(["scenario-packs: no Scenario Pack manifests found"]);
  });

  it("reports a remaining pack that cannot load once another pack is removed", async () => {
    // Both stubs are structurally invalid packs, so the registry cannot load either:
    // the check must surface that instead of reporting success.
    const root = await skeleton({ "scenario-packs/other/manifest.yaml": "id: other-stub\nversion: 1.0.0\n" });
    const violations = await packRemovalViolations(root);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join("\n")).toMatch(/pack registry without .*became invalid/u);
  });

  it("this repository: the registry loads every remaining pack with any one pack removed, or with only the template", async () => {
    expect(await packRemovalViolations(repositoryRoot)).toEqual([]);
  }, 60_000);
});

describe("architecture:check on this repository's tree", () => {
  it("reports no violations (the same function the CLI runs)", async () => {
    expect(await architectureViolations()).toEqual([]);
  }, 90_000);
});
