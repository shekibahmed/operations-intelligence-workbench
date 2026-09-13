import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPackRegistry } from "@oiw/scenario-sdk";

import { findPackById, stubPacks } from "@/lib/stub/packs";
import { TOUR_STEPS_BY_PACK, tourTargetFixtureId } from "@/lib/tour/steps";

const scenarioPacksDirectory =
  process.env.SCENARIO_PACKS_DIR ?? resolve(process.cwd(), "..", "..", "scenario-packs");

/**
 * Selector-registration handoff (value-traction plan U4): `/demo` renders
 * from the curated `stubPacks` list, not the live registry. This test pins
 * the safe direction of that handoff — every curated card must resolve to
 * a real, loadable pack — while the reverse direction (a registry pack
 * with no card yet) stays a documented authoring step, not a gate, so pack
 * authors without `apps/web` ownership are never blocked.
 */
describe("selector pack cards", () => {
  it("has a unique id per card with a complete card contract", () => {
    const ids = stubPacks.map((pack) => pack.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pack of stubPacks) {
      expect(pack.name.length).toBeGreaterThan(0);
      expect(pack.problemStatement.length).toBeGreaterThan(0);
      expect(pack.sourceTypes.length).toBeGreaterThan(0);
      expect(pack.exampleOutput.length).toBeGreaterThan(0);
      expect(pack.estimatedMinutes).toBeGreaterThan(0);
      expect(pack.lensSummary.leadership.length).toBeGreaterThan(0);
      expect(pack.lensSummary.operations.length).toBeGreaterThan(0);
      expect(pack.lensSummary.technical.length).toBeGreaterThan(0);
      expect(findPackById(pack.id)).toBe(pack);
    }
  });

  it("every curated card resolves to a pack in the live registry", async () => {
    const registry = await buildPackRegistry(scenarioPacksDirectory);
    expect(registry.invalid).toEqual([]);
    const loadedIds = new Set(registry.loaded.map((entry) => entry.id));
    for (const pack of stubPacks) {
      expect(loadedIds.has(pack.id)).toBe(true);
    }
  });

  it("every curated card has a guided tour with a pinned fixture", () => {
    for (const pack of stubPacks) {
      expect(TOUR_STEPS_BY_PACK[pack.id]).toBeDefined();
      expect(tourTargetFixtureId(pack.id)).toMatch(new RegExp(`^${pack.id}-demo-\\d+$`));
    }
  });
});
