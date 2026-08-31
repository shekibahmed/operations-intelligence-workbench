import { render, screen } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "@/app/page";
import ScenarioSelectorPage from "@/app/demo/page";
import GuidedScenarioStartPage from "@/app/demo/[pack]/page";
import AdaptCtaPage from "@/app/adapt/page";
import LeadershipOverviewPage from "@/app/w/[workspace]/overview/page";
import ArtifactInboxPage from "@/app/w/[workspace]/inbox/page";
import ReviewQueuePage from "@/app/w/[workspace]/review/page";
import CaseListPage from "@/app/w/[workspace]/cases/page";
import CaseDetailPage from "@/app/w/[workspace]/cases/[caseId]/page";
import EntityListPage from "@/app/w/[workspace]/entities/page";
import EntityDetailPage from "@/app/w/[workspace]/entities/[entityId]/page";
import DecisionCentrePage from "@/app/w/[workspace]/decisions/page";
import TechnicalArtifactInspectorPage from "@/app/w/[workspace]/technical/artifacts/[id]/page";
import TechnicalRuleTracePage from "@/app/w/[workspace]/technical/rules/[id]/page";
import AuditExplorerPage from "@/app/w/[workspace]/audit/page";
import AboutPackPage from "@/app/w/[workspace]/about-pack/page";
import { artifactIds, caseIds, entityIds } from "@/lib/stub/ids";
import { stubRuleTrace } from "@/lib/stub/rule-trace";

const WORKSPACE = "demo-asset-reliability";

/**
 * These route-smoke tests call page functions directly (no real Next.js
 * server, no real Postgres). `requireWorkspace`/`getWorkspacePackLabels`
 * stand in for a validated guest session; `getRepositories` stands in for
 * `@oiw/persistence`, reusing the same in-repo stub fixtures the rest of
 * this file already renders against (loaded via dynamic `import()` inside
 * the factory since `vi.mock` factories are hoisted above this file's own
 * imports and cannot safely close over module-level `const`s declared
 * below them). Session-cookie and real-data-mapping behaviour is covered
 * separately in `server-workspace.test.ts` and `inbox-mapping.test.ts`.
 */
const FAKE_WORKSPACE = vi.hoisted(() => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Asset Reliability Demo",
  slug: "demo-asset-reliability",
  activePackId: "asset-reliability",
  mode: "public-demo" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  resetAt: null,
  expiresAt: "2099-01-01T00:00:00.000Z",
}));

const FAKE_LABELS = vi.hoisted(() => ({
  packId: "asset-reliability",
  packName: "Asset Reliability",
  packDescription: "Test-double pack description.",
  entityTypes: {},
  eventTypes: {},
  signalTypes: {},
  caseTypes: {},
  actionTypes: {},
  decisionTypes: {},
  workflowStates: {},
}));

vi.mock("@/lib/server/workspace", () => ({
  requireWorkspace: vi.fn(async () => FAKE_WORKSPACE),
}));

vi.mock("@/lib/server/pack-registry", () => ({
  getWorkspacePackLabels: vi.fn(async () => FAKE_LABELS),
  findPackEntry: vi.fn(async () => undefined),
  loadPackRegistry: vi.fn(async () => ({ loaded: [], invalid: [], skipped: [], get: () => undefined, list: () => [] })),
}));

vi.mock("@/lib/server/db", async () => {
  const stub = await import("@/lib/stub");
  return {
    getRepositories: () => ({
      artifacts: {
        list: async () => stub.stubArtifacts,
        findById: async (_workspaceId: string, id: string) => stub.stubArtifacts.find((artifact) => artifact.id === id) ?? null,
      },
      sources: { list: async () => stub.stubSources },
      cases: { list: async () => stub.stubCases },
      decisions: { list: async () => stub.stubDecisions },
      auditEntries: { list: async () => stub.stubAuditEntries },
      artifactSegments: {
        listByArtifact: async (_workspaceId: string, artifactId: string) =>
          stub.stubArtifactSegments.filter((segment) => segment.artifactId === artifactId),
      },
    }),
  };
});

function setRoute(pathname: string, query: Record<string, string> = {}) {
  vi.mocked(usePathname).mockReturnValue(pathname);
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(query) as never);
}

describe("route smoke tests — every §19 route renders without throwing", () => {
  it("R1 landing page", () => {
    setRoute("/");
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("R2 scenario selector", async () => {
    setRoute("/demo");
    const element = await ScenarioSelectorPage({ searchParams: Promise.resolve({}) });
    render(element);
    expect(screen.getByText("Asset Reliability")).toBeInTheDocument();
  });

  it("R3 guided scenario start", async () => {
    setRoute("/demo/asset-reliability");
    const element = await GuidedScenarioStartPage({
      params: Promise.resolve({ pack: "asset-reliability" }),
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Asset Reliability" })).toBeInTheDocument();
  });

  it("R16 adapt CTA", async () => {
    setRoute("/adapt");
    const element = await AdaptCtaPage({ searchParams: Promise.resolve({ scenario: "asset-reliability" }) });
    render(element);
    expect(screen.getByRole("heading", { name: /Adapt this workflow/i })).toBeInTheDocument();
  });

  it("R4 leadership overview", async () => {
    setRoute(`/w/${WORKSPACE}/overview`, { lens: "leadership" });
    const element = await LeadershipOverviewPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "leadership" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("R5 artifact inbox", async () => {
    setRoute(`/w/${WORKSPACE}/inbox`, { lens: "operations" });
    const element = await ArtifactInboxPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
  });

  it("R6 review queue", async () => {
    setRoute(`/w/${WORKSPACE}/review`, { lens: "operations" });
    const element = await ReviewQueuePage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Review Queue" })).toBeInTheDocument();
  });

  it("R7 case list", async () => {
    setRoute(`/w/${WORKSPACE}/cases`, { lens: "operations" });
    const element = await CaseListPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Cases" })).toBeInTheDocument();
  });

  it("R8 case detail", async () => {
    setRoute(`/w/${WORKSPACE}/cases/${caseIds.open}`, { lens: "operations" });
    const element = await CaseDetailPage({
      params: Promise.resolve({ workspace: WORKSPACE, caseId: caseIds.open }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getAllByText(/Repeat brake-assembly fault/).length).toBeGreaterThan(0);
  });

  it("R9 entity list", async () => {
    setRoute(`/w/${WORKSPACE}/entities`, { lens: "operations" });
    const element = await EntityListPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Entities" })).toBeInTheDocument();
  });

  it("R10 entity detail", async () => {
    setRoute(`/w/${WORKSPACE}/entities/${entityIds.assetPrimary}`, { lens: "operations" });
    const element = await EntityDetailPage({
      params: Promise.resolve({ workspace: WORKSPACE, entityId: entityIds.assetPrimary }),
      searchParams: Promise.resolve({ lens: "operations" }),
    });
    render(element);
    expect(screen.getAllByText("AR-1042").length).toBeGreaterThan(0);
  });

  it("R11 decision centre", async () => {
    setRoute(`/w/${WORKSPACE}/decisions`, { lens: "leadership" });
    const element = await DecisionCentrePage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "leadership" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Decisions" })).toBeInTheDocument();
  });

  it("R12 technical artifact inspector", async () => {
    setRoute(`/w/${WORKSPACE}/technical/artifacts/${artifactIds.informal}`, { lens: "technical" });
    const element = await TechnicalArtifactInspectorPage({
      params: Promise.resolve({ workspace: WORKSPACE, id: artifactIds.informal }),
      searchParams: Promise.resolve({ lens: "technical" }),
    });
    render(element);
    expect(screen.getByRole("tab", { name: "Artifact" })).toHaveAttribute("aria-selected", "true");
  });

  it("R13 technical rule trace", async () => {
    setRoute(`/w/${WORKSPACE}/technical/rules/${stubRuleTrace.ruleId}`, { lens: "technical" });
    const element = await TechnicalRuleTracePage({
      params: Promise.resolve({ workspace: WORKSPACE, id: stubRuleTrace.ruleId }),
      searchParams: Promise.resolve({ lens: "technical" }),
    });
    render(element);
    expect(screen.getByRole("tab", { name: "Rule trace" })).toHaveAttribute("aria-selected", "true");
  });

  it("R14 audit explorer", async () => {
    setRoute(`/w/${WORKSPACE}/audit`, { lens: "technical" });
    const element = await AuditExplorerPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "technical" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Audit" })).toBeInTheDocument();
  });

  it("R15 about this pack", async () => {
    setRoute(`/w/${WORKSPACE}/about-pack`, { lens: "technical" });
    const element = await AboutPackPage({
      params: Promise.resolve({ workspace: WORKSPACE }),
      searchParams: Promise.resolve({ lens: "technical" }),
    });
    render(element);
    expect(screen.getByRole("heading", { name: "Asset Reliability" })).toBeInTheDocument();
  });
});
