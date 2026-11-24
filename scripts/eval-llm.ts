/**
 * Scores a live, OpenAI-compatible model against the Scenario Pack gold sets.
 *
 * It needs no database: it sends each fixture artifact to the model, applies
 * the same StructuredOutputValidator the application uses, and compares the
 * proposals with `evaluations/<set>.gold.json`. Nothing is persisted.
 *
 *   OIW_LLM_BASE_URL=http://127.0.0.1:11434/v1 OIW_LLM_MODEL=qwen3:8b \
 *     pnpm eval:llm --set edge-cases
 *
 * Add OIW_LLM_API_KEY for a hosted endpoint. That uses your key and your
 * quota. The fixture provider and `pnpm eval` stay the deterministic CI gate.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import type { JsonValue, ProposedObservation } from "@oiw/contracts";

import {
  LIVE_PROVIDER_ENV,
  OpenAICompatibleIntelligenceProvider,
  StructuredOutputValidator,
} from "../packages/intelligence/src/index.js";
import {
  isTemplatePackDirectoryName,
  loadFixtureSet,
  loadPackFromDirectory,
  type FixtureSetName,
} from "../packages/scenario-sdk/src/index.js";

const repositoryRoot = resolve(import.meta.dirname, "..");
const FIXTURE_SETS: readonly FixtureSetName[] = ["smoke", "demo", "edge-cases"];

interface GoldObservation {
  schemaKey: string;
  status: "extracted" | "insufficient-evidence" | "negated";
  value: JsonValue | null;
}

interface GoldSample {
  fixtureId: string;
  expectedObservations: GoldObservation[];
}

interface Tally {
  artifacts: number;
  providerErrors: number;
  expected: number;
  statusMatch: number;
  expectedValues: number;
  valueExact: number;
  valueClose: number;
  expectedAbstentions: number;
  correctAbstentions: number;
  /** Gold says insufficient-evidence or negated; the model asserted a value. */
  falseConfident: number;
  /** Extracted values for schema keys the gold set does not expect. */
  unexpectedExtractions: number;
  /** Values withheld because the model's quote was not in the source. */
  withheldUngrounded: number;
  schemaInvalid: number;
  durationMs: number;
}

function emptyTally(): Tally {
  return {
    artifacts: 0,
    providerErrors: 0,
    expected: 0,
    statusMatch: 0,
    expectedValues: 0,
    valueExact: 0,
    valueClose: 0,
    expectedAbstentions: 0,
    correctAbstentions: 0,
    falseConfident: 0,
    unexpectedExtractions: 0,
    withheldUngrounded: 0,
    schemaInvalid: 0,
    durationMs: 0,
  };
}

function addTally(target: Tally, source: Tally): void {
  for (const key of Object.keys(target) as (keyof Tally)[]) target[key] += source[key];
}

function normaliseText(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function canonical(value: unknown): string {
  if (typeof value === "string") return normaliseText(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Exact after case, whitespace and punctuation are ignored. */
function valuesMatch(expected: unknown, actual: unknown): boolean {
  return canonical(expected) === canonical(actual);
}

/** Close: one string contains the other, or at least 60% word overlap. */
function valuesClose(expected: unknown, actual: unknown): boolean {
  if (valuesMatch(expected, actual)) return true;
  if (typeof expected !== "string" || typeof actual !== "string") return false;
  const left = normaliseText(expected);
  const right = normaliseText(actual);
  if (left.length === 0 || right.length === 0) return false;
  if (left.includes(right) || right.includes(left)) return true;
  const leftWords = new Set(left.split(" "));
  const rightWords = new Set(right.split(" "));
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared / new Set([...leftWords, ...rightWords]).size >= 0.6;
}

function scoreSample(gold: GoldSample, proposals: readonly ProposedObservation[], tally: Tally): void {
  const unused = [...proposals];
  for (const expected of gold.expectedObservations) {
    tally.expected += 1;
    const index = unused.findIndex(({ schemaKey }) => schemaKey === expected.schemaKey);
    const actual = index === -1 ? undefined : unused.splice(index, 1)[0];
    const actualStatus = actual?.status ?? "insufficient-evidence";
    if (actualStatus === expected.status) tally.statusMatch += 1;

    if (expected.status === "extracted") {
      tally.expectedValues += 1;
      if (actual?.status === "extracted") {
        if (valuesMatch(expected.value, actual.value)) tally.valueExact += 1;
        if (valuesClose(expected.value, actual.value)) tally.valueClose += 1;
      }
    } else {
      tally.expectedAbstentions += 1;
      if (actualStatus === expected.status) tally.correctAbstentions += 1;
      if (actual?.status === "extracted") tally.falseConfident += 1;
    }
  }
  tally.unexpectedExtractions += unused.filter(({ status }) => status === "extracted").length;
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}

function tableRow(label: string, tally: Tally): string {
  return [
    label,
    String(tally.artifacts),
    String(tally.providerErrors),
    percent(tally.statusMatch, tally.expected),
    percent(tally.valueExact, tally.expectedValues),
    percent(tally.valueClose, tally.expectedValues),
    `${String(tally.correctAbstentions)}/${String(tally.expectedAbstentions)}`,
    String(tally.falseConfident),
    String(tally.unexpectedExtractions),
    String(tally.withheldUngrounded),
    String(tally.schemaInvalid),
  ].join(" | ");
}

const TABLE_HEADER = [
  "Pack / set | Artifacts | Errors | Status match | Value exact | Value close | Abstentions kept | False confident | Unexpected values | Withheld (ungrounded) | Schema-invalid",
  "---|---|---|---|---|---|---|---|---|---|---",
].join("\n");

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      pack: { type: "string" },
      set: { type: "string", multiple: true },
      limit: { type: "string" },
      out: { type: "string" },
    },
  });

  const provider = OpenAICompatibleIntelligenceProvider.fromEnv();
  if (provider === null) {
    console.error(
      `Set ${LIVE_PROVIDER_ENV.baseUrl} and ${LIVE_PROVIDER_ENV.model} (and ${LIVE_PROVIDER_ENV.apiKey} if the endpoint needs one).\n` +
        "Free local example: ollama pull qwen3:8b, then\n" +
        `  ${LIVE_PROVIDER_ENV.baseUrl}=http://127.0.0.1:11434/v1 ${LIVE_PROVIDER_ENV.model}=qwen3:8b pnpm eval:llm --set smoke`,
    );
    return 2;
  }

  const sets = (values.set ?? ["smoke"]) as FixtureSetName[];
  for (const set of sets) {
    if (!FIXTURE_SETS.includes(set)) {
      console.error(`Unknown fixture set "${set}". Use one of: ${FIXTURE_SETS.join(", ")}`);
      return 2;
    }
  }
  const limit = values.limit === undefined ? Number.POSITIVE_INFINITY : Number(values.limit);
  const validator = new StructuredOutputValidator();
  const packsDirectory = resolve(repositoryRoot, "scenario-packs");
  const packDirectories = (await readdir(packsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !isTemplatePackDirectoryName(entry.name))
    .map((entry) => join(packsDirectory, entry.name))
    .sort();

  const rows: { label: string; tally: Tally }[] = [];
  const total = emptyTally();
  for (const directory of packDirectories) {
    const loaded = await loadPackFromDirectory(directory);
    if (loaded.status !== "loaded") continue;
    const pack = loaded.pack;
    if (values.pack !== undefined && pack.manifest.id !== values.pack) continue;

    for (const set of sets) {
      const fixtureSet = await loadFixtureSet(pack, set);
      if (fixtureSet.status !== "loaded") throw new Error(`${pack.manifest.id}/${set} fixtures are invalid`);
      const goldPath = join(pack.directory, "evaluations", `${set}.gold.json`);
      const gold = JSON.parse(await readFile(goldPath, "utf8")) as GoldSample[];
      const goldById = new Map(gold.map((sample) => [sample.fixtureId, sample]));
      const tally = emptyTally();

      for (const artifact of fixtureSet.fixtureSet.artifacts.slice(0, limit)) {
        const sample = goldById.get(artifact.id);
        if (sample === undefined) continue;
        tally.artifacts += 1;
        const started = Date.now();
        try {
          const result = await provider.extract({
            artifact: {
              checksum: artifact.sha256,
              artifactType: artifact.artifactType,
              mimeType: artifact.mimeType,
              rawText: new TextDecoder().decode(artifact.content),
              rawReference: `fixture://${pack.manifest.id}/${set}/${artifact.id}`,
              metadata: artifact.sourceMetadata,
            },
            observationSchema: Object.fromEntries(pack.observationSchemas) as Record<string, JsonValue>,
            context: { packId: pack.manifest.id, packVersion: pack.manifest.version, locale: "en", values: {} },
          });
          const validation = validator.validate(result, artifact.sha256, pack.observationSchemas);
          if (validation.validResult) {
            tally.schemaInvalid += validation.observations.filter(({ valid }) => !valid).length;
          }
          tally.withheldUngrounded += result.observations.filter(
            (observation) => observation.status === "insufficient-evidence" && observation.confidence === 0 &&
              observation.reason.includes("not found verbatim"),
          ).length;
          scoreSample(sample, result.observations, tally);
        } catch (error) {
          tally.providerErrors += 1;
          scoreSample(sample, [], tally);
          console.error(`${artifact.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
        tally.durationMs += Date.now() - started;
        process.stderr.write(".");
      }
      process.stderr.write("\n");
      rows.push({ label: `${pack.manifest.id} / ${set}`, tally });
      addTally(total, tally);
    }
  }

  const report = [
    `Model: \`${provider.model}\`  `,
    `Run: ${new Date().toISOString()}`,
    "",
    TABLE_HEADER,
    ...rows.map(({ label, tally }) => tableRow(label, tally)),
    tableRow("**All**", total),
  ].join("\n");
  console.log(report);

  const outPath = resolve(
    repositoryRoot,
    values.out ?? `eval-results/llm-${provider.model.replace(/[^a-zA-Z0-9.-]+/g, "_")}.json`,
  );
  await mkdir(resolve(outPath, ".."), { recursive: true });
  await writeFile(
    outPath,
    `${JSON.stringify({ model: provider.model, sets, rows, total, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.error(`Wrote ${relative(repositoryRoot, outPath)}`);
  return total.providerErrors === total.artifacts && total.artifacts > 0 ? 1 : 0;
}

process.exitCode = await main();
