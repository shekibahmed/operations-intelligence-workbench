import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ActionItem } from "@oiw/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActionItemChecklist } from "@/app/w/[workspace]/cases/[caseId]/ActionItemChecklist";

const toggleActionItemAction = vi.fn();

vi.mock("@/app/w/[workspace]/cases/[caseId]/actions", () => ({
  toggleActionItemAction: (...args: unknown[]) => toggleActionItemAction(...args),
}));

function actionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "action-1",
    workspaceId: "workspace-1",
    caseId: "case-1",
    actionType: "completion-inspection",
    title: "Complete follow-up inspection",
    assignee: "Guest reviewer",
    status: "open",
    dueAt: null,
    completionEvidenceSegmentIds: [],
    completedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ActionItemChecklist", () => {
  it("renders 'No action items yet' when there are none", () => {
    render(<ActionItemChecklist workspace="demo-asset-reliability" items={[]} />);
    expect(screen.getByText("No action items yet.")).toBeInTheDocument();
  });

  it("checking an open item persists completion via the real server action", async () => {
    toggleActionItemAction.mockResolvedValue({ ok: true, actionItem: actionItem({ status: "completed" }) });
    render(<ActionItemChecklist workspace="demo-asset-reliability" items={[actionItem()]} />);

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(toggleActionItemAction).toHaveBeenCalledWith("demo-asset-reliability", "action-1", true));
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
  });

  it("shows the action's error and leaves the checkbox state unchanged on failure", async () => {
    toggleActionItemAction.mockResolvedValue({ ok: false, message: "Could not update this action item." });
    render(<ActionItemChecklist workspace="demo-asset-reliability" items={[actionItem()]} />);

    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not update this action item."));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
