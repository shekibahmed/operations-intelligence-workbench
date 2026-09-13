import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DETAIL_VISIT_STORAGE_KEY, DetailVisitMarker } from "@/components/conversion/DetailVisitMarker";
import { EngagedAdaptBanner } from "@/components/conversion/EngagedAdaptBanner";

describe("DetailVisitMarker", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("records the session-local detail-visit signal on mount", () => {
    render(<DetailVisitMarker />);
    expect(window.sessionStorage.getItem(DETAIL_VISIT_STORAGE_KEY)).toBe("1");
  });

  it("renders nothing visible", () => {
    const { container } = render(<DetailVisitMarker />);
    expect(container.textContent).toBe("");
  });
});

describe("EngagedAdaptBanner", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stays hidden when the visitor has not opened a detail view", () => {
    render(<EngagedAdaptBanner scenario="asset-reliability" packName="Asset Reliability" />);
    expect(screen.queryByRole("heading", { name: /You've seen the evidence/ })).not.toBeInTheDocument();
  });

  it("shows the contextual call to action after a detail visit", async () => {
    window.sessionStorage.setItem(DETAIL_VISIT_STORAGE_KEY, "1");
    render(<EngagedAdaptBanner scenario="asset-reliability" packName="Asset Reliability" />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /You've seen the evidence/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Adapt this workflow/ })).toHaveAttribute(
      "href",
      "/adapt?scenario=asset-reliability",
    );
  });
});
