import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scenarioPacksDirectory = resolve(repositoryRoot, "scenario-packs");
const templateDirectory = join(scenarioPacksDirectory, "_template");

const PACK_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function usage(): string {
  return [
    "Usage: pnpm pack:scaffold <pack-id> [--name \"Human Name\"] [--description \"...\" ]",
    "",
    "Copies scenario-packs/_template into scenario-packs/<pack-id>, renames the",
    "`template-` identifier prefix to `<pack-id>-`, and verifies the copy by",
    "recomputing every fixture artifact checksum (content bytes are never",
    "rewritten, so evidence offsets stay valid).",
    "",
    "Next steps after scaffolding:",
    "  1. pnpm validate:packs",
    "  2. Author in docs/PACK_AUTHORING.md order (§2), gold sets after extractions",
    "  3. Selector registration checklist (docs/PACK_AUTHORING.md §12) to appear on /demo",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`pack:scaffold: ${message}`);
  process.exit(1);
}

function parseArguments(argv: string[]): { packId: string; name: string; description: string } {
  const positional: string[] = [];
  let name: string | undefined;
  let description: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === "--name") {
      name = argv[index + 1];
      index += 1;
    } else if (argument === "--description") {
      description = argv[index + 1];
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (argument.startsWith("--")) {
      fail(`unknown flag ${argument}\n\n${usage()}`);
    } else {
      positional.push(argument);
    }
  }
  if (name === undefined || description === undefined || positional.length === 0) {
    fail(`expected <pack-id> --name <name> --description <description>\n\n${usage()}`);
  }
  return { packId: positional[0]!, name, description };
}

function collectFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  const { packId, name, description } = parseArguments(process.argv.slice(2));
  if (!PACK_ID_PATTERN.test(packId) || packId === "template") {
    fail(`pack id must be kebab-case (e.g. field-compliance), got ${JSON.stringify(packId)}`);
  }
  if (!existsSync(templateDirectory)) fail("scenario-packs/_template is missing");
  const targetDirectory = join(scenarioPacksDirectory, packId);
  if (existsSync(targetDirectory)) {
    fail(`scenario-packs/${packId} already exists — refusing to overwrite`);
  }

  cpSync(templateDirectory, targetDirectory, { recursive: true });

  // Rewrite the `template-` identifier prefix everywhere (manifest paths,
  // schema ids, rule references, fixture index ids, gold sets). Artifact
  // content bytes are verified untouched below, so evidence offsets stay
  // valid.
  const files = collectFiles(targetDirectory).sort();
  for (const file of files) {
    if (file.endsWith("README.md")) continue;
    const original = readFileSync(file, "utf8");
    if (original.includes("template-")) {
      writeFileSync(file, original.replaceAll("template-", `${packId}-`));
    }
  }
  // Bare manifest identity (the prefix replacement above cannot cover it).
  const manifestPath = join(targetDirectory, "manifest.yaml");
  const manifest = readFileSync(manifestPath, "utf8")
    .replace(/^id: template$/m, `id: ${packId}`)
    .replace(/^name: "Template Pack"$/m, `name: "${name.replaceAll('"', "'")}"`);
  writeFileSync(manifestPath, manifest);

  // Rename `template-`-prefixed file names to match their references.
  for (const file of collectFiles(targetDirectory).sort().reverse()) {
    const renamed = file.replaceAll("template-", `${packId}-`);
    if (renamed !== file) renameSync(file, renamed);
  }

  // The template README documents template-only concerns; a real pack
  // starts from the authoring guide instead.
  rmSync(join(targetDirectory, "README.md"));
  writeFileSync(
    join(targetDirectory, "README.md"),
    [
      `# ${name}`,
      "",
      description,
      "",
      "Scaffolded from `scenario-packs/_template` via `pnpm pack:scaffold`.",
      "Author in `docs/PACK_AUTHORING.md` order (§2): observations → entities →",
      "events → cases → workflows → rules → seed → fixtures (content, then",
      "`sha256`, then checksum-keyed extractions, then `index.json`) → gold",
      "sets → metrics → dashboards → labels → manifest last.",
      "",
      "Validate with `pnpm validate:packs`, prove the lifecycle with the",
      "common-lifecycle suite and `pnpm eval --pack <id>`, and follow the",
      "selector registration checklist (`docs/PACK_AUTHORING.md` §12) to",
      "appear on `/demo`.",
      "",
    ].join("\n"),
  );

  // Self-check: every fixture artifact's bytes must be identical to the
  // template's, so declared checksums and evidence offsets still hold.
  const indexPath = join(targetDirectory, "fixtures", "smoke", "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as Array<{
    id: string;
    contentPath: string;
    sha256: string;
    expectedExtraction: string;
  }>;
  for (const entry of index) {
    const contentFile = join(targetDirectory, "fixtures", "smoke", entry.contentPath);
    const extractionFile = join(targetDirectory, "fixtures", "smoke", entry.expectedExtraction);
    if (!existsSync(contentFile)) fail(`scaffolded artifact content missing: ${entry.contentPath}`);
    if (!existsSync(extractionFile)) fail(`scaffolded expected extraction missing: ${entry.expectedExtraction}`);
    const actual = sha256Hex(readFileSync(contentFile));
    if (actual !== entry.sha256) {
      fail(`checksum drift in ${entry.contentPath}: index says ${entry.sha256}, bytes say ${actual}`);
    }
  }

  console.log(`Scaffolded scenario-packs/${packId} (${index.length} smoke fixtures verified).`);
  console.log("Next: pnpm validate:packs");
}

await main();
