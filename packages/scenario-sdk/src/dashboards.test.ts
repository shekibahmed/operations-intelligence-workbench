import { describe, expect, it } from "vitest";

import { DashboardDefinitionSchema, validateDashboardMetricReferences } from "./dashboards.js";

const validDashboard = {
  id: "leadership-overview",
  title: "Leadership Overview",
  widgets: [
    {
      id: "open-cases",
      type: "stat-card",
      title: "Open Cases",
      parameters: { metricId: "open-cases" },
    },
  ],
};

describe("DashboardDefinitionSchema", () => {
  it("accepts a widget from the fixed A5 catalogue", () => {
    expect(DashboardDefinitionSchema.safeParse(validDashboard).success).toBe(true);
  });

  it("rejects a widget type outside the fixed A5 catalogue", () => {
    const result = DashboardDefinitionSchema.safeParse({
      ...validDashboard,
      widgets: [{ id: "weird-widget", type: "chart-3d", title: "3D Chart", parameters: {} }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["widgets", 0, "type"]);
    }
  });

  it("requires at least one widget", () => {
    expect(DashboardDefinitionSchema.safeParse({ ...validDashboard, widgets: [] }).success).toBe(false);
  });

  it("requires every widget metricId to resolve against the loaded catalogue", () => {
    const dashboard = DashboardDefinitionSchema.parse(validDashboard);
    expect(
      validateDashboardMetricReferences("dashboard.json", dashboard, new Set(["open-cases"])),
    ).toEqual([]);
    expect(
      validateDashboardMetricReferences("dashboard.json", dashboard, new Set())[0],
    ).toMatchObject({
      path: "dashboard.json#widgets.0.parameters.metricId",
      severity: "error",
    });
  });
});
