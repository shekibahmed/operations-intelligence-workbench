import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import ts from "typescript";

import { buildPackRegistry, isTemplatePackDirectoryName } from "../packages/scenario-sdk/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");

/** Every workspace package under packages/ is core: the list is discovered, not hand-maintained. */
async function corePackageDirectories(root: string): Promise<string[]> {
  const entries = await readdir(join(root, "packages"), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => `packages/${entry.name}`)
    .sort();
}

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
  ".csv",
  ".ini",
  ".js",
  ".json",
  ".key",
  ".md",
  ".mjs",
  ".pem",
  ".properties",
  ".sh",
  ".sql",
  ".tf",
  ".tfvars",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const directCredentialPatterns = [
  { label: "private key", pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
  { label: "OpenAI API key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u },
  { label: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/u },
  {
    label: "JWT-shaped token",
    pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/u,
  },
] as const;
const genericCredentialAssignment =
  /\b[A-Za-z0-9_-]*(?:api[_-]?key|credential|password|secret|token)[A-Za-z0-9_-]*\s*(?:=|:)\s*["'`]?([A-Za-z0-9+/_=-]{32,})/gimu;
const postgresCredentialUrl =
  /\bpostgres(?:ql)?:\/\/([^:\s/@]+):([^@\s/]+)@([^/\s"'`]+)/gimu;
const execFileAsync = promisify(execFile);

function shannonEntropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value) counts.set(character, (counts.get(character) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) return true;
  return [
    "example",
    "placeholder",
    "not-for-production",
    "test-only",
    "dummy",
    "fake",
    "at-least-32-bytes",
    "your-",
    "[your",
  ].some((marker) => normalized.includes(marker));
}

export function credentialLabelsInText(content: string): string[] {
  const labels = new Set<string>();
  for (const credential of directCredentialPatterns) {
    if (credential.pattern.test(content)) labels.add(credential.label);
  }

  for (const match of content.matchAll(genericCredentialAssignment)) {
    const candidate = match[1]!;
    if (!isPlaceholder(candidate) && shannonEntropy(candidate) >= 3.5) {
      labels.add("generic high-entropy credential");
    }
  }

  for (const match of content.matchAll(postgresCredentialUrl)) {
    const [, username, password, host] = match;
    const localHost = /^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?):?\d*$/iu.test(host!);
    if (!localHost && !isPlaceholder(username!) && !isPlaceholder(password!)) {
      labels.add("credential-bearing PostgreSQL URL");
    }
  }
  return [...labels];
}

export function unsafeWriteBackLabelsInText(content: string): string[] {
  const labels: string[] = [];
  if (
    /(?:from\s+|import\s*\(|require\s*\()["'](?:node:)?(?:http|https|net|tls|undici|axios|got|node-fetch)(?:\/|["'])/u.test(
      content,
    )
  ) {
    labels.push("outbound network client import in the rule/decision path");
  }
  if (/\bfetch\s*\(/u.test(content)) {
    labels.push("outbound fetch call in the rule/decision path");
  }
  return labels;
}

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

async function trackedRepositoryTextFiles(root: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "utf8",
    });
    return stdout
      .split("\0")
      .filter((path) => path.length > 0)
      .filter((path) => scannedTextExtensions.has(extname(path)) || basename(path).startsWith(".env"))
      .map((path) => resolve(root, path));
  } catch {
    return repositoryTextFiles(root);
  }
}

export interface ScenarioPackIdentity {
  directory: string;
  id: string;
}

/**
 * Reads every loadable pack identity straight from `scenario-packs/<dir>/manifest.yaml`,
 * so no ID is ever hard-coded in this check. Underscore-prefixed directories are
 * scaffolding (`_template`), not packs. A pack directory with an unreadable or
 * id-less manifest fails closed rather than being skipped.
 */
export async function loadScenarioPackIdentities(
  packsDirectory: string,
): Promise<ScenarioPackIdentity[]> {
  const entries = await readdir(packsDirectory, { withFileTypes: true });
  const identities: ScenarioPackIdentity[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || isTemplatePackDirectoryName(entry.name)) continue;
    let manifest: string;
    try {
      manifest = await readFile(join(packsDirectory, entry.name, "manifest.yaml"), "utf8");
    } catch {
      continue; // narrative-only directories have no manifest and are not packs
    }
    const match = /^id:\s*["']?([A-Za-z0-9][A-Za-z0-9._-]*)["']?\s*(?:#.*)?$/mu.exec(manifest);
    if (match === null) throw new Error(`${entry.name}/manifest.yaml has no top-level "id:" line`);
    identities.push({ directory: entry.name, id: match[1]! });
  }
  return identities.sort((left, right) => left.id.localeCompare(right.id));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Pack IDs (and pack directory names) found in text. A match must stand alone:
 * `asset-reliability` matches, `my-asset-reliability-x` does not.
 */
export function packIdsInText(content: string, identities: readonly ScenarioPackIdentity[]): string[] {
  const found = new Set<string>();
  for (const name of new Set(identities.flatMap(({ id, directory }) => [id, directory]))) {
    if (new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(name)}(?![A-Za-z0-9_-])`, "u").test(content)) {
      found.add(name);
    }
  }
  return [...found].sort();
}

function isTestSource(path: string): boolean {
  const segments = path.split(sep);
  return (
    /\.(?:test|spec)\.[cm]?tsx?$/u.test(path) ||
    segments.includes("test") ||
    segments.includes("tests") ||
    segments.includes("__tests__")
  );
}

/**
 * The compile closure of a TypeScript project, resolved (imports followed) but not
 * type-checked, so it is cheap. Returned paths exclude node_modules.
 */
export function compileClosure(tsconfigPath: string): string[] {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (read.error !== undefined) throw new Error(`${tsconfigPath}: cannot read tsconfig`);
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(tsconfigPath));
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true },
    ...(parsed.projectReferences === undefined ? {} : { projectReferences: parsed.projectReferences }),
  });
  return program
    .getSourceFiles()
    .map(({ fileName }) => resolve(fileName))
    .filter((fileName) => !fileName.split(sep).includes("node_modules"));
}

async function tsconfigPaths(root: string): Promise<string[]> {
  const candidates = ["tsconfig.tools.json"];
  for (const group of ["packages", "apps"]) {
    let entries;
    try {
      entries = await readdir(join(root, group), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) candidates.push(`${group}/${entry.name}/tsconfig.json`);
    }
  }
  const existing: string[] = [];
  for (const candidate of candidates) {
    try {
      await readFile(join(root, candidate));
      existing.push(join(root, candidate));
    } catch {
      /* project not present in this tree */
    }
  }
  return existing.sort();
}

/**
 * Neutrality, part 1: no TypeScript project in the repository pulls any file from
 * `scenario-packs/` into its compile. Because the compile closure excludes every
 * pack directory, deleting any one of them cannot change what compiles.
 */
export async function compileNeutralityViolations(root: string): Promise<string[]> {
  const packsDirectory = resolve(root, "scenario-packs") + sep;
  const violations: string[] = [];
  for (const tsconfig of await tsconfigPaths(root)) {
    const included = compileClosure(tsconfig).filter((file) => file.startsWith(packsDirectory));
    for (const file of included) {
      violations.push(
        `${relative(root, tsconfig)}: compiles ${relative(root, file)}, so the build depends on a Scenario Pack directory`,
      );
    }
  }
  return violations;
}

/**
 * Neutrality, part 2 (runtime): the pack registry still loads every remaining pack,
 * with no invalid entries, when any single pack directory is removed, and when only
 * the template remains. Uses temporary copies; nothing in the
 * repository is modified.
 */
export async function packRemovalViolations(root: string): Promise<string[]> {
  const packsDirectory = resolve(root, "scenario-packs");
  const identities = await loadScenarioPackIdentities(packsDirectory);
  if (identities.length === 0) return [`${relative(root, packsDirectory) || "scenario-packs"}: no Scenario Pack manifests found`];
  const directories = (await readdir(packsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const violations: string[] = [];

  const scenarios: Array<{ label: string; kept: string[]; expectedIds: string[] }> = [
    ...identities.map((removed) => ({
      label: `without ${removed.id}`,
      kept: directories.filter((name) => name !== removed.directory),
      expectedIds: identities.filter(({ id }) => id !== removed.id).map(({ id }) => id),
    })),
    {
      label: "with only the template",
      kept: directories.filter((name) => isTemplatePackDirectoryName(name)),
      expectedIds: [],
    },
  ];
  for (const scenario of scenarios) {
    const temporary = await mkdtemp(join(tmpdir(), "oiw-pack-removal-"));
    try {
      for (const name of scenario.kept) {
        await cp(join(packsDirectory, name), join(temporary, name), { recursive: true });
      }
      const registry = await buildPackRegistry(temporary);
      const loadedIds = registry.loaded.map(({ id }) => id).sort();
      if (registry.invalid.length > 0) {
        violations.push(`pack registry ${scenario.label}: ${registry.invalid.length} pack(s) became invalid`);
      }
      if (JSON.stringify(loadedIds) !== JSON.stringify([...scenario.expectedIds].sort())) {
        violations.push(
          `pack registry ${scenario.label}: loaded [${loadedIds.join(", ")}], expected [${[...scenario.expectedIds].sort().join(", ")}]`,
        );
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
  return violations;
}

export interface ArchitectureCheckOptions {
  /** Skip the (slower) TypeScript compile-closure and pack-removal checks. */
  skipNeutralityCompile?: boolean;
}

export async function architectureViolations(
  root: string = repositoryRoot,
  options: ArchitectureCheckOptions = {},
): Promise<string[]> {
  const violations: string[] = [];
  const packageDirectories = await corePackageDirectories(root);
  const packIdentities = await loadScenarioPackIdentities(resolve(root, "scenario-packs"));
  if (packIdentities.length === 0) {
    violations.push("scenario-packs: no Scenario Pack manifests found, so pack-ID neutrality cannot be checked");
  }

  for (const packageDirectory of packageDirectories) {
    const absoluteDirectory = join(root, packageDirectory);
    for (const file of await sourceFiles(absoluteDirectory)) {
      const content = await readFile(file, "utf8");
      const displayPath = relative(root, file);

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

      if (!isTestSource(relative(join(root, packageDirectory), file))) {
        for (const packId of packIdsInText(content, packIdentities)) {
          violations.push(`${displayPath}: core source names Scenario Pack "${packId}"`);
        }
      }
    }
  }

  const writeBackPaths = [
    ...(await sourceFiles(join(root, "packages/rules"))),
    ...[
      "packages/application/src/decisions.ts",
      "packages/application/src/operational-outcome-executors.ts",
      "packages/application/src/rule-execution.ts",
    ].map((path) => resolve(root, path)),
  ];
  for (const file of writeBackPaths) {
    const content = await readFile(file, "utf8");
    for (const label of unsafeWriteBackLabelsInText(content)) {
      violations.push(`${relative(root, file)}: ${label}`);
    }
  }

  for (const file of await trackedRepositoryTextFiles(root)) {
    const displayPath = relative(root, file);
    const name = basename(file);
    if (name.startsWith(".env") && name !== ".env.example") {
      violations.push(`${displayPath}: committed environment file may contain credentials`);
    }
    const content = await readFile(file, "utf8");
    for (const label of credentialLabelsInText(content)) {
      violations.push(`${displayPath}: possible committed ${label}`);
    }
  }

  if (options.skipNeutralityCompile !== true) {
    violations.push(...(await compileNeutralityViolations(root)));
    violations.push(...(await packRemovalViolations(root)));
  }
  return violations;
}

async function main(): Promise<void> {
  const violations = await architectureViolations();
  if (violations.length > 0) {
    console.error("Architecture boundary violations:\n");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      "Architecture checks passed: neutrality (no industry terms or Scenario Pack IDs in core sources, no pack file in any compile, registry loads with any one pack removed), pack boundaries, no external write-back and credential patterns are clean.",
    );
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
