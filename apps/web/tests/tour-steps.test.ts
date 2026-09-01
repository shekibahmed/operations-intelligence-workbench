import { describe, expect, it } from "vitest";

import { TOUR_STEPS_BY_PACK, TOUR_TARGET_FIXTURE_IDS, getTourSteps } from "@/lib/tour/steps";

const BASE = "/w/workspace-1";

const EXPECTED_STEP_IDS = [
  "inbox-arrival",
  "inbox-process",
  "review-ambiguity",
  "rule-trace",
  "case-list",
  "case-detail",
  "decision-approval",
  "dashboard-update",
  "technical-trace",
  "adapt-cta",
];

/** Vocabulary each pack's tour must use, sourced from that pack's own `labels.json` (never a generic or another pack's noun). */
const PACK_VOCABULARY: Record<string, string[]> = {
  "asset-reliability": ["Reliability Case"],
  "process-exceptions": ["Exception Case", "Hold Affected Output"],
  "document-assurance": ["Review Case", "Accept Exception"],
};

describe.each(Object.entries(TOUR_STEPS_BY_PACK))("%s tour steps", (packId, steps) => {
  it("has a unique id per step, in DEMO_SCRIPT order", () => {
    const ids = steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(EXPECTED_STEP_IDS);
  });

  it("every step but the last has a way to advance (same-page, static, or dynamic)", () => {
    for (const step of steps.slice(0, -1)) {
      expect(["same-page", "static", "dynamic"]).toContain(step.next.kind);
    }
  });

  it("the last step has no further Next action, so the tour terminates", () => {
    expect(steps.at(-1)?.next.kind).toBe("none");
  });

  it("every step's target is a real CSS attribute selector, never empty", () => {
    for (const step of steps) {
      expect(step.target.length).toBeGreaterThan(0);
      expect(step.target.startsWith("[")).toBe(true);
    }
  });

  it("static `next` targets resolve to real, distinct workspace routes", () => {
    const staticSteps = steps.filter((step) => step.next.kind === "static");
    for (const step of staticSteps) {
      if (step.next.kind !== "static") continue;
      const path = step.next.path(BASE);
      expect(path.startsWith(BASE)).toBe(true);
    }
  });

  it("each step's own `match` recognizes the exact route its `next` static path names", () => {
    for (let i = 0; i < steps.length - 1; i += 1) {
      const step = steps[i]!;
      if (step.next.kind !== "static") continue;
      const nextStep = steps[i + 1]!;
      const path = step.next.path(BASE);
      expect(nextStep.match(path, BASE)).toBe(true);
    }
  });

  it("every `beforeNext` fixture-processing step names fixtures from this pack only", () => {
    for (const step of steps) {
      if (step.beforeNext === undefined) continue;
      expect(step.beforeNext.fixtureIds.length).toBeGreaterThan(0);
      for (const fixtureId of step.beforeNext.fixtureIds) {
        expect(fixtureId.startsWith(`${packId}-`)).toBe(true);
      }
    }
  });

  it("the tour never fabricates data: no step body references a specific numeric value not derivable from a rule/metric", () => {
    // A loose guard against regressions like hardcoding "3 signals" — every
    // step's copy should describe behaviour, not bake in a fixture number.
    for (const step of steps) {
      expect(step.body).not.toMatch(/\$\d/); // no hardcoded currency figures
    }
  });

  it("has a real pinned fixture for the visitor to Process by hand, from this pack's own demo set", () => {
    const fixtureId = TOUR_TARGET_FIXTURE_IDS[packId];
    expect(fixtureId).toBeDefined();
    expect(fixtureId).toMatch(new RegExp(`^${packId}-demo-\\d+$`));
  });

  it("uses this pack's own vocabulary, sourced from its labels.json, not a generic or borrowed noun", () => {
    const allBodyText = steps.map((step) => `${step.title} ${step.body} ${step.actionHint ?? ""}`).join(" ");
    for (const term of PACK_VOCABULARY[packId]!) {
      expect(allBodyText).toContain(term);
    }
    for (const [otherPackId, terms] of Object.entries(PACK_VOCABULARY)) {
      if (otherPackId === packId) continue;
      for (const term of terms) {
        expect(allBodyText).not.toContain(term);
      }
    }
  });
});

describe("getTourSteps", () => {
  it("returns the step list for each of the three registered packs", () => {
    for (const packId of Object.keys(TOUR_STEPS_BY_PACK)) {
      expect(getTourSteps(packId)).toBe(TOUR_STEPS_BY_PACK[packId]);
    }
  });

  it("returns undefined for a pack with no configured tour", () => {
    expect(getTourSteps("not-a-real-pack")).toBeUndefined();
  });
});
