import { DashboardWidgetTypeSchema, JsonValueSchema, SlugSchema } from "@oiw/contracts";
import { z } from "zod";

import { issueError, type PackIssue } from "./errors.js";

/**
 * Dashboard file shape. Contracts (frozen) only declare the manifest's path
 * references to dashboard files (§A5), not the file contents, so this SDK
 * owns the widget-catalogue-constrained schema for the referenced files.
 */
export const DashboardWidgetSchema = z
  .object({
    id: SlugSchema,
    type: DashboardWidgetTypeSchema,
    title: z.string().min(1),
    parameters: z.record(z.string(), JsonValueSchema),
  })
  .strict();

export const DashboardDefinitionSchema = z
  .object({
    id: SlugSchema,
    title: z.string().min(1),
    widgets: z.array(DashboardWidgetSchema).min(1),
  })
  .strict();

export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type DashboardDefinition = z.infer<typeof DashboardDefinitionSchema>;

export function validateDashboardMetricReferences(
  relativePath: string,
  dashboard: DashboardDefinition,
  metricIds: ReadonlySet<string>,
): PackIssue[] {
  const issues: PackIssue[] = [];
  dashboard.widgets.forEach((widget, index) => {
    const metricId = widget.parameters["metricId"];
    const path = `${relativePath}#widgets.${index}.parameters.metricId`;
    if (typeof metricId !== "string" || metricId.length === 0) {
      issues.push(issueError(path, "Dashboard widget requires a metricId"));
    } else if (!metricIds.has(metricId)) {
      issues.push(issueError(path, `Dashboard widget references unknown Metric "${metricId}"`));
    }
  });
  return issues;
}
