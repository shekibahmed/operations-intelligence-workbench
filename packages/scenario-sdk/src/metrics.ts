import { MetricDefinitionV15Schema, type MetricDefinitionV15 } from "@oiw/contracts";
import { z } from "zod";

export const MetricDefinitionCatalogueSchema = z.array(MetricDefinitionV15Schema).min(1);

export interface MetricDefinitionCatalogue {
  metricDefinitions: ReadonlyMap<string, MetricDefinitionV15>;
}

export function getMetricDefinition(
  pack: MetricDefinitionCatalogue,
  metricId: string,
): MetricDefinitionV15 | undefined {
  return pack.metricDefinitions.get(metricId);
}
