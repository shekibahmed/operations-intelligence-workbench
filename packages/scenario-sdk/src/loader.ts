import { access } from "node:fs/promises";
import { resolve } from "node:path";

import {
  EventDefinitionSchema,
  ObservationSchemaDefinitionSchema,
  SeedEntityCatalogueSchema,
  WorkflowDefinitionSchema,
  type EventDefinition,
  type ObservationSchemaDefinition,
  type RuleDefinition,
  type ScenarioPack,
  type SeedEntity,
  type WorkflowDefinition,
} from "@oiw/contracts";

import { DashboardDefinitionSchema, type DashboardDefinition } from "./dashboards.js";
import { issueError, type PackIssue } from "./errors.js";
import { validateEventDefinitionAmbiguity } from "./events.js";
import { validateFixtureSet } from "./fixtures.js";
import { readAndValidateJsonFile, readJsonFile } from "./json-files.js";
import { loadManifest, MANIFEST_FILE_NAME } from "./manifest.js";
import { validateObservationValue } from "./observations.js";
import { RuleFileSchema, validateRuleEventTypes } from "./rules.js";

export interface LoadedScenarioPack {
  directory: string;
  manifest: ScenarioPack;
  labels: Record<string, unknown>;
  observationSchemas: ReadonlyMap<string, ObservationSchemaDefinition>;
  eventDefinitions: ReadonlyMap<string, EventDefinition>;
  seedEntities: readonly SeedEntity[];
  workflows: Record<string, WorkflowDefinition>;
  rules: RuleDefinition[];
  dashboards: {
    leadership: DashboardDefinition;
    operations: DashboardDefinition;
    technical: DashboardDefinition;
  };
}

export type PackLoadResult =
  | { status: "loaded"; directory: string; pack: LoadedScenarioPack; warnings: PackIssue[] }
  | { status: "invalid"; directory: string; errors: PackIssue[]; warnings: PackIssue[] }
  | { status: "skipped"; directory: string; reason: string };

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const DASHBOARD_LENSES = ["leadership", "operations", "technical"] as const;
type DashboardLens = (typeof DASHBOARD_LENSES)[number];

const FIXTURE_SETS = [
  ["smoke", "smoke"],
  ["demo", "demo"],
  ["edgeCases", "edge-cases"],
] as const;

/**
 * Reads `manifest.yaml` and every file it references into a validated,
 * typed `LoadedScenarioPack`. Never throws for pack-content problems: those
 * surface as `invalid` with path-annotated issues so a registry can report
 * many packs without crashing.
 */
export async function loadPackFromDirectory(packDirectory: string): Promise<PackLoadResult> {
  const manifestPath = resolve(packDirectory, MANIFEST_FILE_NAME);
  if (!(await fileExists(manifestPath))) {
    if (await fileExists(resolve(packDirectory, "narrative"))) {
      return {
        status: "skipped",
        directory: packDirectory,
        reason:
          "Pack contains only narrative/ content; schema-bound manifest, schemas, rules and dashboards arrive with OIW-004b.",
      };
    }
    return {
      status: "invalid",
      directory: packDirectory,
      errors: [issueError(MANIFEST_FILE_NAME, "No manifest.yaml found in pack directory")],
      warnings: [],
    };
  }

  const manifestResult = await loadManifest(packDirectory);
  if (!manifestResult.ok) {
    return { status: "invalid", directory: packDirectory, errors: manifestResult.issues, warnings: [] };
  }
  const manifest = manifestResult.manifest;

  const errors: PackIssue[] = [];
  const warnings: PackIssue[] = [];

  let labels: Record<string, unknown> = {};
  const labelsResult = await readJsonFile(resolve(packDirectory, manifest.labels), manifest.labels);
  if (!labelsResult.ok) {
    errors.push(...labelsResult.issues);
  } else if (typeof labelsResult.value !== "object" || labelsResult.value === null || Array.isArray(labelsResult.value)) {
    errors.push(issueError(manifest.labels, "Expected labels file to contain a JSON object"));
  } else {
    labels = labelsResult.value as Record<string, unknown>;
  }

  const genericJsonPaths = [
    ...manifest.entityTypes.map((entityType) => entityType.schema),
    ...manifest.caseDefinitions,
    ...manifest.evaluationSets,
    ...(manifest.tours !== undefined
      ? [
          manifest.tours.leadership,
          ...(manifest.tours.operations !== undefined ? [manifest.tours.operations] : []),
          ...(manifest.tours.technical !== undefined ? [manifest.tours.technical] : []),
        ]
      : []),
  ];
  for (const relativePath of genericJsonPaths) {
    const result = await readJsonFile(resolve(packDirectory, relativePath), relativePath);
    if (!result.ok) {
      errors.push(...result.issues);
    }
  }

  const observationSchemas = new Map<string, ObservationSchemaDefinition>();
  for (const relativePath of manifest.observationSchemas) {
    const result = await readAndValidateJsonFile(
      resolve(packDirectory, relativePath),
      relativePath,
      ObservationSchemaDefinitionSchema,
    );
    if (!result.ok) {
      errors.push(...result.issues);
      continue;
    }
    if (observationSchemas.has(result.value.schemaKey)) {
      errors.push(
        issueError(
          `${relativePath}#schemaKey`,
          `Duplicate observation schemaKey: ${result.value.schemaKey}`,
        ),
      );
      continue;
    }
    observationSchemas.set(result.value.schemaKey, result.value);
  }

  const eventDefinitions = new Map<string, EventDefinition>();
  const eventDefinitionSources: Array<{ definition: EventDefinition; path: string }> = [];
  for (const eventType of manifest.eventTypes) {
    const result = await readAndValidateJsonFile(
      resolve(packDirectory, eventType.schema),
      eventType.schema,
      EventDefinitionSchema,
    );
    if (!result.ok) {
      errors.push(...result.issues);
      continue;
    }
    const definition = result.value;
    if (definition.eventType !== eventType.id) {
      errors.push(
        issueError(
          `${eventType.schema}#eventType`,
          `Event definition "${definition.eventType}" must match manifest event type "${eventType.id}"`,
        ),
      );
    }
    if (definition.displayName !== eventType.displayName) {
      errors.push(
        issueError(
          `${eventType.schema}#displayName`,
          `Event definition displayName must match manifest label "${eventType.displayName}"`,
        ),
      );
    }
    if (eventDefinitions.has(definition.eventType)) {
      errors.push(
        issueError(
          `${eventType.schema}#eventType`,
          `Duplicate Event definition: ${definition.eventType}`,
        ),
      );
      continue;
    }

    const referencedSchemaKeys = new Set([
      ...definition.requiredObservations,
      ...definition.optionalObservations,
    ]);
    for (const schemaKey of referencedSchemaKeys) {
      if (!observationSchemas.has(schemaKey)) {
        errors.push(
          issueError(
            `${eventType.schema}#${schemaKey}`,
            `Event definition references unknown observation schemaKey "${schemaKey}"`,
          ),
        );
      }
    }
    for (const [schemaKey, values] of Object.entries(
      definition.requiredObservationValues ?? {},
    )) {
      const observationSchema = observationSchemas.get(schemaKey);
      if (observationSchema === undefined) continue;
      values.forEach((value, index) => {
        const validation = validateObservationValue(observationSchema, value);
        for (const issue of validation.issues) {
          const nestedPath = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
          errors.push(
            issueError(
              `${eventType.schema}#requiredObservationValues.${schemaKey}.${index}${nestedPath}`,
              `Invalid required Observation value: ${issue.message}`,
            ),
          );
        }
      });
    }
    const primaryEntityKey = definition.primaryEntity?.observationSchemaKey;
    if (
      primaryEntityKey !== undefined &&
      observationSchemas.get(primaryEntityKey)?.entityType === undefined
    ) {
      errors.push(
        issueError(
          `${eventType.schema}#primaryEntity.observationSchemaKey`,
          `Primary Entity observation "${primaryEntityKey}" must declare an entityType`,
        ),
      );
    }
    eventDefinitions.set(definition.eventType, definition);
    eventDefinitionSources.push({ definition, path: eventType.schema });
  }
  errors.push(...validateEventDefinitionAmbiguity(eventDefinitionSources));

  const seedEntities: SeedEntity[] = [];
  if (manifest.seedEntities !== undefined) {
    const result = await readAndValidateJsonFile(
      resolve(packDirectory, manifest.seedEntities),
      manifest.seedEntities,
      SeedEntityCatalogueSchema,
    );
    if (!result.ok) {
      errors.push(...result.issues);
    } else {
      const entityTypes = new Set(manifest.entityTypes.map((entityType) => entityType.id));
      const seenIds = new Set<string>();
      for (const [index, entity] of result.value.entries()) {
        if (seenIds.has(entity.id)) {
          errors.push(
            issueError(`${manifest.seedEntities}#${index}.id`, `Duplicate seed Entity id "${entity.id}"`),
          );
          continue;
        }
        seenIds.add(entity.id);
        if (!entityTypes.has(entity.entityType)) {
          errors.push(
            issueError(
              `${manifest.seedEntities}#${index}.entityType`,
              `Seed Entity references undeclared entity type "${entity.entityType}"`,
            ),
          );
        }
        seedEntities.push(entity);
      }
    }
  }

  const workflows: Record<string, WorkflowDefinition> = {};
  for (const [workflowId, relativePath] of Object.entries(manifest.workflows)) {
    const result = await readAndValidateJsonFile(
      resolve(packDirectory, relativePath),
      relativePath,
      WorkflowDefinitionSchema,
    );
    if (result.ok) {
      workflows[workflowId] = result.value;
    } else {
      errors.push(...result.issues);
    }
  }

  const declaredEventTypeIds = new Set(manifest.eventTypes.map((eventType) => eventType.id));
  const rules: RuleDefinition[] = [];
  for (const relativePath of manifest.rules) {
    const result = await readAndValidateJsonFile(resolve(packDirectory, relativePath), relativePath, RuleFileSchema);
    if (!result.ok) {
      errors.push(...result.issues);
      continue;
    }
    rules.push(...result.value);
    errors.push(...validateRuleEventTypes(result.value, declaredEventTypeIds, relativePath));
  }

  const dashboards: Partial<Record<DashboardLens, DashboardDefinition>> = {};
  for (const lens of DASHBOARD_LENSES) {
    const relativePath = manifest.dashboards[lens];
    const result = await readAndValidateJsonFile(
      resolve(packDirectory, relativePath),
      relativePath,
      DashboardDefinitionSchema,
    );
    if (result.ok) {
      dashboards[lens] = result.value;
    } else {
      errors.push(...result.issues);
    }
  }

  for (const [manifestKey, label] of FIXTURE_SETS) {
    const relativePath = manifest.fixtures[manifestKey];
    const issues = await validateFixtureSet(packDirectory, relativePath, label);
    for (const issue of issues) {
      (issue.severity === "error" ? errors : warnings).push(issue);
    }
  }

  if (errors.length > 0) {
    return { status: "invalid", directory: packDirectory, errors, warnings };
  }

  return {
    status: "loaded",
    directory: packDirectory,
    warnings,
    pack: {
      directory: packDirectory,
      manifest,
      labels,
      observationSchemas,
      eventDefinitions,
      seedEntities,
      workflows,
      rules,
      dashboards: dashboards as LoadedScenarioPack["dashboards"],
    },
  };
}
