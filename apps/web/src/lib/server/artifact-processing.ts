import {
  ArtifactProcessingService,
  type ArtifactProcessingPackResolver,
  type ArtifactProcessingResult,
} from "@oiw/application";
import type { Workspace } from "@oiw/contracts";
import { FormatAdapterRegistry } from "@oiw/ingestion";
import { ConfidenceAbstentionPolicy, FixtureIntelligenceProvider, StructuredOutputValidator } from "@oiw/intelligence";
import type { LoadedScenarioPack } from "@oiw/scenario-sdk";

import { getRepositories } from "@/lib/server/db";
import { findPackEntry } from "@/lib/server/pack-registry";

/**
 * `FixtureIntelligenceProvider.fromPack` loads every fixture set's expected
 * extractions up front (A1); caching one instance per pack id+version avoids
 * re-reading fixture files on every Process click, mirroring the
 * `getRepositories()` connection cache in `./db.ts`.
 */
declare global {
  var __oiwIntelligenceProviders: Map<string, Promise<FixtureIntelligenceProvider>> | undefined;
}

function providerCache(): Map<string, Promise<FixtureIntelligenceProvider>> {
  globalThis.__oiwIntelligenceProviders ??= new Map();
  return globalThis.__oiwIntelligenceProviders;
}

function providerForPack(pack: LoadedScenarioPack): Promise<FixtureIntelligenceProvider> {
  const cache = providerCache();
  const key = `${pack.manifest.id}@${pack.manifest.version}`;
  let pending = cache.get(key);
  if (pending === undefined) {
    pending = FixtureIntelligenceProvider.fromPack(pack);
    cache.set(key, pending);
  }
  return pending;
}

export class ActivePackNotFoundError extends Error {
  readonly retryable = false;

  constructor(workspaceId: string) {
    super(`Workspace "${workspaceId}" has no loadable active Scenario Pack`);
    this.name = "ActivePackNotFoundError";
  }
}

/**
 * Consumes `@oiw/application`'s public `ArtifactProcessingService` (OIW-301)
 * against this workspace's active pack. Structural typing lets the real
 * `@oiw/persistence` repositories, `@oiw/ingestion` adapters and
 * `@oiw/intelligence` validator/policy satisfy the service's narrow ports
 * without any adapter glue beyond pack resolution.
 */
export async function processArtifactForWorkspace(
  workspace: Workspace,
  artifactId: string,
): Promise<ArtifactProcessingResult> {
  if (workspace.activePackId === null) throw new ActivePackNotFoundError(workspace.id);
  const entry = await findPackEntry(workspace.activePackId);
  if (entry === undefined) throw new ActivePackNotFoundError(workspace.id);

  const provider = await providerForPack(entry.pack);
  const packResolver: ArtifactProcessingPackResolver = { resolve: () => entry.pack };
  const service = new ArtifactProcessingService(
    getRepositories(),
    new FormatAdapterRegistry(),
    provider,
    new StructuredOutputValidator(),
    new ConfidenceAbstentionPolicy(),
    packResolver,
  );

  return service.processArtifact(workspace.id, artifactId);
}
