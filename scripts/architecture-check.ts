import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

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

const ignoredDirectories = new Set([".git", ".next", "dist", "node_modules", "test-results"]);
const scannedTextExtensions = new Set([
  ".cjs",
  ".conf",
  ".ini",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".properties",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".xml",
  ".yaml",
  ".yml",
]);
const credentialPatterns = [
  { label: "private key", pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
  { label: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u },
] as const;
const execFileAsync = promisify(execFile);

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
        return sourceFiles(path);
      }
      return entry.isFile() && extname(entry.name) === ".ts" ? [path] : [];
    }),
  );
  return files.flat();
}

async function repositoryTextFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) return repositoryTextFiles(path);
      if (!entry.isFile()) return [];
      return scannedTextExtensions.has(extname(entry.name)) || entry.name.startsWith(".env") ? [path] : [];
    }),
  );
  return files.flat();
}

async function trackedRepositoryTextFiles(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    });
    return stdout
      .split("\0")
      .filter((path) => path.length > 0)
      .filter((path) => scannedTextExtensions.has(extname(path)) || basename(path).startsWith(".env"))
      .map((path) => resolve(repositoryRoot, path));
  } catch {
    return repositoryTextFiles(repositoryRoot);
  }
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

for (const file of await trackedRepositoryTextFiles()) {
  const displayPath = relative(repositoryRoot, file);
  const name = basename(file);
  if (name.startsWith(".env") && name !== ".env.example") {
    violations.push(`${displayPath}: committed environment file may contain credentials`);
  }
  const content = await readFile(file, "utf8");
  for (const credential of credentialPatterns) {
    if (credential.pattern.test(content)) {
      violations.push(`${displayPath}: possible committed ${credential.label}`);
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
  console.log("Architecture checks passed: neutrality, pack boundaries and credential patterns are clean.");
}
