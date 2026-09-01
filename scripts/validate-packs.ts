import { basename, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPackRegistry,
  formatIssue,
  isTemplatePackDirectoryName,
  loadPackFromDirectory,
} from "../packages/scenario-sdk/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scenarioPacksDirectory = resolve(repositoryRoot, "scenario-packs");

export interface PackValidationOutput {
  log(message: string): void;
  error(message: string): void;
}

function displayPath(path: string): string {
  return relative(repositoryRoot, path) || ".";
}

export async function validatePackDirectories(
  directory: string,
  output: PackValidationOutput = console,
): Promise<number> {
  const registry = await buildPackRegistry(directory);
  const templateSkips = registry.skipped.filter(({ directory: skippedDirectory }) =>
    isTemplatePackDirectoryName(basename(skippedDirectory)),
  );
  const ordinarySkips = registry.skipped.filter(
    ({ directory: skippedDirectory }) => !isTemplatePackDirectoryName(basename(skippedDirectory)),
  );
  const templateResults = await Promise.all(
    templateSkips.map(({ directory: templateDirectory }) => loadPackFromDirectory(templateDirectory)),
  );

  for (const skip of ordinarySkips) {
    output.log(`SKIP  ${displayPath(skip.directory)}: ${skip.reason}`);
  }

  for (const entry of registry.loaded) {
    output.log(`OK    ${displayPath(entry.directory)} (${entry.id}@${entry.version})`);
    for (const warning of entry.warnings) {
      output.log(`      ${formatIssue(warning)}`);
    }
  }

  for (const invalid of registry.invalid) {
    output.error(`FAIL  ${displayPath(invalid.directory)}`);
    for (const issue of invalid.errors) {
      output.error(`      ${formatIssue(issue)}`);
    }
    for (const issue of invalid.warnings) {
      output.error(`      ${formatIssue(issue)}`);
    }
  }

  for (const result of templateResults) {
    if (result.status === "loaded") {
      output.log(
        `TEMPLATE OK    ${displayPath(result.directory)} (${result.pack.manifest.id}@${result.pack.manifest.version})`,
      );
      for (const warning of result.warnings) {
        output.log(`             ${formatIssue(warning)}`);
      }
    } else if (result.status === "invalid") {
      output.error(`TEMPLATE FAIL  ${displayPath(result.directory)}`);
      for (const issue of result.errors) {
        output.error(`               ${formatIssue(issue)}`);
      }
      for (const issue of result.warnings) {
        output.error(`               ${formatIssue(issue)}`);
      }
    } else {
      output.log(`TEMPLATE SKIP  ${displayPath(result.directory)}: ${result.reason}`);
    }
  }

  const templateLoaded = templateResults.filter(({ status }) => status === "loaded").length;
  const templateInvalid = templateResults.filter(({ status }) => status === "invalid").length;
  const templateSkipped = templateResults.filter(({ status }) => status === "skipped").length;
  output.log(
    `\n${registry.loaded.length} loaded, ${registry.invalid.length} invalid, ${ordinarySkips.length} skipped; ` +
      `${templateLoaded} template loaded, ${templateInvalid} template invalid, ${templateSkipped} template skipped.`,
  );

  return registry.invalid.length > 0 || templateInvalid > 0 ? 1 : 0;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  process.exitCode = await validatePackDirectories(scenarioPacksDirectory);
}
