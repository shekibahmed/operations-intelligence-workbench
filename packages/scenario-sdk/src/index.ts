export const scenarioSdkPackageBoundary = "@oiw/scenario-sdk" as const;

export {
  DashboardDefinitionSchema,
  DashboardWidgetSchema,
  validateDashboardMetricReferences,
} from "./dashboards.js";
export type { DashboardDefinition, DashboardWidget } from "./dashboards.js";
export { formatIssue, issueError, issueWarning } from "./errors.js";
export type { PackIssue, PackIssueSeverity } from "./errors.js";
export { MANIFEST_FILE_NAME, loadManifest } from "./manifest.js";
export type { ManifestLoadResult } from "./manifest.js";
export { loadPackFromDirectory } from "./loader.js";
export type { LoadedScenarioPack, PackLoadResult } from "./loader.js";
export { getEventDefinition, validateEventDefinitionAmbiguity } from "./events.js";
export type { EventDefinitionSource } from "./events.js";
export { getCaseDefinition, getCaseDefinitionsForRule } from "./cases.js";
export { getObservationSchema, validateObservationValue } from "./observations.js";
export type {
  ObservationValueValidationIssue,
  ObservationValueValidationResult,
} from "./observations.js";
export { MetricDefinitionCatalogueSchema, getMetricDefinition } from "./metrics.js";
export type { MetricDefinitionCatalogue } from "./metrics.js";
export { buildPackRegistry } from "./registry.js";
export type { InvalidPackEntry, PackRegistry, PackRegistryEntry, SkippedPackEntry } from "./registry.js";
export { collectEventTypeReferences, RuleFileSchema, validateRuleEventTypes } from "./rules.js";
export {
  FixtureArtifactIndexEntrySchema,
  FixtureSetIndexSchema,
  loadFixtureSet,
  validateFixtureSet,
} from "./fixtures.js";
export type {
  FixtureArtifactIndexEntry,
  FixtureSetLoadResult,
  FixtureSetName,
  LoadedFixtureArtifact,
  LoadedFixtureSet,
} from "./fixtures.js";
