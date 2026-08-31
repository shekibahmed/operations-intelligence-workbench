import type { DashboardDefinition, DashboardWidget } from "@oiw/scenario-sdk";

import { ActivityFeed } from "@/components/widgets/ActivityFeed";
import { ListCard } from "@/components/widgets/ListCard";
import { PendingApprovalsCard } from "@/components/widgets/PendingApprovalsCard";
import { SeverityBreakdown } from "@/components/widgets/SeverityBreakdown";
import { SlaTable } from "@/components/widgets/SlaTable";
import { StatCard } from "@/components/widgets/StatCard";
import { TextImpactCard } from "@/components/widgets/TextImpactCard";
import { TrendLine } from "@/components/widgets/TrendLine";
import { formatMetricNumber, type MetricValue } from "@/lib/server/metrics";

/**
 * Generic, pack-neutral renderer over a pack's `DashboardDefinition` (A5):
 * for every widget it looks up the evaluated `MetricValue` by
 * `widget.parameters.metricId` and maps it onto the one widget component the
 * widget's `type` names. No pack ID or industry noun appears here — widget
 * titles and any per-item labels are already pack-labelled by the time they
 * reach `MetricValue` (`lib/server/metrics.ts`).
 */
export function DashboardGrid({
  dashboard,
  values,
  base,
}: {
  dashboard: DashboardDefinition;
  values: Map<string, MetricValue>;
  base: string;
}) {
  return (
    <div data-tour="tour-dashboard-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dashboard.widgets.map((widget) => (
        <DashboardWidgetView key={widget.id} widget={widget} value={values.get(metricIdOf(widget))} base={base} />
      ))}
    </div>
  );
}

function metricIdOf(widget: DashboardWidget): string {
  return typeof widget.parameters["metricId"] === "string" ? widget.parameters["metricId"] : "";
}

function DashboardWidgetView({ widget, value, base }: { widget: DashboardWidget; value: MetricValue | undefined; base: string }) {
  if (value === undefined) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-ink-muted xl:col-span-1">
        {widget.title}: metric not found.
      </div>
    );
  }

  switch (widget.type) {
    case "stat-card": {
      if (value.kind !== "stat") return null;
      return (
        <StatCard
          label={widget.title}
          value={value.value}
          classification={value.classification}
          subtext={value.value === 0 ? "No activity yet — process an artifact to begin." : undefined}
        />
      );
    }
    case "severity-breakdown": {
      if (value.kind !== "breakdown") return null;
      return <SeverityBreakdown title={widget.title} tiers={value.entries} />;
    }
    case "list-card": {
      if (value.kind !== "stat") return null;
      return (
        <ListCard
          title={widget.title}
          items={value.sampleRecords.map((record) => ({
            key: record.key,
            title: record.title,
            supportingLine: record.supportingLine,
            ...(record.href !== undefined ? { href: record.href } : {}),
          }))}
          viewAllHref={listViewAllHref(base, widget)}
          emptyMessage="Nothing here yet."
        />
      );
    }
    case "trend-line": {
      if (value.kind !== "series") return null;
      const periods = typeof widget.parameters["periods"] === "number" ? widget.parameters["periods"] : value.points.length;
      return <TrendLine title={widget.title} seriesLabel={widget.title} points={value.points.slice(-periods)} />;
    }
    case "sla-table": {
      if (value.kind !== "rows") return null;
      return <SlaTable title={widget.title} rows={value.rows} emptyMessage="Nothing overdue or at risk right now." />;
    }
    case "pending-approvals": {
      if (value.kind !== "stat") return null;
      return (
        <PendingApprovalsCard
          viewAllHref={`${base}/decisions`}
          approvals={value.sampleRecords.map((record) => ({
            key: record.key,
            title: record.title,
            riskLevel: record.riskLevel ?? "unknown",
            href: record.href ?? `${base}/decisions`,
          }))}
        />
      );
    }
    case "activity-feed": {
      if (value.kind !== "activity") return null;
      return <ActivityFeed entries={value.entries} auditHref={`${base}/audit`} />;
    }
    case "text-impact": {
      const caveat = typeof widget.parameters["caveat"] === "string" ? widget.parameters["caveat"] : undefined;
      const display =
        value.kind === "text"
          ? value.value
          : value.kind === "stat"
            ? formatMetricNumber(value.value, "number")
            : "";
      return (
        <TextImpactCard
          heading={widget.title}
          body={caveat ?? ""}
          metric={{ value: display, classification: value.classification }}
        />
      );
    }
    default:
      return null;
  }
}

function listViewAllHref(base: string, widget: DashboardWidget): string {
  const metricId = metricIdOf(widget);
  if (metricId.includes("case")) return `${base}/cases`;
  if (metricId.includes("decision")) return `${base}/decisions`;
  return `${base}/audit`;
}
