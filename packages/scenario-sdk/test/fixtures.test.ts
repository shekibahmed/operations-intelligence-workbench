import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadFixtureSet } from "../src/fixtures.js";
import { loadPackFromDirectory, type LoadedScenarioPack } from "../src/loader.js";

const validPackDirectory = resolve(import.meta.dirname, "fixtures/packs/valid");
const temporaryDirectories: string[] = [];

async function loadValidPack(): Promise<LoadedScenarioPack> {
  const result = await loadPackFromDirectory(validPackDirectory);
  if (result.status !== "loaded") throw new Error("Expected the valid fixture pack to load");
  return result.pack;
}

async function temporaryPack(index: unknown): Promise<LoadedScenarioPack> {
  const directory = await mkdtemp(resolve(tmpdir(), "oiw-fixture-loader-"));
  temporaryDirectories.push(directory);
  await mkdir(resolve(directory, "fixtures/smoke"), { recursive: true });
  await writeFile(resolve(directory, "fixtures/smoke/index.json"), JSON.stringify(index));
  const pack = await loadValidPack();
  return {
    ...pack,
    directory,
    manifest: {
      ...pack.manifest,
      fixtures: {
        smoke: "fixtures/smoke",
        demo: "fixtures/demo",
        edgeCases: "fixtures/edge-cases",
      },
    },
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("loadFixtureSet", () => {
  it("loads typed artifact content and extractions in deterministic artifact-id order", async () => {
    const result = await loadFixtureSet(await loadValidPack(), "smoke");
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") throw new Error("Expected fixture set to load");

    expect(result.fixtureSet.artifacts.map((artifact) => artifact.id)).toEqual([
      "example-smoke-001",
      "example-smoke-002",
    ]);
    expect(new TextDecoder().decode(result.fixtureSet.artifacts[0]?.content)).toBe(
      "Record REC-123 received from Node A at 08:00.\n",
    );
    expect(result.fixtureSet.artifacts[0]?.extraction.artifactChecksum).toBe(
      result.fixtureSet.artifacts[0]?.sha256,
    );
    expect(result.warnings).toEqual([]);
  });

  it("returns a typed empty set and warning when a pack has no fixture directory", async () => {
    const result = await loadFixtureSet(await loadValidPack(), "demo");
    expect(result.status).toBe("loaded");
    if (result.status !== "loaded") throw new Error("Expected absent fixture set to be tolerated");
    expect(result.fixtureSet.artifacts).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.severity).toBe("warning");
  });

  it("returns path-annotated validation failures for an invalid fixture index", async () => {
    const pack = await temporaryPack([{ id: "incomplete-fixture" }]);
    const result = await loadFixtureSet(pack, "smoke");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected fixture set to be invalid");
    expect(result.errors.some((issue) => issue.path.includes("index.json#0.artifactType"))).toBe(
      true,
    );
  });

  it("rejects artifact content that does not match the declared checksum", async () => {
    const pack = await temporaryPack([
      {
        id: "checksum-fixture",
        artifactType: "plain-text",
        mimeType: "text/plain",
        contentPath: "artifacts/checksum-fixture.txt",
        sourceMetadata: { synthetic: true },
        sha256: "a".repeat(64),
        expectedExtraction: "extractions/checksum-fixture.json",
      },
    ]);
    await mkdir(resolve(pack.directory, "fixtures/smoke/artifacts"), { recursive: true });
    await writeFile(
      resolve(pack.directory, "fixtures/smoke/artifacts/checksum-fixture.txt"),
      "checksum mismatch",
    );

    const result = await loadFixtureSet(pack, "smoke");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected fixture set to be invalid");
    expect(result.errors.some((issue) => issue.path.endsWith("#checksum-fixture.sha256"))).toBe(
      true,
    );
  });
});
