import { readFile } from "node:fs/promises";

import type { z } from "zod";

import { issueError, type PackIssue } from "./errors.js";

export type FileParseResult<T> = { ok: true; value: T } | { ok: false; issues: PackIssue[] };

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
}

export async function readJsonFile(
  absolutePath: string,
  relativePath: string,
): Promise<FileParseResult<unknown>> {
  let raw: string;
  try {
    raw = await readFile(absolutePath, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { ok: false, issues: [issueError(relativePath, "File does not exist")] };
    }
    return {
      ok: false,
      issues: [issueError(relativePath, `Failed to read file: ${(error as Error).message}`)],
    };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (error) {
    return {
      ok: false,
      issues: [issueError(relativePath, `Invalid JSON: ${(error as Error).message}`)],
    };
  }
}

export async function readAndValidateJsonFile<T>(
  absolutePath: string,
  relativePath: string,
  schema: z.ZodType<T>,
): Promise<FileParseResult<T>> {
  const parsed = await readJsonFile(absolutePath, relativePath);
  if (!parsed.ok) {
    return parsed;
  }
  const result = schema.safeParse(parsed.value);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const issues = result.error.issues.map((issue) =>
    issueError(
      issue.path.length > 0 ? `${relativePath}#${issue.path.join(".")}` : relativePath,
      issue.message,
    ),
  );
  return { ok: false, issues };
}
