import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DemoSummary, buildDemoSummaryText } from "@/components/tour/DemoSummary";

describe("buildDemoSummaryText", () => {
  it("names the scenario, entry, progress, and synthetic-data footer", () => {
    const text = buildDemoSummaryText({
      packName: "Asset Reliability",
      scenarioId: "asset-reliability",
      entry: "Guided tour",
      progress: "Step 7 of 10",
    });

    expect(text).toContain("Asset Reliability");
    expect(text).toContain("Scenario: asset-reliability");
    expect(text).toContain("Entry: Guided tour");
    expect(text).toContain("Progress: Step 7 of 10");
    expect(text).toContain("Synthetic demo data");
  });
});

describe("DemoSummary", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders free-exploration progress with a copy action and assessment link", async () => {
    window.history.pushState({}, "", "/w/workspace-1/overview");
    render(<DemoSummary packName="Asset Reliability" scenarioId="asset-reliability" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Demo summary" })).toBeInTheDocument());
    expect(screen.getByText("Free exploration")).toBeInTheDocument();
    expect(screen.getByText("Exploring freely")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy summary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Discuss this workflow/ })).toHaveAttribute(
      "href",
      "/adapt?scenario=asset-reliability",
    );
    expect(screen.getByText(/Synthetic demo data/)).toBeInTheDocument();
  });

  it("reflects guided-tour progress from session state", async () => {
    window.history.pushState({}, "", "/w/workspace-1/overview");
    window.sessionStorage.setItem("oiw-tour-state", JSON.stringify({ active: true, index: 6 }));
    render(<DemoSummary packName="Asset Reliability" scenarioId="asset-reliability" />);

    await waitFor(() => expect(screen.getByText("Guided tour")).toBeInTheDocument());
    expect(screen.getByText("Step 7 of 10")).toBeInTheDocument();
  });
});
