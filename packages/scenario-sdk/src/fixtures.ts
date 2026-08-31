import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import { ExtractionResultSchema } from "@oiw/contracts";

import { issueError, issueWarning, type PackIssue } from "./errors.js";
import { readAndValidateJsonFile } from "./json-files.js";

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
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
