import { render, screen } from "@testing-library/react";
import type { DashboardDefinition } from "@oiw/scenario-sdk";
import { describe, expect, it } from "vitest";

import { DashboardGrid } from "@/components/widgets/DashboardGrid";
import type { MetricValue } from "@/lib/server/metrics";

const BASE = "/w/workspace-1";

function dashboard(widgets: DashboardDefinition["widgets"]): DashboardDefinition {
  return { id: "leadership", title: "Leadership", widgets };
}

describe("DashboardGrid", () => {
  it("renders a stat-card widget from a real stat metric value", () => {
    const values = new Map<string, MetricValue>([
      ["critical-signal-count", { kind: "stat", value: 3, classification: "calculated", sampleRecords: [] }],
    ]);
    render(
      <DashboardGrid
        dashboard={dashboard([{ id: "w1", type: "stat-card", title: "Critical Signals", parameters: { metricId: "critical-signal-count" } }])}
        values={values}
        base={BASE}
      />,
    );
    expect(screen.getByText("Critical Signals")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Calculated")).toBeInTheDocument();
  });

  it("renders a severity-breakdown widget from a real breakdown metric value", () => {
    const values = new Map<string, MetricValue>([
      [
        "cases-by-severity",
        { kind: "breakdown", classification: "calculated", entries: [{ key: "critical", label: "Critical", count: 2, href: `${BASE}/cases?severity=critical` }] },
      ],
    ]);
    render(
      <DashboardGrid
        dashboard={dashboard([{ id: "w1", type: "severity-breakdown", title: "Cases by Severity", parameters: { metricId: "cases-by-severity" } }])}
        values={values}
        base={BASE}
      />,
    );
    const link = screen.getByRole("link", { name: "2" });
    expect(link).toHaveAttribute("href", `${BASE}/cases?severity=critical`);
  });

  it("renders a list-card widget's real sample records as linked items", () => {
    const values = new Map<string, MetricValue>([
      [
        "open-reliability-cases",
        {
          kind: "stat",
          value: 1,
          classification: "calculated",
          sampleRecords: [{ key: "case-1", title: "Reliability Case: fault-reported", supportingLine: "Open", href: `${BASE}/cases/case-1` }],
        },
      ],
    ]);
    render(
      <DashboardGrid
        dashboard={dashboard([{ id: "w1", type: "list-card", title: "Open Reliability Cases", parameters: { metricId: "open-reliability-cases" } }])}
        values={values}
        base={BASE}
      />,
    );
    const link = screen.getByRole("link", { name: "Reliability Case: fault-reported" });
    expect(link).toHaveAttribute("href", `${BASE}/cases/case-1`);
  });

  it("renders a text-impact widget's hypothetical value with its provenance badge and caveat text", () => {
    const values = new Map<string, MetricValue>([["estimated-downtime-exposure", { kind: "text", classification: "hypothetical", value: "~24h" }]]);
    render(
      <DashboardGrid
        dashboard={dashboard([
          {
            id: "w1",
            type: "text-impact",
            title: "Estimated Downtime Exposure",
            parameters: { metricId: "estimated-downtime-exposure", caveat: "Hypothetical estimate, not an observed measurement." },
          },
        ])}
        values={values}
        base={BASE}
      />,
    );
    expect(screen.getByText("~24h")).toBeInTheDocument();
    expect(screen.getByText("Hypothetical")).toBeInTheDocument();
    expect(screen.getByText("Hypothetical estimate, not an observed measurement.")).toBeInTheDocument();
  });

  it("renders a sla-table widget's real rows with risk labels", () => {
    const values = new Map<string, MetricValue>([
      ["overdue-actions", { kind: "rows", classification: "calculated", rows: [{ key: "action-1", name: "Reliability Case: fault-reported", dueLabel: "9/1/2020", risk: "overdue", href: `${BASE}/cases/case-1` }] }],
    ]);
    render(
      <DashboardGrid
        dashboard={dashboard([{ id: "w1", type: "sla-table", title: "Overdue and At-Risk Actions", parameters: { metricId: "overdue-actions" } }])}
        values={values}
        base={BASE}
      />,
    );
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reliability Case: fault-reported" })).toHaveAttribute("href", `${BASE}/cases/case-1`);
  });

  it("shows a not-found message rather than crashing when a widget's metricId has no evaluated value", () => {
    render(
      <DashboardGrid
        dashboard={dashboard([{ id: "w1", type: "stat-card", title: "Unknown Metric", parameters: { metricId: "does-not-exist" } }])}
        values={new Map()}
        base={BASE}
      />,
    );
    expect(screen.getByText(/metric not found/)).toBeInTheDocument();
  });
});
