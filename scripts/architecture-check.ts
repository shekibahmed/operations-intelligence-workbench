import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

async function architectureViolations(): Promise<string[]> {
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

  const writeBackPaths = [
    ...(await sourceFiles(join(repositoryRoot, "packages/rules"))),
    ...[
      "packages/application/src/decisions.ts",
      "packages/application/src/operational-outcome-executors.ts",
      "packages/application/src/rule-execution.ts",
    ].map((path) => resolve(repositoryRoot, path)),
  ];
  for (const file of writeBackPaths) {
    const content = await readFile(file, "utf8");
    for (const label of unsafeWriteBackLabelsInText(content)) {
      violations.push(`${relative(repositoryRoot, file)}: ${label}`);
    }
  }

  for (const file of await trackedRepositoryTextFiles()) {
    const displayPath = relative(repositoryRoot, file);
    const name = basename(file);
    if (name.startsWith(".env") && name !== ".env.example") {
      violations.push(`${displayPath}: committed environment file may contain credentials`);
    }
    const content = await readFile(file, "utf8");
    for (const label of credentialLabelsInText(content)) {
      violations.push(`${displayPath}: possible committed ${label}`);
    }
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
      "Architecture checks passed: neutrality, pack boundaries, no external write-back and credential patterns are clean.",
    );
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
