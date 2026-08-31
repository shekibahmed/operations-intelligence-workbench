import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  ChecksumSchema,
  ExtractionResultSchema,
  JsonValueSchema,
  SlugSchema,
  type ExtractionResult,
  type ScenarioPack,
} from "@oiw/contracts";
import { z } from "zod";

import { issueError, issueWarning, type PackIssue } from "./errors.js";
import { readAndValidateJsonFile } from "./json-files.js";
import type { LoadedScenarioPack } from "./loader.js";

const FixtureRelativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !isAbsolute(value) &&
      !value.includes("\\") &&
      !value.split("/").some((component) => component === ".."),
    "Expected a fixture-set-relative path without traversal",
  );

export const FixtureArtifactIndexEntrySchema = z
  .object({
    id: SlugSchema,
    artifactType: SlugSchema,
    mimeType: z.string().min(1),
    contentPath: FixtureRelativePathSchema,
    sourceMetadata: z.record(z.string(), JsonValueSchema),
    sha256: ChecksumSchema,
    expectedExtraction: FixtureRelativePathSchema,
  })
  .strict();

export const FixtureSetIndexSchema = z.array(FixtureArtifactIndexEntrySchema);

export type FixtureSetName = ScenarioPack["defaultFixtureSet"];
export type FixtureArtifactIndexEntry = z.infer<typeof FixtureArtifactIndexEntrySchema>;

export interface LoadedFixtureArtifact extends FixtureArtifactIndexEntry {
  content: Uint8Array;
  extraction: ExtractionResult;
}

export interface LoadedFixtureSet {
  name: FixtureSetName;
  directory: string;
  artifacts: LoadedFixtureArtifact[];
}

export type FixtureSetLoadResult =
  | { status: "loaded"; fixtureSet: LoadedFixtureSet; warnings: PackIssue[] }
  | { status: "invalid"; errors: PackIssue[]; warnings: PackIssue[] };

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function staysWithin(directory: string, path: string): boolean {
  const relativePath = relative(directory, path);
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

function fixtureManifestKey(setName: FixtureSetName): keyof ScenarioPack["fixtures"] {
  return setName === "edge-cases" ? "edgeCases" : setName;
}

async function resolveContentPath(
  setDirectory: string,
  contentPath: string,
): Promise<string | null> {
  const declaredPath = resolve(setDirectory, contentPath);
  if (!staysWithin(setDirectory, declaredPath)) return null;
  if (await fileExists(declaredPath)) return declaredPath;

  // OIW-004b's integration normalized fixture payloads to `artifacts/`
  // while retaining the narrative-authored `content/` index references.
  // Keep that additive layout correction inside the SDK boundary.
  const normalizedPath = resolve(setDirectory, "artifacts", basename(contentPath));
  return staysWithin(setDirectory, normalizedPath) && (await fileExists(normalizedPath))
    ? normalizedPath
    : declaredPath;
}

/**
 * Loads one manifest-declared fixture set into checksum-verified, typed
 * artifact records. Pack-content errors are returned as path-annotated issues;
 * an absent set is a valid empty result with a warning.
 */
export async function loadFixtureSet(
  pack: LoadedScenarioPack,
  setName: FixtureSetName,
): Promise<FixtureSetLoadResult> {
  const relativeSetPath = pack.manifest.fixtures[fixtureManifestKey(setName)];
  const setDirectory = resolve(pack.directory, relativeSetPath);
  if (!(await directoryExists(setDirectory))) {
    return {
      status: "loaded",
      fixtureSet: { name: setName, directory: setDirectory, artifacts: [] },
      warnings: [
        issueWarning(relativeSetPath, `Fixture set "${setName}" directory not found; loaded empty`),
      ],
    };
  }

  const relativeIndexPath = `${relativeSetPath}/index.json`;
  const indexResult = await readAndValidateJsonFile(
    join(setDirectory, "index.json"),
    relativeIndexPath,
    FixtureSetIndexSchema,
  );
  if (!indexResult.ok) {
    return { status: "invalid", errors: indexResult.issues, warnings: [] };
  }

  const errors: PackIssue[] = [];
  const seenIds = new Set<string>();
  const artifacts: LoadedFixtureArtifact[] = [];
  const entries = [...indexResult.value].sort((left, right) => left.id.localeCompare(right.id));

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      errors.push(issueError(relativeIndexPath, `Duplicate fixture artifact id "${entry.id}"`));
      continue;
    }
    seenIds.add(entry.id);

    const contentPath = await resolveContentPath(setDirectory, entry.contentPath);
    if (contentPath === null) {
      errors.push(
        issueError(
          `${relativeIndexPath}#${entry.id}.contentPath`,
          `Content path "${entry.contentPath}" escapes the fixture set`,
        ),
      );
      continue;
    }

    let content: Uint8Array;
    try {
      content = await readFile(contentPath);
    } catch (error) {
      errors.push(
        issueError(
          `${relativeSetPath}/${entry.contentPath}`,
          `Failed to read fixture artifact: ${(error as Error).message}`,
        ),
      );
      continue;
    }

    const checksum = createHash("sha256").update(content).digest("hex");
    if (checksum !== entry.sha256) {
      errors.push(
        issueError(
          `${relativeIndexPath}#${entry.id}.sha256`,
          `Declared checksum "${entry.sha256}" does not match artifact checksum "${checksum}"`,
        ),
      );
      continue;
    }

    const extractionPath = resolve(setDirectory, entry.expectedExtraction);
    if (!staysWithin(setDirectory, extractionPath)) {
      errors.push(
        issueError(
          `${relativeIndexPath}#${entry.id}.expectedExtraction`,
          `Expected-extraction path "${entry.expectedExtraction}" escapes the fixture set`,
        ),
      );
      continue;
    }
    const extractionResult = await readAndValidateJsonFile(
      extractionPath,
      `${relativeSetPath}/${entry.expectedExtraction}`,
      ExtractionResultSchema,
    );
    if (!extractionResult.ok) {
      errors.push(...extractionResult.issues);
      continue;
    }
    if (extractionResult.value.artifactChecksum !== checksum) {
      errors.push(
        issueError(
          `${relativeSetPath}/${entry.expectedExtraction}#artifactChecksum`,
          `Expected extraction checksum "${extractionResult.value.artifactChecksum}" does not match artifact checksum "${checksum}"`,
        ),
      );
      continue;
    }

    artifacts.push({ ...entry, content, extraction: extractionResult.value });
  }

  if (errors.length > 0) {
    return { status: "invalid", errors, warnings: [] };
  }
  return {
    status: "loaded",
    fixtureSet: { name: setName, directory: setDirectory, artifacts },
    warnings: [],
  };
}

/**
 * Cross-checks one fixture set (smoke/demo/edge-cases) against A1: every
 * fixture artifact must have a checksum-keyed expected extraction under
 * `<set>/extractions/<artifact-id>.json`. Missing fixture-set or artifact
 * directories are tolerated with a warning until OIW-004b lands.
 */
export async function validateFixtureSet(
  packDirectory: string,
  relativeSetPath: string,
  setLabel: string,
): Promise<PackIssue[]> {
  const setAbsolute = resolve(packDirectory, relativeSetPath);
  if (!(await directoryExists(setAbsolute))) {
    return [
      issueWarning(
        relativeSetPath,
        `Fixture set "${setLabel}" directory not found; tolerated until OIW-004b lands`,
      ),
    ];
  }

  const artifactsDir = join(setAbsolute, "artifacts");
  if (!(await directoryExists(artifactsDir))) {
    return [
      issueWarning(
        `${relativeSetPath}/artifacts`,
        `Fixture set "${setLabel}" has no artifacts directory; tolerated until OIW-004b lands`,
      ),
    ];
  }

  const extractionsDir = join(setAbsolute, "extractions");
  const artifactEntries = (await readdir(artifactsDir, { withFileTypes: true })).filter((entry) =>
    entry.isFile(),
  );

  const issues: PackIssue[] = [];
  for (const entry of artifactEntries) {
    const artifactId = basename(entry.name, extname(entry.name));
    const relativeExtractionPath = `${relativeSetPath}/extractions/${artifactId}.json`;

    const bytes = await readFile(join(artifactsDir, entry.name));
    const checksum = createHash("sha256").update(bytes).digest("hex");

    const extraction = await readAndValidateJsonFile(
      join(extractionsDir, `${artifactId}.json`),
      relativeExtractionPath,
      ExtractionResultSchema,
    );
    if (!extraction.ok) {
      issues.push(...extraction.issues);
      continue;
    }
    if (extraction.value.artifactChecksum !== checksum) {
      issues.push(
        issueError(
          relativeExtractionPath,
          `Expected extraction checksum "${extraction.value.artifactChecksum}" does not match artifact "${entry.name}" checksum "${checksum}"`,
        ),
      );
    }
  }
  return issues;
}
