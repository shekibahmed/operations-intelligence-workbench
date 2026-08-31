import { relative, resolve } from "node:path";

import { buildPackRegistry, formatIssue } from "../packages/scenario-sdk/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scenarioPacksDirectory = resolve(repositoryRoot, "scenario-packs");

function displayPath(path: string): string {
  return relative(repositoryRoot, path) || ".";
}

const registry = await buildPackRegistry(scenarioPacksDirectory);

for (const skip of registry.skipped) {
  console.log(`SKIP  ${displayPath(skip.directory)}: ${skip.reason}`);
}

for (const entry of registry.loaded) {
  console.log(`OK    ${displayPath(entry.directory)} (${entry.id}@${entry.version})`);
  for (const warning of entry.warnings) {
    console.log(`      ${formatIssue(warning)}`);
  }
}

for (const invalid of registry.invalid) {
  console.error(`FAIL  ${displayPath(invalid.directory)}`);
  for (const issue of invalid.errors) {
    console.error(`      ${formatIssue(issue)}`);
  }
  for (const issue of invalid.warnings) {
    console.error(`      ${formatIssue(issue)}`);
  }
}

console.log(
  `\n${registry.loaded.length} loaded, ${registry.invalid.length} invalid, ${registry.skipped.length} skipped.`,
);

if (registry.invalid.length > 0) {
  process.exitCode = 1;
}
