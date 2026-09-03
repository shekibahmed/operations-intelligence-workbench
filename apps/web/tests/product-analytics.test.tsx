import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsPageEvents } from "@/components/analytics/AnalyticsPageEvents";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
  vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  window.history.replaceState({}, "", "/adapt?scenario=example-pack");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("first-party product analytics emitter", () => {
  it("posts only the allow-listed event context to the same-origin endpoint", async () => {
    render(
      <AnalyticsPageEvents
        events={[{ name: "cta-opened", context: { scenarioId: "example-pack" } }]}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/api/analytics");
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin", keepalive: true });
    expect(JSON.parse(String(init?.body))).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "cta-opened",
      context: { scenarioId: "example-pack", path: "/adapt" },
    });
  });
});
