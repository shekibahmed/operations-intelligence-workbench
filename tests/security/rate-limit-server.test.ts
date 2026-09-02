import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditEntry, Workspace } from "@oiw/contracts";

const mocks = vi.hoisted(() => ({
  auditInsert: vi.fn(),
  buildAuditEntry: vi.fn(),
  findWorkspace: vi.fn(),
  readSessionPayload: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({ readSessionPayload: () => mocks.readSessionPayload() }));
vi.mock("@/lib/server/db", () => ({
  getRepositories: () => ({
    workspaces: { findById: (workspaceId: string) => mocks.findWorkspace(workspaceId) },
    auditEntries: {
      insert: (workspaceId: string, entry: AuditEntry) => mocks.auditInsert(workspaceId, entry),
      list: () => Promise.resolve([]),
    },
  }),
}));
vi.mock("@/lib/server/audit", () => ({
  buildAuditEntry: (...args: unknown[]) => mocks.buildAuditEntry(...args),
}));

const { clientAddressForRateLimit, enforceGuestRateLimit, GuestRateLimitError } = await import(
  "@/lib/server/rate-limit"
);

const workspace: Workspace = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic workspace",
  slug: "synthetic-workspace",
  activePackId: "test-pack",
  mode: "public-demo",
  createdAt: "2026-09-02T00:00:00.000Z",
  resetAt: null,
  expiresAt: "2099-09-02T00:00:00.000Z",
};

const priorEnvironment = {
  ipCapacity: process.env.OIW_RATE_LIMIT_DECISION_IP_CAPACITY,
  sessionCapacity: process.env.OIW_RATE_LIMIT_DECISION_SESSION_CAPACITY,
  refillInterval: process.env.OIW_RATE_LIMIT_DECISION_REFILL_INTERVAL_MS,
  salt: process.env.OIW_RATE_LIMIT_IP_SALT,
};

beforeEach(() => {
  process.env.OIW_RATE_LIMIT_DECISION_IP_CAPACITY = "1";
  process.env.OIW_RATE_LIMIT_DECISION_SESSION_CAPACITY = "1";
  process.env.OIW_RATE_LIMIT_DECISION_REFILL_INTERVAL_MS = "60000";
  process.env.OIW_RATE_LIMIT_IP_SALT = "test-only-rate-limit-salt-at-least-32-bytes";
  globalThis.__oiwGuestRateLimitStore = undefined;
  globalThis.__oiwGuestRateLimitAuditWindows = undefined;
  mocks.readSessionPayload.mockResolvedValue({
    version: 1,
    sessionId: "22222222-2222-4222-8222-222222222222",
    workspaceId: workspace.id,
    issuedAt: 1,
    expiresAt: 4_102_444_800,
  });
  mocks.findWorkspace.mockResolvedValue(workspace);
  mocks.buildAuditEntry.mockImplementation(async (_repositories: unknown, input: { data: Record<string, unknown> }) => ({
    id: "33333333-3333-4333-8333-333333333333",
    workspaceId: workspace.id,
    occurredAt: "2026-09-02T00:00:00.000Z",
    action: "guest-rate-limit-exceeded",
    actor: { type: "human", id: "22222222-2222-4222-8222-222222222222" },
    subject: { type: "workspace", id: workspace.id },
    cause: "rejected",
    data: input.data,
    previousEntryHash: null,
    entryHash: "a".repeat(64),
  }));
  mocks.auditInsert.mockImplementation(async (_workspaceId: string, entry: AuditEntry) => entry);
});

afterEach(() => {
  for (const [name, value] of [
    ["OIW_RATE_LIMIT_DECISION_IP_CAPACITY", priorEnvironment.ipCapacity],
    ["OIW_RATE_LIMIT_DECISION_SESSION_CAPACITY", priorEnvironment.sessionCapacity],
    ["OIW_RATE_LIMIT_DECISION_REFILL_INTERVAL_MS", priorEnvironment.refillInterval],
    ["OIW_RATE_LIMIT_IP_SALT", priorEnvironment.salt],
  ] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("web guest rate-limit enforcement", () => {
  it("ignores spoofable forwarding headers unless a trusted proxy policy selects one", () => {
    const incoming = new Headers({
      "x-forwarded-for": "198.51.100.10, 198.51.100.11",
      "x-real-ip": "198.51.100.12",
      "x-vercel-forwarded-for": "198.51.100.13",
    });

    expect(clientAddressForRateLimit(incoming, {})).toBe("unknown");
    expect(clientAddressForRateLimit(incoming, { VERCEL: "1" })).toBe("198.51.100.13");
    expect(
      clientAddressForRateLimit(incoming, { OIW_TRUSTED_PROXY_HEADER: "x-forwarded-for" }),
    ).toBe("198.51.100.10");
    expect(clientAddressForRateLimit(incoming, { OIW_TRUSTED_PROXY_HEADER: "none" })).toBe(
      "unknown",
    );
  });

  it("rejects an unsupported trusted proxy header policy", () => {
    expect(() =>
      clientAddressForRateLimit(new Headers(), { OIW_TRUSTED_PROXY_HEADER: "client-ip" }),
    ).toThrow("OIW_TRUSTED_PROXY_HEADER must be");
  });

  it("rejects with 429 semantics, audits once per window and stores only a hashed IP key", async () => {
    await expect(enforceGuestRateLimit("decision", workspace)).resolves.toBeUndefined();
    await expect(enforceGuestRateLimit("decision", workspace)).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: expect.any(Number),
    });
    await expect(enforceGuestRateLimit("decision", workspace)).rejects.toBeInstanceOf(GuestRateLimitError);

    expect(mocks.auditInsert).toHaveBeenCalledTimes(1);
    const auditInput = mocks.buildAuditEntry.mock.calls[0]?.[1] as { data: Record<string, unknown> };
    expect(auditInput.data.ipKey).toMatch(/^[0-9a-f]{64}$/);
    expect(auditInput.data.ipKey).not.toBe("203.0.113.42");
    expect(auditInput.data).toMatchObject({ mutation: "decision", deniedScopes: ["ip", "session"] });
  });
});
