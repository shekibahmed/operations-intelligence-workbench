import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workspace } from "@oiw/contracts";

const mocks = vi.hoisted(() => ({
  enforceGuestRateLimit: vi.fn(),
  getOrCreateAnalyticsSessionId: vi.fn(),
  activeAnalyticsWorkspace: vi.fn(),
  recordProductAnalyticsEvent: vi.fn(),
}));

vi.mock("@/lib/server/analytics-session", () => ({
  getOrCreateAnalyticsSessionId: () => mocks.getOrCreateAnalyticsSessionId(),
}));
vi.mock("@/lib/server/product-analytics", () => ({
  activeAnalyticsWorkspace: () => mocks.activeAnalyticsWorkspace(),
  recordProductAnalyticsEvent: (...args: unknown[]) => mocks.recordProductAnalyticsEvent(...args),
}));
vi.mock("@/lib/server/rate-limit", () => {
  class GuestRateLimitError extends Error {
    readonly status = 429;
    readonly retryAfterSeconds: number;

    constructor(retryAfterMs: number) {
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
      super(`Too many requests. Try again in ${String(retryAfterSeconds)} seconds.`);
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
  return {
    GuestRateLimitError,
    enforceGuestRateLimit: (...args: unknown[]) => mocks.enforceGuestRateLimit(...args),
  };
});

const { POST } = await import("@/app/api/analytics/route");
const { GuestRateLimitError } = await import("@/lib/server/rate-limit");

const workspace: Workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic workspace",
  slug: "synthetic-workspace",
  activePackId: "example-pack",
  mode: "public-demo",
  createdAt: "2026-09-03T08:00:00.000Z",
  resetAt: null,
  expiresAt: "2099-09-03T08:00:00.000Z",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrCreateAnalyticsSessionId.mockResolvedValue("22222222-2222-4222-8222-222222222222");
  mocks.activeAnalyticsWorkspace.mockResolvedValue(workspace);
  mocks.enforceGuestRateLimit.mockResolvedValue(undefined);
  mocks.recordProductAnalyticsEvent.mockResolvedValue(undefined);
});

describe("analytics HTTP boundary", () => {
  it("derives Workspace scope server-side for a valid event", async () => {
    const response = await POST(request({
      id: "33333333-3333-4333-8333-333333333333",
      name: "case-opened",
      context: { path: "/w/synthetic-workspace/cases/example" },
    }));

    expect(response.status).toBe(202);
    expect(mocks.enforceGuestRateLimit).toHaveBeenCalledWith(
      "analytics",
      workspace,
      1,
      "22222222-2222-4222-8222-222222222222",
    );
    expect(mocks.recordProductAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ workspace, name: "case-opened" }),
    );
  });

  it("rejects client-supplied Workspace or network identity", async () => {
    const response = await POST(request({
      name: "case-opened",
      workspaceId: "44444444-4444-4444-8444-444444444444",
      ipAddress: "203.0.113.42",
      context: { path: "/w/synthetic-workspace/cases/example" },
    }));

    expect(response.status).toBe(400);
    expect(mocks.recordProductAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("rejects PII-shaped arbitrary analytics context", async () => {
    const response = await POST(request({
      name: "cta-opened",
      context: { contactDetails: "person@example.test" },
    }));

    expect(response.status).toBe(400);
    expect(mocks.recordProductAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("returns 429 before recording an event when the limiter denies it", async () => {
    mocks.enforceGuestRateLimit.mockRejectedValueOnce(new GuestRateLimitError(5_000));
    const response = await POST(request({ name: "landing-page-view", context: { path: "/" } }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("5");
    expect(mocks.recordProductAnalyticsEvent).not.toHaveBeenCalled();
  });
});
