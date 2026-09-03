import type { ReactNode } from "react";

import { AnalyticsPageEvents, type AnalyticsPageEventDefinition } from "@/components/analytics/AnalyticsPageEvents";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { LensCookieSync } from "@/components/shell/LensCookieSync";
import { MobileNavDrawer } from "@/components/shell/MobileNavDrawer";
import { PrimaryNav } from "@/components/shell/PrimaryNav";
import { TopBar } from "@/components/shell/TopBar";
import { TourOverlay } from "@/components/tour/TourOverlay";
import type { Lens } from "@/lib/lens";
import { workspaceBase } from "@/lib/routes";

export function WorkspaceShell({
  workspace,
  packName,
  packId,
  section,
  lens,
  sessionMinutesRemaining,
  itemLabel,
  defaultArtifactId,
  defaultRuleId,
  children,
}: {
  workspace: string;
  packName: string;
  packId: string;
  /**
   * The section of the page rendering this shell (e.g. "audit",
   * "cases-detail", "technical-rules"). Passed down instead of reading
   * usePathname() so nav/breadcrumb active state always matches the
   * server-rendered tree during route transitions (hydration-safe).
   */
  section: string;
  lens: Lens;
  sessionMinutesRemaining: number;
  itemLabel?: string | undefined;
  defaultArtifactId: string;
  defaultRuleId: string;
  children: ReactNode;
}) {
  const analyticsEvents: AnalyticsPageEventDefinition[] = [];
  if (section === "cases-detail") analyticsEvents.push({ name: "case-opened" });
  if (section === "decisions") analyticsEvents.push({ name: "decision-viewed" });
  if (section === "technical-artifacts") {
    analyticsEvents.push({ name: "artifact-opened" }, { name: "technical-trace-viewed" });
  }
  if (section === "technical-rules") analyticsEvents.push({ name: "technical-trace-viewed" });
  const contextualEvents = analyticsEvents.map((event) => ({
    ...event,
    context: { ...event.context, scenarioId: packId, lens },
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsPageEvents events={contextualEvents} />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-2">
        Skip to main content
      </a>
      <LensCookieSync lens={lens} />
      <TopBar workspace={workspace} packName={packName} packId={packId} lens={lens} sessionMinutesRemaining={sessionMinutesRemaining} />
      <div className="flex flex-1 flex-col xl:flex-row">
        <MobileNavDrawer>
          <PrimaryNav workspace={workspace} section={section} lens={lens} defaultArtifactId={defaultArtifactId} defaultRuleId={defaultRuleId} />
        </MobileNavDrawer>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Breadcrumbs workspace={workspace} packName={packName} section={section} lens={lens} itemLabel={itemLabel} />
          <main id="main-content" className="flex flex-1 flex-col gap-4">
            {children}
          </main>
        </div>
      </div>
      <TourOverlay workspace={workspace} base={workspaceBase(workspace)} packId={packId} />
    </div>
  );
}
