import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const corePackageDirectories = [
  "packages/contracts",
  "packages/domain",
  "packages/application",
  "packages/persistence",
  "packages/intelligence",
  "packages/ingestion",
  "packages/rules",
  "packages/audit",
  "packages/evals",
];

const prohibitedIndustryTerms = [
  "brake",
  "factory",
  "fleet",
  "hospital",
  "manufacturing",
  "patient",
  "vehicle",
] as const;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "dist" && entry.name !== "node_modules") {
        return sourceFiles(path);
      }
      return entry.isFile() && extname(entry.name) === ".ts" ? [path] : [];
    }),
  );
  return files.flat();
}

const violations: string[] = [];

for (const packageDirectory of corePackageDirectories) {
  const absoluteDirectory = join(repositoryRoot, packageDirectory);
  for (const file of await sourceFiles(absoluteDirectory)) {
    const content = await readFile(file, "utf8");
    const displayPath = relative(repositoryRoot, file);

    for (const term of prohibitedIndustryTerms) {
      if (new RegExp(`\\b${term}\\b`, "iu").test(content)) {
        violations.push(`${displayPath}: prohibited industry term "${term}"`);
      }
    }

    if (packageDirectory === "packages/domain") {
      const packImportPattern = /(?:from\s+|import\s*\(|require\s*\()["'][^"']*scenario-packs(?:\/|["'])/u;
      if (packImportPattern.test(content)) {
        violations.push(`${displayPath}: core domain code must not import a Scenario Pack directly`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Architecture checks passed: core packages are neutral and domain imports respect pack boundaries.");
}
