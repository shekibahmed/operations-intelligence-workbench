import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionTokenPayload } from "@oiw/application";
import type { Workspace } from "@oiw/contracts";

const readSessionPayload = vi.fn<() => Promise<SessionTokenPayload | null>>();
const findBySlug = vi.fn<(slug: string) => Promise<Workspace | null>>();

vi.mock("@/lib/server/session", () => ({
  readSessionPayload: () => readSessionPayload(),
}));

vi.mock("@/lib/server/db", () => ({
  getRepositories: () => ({ workspaces: { findBySlug: (slug: string) => findBySlug(slug) } }),
}));

const { requireWorkspace } = await import("@/lib/server/workspace");

function payload(workspaceId: string): SessionTokenPayload {
  return { version: 1, sessionId: "11111111-1111-4111-8111-111111111111", workspaceId, issuedAt: 0, expiresAt: 9_999_999_999 };
}

function workspace(overrides: Partial<Workspace> & { id: string; slug: string }): Workspace {
  return {
    name: "Test workspace",
    activePackId: "asset-reliability",
    mode: "public-demo",
    createdAt: "2026-01-01T00:00:00.000Z",
    resetAt: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  readSessionPayload.mockReset();
  findBySlug.mockReset();
});

/** ADR-007: every `/w/[workspace]/*` request must resolve its session cookie to the exact workspace the URL names. */
describe("requireWorkspace — ADR-007 session-cookie guard", () => {
  it("redirects to /demo when there is no session cookie", async () => {
    readSessionPayload.mockResolvedValue(null);

    await expect(requireWorkspace("slug-no-cookie")).rejects.toThrow("REDIRECT:/demo");
    expect(findBySlug).not.toHaveBeenCalled();
  });

  it("redirects to /demo when the slug does not resolve to any workspace", async () => {
    readSessionPayload.mockResolvedValue(payload("11111111-1111-4111-8111-000000000001"));
    findBySlug.mockResolvedValue(null);

    await expect(requireWorkspace("slug-unknown")).rejects.toThrow("REDIRECT:/demo");
  });

  it("redirects to /demo when the session is bound to a different workspace than the requested slug (cross-workspace access)", async () => {
    readSessionPayload.mockResolvedValue(payload("11111111-1111-4111-8111-00000000000a"));
    findBySlug.mockResolvedValue(
      workspace({ id: "11111111-1111-4111-8111-00000000000b", slug: "slug-cross-workspace" }),
    );

    await expect(requireWorkspace("slug-cross-workspace")).rejects.toThrow("REDIRECT:/demo");
  });

  it("redirects to /demo when the workspace has expired", async () => {
    readSessionPayload.mockResolvedValue(payload("11111111-1111-4111-8111-000000000002"));
    findBySlug.mockResolvedValue(
      workspace({
        id: "11111111-1111-4111-8111-000000000002",
        slug: "slug-expired",
        expiresAt: "2000-01-01T00:00:00.000Z",
      }),
    );

    await expect(requireWorkspace("slug-expired")).rejects.toThrow("REDIRECT:/demo");
  });

  it("returns the workspace when the session matches the requested slug and has not expired", async () => {
    const record = workspace({ id: "11111111-1111-4111-8111-000000000003", slug: "slug-valid" });
    readSessionPayload.mockResolvedValue(payload("11111111-1111-4111-8111-000000000003"));
    findBySlug.mockResolvedValue(record);

    await expect(requireWorkspace("slug-valid")).resolves.toEqual(record);
  });
});
