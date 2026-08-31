import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import type { PackIssue } from "./errors.js";
import { loadPackFromDirectory, type LoadedScenarioPack } from "./loader.js";

export interface PackRegistryEntry {
  id: string;
  version: string;
  directory: string;
  pack: LoadedScenarioPack;
  warnings: PackIssue[];
}

export interface InvalidPackEntry {
  directory: string;
  errors: PackIssue[];
  warnings: PackIssue[];
}

export interface SkippedPackEntry {
  directory: string;
  reason: string;
}

export interface PackRegistry {
  loaded: PackRegistryEntry[];
  invalid: InvalidPackEntry[];
  skipped: SkippedPackEntry[];
  get(id: string, version: string): LoadedScenarioPack | undefined;
  list(): PackRegistryEntry[];
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
}

/**
 * Enumerates `<scenarioPacksDirectory>/*`, loads each pack directory and
 * partitions the results into loaded/invalid/skipped without ever crashing
 * on a single bad pack. Directory order is sorted for stable output.
 */
export async function buildPackRegistry(scenarioPacksDirectory: string): Promise<PackRegistry> {
  let directoryNames: string[] = [];
  try {
    const entries = await readdir(scenarioPacksDirectory, { withFileTypes: true });
    directoryNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (errorCode(error) !== "ENOENT") {
      throw error;
    }
  }

  const loaded: PackRegistryEntry[] = [];
  const invalid: InvalidPackEntry[] = [];
  const skipped: SkippedPackEntry[] = [];

  for (const name of directoryNames) {
    const directory = resolve(scenarioPacksDirectory, name);
    const result = await loadPackFromDirectory(directory);
    if (result.status === "loaded") {
      loaded.push({
        id: result.pack.manifest.id,
        version: result.pack.manifest.version,
        directory,
        pack: result.pack,
        warnings: result.warnings,
      });
    } else if (result.status === "invalid") {
      invalid.push({ directory, errors: result.errors, warnings: result.warnings });
    } else {
      skipped.push({ directory, reason: result.reason });
    }
  }

  const byKey = new Map(loaded.map((entry) => [`${entry.id}@${entry.version}`, entry]));

  return {
    loaded,
    invalid,
    skipped,
    get(id: string, version: string) {
      return byKey.get(`${id}@${version}`)?.pack;
    },
    list() {
      return loaded;
    },
  };
}
