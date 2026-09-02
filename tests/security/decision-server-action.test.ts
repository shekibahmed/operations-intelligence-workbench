import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Approval, AuditEntry, Case, Decision, Workspace } from "@oiw/contracts";

const mocks = vi.hoisted(() => ({
  enforceGuestRateLimit: vi.fn(),
  getRepositories: vi.fn(),
  readSessionPayload: vi.fn(),
  requireWorkspace: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  enforceGuestRateLimit: (...args: unknown[]) => mocks.enforceGuestRateLimit(...args),
}));
vi.mock("@/lib/server/db", () => ({ getRepositories: () => mocks.getRepositories() }));
vi.mock("@/lib/server/session", () => ({ readSessionPayload: () => mocks.readSessionPayload() }));
vi.mock("@/lib/server/workspace", () => ({
  requireWorkspace: (slug: string) => mocks.requireWorkspace(slug),
}));

const { UserFacingActionError } = await import("@/lib/server/action-error");
const { decideOnDecision } = await import("@/app/w/[workspace]/decisions/actions");

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222222";
const decisionId = "33333333-3333-4333-8333-333333333333";
const otherDecisionId = "44444444-4444-4444-8444-444444444444";
const caseId = "55555555-5555-4555-8555-555555555555";

const workspace: Workspace = {
  id: workspaceId,
  name: "Synthetic workspace",
  slug: "workspace-a",
  activePackId: "test-pack",
  mode: "public-demo",
  createdAt: "2026-09-02T00:00:00.000Z",
  resetAt: null,
  expiresAt: "2099-09-02T00:00:00.000Z",
};

function decision(id = decisionId, ownerWorkspaceId = workspaceId): Decision {
  return {
    id,
    workspaceId: ownerWorkspaceId,
    caseId,
    decisionType: "test-decision",
    proposal: "Synthetic proposal",
    rationale: "Synthetic rationale",
    evidenceSegmentIds: ["66666666-6666-4666-8666-666666666666"],
    riskLevel: "critical",
    approvalPolicyId: "human-required",
    status: "awaiting-approval",
    createdAt: "2026-09-02T00:00:00.000Z",
    decidedAt: null,
  };
}

function caseRecord(): Case {
  return {
    id: caseId,
    workspaceId,
    caseType: "test-case",
    title: "Synthetic case",
    status: "open",
    priority: "high",
    severity: "critical",
    owner: null,
    dueAt: null,
    relatedEntityIds: [],
    relatedEventIds: [],
    relatedSignalIds: [],
    closureRequirementIds: [],
    reEvaluationStatus: "not-required",
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
  };
}

interface ActionState {
  decisions: Map<string, Decision>;
  approvals: Approval[];
  cases: Map<string, Case>;
  audits: AuditEntry[];
}

function repositories(state: ActionState) {
  return {
    decisions: {
      async findById(scope: string, id: string): Promise<Decision | null> {
        const record = state.decisions.get(id) ?? null;
        return record?.workspaceId === scope ? record : null;
      },
      async update(scope: string, id: string, value: Decision): Promise<Decision | null> {
        const current = state.decisions.get(id);
        if (current?.workspaceId !== scope || value.workspaceId !== scope) return null;
        state.decisions.set(id, value);
        return value;
      },
    },
    approvals: {
      async insert(scope: string, value: Approval): Promise<Approval> {
        if (value.workspaceId !== scope) throw new Error("cross-workspace approval");
        state.approvals.push(value);
        return value;
      },
      async list(scope: string): Promise<Approval[]> {
        return state.approvals.filter((approval) => approval.workspaceId === scope);
      },
    },
    cases: {
      async findById(scope: string, id: string): Promise<Case | null> {
        const record = state.cases.get(id) ?? null;
        return record?.workspaceId === scope ? record : null;
      },
      async update(scope: string, id: string, value: Case): Promise<Case | null> {
        const current = state.cases.get(id);
        if (current?.workspaceId !== scope || value.workspaceId !== scope) return null;
        state.cases.set(id, value);
        return value;
      },
    },
    auditEntries: {
      async insert(scope: string, value: AuditEntry): Promise<AuditEntry> {
        if (value.workspaceId !== scope) throw new Error("cross-workspace audit");
        state.audits.push(value);
        return value;
      },
      async list(scope: string): Promise<AuditEntry[]> {
        return state.audits.filter((entry) => entry.workspaceId === scope);
      },
    },
  };
}

let state: ActionState;

beforeEach(() => {
  state = {
    decisions: new Map([
      [decisionId, decision()],
      [otherDecisionId, decision(otherDecisionId, otherWorkspaceId)],
    ]),
    approvals: [],
    cases: new Map([[caseId, caseRecord()]]),
    audits: [],
  };
  mocks.getRepositories.mockReturnValue(repositories(state));
  mocks.requireWorkspace.mockResolvedValue(workspace);
  mocks.readSessionPayload.mockResolvedValue({
    version: 1,
    sessionId: "77777777-7777-4777-8777-777777777777",
    workspaceId,
    issuedAt: 1,
    expiresAt: 4_102_444_800,
  });
  mocks.enforceGuestRateLimit.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("decision Server Action adversarial boundary", () => {
  it("rejects a crafted status/outcome value before writing an Approval", async () => {
    const result = await decideOnDecision(
      workspace.slug,
      decisionId,
      "status:approved" as Approval["outcome"],
      "crafted input",
    );

    expect(result).toEqual({ ok: false, message: "The decision request is invalid." });
    expect(state.approvals).toHaveLength(0);
    expect(state.decisions.get(decisionId)?.status).toBe("awaiting-approval");
  });

  it("requires a non-empty comment for a high-risk decision before any write", async () => {
    const result = await decideOnDecision(workspace.slug, decisionId, "approved", "   ");

    expect(result).toEqual({
      ok: false,
      message: "A comment is required to decide on a high-risk decision.",
    });
    expect(state.approvals).toHaveLength(0);
  });

  it("rejects replay after one recorded Approval and leaves exactly one Approval", async () => {
    const first = await decideOnDecision(workspace.slug, decisionId, "approved", "Human reviewed evidence.");
    const replay = await decideOnDecision(workspace.slug, decisionId, "approved", "Replay the same request.");

    expect(first.ok).toBe(true);
    expect(replay).toEqual({ ok: false, message: "Could not save this decision." });
    expect(state.approvals).toHaveLength(1);
    expect(state.decisions.get(decisionId)?.status).toBe("approved");
  });

  it("fails a direct object reference owned by another workspace without revealing it", async () => {
    const result = await decideOnDecision(
      workspace.slug,
      otherDecisionId,
      "approved",
      "Try another workspace's decision.",
    );

    expect(result).toEqual({ ok: false, message: "This decision could not be found." });
    expect(state.approvals).toHaveLength(0);
    expect(state.decisions.get(otherDecisionId)?.status).toBe("awaiting-approval");
  });

  it("returns a 429-equivalent result and performs no write when rate-limited", async () => {
    const error = Object.assign(new UserFacingActionError("Too many requests. Try again in 60 seconds."), {
      status: 429 as const,
      retryAfterSeconds: 60,
    });
    mocks.enforceGuestRateLimit.mockRejectedValueOnce(error);

    const result = await decideOnDecision(workspace.slug, decisionId, "approved", "Human reviewed evidence.");

    expect(result).toEqual({
      ok: false,
      message: "Too many requests. Try again in 60 seconds.",
      status: 429,
      retryAfterSeconds: 60,
    });
    expect(state.approvals).toHaveLength(0);
    expect(state.decisions.get(decisionId)?.status).toBe("awaiting-approval");
  });
});
