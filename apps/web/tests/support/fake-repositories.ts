import type { PersistenceRepositories } from "@oiw/persistence";

/**
 * Minimal in-memory `PersistenceRepositories` for unit-testing the view
 * builders in `src/lib/case-detail.ts` / `src/lib/entity-detail.ts` without a
 * real Postgres connection. Only `list`/`findById` are exercised by those
 * builders; every other member is a structurally-typed no-op so the object
 * satisfies the full repository interface.
 */
export function fakeRepositories(data: {
  entities?: unknown[];
  operationalEvents?: unknown[];
  cases?: unknown[];
  signals?: unknown[];
  actionItems?: unknown[];
  decisions?: unknown[];
  approvals?: unknown[];
  artifacts?: unknown[];
  artifactSegments?: unknown[];
  observations?: unknown[];
}): PersistenceRepositories {
  function listOf<T>(values: T[] | undefined) {
    return {
      list: async () => values ?? [],
      findById: async (_workspaceId: string, id: string) =>
        (values ?? []).find((value: T) => (value as unknown as { id: string }).id === id) ?? null,
      insert: async (_workspaceId: string, value: T) => value,
    };
  }

  return {
    workspaces: {
      insert: async (value: unknown) => value,
      findById: async () => null,
      findBySlug: async () => null,
      listExpired: async () => [],
      update: async () => null,
      delete: async () => false,
      clearForReset: async () => false,
    },
    sources: listOf([]),
    artifacts: { ...listOf(data.artifacts ?? []), updateProcessingStatus: async () => null },
    artifactSegments: { ...listOf(data.artifactSegments ?? []), listByArtifact: async () => [] },
    entities: { ...listOf(data.entities ?? []), update: async () => null },
    observations: {
      ...listOf(data.observations ?? []),
      correct: async () => null,
      listByArtifact: async () => [],
      listRevisions: async () => [],
    },
    operationalEvents: { ...listOf(data.operationalEvents ?? []), markForReEvaluation: async () => null },
    signals: listOf(data.signals ?? []),
    cases: { ...listOf(data.cases ?? []), update: async () => null },
    actionItems: { ...listOf(data.actionItems ?? []), update: async () => null },
    decisions: { ...listOf(data.decisions ?? []), update: async () => null },
    approvals: listOf(data.approvals ?? []),
    auditEntries: { ...listOf([]), insert: async (_w: unknown, value: unknown) => value },
  } as unknown as PersistenceRepositories;
}
