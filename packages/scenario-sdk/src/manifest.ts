import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ScenarioPackManifestSchema, type ScenarioPack } from "@oiw/contracts";
import { parse as parseYaml } from "yaml";

import { issueError, type PackIssue } from "./errors.js";

export const MANIFEST_FILE_NAME = "manifest.yaml";

export type ManifestLoadResult = { ok: true; manifest: ScenarioPack } | { ok: false; issues: PackIssue[] };

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
}

export async function loadManifest(packDirectory: string): Promise<ManifestLoadResult> {
  const manifestPath = resolve(packDirectory, MANIFEST_FILE_NAME);

  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { ok: false, issues: [issueError(MANIFEST_FILE_NAME, "File does not exist")] };
    }
    return {
      ok: false,
      issues: [issueError(MANIFEST_FILE_NAME, `Failed to read file: ${(error as Error).message}`)],
    };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (error) {
    return {
      ok: false,
      issues: [issueError(MANIFEST_FILE_NAME, `Invalid YAML: ${(error as Error).message}`)],
    };
  }

  const result = ScenarioPackManifestSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) =>
        issueError(
          issue.path.length > 0 ? `${MANIFEST_FILE_NAME}#${issue.path.join(".")}` : MANIFEST_FILE_NAME,
          issue.message,
        ),
      ),
    };
  }

  return { ok: true, manifest: result.data };
}
