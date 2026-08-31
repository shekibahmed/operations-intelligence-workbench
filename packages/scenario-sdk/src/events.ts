import type { EventDefinition, JsonValue } from "@oiw/contracts";

import { issueError, type PackIssue } from "./errors.js";
import type { LoadedScenarioPack } from "./loader.js";

export interface EventDefinitionSource {
  definition: EventDefinition;
  path: string;
}

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function matchingCriteria(definition: EventDefinition): string {
  const requiredObservations = [...definition.requiredObservations].sort();
  const requiredObservationValues = Object.entries(
    definition.requiredObservationValues ?? {},
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schemaKey, values]) => [
      schemaKey,
      values.map(canonicalJson).sort(),
    ]);
  const primaryEntityKey = definition.primaryEntity?.observationSchemaKey;
  const requiredPrimaryEntity =
    primaryEntityKey !== undefined && requiredObservations.includes(primaryEntityKey)
      ? primaryEntityKey
      : null;

  return JSON.stringify({
    requiredObservations,
    requiredObservationValues,
    requiredPrimaryEntity,
  });
}

/** Rejects Event pairs for which the assembler receives identical match inputs. */
export function validateEventDefinitionAmbiguity(
  sources: readonly EventDefinitionSource[],
): PackIssue[] {
  const firstByCriteria = new Map<string, EventDefinitionSource>();
  const issues: PackIssue[] = [];

  for (const source of sources) {
    const criteria = matchingCriteria(source.definition);
    const first = firstByCriteria.get(criteria);
    if (first === undefined) {
      firstByCriteria.set(criteria, source);
      continue;
    }

    issues.push(
      issueError(
        `${source.path}#requiredObservations`,
        `Event definition "${source.definition.eventType}" is indistinguishable from "${first.definition.eventType}": required Observation keys, value constraints and required primary-Entity matching are identical`,
      ),
    );
  }

  return issues;
}

/** Returns one validated pack-owned Event definition by its eventType. */
export function getEventDefinition(
  pack: LoadedScenarioPack,
  eventType: string,
): EventDefinition | undefined {
  return pack.eventDefinitions.get(eventType);
}
