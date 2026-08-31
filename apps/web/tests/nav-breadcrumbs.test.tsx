import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { PrimaryNav } from "@/components/shell/PrimaryNav";

const WORKSPACE = "demo-asset-reliability";

describe("PrimaryNav", () => {
  it("renders every P0 section, always reachable regardless of lens (UX_SPEC §1.3)", () => {
    render(
      <PrimaryNav workspace={WORKSPACE} section="cases" lens="technical" defaultArtifactId="artifact-1" defaultRuleId="rule-1" />,
    );

    for (const label of ["Overview", "Inbox", "Review Queue", "Cases", "Entities", "Decisions", "Audit", "About this pack"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Artifacts" })).toHaveAttribute(
      "href",
      expect.stringContaining("/technical/artifacts/artifact-1"),
    );
  });

  it("marks the current section's nav link as the current page", () => {
    render(<PrimaryNav workspace={WORKSPACE} section="cases" lens="operations" defaultArtifactId="a" defaultRuleId="r" />);

    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Inbox" })).not.toHaveAttribute("aria-current");
  });

  it("marks the list section active on its detail pages (cases-detail → Cases)", () => {
    render(<PrimaryNav workspace={WORKSPACE} section="cases-detail" lens="operations" defaultArtifactId="a" defaultRuleId="r" />);

    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("aria-current", "page");
  });

  it("carries the active lens through every nav link's URL", () => {
    render(<PrimaryNav workspace={WORKSPACE} section="overview" lens="technical" defaultArtifactId="a" defaultRuleId="r" />);

    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("href", expect.stringContaining("lens=technical"));
  });
});

describe("Breadcrumbs", () => {
  it("shows only the pack-name crumb on Overview", () => {
    render(<Breadcrumbs workspace={WORKSPACE} packName="Asset Reliability" section="overview" lens="leadership" />);

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Asset Reliability");
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });

  it("builds Pack / Section / Item on a detail route, with Section linking back to the list", () => {
    render(
      <Breadcrumbs workspace={WORKSPACE} packName="Asset Reliability" section="cases-detail" lens="operations" itemLabel="Repeat fault — AR-1042" />,
    );

    expect(screen.getByRole("link", { name: "Cases" })).toHaveAttribute("href", expect.stringContaining(`/w/${WORKSPACE}/cases`));
    const current = screen.getByText("Repeat fault — AR-1042");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("carries the Technical section's extra nesting (Pack / Technical / Artifacts / id)", () => {
    render(
      <Breadcrumbs workspace={WORKSPACE} packName="Asset Reliability" section="technical-artifacts" lens="technical" itemLabel="art-1" />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toHaveTextContent("Asset Reliability");
    expect(nav).toHaveTextContent("Technical");
    expect(nav).toHaveTextContent("Artifacts");
    expect(nav).toHaveTextContent("art-1");
  });
});
