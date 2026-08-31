import type { CaseDefinition } from "@oiw/contracts";

export interface CaseDefinitionCatalogue {
  caseDefinitions: ReadonlyMap<string, CaseDefinition>;
}

export function getCaseDefinition(
  pack: CaseDefinitionCatalogue,
  caseType: string,
): CaseDefinition | undefined {
  return pack.caseDefinitions.get(caseType);
}

export function getCaseDefinitionsForRule(
  pack: CaseDefinitionCatalogue,
  ruleId: string,
): CaseDefinition[] {
  return [...pack.caseDefinitions.values()].filter((definition) =>
    definition.triggeredByRules.includes(ruleId),
  );
}
