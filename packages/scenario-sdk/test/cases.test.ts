import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getCaseDefinition,
  getCaseDefinitionsForRule,
  loadPackFromDirectory,
} from "../src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixturePack = resolve(import.meta.dirname, "fixtures/packs/valid");
const temporaryDirectories: string[] = [];

async function temporaryPack(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "oiw-case-definition-"));
  temporaryDirectories.push(directory);
  await cp(fixturePack, directory, { recursive: true });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Case definition catalogue", () => {
  it("loads typed Case definitions from every real pack", async () => {
    for (const packId of ["asset-reliability", "document-assurance", "process-exceptions"]) {
      const result = await loadPackFromDirectory(resolve(repositoryRoot, "scenario-packs", packId));
      if (result.status !== "loaded") throw new Error(JSON.stringify(result.errors));
      expect(result.pack.caseDefinitions.size).toBe(result.pack.manifest.caseDefinitions.length);
    }
  });

  it("exposes definitions by case type and triggering rule", async () => {
    const result = await loadPackFromDirectory(
      resolve(repositoryRoot, "scenario-packs/asset-reliability"),
    );
    if (result.status !== "loaded") throw new Error(JSON.stringify(result.errors));

    expect(getCaseDefinition(result.pack, "reliability-case")).toMatchObject({
      workflowId: "default",
      defaultPriority: "normal",
      defaultSeverity: "medium",
    });
    expect(
      getCaseDefinitionsForRule(result.pack, "safety-critical-removal-approval").map(
        ({ caseType }) => caseType,
      ),
    ).toEqual(["reliability-case"]);
  });

  it("rejects unknown workflow, closure-requirement and triggering-rule references", async () => {
    const directory = await temporaryPack();
    const casePath = resolve(directory, "schemas/cases.json");
    const definition = JSON.parse(await readFile(casePath, "utf8")) as Record<string, unknown>;
    await writeFile(
      casePath,
      JSON.stringify({
        ...definition,
        workflowId: "missing-workflow",
        closureRequirements: ["missing-requirement"],
        triggeredByRules: ["missing-rule"],
      }),
      "utf8",
    );

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(result.errors.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unknown workflow"),
        expect.stringContaining("unknown rule"),
      ]),
    );
  });

  it("rejects create-case actions referencing an unknown Case definition", async () => {
    const directory = await temporaryPack();
    const rulePath = resolve(directory, "rules/default.rules.json");
    const rules = JSON.parse(await readFile(rulePath, "utf8")) as Array<
      Record<string, unknown>
    >;
    await writeFile(
      rulePath,
      JSON.stringify([
        {
          ...rules[0],
          then: [{ type: "create-case", definitionId: "missing-case", parameters: {} }],
        },
      ]),
      "utf8",
    );

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        path: "./rules/default.rules.json#0.then.0.definitionId",
        message: expect.stringContaining('unknown Case definition "missing-case"'),
      }),
    );
  });
});
