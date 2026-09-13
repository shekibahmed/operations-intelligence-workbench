import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TourOverlay } from "@/components/tour/TourOverlay";

const processFixtureArtifacts = vi.fn(
  async (..._args: unknown[]): Promise<{ ok: true } | { ok: false; message: string }> => ({ ok: true as const }),
);

vi.mock("@/app/w/[workspace]/inbox/actions", () => ({
  processFixtureArtifacts: (...args: unknown[]) => processFixtureArtifacts(...args),
}));

const BASE = "/w/workspace-1";

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(usePathname).mockReturnValue(`${BASE}/inbox`);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("TourOverlay", () => {
  it("stays hidden for a pack with no configured tour, even with ?tour=1", () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="not-a-real-pack" />);
    expect(screen.queryByTestId("tour-panel")).not.toBeInTheDocument();
  });

  it("activates for the other two registered packs' own tours", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="process-exceptions" />);
    await waitFor(() => expect(screen.getByTestId("tour-panel")).toBeInTheDocument());
    expect(screen.getByText("New artifacts have arrived")).toBeInTheDocument();
  });

  it("activates on the first Inbox arrival (?tour=1) and shows the first step, focused", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);

    await waitFor(() => expect(screen.getByTestId("tour-panel")).toBeInTheDocument());
    expect(screen.getByText("New artifacts have arrived")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "Guided tour · Step 1 of 10")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("tour-panel")).toHaveFocus());
  });

  it("does not activate on a plain visit with no ?tour=1 and no prior session state", () => {
    window.history.pushState({}, "", `${BASE}/inbox`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);
    expect(screen.queryByTestId("tour-panel")).not.toBeInTheDocument();
  });

  it("resumes from sessionStorage on a later page without ?tour=1", async () => {
    window.sessionStorage.setItem("oiw-tour-state", JSON.stringify({ active: true, index: 2 }));
    window.history.pushState({}, "", `${BASE}/review`);
    vi.mocked(usePathname).mockReturnValue(`${BASE}/review`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);

    await waitFor(() => expect(screen.getByText("Review uncertainty")).toBeInTheDocument());
  });

  it("Back and Next move between same-page steps and persist the new index to sessionStorage", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);
    await waitFor(() => expect(screen.getByText("New artifacts have arrived")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Process the artifact")).toBeInTheDocument());
    expect(JSON.parse(window.sessionStorage.getItem("oiw-tour-state")!)).toEqual({ active: true, index: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByText("New artifacts have arrived")).toBeInTheDocument());
  });

  it("Escape exits the tour and clears sessionStorage activity", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);
    await waitFor(() => expect(screen.getByTestId("tour-panel")).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("tour-panel")).not.toBeInTheDocument());
    expect(JSON.parse(window.sessionStorage.getItem("oiw-tour-state")!)).toEqual({ active: false, index: 0 });
  });

  it("the Exit tour button does the same as Escape", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);
    await waitFor(() => expect(screen.getByTestId("tour-panel")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Exit tour" }));
    await waitFor(() => expect(screen.queryByTestId("tour-panel")).not.toBeInTheDocument());
  });

  it("shows the activation framing and milestone checklist on the first step", async () => {
    window.history.pushState({}, "", `${BASE}/inbox?tour=1`);
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);

    await waitFor(() => expect(screen.getByTestId("tour-panel")).toBeInTheDocument());
    expect(screen.getByText(/Activation step 1 of 7/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tour progress" })).toBeInTheDocument();
    expect(screen.getByText("Process raw input")).toBeInTheDocument();
  });

  it("keeps the visitor on the same step with a retry message when fixture processing fails", async () => {
    window.sessionStorage.setItem("oiw-tour-state", JSON.stringify({ active: true, index: 2 }));
    window.history.pushState({}, "", `${BASE}/review`);
    vi.mocked(usePathname).mockReturnValue(`${BASE}/review`);
    processFixtureArtifacts.mockResolvedValueOnce({ ok: false as const, message: "Processing failed unexpectedly." });
    render(<TourOverlay workspace="workspace-1" base={BASE} packId="asset-reliability" />);

    await waitFor(() => expect(screen.getByText("Review uncertainty")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/Your place in the tour is kept/)).toBeInTheDocument();
    expect(screen.getByText("Review uncertainty")).toBeInTheDocument();
    expect(processFixtureArtifacts).toHaveBeenCalledWith("workspace-1", [
      "asset-reliability-demo-002",
      "asset-reliability-demo-003",
      "asset-reliability-demo-004",
      "asset-reliability-demo-005",
    ]);
  });
});
