import {
  ExtractionResultSchema,
  type ExtractionResult,
  type ObservationSchemaDefinition,
  type ProposedObservation,
} from "@oiw/contracts";
import { validateObservationValue } from "@oiw/scenario-sdk";

export interface ProposedObservationValidation {
  proposal: ProposedObservation;
  valid: boolean;
  issues: string[];
}

export type StructuredExtractionValidation =
  | {
      validResult: true;
      result: ExtractionResult;
      observations: ProposedObservationValidation[];
      issues: string[];
    }
  | {
      validResult: false;
      result: null;
      observations: [];
      issues: string[];
    };

function formatValueIssues(
  label: string,
  issues: ReturnType<typeof validateObservationValue>["issues"],
): string[] {
  return issues.map(({ path, message }) =>
    `${label}${path.length === 0 ? "" : `.${path.join(".")}`}: ${message}`,
  );
}

export class StructuredOutputValidator {
  validate(
    untrustedResult: unknown,
    expectedChecksum: string,
    catalogue: ReadonlyMap<string, ObservationSchemaDefinition>,
  ): StructuredExtractionValidation {
    const parsed = ExtractionResultSchema.safeParse(untrustedResult);
    if (!parsed.success) {
      return {
        validResult: false,
        result: null,
        observations: [],
        issues: parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "result"}: ${issue.message}`,
        ),
      };
    }

    const resultIssues =
      parsed.data.artifactChecksum === expectedChecksum
        ? []
        : [
            `artifactChecksum: expected ${expectedChecksum}, received ${parsed.data.artifactChecksum}`,
          ];
    if (resultIssues.length > 0) {
      return {
        validResult: false,
        result: null,
        observations: [],
        issues: resultIssues,
      };
    }

    const observations = parsed.data.observations.map((proposal) => {
      const definition = catalogue.get(proposal.schemaKey);
      if (definition === undefined) {
        return {
          proposal,
          valid: false,
          issues: [`schemaKey: unknown observation schema "${proposal.schemaKey}"`],
        };
      }
      if (proposal.status !== "extracted") return { proposal, valid: true, issues: [] };

      const issues = formatValueIssues(
        "value",
        validateObservationValue(definition, proposal.value).issues,
      );
      for (const [index, candidate] of (proposal.alternativeCandidates ?? []).entries()) {
        issues.push(
          ...formatValueIssues(
            `alternativeCandidates.${index}.value`,
            validateObservationValue(definition, candidate.value).issues,
          ),
        );
      }
      return { proposal, valid: issues.length === 0, issues };
    });
    return {
      validResult: true,
      result: parsed.data,
      observations,
      issues: observations.flatMap(({ proposal, issues }) =>
        issues.map((issue) => `${proposal.schemaKey}: ${issue}`),
      ),
    };
  }
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

export class ConfidenceAbstentionPolicy {
  constructor(private readonly defaultThreshold = DEFAULT_CONFIDENCE_THRESHOLD) {
    if (defaultThreshold < 0 || defaultThreshold > 1) {
      throw new RangeError("Default confidence threshold must be between zero and one");
    }
  }

  reviewStatus(
    proposal: ProposedObservation,
    definition: ObservationSchemaDefinition | undefined,
    structurallyValid: boolean,
  ): "not-required" | "pending" {
    if (!structurallyValid || definition === undefined) return "pending";
    if (proposal.status === "insufficient-evidence") return "pending";
    const threshold = definition.confidenceThreshold ?? this.defaultThreshold;
    return proposal.confidence < threshold ? "pending" : "not-required";
  }
}
