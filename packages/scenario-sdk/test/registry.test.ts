import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildPackRegistry } from "../src/registry.js";

const registryFixtures = resolve(import.meta.dirname, "fixtures/registry");

describe("buildPackRegistry", () => {
  it("loads a valid pack, reports an invalid one without crashing, and reports a narrative-only skip", async () => {
    const registry = await buildPackRegistry(registryFixtures);

    expect(registry.loaded).toHaveLength(1);
    expect(registry.loaded[0]?.id).toBe("example-pack");
    expect(registry.loaded[0]?.version).toBe("1.0.0");

    expect(registry.invalid).toHaveLength(1);
    expect(registry.invalid[0]?.errors.length).toBeGreaterThan(0);

    expect(registry.skipped).toHaveLength(1);
    expect(registry.skipped[0]?.reason).toContain("narrative/");
  });

  it("looks packs up by id and version, and lists loaded packs in stable directory order", async () => {
    const registry = await buildPackRegistry(registryFixtures);

    expect(registry.get("example-pack", "1.0.0")).toBeDefined();
    expect(registry.get("example-pack", "9.9.9")).toBeUndefined();
    expect(registry.get("does-not-exist", "1.0.0")).toBeUndefined();

    expect(registry.list().map((entry) => entry.id)).toEqual(["example-pack"]);
  });

  it("tolerates a missing scenario-packs directory instead of throwing", async () => {
    const registry = await buildPackRegistry(resolve(registryFixtures, "does-not-exist"));
    expect(registry.loaded).toHaveLength(0);
    expect(registry.invalid).toHaveLength(0);
    expect(registry.skipped).toHaveLength(0);
  });
});
