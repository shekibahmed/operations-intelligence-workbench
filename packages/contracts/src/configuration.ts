import { z } from "zod";

import { JsonValueSchema, SlugSchema, VersionSchema } from "./common.js";
import type { JsonValue } from "./common.js";

export const RelativePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith("/") && !value.split("/").includes(".."), {
    message: "Expected a repository-relative path without parent traversal",
  });

export const EventFieldFactSchema = z
  .object({
    kind: z.literal("event-field"),
    field: z.enum(["eventType", "occurredAt", "recordedAt", "entityIds", "attributes"]),
    attributeKey: SlugSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.field === "attributes" && value.attributeKey === undefined) {
      context.addIssue({
        code: "custom",
        message: "Event attributes require an attributeKey",
        path: ["attributeKey"],
      });
    }
    if (value.field !== "attributes" && value.attributeKey !== undefined) {
      context.addIssue({
        code: "custom",
        message: "attributeKey is only valid for the attributes event field",
        path: ["attributeKey"],
      });
    }
  });

export const ObservationFactSchema = z
  .object({
    kind: z.literal("observation"),
    schemaKey: SlugSchema,
    field: z.enum(["value", "normalisedValue", "confidence", "reviewStatus", "evidenceStatus"]),
  })
  .strict();

export const AggregateFactSchema = z
  .object({
    kind: z.literal("aggregate"),
    aggregate: z.enum([
      "related-event-count",
      "open-case-count",
      "open-action-count",
      "pending-decision-count",
    ]),
    eventType: SlugSchema.optional(),
    withinHours: z.number().int().positive().max(876_000).optional(),
  })
  .strict();

export const FactReferenceSchema = z.discriminatedUnion("kind", [
  EventFieldFactSchema,
  ObservationFactSchema,
  AggregateFactSchema,
]);

export type FactReference = z.infer<typeof FactReferenceSchema>;

export interface ComparisonCondition {
  fact: FactReference;
  operator:
    | "equals"
    | "not-equals"
    | "in"
    | "not-in"
    | "greater-than"
    | "greater-than-or-equal"
    | "less-than"
    | "less-than-or-equal"
    | "exists"
    | "not-exists";
  value?: JsonValue | undefined;
}

export interface AllCondition {
  all: Condition[];
}

export interface AnyCondition {
  any: Condition[];
}

export interface NotCondition {
  not: Condition;
}

export type Condition = AllCondition | AnyCondition | ComparisonCondition | NotCondition;

const ComparisonConditionSchema: z.ZodType<ComparisonCondition> = z
  .object({
    fact: FactReferenceSchema,
    operator: z.enum([
      "equals",
      "not-equals",
      "in",
      "not-in",
      "greater-than",
      "greater-than-or-equal",
      "less-than",
      "less-than-or-equal",
      "exists",
      "not-exists",
    ]),
    value: JsonValueSchema.optional(),
  })
  .strict()
  .superRefine((condition, context) => {
    const valueFreeOperators = new Set(["exists", "not-exists"]);
    if (valueFreeOperators.has(condition.operator) && condition.value !== undefined) {
      context.addIssue({ code: "custom", message: `${condition.operator} does not accept a value`, path: ["value"] });
    }
    if (!valueFreeOperators.has(condition.operator) && condition.value === undefined) {
      context.addIssue({ code: "custom", message: `${condition.operator} requires a value`, path: ["value"] });
    }
  });

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    ComparisonConditionSchema,
    z.object({ all: z.array(ConditionSchema).min(1) }).strict(),
    z.object({ any: z.array(ConditionSchema).min(1) }).strict(),
    z.object({ not: ConditionSchema }).strict(),
  ]),
);

export const RuleActionSchema = z
  .object({
    type: z.enum([
      "create-signal",
      "create-case",
      "create-action",
      "propose-decision",
      "flag-review",
    ]),
    definitionId: SlugSchema,
    parameters: z.record(z.string(), JsonValueSchema),
  })
  .strict();

export const RuleDefinitionSchema = z
  .object({
    id: SlugSchema,
    version: VersionSchema,
    description: z.string().min(1),
    when: ConditionSchema,
    then: z.array(RuleActionSchema).min(1),
  })
  .strict();

export const WorkflowDefinitionSchema = z
  .object({
    id: SlugSchema,
    version: VersionSchema,
    initialState: SlugSchema,
    states: z
      .array(
        z
          .object({
            id: SlugSchema,
            label: z.string().min(1),
            terminal: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    transitions: z.array(
      z
        .object({
          id: SlugSchema,
          from: SlugSchema,
          to: SlugSchema,
          guard: ConditionSchema.optional(),
          requiresApprovalPolicyId: SlugSchema.optional(),
        })
        .strict(),
    ),
    closureRequirements: z.array(
      z
        .object({
          id: SlugSchema,
          type: z.enum([
            "action-completed",
            "evidence-present",
            "decision-approved",
            "observation-reviewed",
          ]),
          definitionId: SlugSchema.optional(),
          description: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((workflow, context) => {
    const stateIds = new Set(workflow.states.map((state) => state.id));
    if (!stateIds.has(workflow.initialState)) {
      context.addIssue({ code: "custom", message: "initialState must reference a declared state", path: ["initialState"] });
    }
    workflow.transitions.forEach((transition, index) => {
      if (!stateIds.has(transition.from)) {
        context.addIssue({ code: "custom", message: "Transition source must reference a declared state", path: ["transitions", index, "from"] });
      }
      if (!stateIds.has(transition.to)) {
        context.addIssue({ code: "custom", message: "Transition target must reference a declared state", path: ["transitions", index, "to"] });
      }
    });
  });

/**
 * Additive contract for one pack-owned Case definition. Workflow state and
 * closure policy stay in WorkflowDefinition; this record selects that policy
 * and supplies neutral defaults for deterministic Case creation.
 */
export const CaseDefinitionSchema = z
  .object({
    caseType: SlugSchema,
    displayName: z
      .object({
        singular: z.string().min(1).max(200),
        plural: z.string().min(1).max(200),
      })
      .strict(),
    description: z.string().min(1),
    workflowId: SlugSchema,
    defaultPriority: z.enum(["low", "normal", "high", "urgent"]),
    defaultSeverity: z.enum(["info", "low", "medium", "high", "critical"]),
    defaultOwner: z.string().min(1).nullable().default(null),
    defaultDueInHours: z.number().int().positive().max(876_000).nullable().default(null),
    closureRequirements: z.array(SlugSchema),
    triggeredByRules: z.array(SlugSchema).min(1),
  })
  .strict()
  .superRefine((definition, context) => {
    for (const [field, values] of [
      ["closureRequirements", definition.closureRequirements],
      ["triggeredByRules", definition.triggeredByRules],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: "custom", message: `${field} must be unique`, path: [field] });
      }
    }
  });

const PackTypeDefinitionSchema = z
  .object({
    id: SlugSchema,
    displayName: z.string().min(1),
    schema: RelativePathSchema,
  })
  .strict();

const ObservationStringJsonSchema = z
  .object({
    type: z.literal("string"),
    enum: z.array(z.string()).min(1).optional(),
    format: z.literal("date").optional(),
    pattern: z.string().optional(),
  })
  .strict()
  .superRefine((schema, context) => {
    if (schema.enum !== undefined && new Set(schema.enum).size !== schema.enum.length) {
      context.addIssue({ code: "custom", message: "enum values must be unique", path: ["enum"] });
    }
    if (schema.pattern !== undefined) {
      try {
        new RegExp(schema.pattern, "u");
      } catch {
        context.addIssue({ code: "custom", message: "pattern must be a valid regular expression", path: ["pattern"] });
      }
    }
  });

const ObservationNumberJsonSchema = z
  .object({
    type: z.enum(["number", "integer"]),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
  })
  .strict()
  .superRefine((schema, context) => {
    if (schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum) {
      context.addIssue({ code: "custom", message: "minimum must not exceed maximum", path: ["minimum"] });
    }
  });

const ObservationBooleanJsonSchema = z.object({ type: z.literal("boolean") }).strict();

const ObservationObjectPropertySchema = z.union([
  ObservationStringJsonSchema,
  ObservationNumberJsonSchema,
  ObservationBooleanJsonSchema,
]);

const ObservationObjectJsonSchema = z
  .object({
    type: z.literal("object"),
    properties: z.record(z.string(), ObservationObjectPropertySchema),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
  })
  .strict()
  .superRefine((schema, context) => {
    schema.required?.forEach((property, index) => {
      if (!(property in schema.properties)) {
        context.addIssue({
          code: "custom",
          message: "required properties must be declared in properties",
          path: ["required", index],
        });
      }
    });
    if (schema.required !== undefined && new Set(schema.required).size !== schema.required.length) {
      context.addIssue({ code: "custom", message: "required properties must be unique", path: ["required"] });
    }
  });

const ObservationSchemaDefinitionBase = {
  schemaKey: SlugSchema,
  displayName: z.string().min(1).max(200),
  description: z.string().min(1),
  entityType: SlugSchema.optional(),
  evidenceRequired: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).optional(),
};

/**
 * Contract v1.2 for one pack-owned observation-schema file. `displayName` is
 * the pack-supplied label and `entityType` is the optional entity-link hint.
 * The supported JSON Schema subset matches the definitions shipped by the
 * three initial packs and is intentionally executable without another schema
 * engine.
 */
export const ObservationSchemaDefinitionSchema = z.discriminatedUnion("valueType", [
  z
    .object({
      ...ObservationSchemaDefinitionBase,
      valueType: z.literal("string"),
      jsonSchema: ObservationStringJsonSchema,
    })
    .strict(),
  z
    .object({
      ...ObservationSchemaDefinitionBase,
      valueType: z.literal("number"),
      jsonSchema: ObservationNumberJsonSchema,
    })
    .strict(),
  z
    .object({
      ...ObservationSchemaDefinitionBase,
      valueType: z.literal("boolean"),
      jsonSchema: ObservationBooleanJsonSchema,
    })
    .strict(),
  z
    .object({
      ...ObservationSchemaDefinitionBase,
      valueType: z.literal("object"),
      jsonSchema: ObservationObjectJsonSchema,
    })
    .strict(),
]);

const EventOccurredAtMappingSchema = z
  .object({
    observationSchemaKey: SlugSchema.nullable(),
    fallback: z.literal("artifact-received-at"),
  })
  .strict();

const EventPrimaryEntityMappingSchema = z
  .object({
    observationSchemaKey: SlugSchema,
  })
  .strict();

const RequiredObservationValuesSchema = z.record(SlugSchema, z.array(JsonValueSchema).min(1));

/**
 * Contract v1.4 for one pack-owned event-definition file. Required and
 * optional observations compose the Event attributes under their schema keys;
 * optional value constraints distinguish definitions whose semantic event is
 * encoded by a required Observation's value rather than by a separate key.
 * Mappings select the Event time and primary Entity without core pack logic.
 */
export const EventDefinitionSchema = z
  .object({
    eventType: SlugSchema,
    displayName: z.string().min(1).max(200),
    description: z.string().min(1),
    requiredObservations: z.array(SlugSchema).min(1),
    requiredObservationValues: RequiredObservationValuesSchema.optional(),
    optionalObservations: z.array(SlugSchema).default([]),
    occurredAt: EventOccurredAtMappingSchema,
    primaryEntity: EventPrimaryEntityMappingSchema.nullable(),
  })
  .strict()
  .superRefine((definition, context) => {
    const required = new Set(definition.requiredObservations);
    if (required.size !== definition.requiredObservations.length) {
      context.addIssue({
        code: "custom",
        message: "requiredObservations must be unique",
        path: ["requiredObservations"],
      });
    }

    for (const schemaKey of Object.keys(definition.requiredObservationValues ?? {})) {
      if (!required.has(schemaKey)) {
        context.addIssue({
          code: "custom",
          message: "requiredObservationValues may constrain only required observations",
          path: ["requiredObservationValues", schemaKey],
        });
      }
    }

    const optional = new Set(definition.optionalObservations);
    if (optional.size !== definition.optionalObservations.length) {
      context.addIssue({
        code: "custom",
        message: "optionalObservations must be unique",
        path: ["optionalObservations"],
      });
    }
    definition.optionalObservations.forEach((schemaKey, index) => {
      if (required.has(schemaKey)) {
        context.addIssue({
          code: "custom",
          message: "An observation cannot be both required and optional",
          path: ["optionalObservations", index],
        });
      }
    });

    const composed = new Set([...required, ...optional]);
    const occurredAtSchemaKey = definition.occurredAt.observationSchemaKey;
    if (occurredAtSchemaKey !== null && !composed.has(occurredAtSchemaKey)) {
      context.addIssue({
        code: "custom",
        message: "occurredAt observationSchemaKey must be required or optional",
        path: ["occurredAt", "observationSchemaKey"],
      });
    }
    const entitySchemaKey = definition.primaryEntity?.observationSchemaKey;
    if (entitySchemaKey !== undefined && !composed.has(entitySchemaKey)) {
      context.addIssue({
        code: "custom",
        message: "primaryEntity observationSchemaKey must be required or optional",
        path: ["primaryEntity", "observationSchemaKey"],
      });
    }
  });

/** Contract v1.3 for one synthetic Entity authored by a Scenario Pack. */
export const SeedEntitySchema = z
  .object({
    id: SlugSchema,
    entityType: SlugSchema,
    displayName: z.string().min(1).max(300),
    externalReference: z.string().min(1).nullable(),
    aliases: z.array(z.string().min(1)).default([]),
    attributes: z.record(z.string(), JsonValueSchema),
    status: SlugSchema,
  })
  .strict()
  .superRefine((entity, context) => {
    if (new Set(entity.aliases).size !== entity.aliases.length) {
      context.addIssue({ code: "custom", message: "aliases must be unique", path: ["aliases"] });
    }
  });

export const SeedEntityCatalogueSchema = z.array(SeedEntitySchema);

const DashboardReferencesSchema = z
  .object({
    leadership: RelativePathSchema,
    operations: RelativePathSchema,
    technical: RelativePathSchema,
  })
  .strict();

export const DashboardWidgetTypeSchema = z.enum([
  "stat-card",
  "severity-breakdown",
  "list-card",
  "trend-line",
  "sla-table",
  "pending-approvals",
  "activity-feed",
  "text-impact",
]);

export const ScenarioPackManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    id: SlugSchema,
    version: VersionSchema,
    name: z.string().min(1).max(200),
    description: z.string().min(1),
    labels: RelativePathSchema,
    entityTypes: z.array(PackTypeDefinitionSchema).min(1),
    eventTypes: z.array(PackTypeDefinitionSchema).min(1),
    observationSchemas: z.array(RelativePathSchema).min(1),
    seedEntities: RelativePathSchema.optional(),
    caseDefinitions: z.array(RelativePathSchema).min(1),
    workflows: z.record(SlugSchema, RelativePathSchema).refine((value) => Object.keys(value).length > 0, {
      message: "At least one workflow is required",
    }),
    rules: z.array(RelativePathSchema).min(1),
    metrics: z.array(RelativePathSchema).min(1),
    dashboards: DashboardReferencesSchema,
    fixtures: z
      .object({
        smoke: RelativePathSchema,
        demo: RelativePathSchema,
        edgeCases: RelativePathSchema,
      })
      .strict(),
    evaluationSets: z.array(RelativePathSchema).min(1),
    // Optional until the tour framework lands (amendment A7 defers tours;
    // OIW-004b packs ship without them).
    tours: z
      .object({
        leadership: RelativePathSchema,
        operations: RelativePathSchema.optional(),
        technical: RelativePathSchema.optional(),
      })
      .strict()
      .optional(),
    defaultLens: z.enum(["leadership", "operations", "technical"]),
    defaultFixtureSet: z.enum(["smoke", "demo", "edge-cases"]),
  })
  .strict();

export const ScenarioPackSchema = ScenarioPackManifestSchema;

export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type CaseDefinition = z.infer<typeof CaseDefinitionSchema>;
export type ObservationSchemaDefinition = z.infer<typeof ObservationSchemaDefinitionSchema>;
export type EventDefinition = z.infer<typeof EventDefinitionSchema>;
export type SeedEntity = z.infer<typeof SeedEntitySchema>;
export type ScenarioPackManifest = z.infer<typeof ScenarioPackManifestSchema>;
export type ScenarioPack = z.infer<typeof ScenarioPackSchema>;
