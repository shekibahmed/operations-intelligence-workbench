import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getEventDefinition, loadFixtureSet, loadPackFromDirectory } from "../src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const fixturePack = resolve(import.meta.dirname, "fixtures/packs/valid");
const temporaryDirectories: string[] = [];

async function temporaryPack(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "oiw-event-seed-"));
  temporaryDirectories.push(directory);
  await cp(fixturePack, directory, { recursive: true });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Event definition and seed Entity catalogues", () => {
  it("loads typed Event definitions and seed Entities from every real pack", async () => {
    for (const packId of ["asset-reliability", "document-assurance", "process-exceptions"]) {
      const result = await loadPackFromDirectory(resolve(repositoryRoot, "scenario-packs", packId));
      expect(result.status).toBe("loaded");
      if (result.status !== "loaded") throw new Error(JSON.stringify(result.errors));

      expect(result.pack.eventDefinitions.size).toBe(result.pack.manifest.eventTypes.length);
      expect(result.pack.seedEntities.length).toBeGreaterThan(0);
    }
  });

  it("exposes explicit Asset Reliability time and primary Entity mappings", async () => {
    const result = await loadPackFromDirectory(
      resolve(repositoryRoot, "scenario-packs/asset-reliability"),
    );
    if (result.status !== "loaded") throw new Error(JSON.stringify(result.errors));

    expect(getEventDefinition(result.pack, "fault-reported")).toMatchObject({
      requiredObservations: ["asset-identifier", "symptom"],
      optionalObservations: ["date-reported"],
      occurredAt: {
        observationSchemaKey: "date-reported",
        fallback: "artifact-received-at",
      },
      primaryEntity: { observationSchemaKey: "asset-identifier" },
    });
  });

  it("exposes validated seed Entities through fixture loading", async () => {
    const packResult = await loadPackFromDirectory(
      resolve(repositoryRoot, "scenario-packs/asset-reliability"),
    );
    if (packResult.status !== "loaded") throw new Error(JSON.stringify(packResult.errors));
    const fixtureResult = await loadFixtureSet(packResult.pack, "demo");
    if (fixtureResult.status !== "loaded") throw new Error(JSON.stringify(fixtureResult.errors));

    const ambiguousAssets = fixtureResult.fixtureSet.entities.filter((entity) =>
      ["A-140", "A-142"].includes(entity.externalReference ?? ""),
    );
    expect(ambiguousAssets).toHaveLength(2);
    expect(ambiguousAssets.every((entity) => entity.aliases.includes("A-14?"))).toBe(true);
  });

  it("rejects Event definitions that reference an unknown Observation schemaKey", async () => {
    const directory = await temporaryPack();
    const eventPath = resolve(directory, "schemas/events/record-received.json");
    const event = JSON.parse(await readFile(eventPath, "utf8")) as Record<string, unknown>;
    await writeFile(
      eventPath,
      JSON.stringify({
        ...event,
        requiredObservations: ["unknown-schema"],
        primaryEntity: null,
      }),
      "utf8",
    );

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(
      result.errors.some(
        (issue) =>
          issue.path.includes("record-received.json#unknown-schema") &&
          issue.message.includes("unknown observation schemaKey"),
      ),
    ).toBe(true);
  });

  it("rejects a fixture pack with indistinguishable Event definitions", async () => {
    const directory = await temporaryPack();
    const manifestPath = resolve(directory, "manifest.yaml");
    const manifest = await readFile(manifestPath, "utf8");
    await writeFile(
      manifestPath,
      manifest.replace(
        "observationSchemas:",
        [
          "  - id: record-indexed",
          "    displayName: Record indexed",
          "    schema: ./schemas/events/record-indexed.json",
          "observationSchemas:",
        ].join("\n"),
      ),
      "utf8",
    );

    const existing = JSON.parse(
      await readFile(resolve(directory, "schemas/events/record-received.json"), "utf8"),
    ) as Record<string, unknown>;
    await writeFile(
      resolve(directory, "schemas/events/record-indexed.json"),
      JSON.stringify({
        ...existing,
        eventType: "record-indexed",
        displayName: "Record indexed",
      }),
      "utf8",
    );

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(
      result.errors.some(
        (issue) =>
          issue.path === "./schemas/events/record-indexed.json#requiredObservations" &&
          issue.message.includes('indistinguishable from "record-received"'),
      ),
    ).toBe(true);
  });

  it("rejects a required Observation value outside its schema", async () => {
    const directory = await temporaryPack();
    const eventPath = resolve(directory, "schemas/events/record-received.json");
    const event = JSON.parse(await readFile(eventPath, "utf8")) as Record<string, unknown>;
    await writeFile(
      eventPath,
      JSON.stringify({
        ...event,
        requiredObservationValues: { "record-id": [42] },
      }),
      "utf8",
    );

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(
      result.errors.some(
        (issue) =>
          issue.path ===
            "./schemas/events/record-received.json#requiredObservationValues.record-id.0" &&
          issue.message.includes("Expected a string"),
      ),
    ).toBe(true);
  });

  it("rejects duplicate seed ids and undeclared seed Entity types", async () => {
    const directory = await temporaryPack();
    const manifestPath = resolve(directory, "manifest.yaml");
    await writeFile(
      manifestPath,
      `${await readFile(manifestPath, "utf8")}\nseedEntities: ./seed/entities.json\n`,
      "utf8",
    );
    await mkdir(resolve(directory, "seed"), { recursive: true });
    const seed = {
      id: "record-r-1",
      entityType: "undeclared-type",
      displayName: "Record R-1",
      externalReference: "R-1",
      aliases: [],
      attributes: {},
      status: "active",
    };
    await writeFile(resolve(directory, "seed/entities.json"), JSON.stringify([seed, seed]), "utf8");

    const result = await loadPackFromDirectory(directory);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid pack");
    expect(result.errors.some((issue) => issue.message.includes("Duplicate seed Entity id"))).toBe(true);
    expect(result.errors.some((issue) => issue.message.includes("undeclared entity type"))).toBe(true);
  });
});
