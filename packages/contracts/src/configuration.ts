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

const PackTypeDefinitionSchema = z
  .object({
    id: SlugSchema,
    displayName: z.string().min(1),
    schema: RelativePathSchema,
  })
  .strict();

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
    tours: z
      .object({
        leadership: RelativePathSchema,
        operations: RelativePathSchema.optional(),
        technical: RelativePathSchema.optional(),
      })
      .strict(),
    defaultLens: z.enum(["leadership", "operations", "technical"]),
    defaultFixtureSet: z.enum(["smoke", "demo", "edge-cases"]),
  })
  .strict();

export const ScenarioPackSchema = ScenarioPackManifestSchema;

export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type ScenarioPackManifest = z.infer<typeof ScenarioPackManifestSchema>;
export type ScenarioPack = z.infer<typeof ScenarioPackSchema>;
