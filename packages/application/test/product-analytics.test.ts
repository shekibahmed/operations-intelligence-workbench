import { describe, expect, it } from "vitest";

import {
  ProductAnalyticsService,
  parseProductAnalyticsEventContext,
  parseProductAnalyticsEventName,
  type ProductAnalyticsEvent,
} from "../src/index.js";

describe("ProductAnalyticsService", () => {
  it("records an allow-listed, session-scoped event with closed context", async () => {
    const events: ProductAnalyticsEvent[] = [];
    const service = new ProductAnalyticsService(
      { insert: async (event) => (events.push(event), true) },
      {
        clock: () => new Date("2026-09-03T08:00:00.000Z"),
        createId: () => "event-1",
      },
    );

    await expect(
      service.record({
        workspaceId: "workspace-1",
        sessionId: "session-1",
        name: "lens-switched",
        context: { path: "/w/example/cases", scenarioId: "example-pack", lens: "technical" },
      }),
    ).resolves.toMatchObject({ id: "event-1", name: "lens-switched" });
    expect(events).toEqual([
      {
        id: "event-1",
        workspaceId: "workspace-1",
        sessionId: "session-1",
        name: "lens-switched",
        context: { path: "/w/example/cases", scenarioId: "example-pack", lens: "technical" },
        occurredAt: "2026-09-03T08:00:00.000Z",
      },
    ]);
  });

  it("rejects unknown events, arbitrary properties and query-bearing paths", () => {
    expect(() => parseProductAnalyticsEventName("page-with-email")).toThrow("Unknown");
    expect(() => parseProductAnalyticsEventContext({ email: "person@example.test" })).toThrow("unsupported");
    expect(() => parseProductAnalyticsEventContext({ path: "/adapt?contact=person" })).toThrow("pathname");
  });
});
