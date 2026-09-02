import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Decision } from "@oiw/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DecisionCard, type DecisionCardData } from "@/app/w/[workspace]/decisions/DecisionCard";

const decideOnDecision = vi.fn();

vi.mock("@/app/w/[workspace]/decisions/actions", () => ({
  decideOnDecision: (...args: unknown[]) => decideOnDecision(...args),
}));

function decision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "decision-1",
    workspaceId: "workspace-1",
    caseId: "case-1",
    decisionType: "remove-from-service",
    proposal: "Hold asset from service",
    rationale: "Repeated safety-critical fault",
    evidenceSegmentIds: ["segment-1"],
    riskLevel: "low",
    approvalPolicyId: "asset-removal-approval",
    status: "awaiting-approval",
    createdAt: "2026-05-01T00:00:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

function cardData(overrides: Partial<Decision> = {}): DecisionCardData {
  return {
    decision: decision(overrides),
    proposalLabel: "Remove From Service: Hold asset from service",
    triggeringRule: { label: "safety-critical-removal-approval v1.0.0", href: "/w/demo/technical/rules/safety-critical-removal-approval" },
    requiredApprover: "Asset Removal Approval",
    potentialConsequence: "The underlying risk remains unmitigated until this decision is resolved.",
    evidenceLinks: [],
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DecisionCard", () => {
  it("approves a low-risk decision directly, without requiring a comment", async () => {
    decideOnDecision.mockResolvedValue({ ok: true, decision: decision({ status: "approved" }) });
    render(<DecisionCard workspace="demo-asset-reliability" data={cardData({ riskLevel: "low" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(decideOnDecision).toHaveBeenCalledWith("demo-asset-reliability", "decision-1", "approved", ""));
    await waitFor(() => expect(screen.getByText("Status: Approved")).toBeInTheDocument());
  });

  it("requires a non-empty comment before a high-risk decision can be approved", async () => {
    decideOnDecision.mockResolvedValue({ ok: true, decision: decision({ status: "approved", riskLevel: "critical" }) });
    render(<DecisionCard workspace="demo-asset-reliability" data={cardData({ riskLevel: "critical" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Approve/ }));
    const dialog = screen.getByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: /Approve/ });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Comment/), { target: { value: "Confirmed unsafe to operate." } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);

    await waitFor(() =>
      expect(decideOnDecision).toHaveBeenCalledWith("demo-asset-reliability", "decision-1", "approved", "Confirmed unsafe to operate."),
    );
  });

  it("shows the action's error on this card and leaves the decision pending", async () => {
    decideOnDecision.mockResolvedValue({ ok: false, message: "Could not save this decision." });
    render(<DecisionCard workspace="demo-asset-reliability" data={cardData({ riskLevel: "low" })} />);

    fireEvent.click(screen.getByRole("button", { name: /Reject/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save this decision."));
    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
  });
});
