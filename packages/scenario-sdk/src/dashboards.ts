import { DashboardWidgetTypeSchema, JsonValueSchema, SlugSchema } from "@oiw/contracts";
import { z } from "zod";

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
