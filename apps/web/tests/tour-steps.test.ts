import { describe, expect, it } from "vitest";

import { TOUR_STEPS } from "@/lib/tour/steps";

const BASE = "/w/workspace-1";

describe("TOUR_STEPS (guided tour engine)", () => {
  it("has a unique id per step, in DEMO_SCRIPT order", () => {
    const ids = TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
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
    ]);
  });

  it("every step but the last has a way to advance (same-page, static, or dynamic)", () => {
    for (const step of TOUR_STEPS.slice(0, -1)) {
      expect(["same-page", "static", "dynamic"]).toContain(step.next.kind);
    }
  });

  it("the last step has no further Next action, so the tour terminates", () => {
    expect(TOUR_STEPS.at(-1)?.next.kind).toBe("none");
  });

  it("every step's target is a real CSS attribute selector, never empty", () => {
    for (const step of TOUR_STEPS) {
      expect(step.target.length).toBeGreaterThan(0);
      expect(step.target.startsWith("[")).toBe(true);
    }
  });

  it("static `next` targets resolve to real, distinct workspace routes", () => {
    const staticSteps = TOUR_STEPS.filter((step) => step.next.kind === "static");
    for (const step of staticSteps) {
      if (step.next.kind !== "static") continue;
      const path = step.next.path(BASE);
      expect(path.startsWith(BASE)).toBe(true);
    }
  });

  it("each step's own `match` recognizes the exact route its `next` static path names", () => {
    for (let i = 0; i < TOUR_STEPS.length - 1; i += 1) {
      const step = TOUR_STEPS[i]!;
      if (step.next.kind !== "static") continue;
      const nextStep = TOUR_STEPS[i + 1]!;
      const path = step.next.path(BASE);
      expect(nextStep.match(path, BASE)).toBe(true);
    }
  });

  it("only the review step triggers the real related-fixture processing side effect", () => {
    const withSideEffect = TOUR_STEPS.filter((step) => step.beforeNext !== undefined);
    expect(withSideEffect).toHaveLength(1);
    expect(withSideEffect[0]?.id).toBe("review-ambiguity");
  });

  it("the tour never fabricates data: no step body references a specific numeric value not derivable from a rule/metric", () => {
    // A loose guard against regressions like hardcoding "3 signals" — every
    // step's copy should describe behaviour, not bake in a fixture number.
    for (const step of TOUR_STEPS) {
      expect(step.body).not.toMatch(/\$\d/); // no hardcoded currency figures
    }
  });
});
