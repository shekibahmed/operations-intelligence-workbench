import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

import { renderCasebook } from "../../packages/ui/src/casebook.js";
import { assembleCasebook, loadCasebook, sha256 } from "./evidence.js";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const inputDirectory = "scenario-packs/asset-reliability/casebook";
const definitionPath = `${inputDirectory}/case.json`;
const outputPath = "apps/web/public/casebook/a-142-repeat-fault.html";
const story = JSON.parse(await readFile(resolve(root, definitionPath), "utf8"));
const sources = JSON.parse(await readFile(resolve(root, inputDirectory, "sources.json"), "utf8"));
const recording = JSON.parse(await readFile(resolve(root, inputDirectory, "recording.json"), "utf8"));

function inputs() {
  return { story: structuredClone(story), sources: structuredClone(sources), recording: structuredClone(recording) };
}
function assembled(input: ReturnType<typeof inputs>) {
  return assembleCasebook(input.story, input.sources, input.recording);
}

async function archive(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "oiw-casebook-archive-"));
  const paths = ["package.json", "apps/web/package.json", "scripts/casebook/build.ts", "scripts/casebook/evidence.ts", "packages/ui/src/casebook.ts", "apps/web/src/lib/firm.ts", definitionPath, `${inputDirectory}/sources.json`, `${inputDirectory}/recording.json`, outputPath];
  for (const path of paths) {
    await mkdir(dirname(resolve(directory, path)), { recursive: true });
    await copyFile(resolve(root, path), resolve(directory, path));
  }
  await writeFile(resolve(directory, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n');
  await mkdir(resolve(directory, "packages/contracts"), { recursive: true });
  await symlink(resolve(root, "packages/contracts/src"), resolve(directory, "packages/contracts/src"), "dir");
  await mkdir(resolve(directory, "node_modules/.bin"), { recursive: true });
  await symlink(resolve(root, "node_modules/.bin/tsx"), resolve(directory, "node_modules/.bin/tsx"));
  return directory;
}
async function run(directory: string, args: string[]) {
  try {
    return await exec("pnpm", args, { cwd: directory, env: process.env });
  } catch (error) {
    if (error !== null && typeof error === "object" && "stdout" in error && "stderr" in error) throw new Error(`${String(error.stdout)}${String(error.stderr)}`);
    throw error;
  }
}

describe("recorded casebook evidence", () => {
  it("preserves actual review, exact predicate, pending proposal, scripted approval and remaining work", async () => {
    const document = await loadCasebook(resolve(root, definitionPath));
    const html = renderCasebook(document);
    expect(document.sources.map((source) => source.date)).toEqual(["2026-04-06", "2026-05-18", "2026-05-21", "2026-06-02", "2026-06-02", "2026-06-03"]);
    expect(html).toContain("it had brake work done back in the spring");
    expect(html).toContain("70%");
    expect(html).toContain("not a measured live-model result");
    expect(html).toContain("pending → accepted");
    expect(html).toContain("at least two related events within 1,440 hours (60 days)");
    expect(html).toContain("it does not require every counted event to be safety-critical");
    const rule = document.sections.find((section) => section.id === "rule")!;
    expect(rule.facts.find((fact) => fact.label === "Resolved related-event count")?.value).toBe("4");
    expect(html).toContain("awaiting-approval");
    expect(html).toContain("decision-1");
    expect(html).toContain("approval-1");
    expect(html).toContain("no physical work is performed by this script");
    const remaining = document.sections.find((section) => section.id === "remaining")!;
    expect(remaining.facts.find((fact) => fact.label === "Case status")?.value).toBe("open");
    expect(remaining.facts.find((fact) => fact.label === "Assigned to / status")?.value).toBe("maintenance-team / open");
    expect(remaining.facts.find((fact) => fact.label === "Completed at")?.value).toBe("Not recorded");
    expect(html).toContain("does not independently verify the original audit hash chain");
    expect(html).toContain("The Rule Inspector displayed its latest matched evaluation");
    expect(html).toContain("https://bekaamchor.com");
    expect(html).toContain("mailto:hello@bekaamchor.com");
    expect(html).toContain("Built by Shekib and the Kaamchor team.");
  });

  it("pins every evidence/code/test link to the actual captured application revision and embeds all originals", () => {
    const document = assembled(inputs());
    expect(document.evidence).toHaveLength(14);
    for (const evidence of document.evidence) {
      expect(evidence.href).toContain("/blob/2360e1e12c9e70f446957ba4e0b95c78f823dbb2/");
      expect(evidence.text).toBe(sources.files.find((file: { id: string }) => file.id === evidence.id).text);
    }
    for (const capability of document.capabilities) for (const link of capability.links) {
      expect(link.href).toContain("/blob/2360e1e12c9e70f446957ba4e0b95c78f823dbb2/");
    }
    expect(document.provenance.find((fact) => fact.label === "Frozen evidence revision")?.value).toBe("d39191038fbe626e6afdd4a54b3a87d2e98cb0e9");
    expect(document.inputHashes).toHaveLength(5);
    expect(renderCasebook(document)).not.toMatch(/blob\/[^/]+\/[^"<]*recording\.json/);
  });

  it.each(["checksum", "excerpt", "confidence", "revision", "provider", "rule-window", "rule-minimum", "aggregate-references", "approval-reference", "approval-comment", "approval-time", "review-audit", "proposal-audit", "rule-version", "source-reference", "stage-reference", "shape"])("rejects inconsistent %s evidence before rendering", (broken) => {
    const input = inputs();
    if (broken === "checksum") input.sources.files[0].text += "altered";
    if (broken === "excerpt") input.sources.excerpt.text = "unsupported excerpt";
    if (broken === "confidence") input.sources.excerpt.confidence = 0.99;
    if (broken === "revision") input.recording.captureRevision = "a".repeat(40);
    if (broken === "provider") input.recording.provider.providerVersion = "2.0.0";
    if (broken === "rule-window") input.recording.rule.withinHours = 24;
    if (broken === "rule-minimum") input.recording.rule.minimumRelatedEvents = 1;
    if (broken === "aggregate-references") input.recording.rule.relatedEventRefs = ["related-event-1"];
    if (broken === "approval-reference") input.recording.approval.decisionRef = "decision-other";
    if (broken === "approval-comment") input.recording.approval.comment = "Different comment";
    if (broken === "approval-time") input.recording.approval.approvedAt = "2026-10-02T13:27:04.314Z";
    if (broken === "review-audit") input.recording.audit.entries = input.recording.audit.entries.filter((entry: { ref: string }) => entry.ref !== "audit-1");
    if (broken === "proposal-audit") input.recording.audit.entries[2].subjectRef = "decision-other";
    if (broken === "rule-version") input.recording.rule.version = "2.0.0";
    if (broken === "source-reference") input.story.sources[0].fileId = "missing";
    if (broken === "stage-reference") input.story.stages[0].id = "missing";
    if (broken === "shape") delete input.recording.case.actionItems[0].status;
    expect(() => assembled(input)).toThrow();
  });

  it("checks the selected excerpt at its frozen evidence coordinates", () => {
    const input = inputs();
    const extractionFile = input.sources.files.find((file: { id: string }) => file.id === "asset-reliability-demo-001-extraction");
    const extraction = JSON.parse(extractionFile.text);
    extraction.observations.find((observation: { schemaKey: string }) => observation.schemaKey === input.sources.excerpt.fieldKey).evidence[0].locator.start = 0;
    extractionFile.text = JSON.stringify(extraction);
    extractionFile.sha256 = sha256(extractionFile.text);
    expect(() => assembled(input)).toThrow(/coordinate|locator/i);
  });

  it("uses frozen inputs without git history or live fixture/capture files, and check makes no writes", async () => {
    const directory = await archive();
    try {
      // This archive has no .git, live artifacts or capture harness. Those are deliberately not required.
      const before = await stat(resolve(directory, outputPath));
      await run(directory, ["casebook:check"]);
      await run(directory, ["casebook:build"]);
      expect(await readFile(resolve(directory, outputPath), "utf8")).toBe(await readFile(resolve(root, outputPath), "utf8"));
      const afterBuild = await stat(resolve(directory, outputPath));
      expect(afterBuild.ino).not.toBe(before.ino);
      await run(directory, ["casebook:check"]);
      expect((await stat(resolve(directory, outputPath))).mtimeMs).toBe(afterBuild.mtimeMs);
      expect(await readdir(resolve(directory, "apps/web/public/casebook"))).toEqual(["a-142-repeat-fault.html"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);

  it("detects output drift in both ordinary builds before packaging and preserves the changed file", async () => {
    const directory = await archive();
    try {
      await writeFile(resolve(directory, outputPath), "deliberately changed\n");
      const before = await stat(resolve(directory, outputPath));
      for (const args of [["casebook:check"], ["build"], ["--filter", "@oiw/web", "build"]]) {
        await expect(run(directory, args)).rejects.toThrow(/Casebook output drifted/);
        expect(await readFile(resolve(directory, outputPath), "utf8")).toBe("deliberately changed\n");
        expect((await stat(resolve(directory, outputPath))).mtimeMs).toBe(before.mtimeMs);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);

  it("binds frozen case/sources input hashes and preserves a valid artifact on failed generation", async () => {
    const directory = await archive();
    try {
      const before = await readFile(resolve(directory, outputPath), "utf8");
      await writeFile(resolve(directory, definitionPath), `${JSON.stringify(story, null, 2)}\n `);
      await expect(run(directory, ["casebook:build"])).rejects.toThrow(/Capture input checksum mismatch/);
      expect(await readFile(resolve(directory, outputPath), "utf8")).toBe(before);
      expect(await readdir(resolve(directory, "apps/web/public/casebook"))).toEqual(["a-142-repeat-fault.html"]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 20_000);
});
