import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { ExtractionResultSchema, RuleDefinitionSchema } from "../../packages/contracts/src/index.js";

import { createDatabase } from "../../packages/persistence/src/database.js";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "../..");
const packDirectory = "scenario-packs/asset-reliability/casebook";

export interface CaptureStages {
  fieldKey: string;
  confidence: string;
  excerpt: string;
  pendingStatus: string;
  queueCleared: boolean;
  ruleId: string;
  ruleVersion: string;
  ruleEventId: string;
  severityValue: string;
  aggregateValue: number;
  commentRequired: boolean;
  approvalComment: string;
}

export interface FrozenSources {
  schemaVersion: 1;
  sourceRevision: string;
  pack: { id: string; version: string };
  provider: { providerId: string; providerVersion: string; model: null; deterministic: true };
  files: Array<{ id: string; kind: string; path: string; text: string; sha256: string }>;
  excerpt: { fileId: string; fieldKey: string; text: string; confidence: number };
}

type ObjectRecord = Record<string, unknown>;
function object(value: unknown, label: string): ObjectRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as ObjectRecord;
}
function list(value: unknown, label: string): ObjectRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry) => object(entry, label));
}
function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be nonempty text`);
  return value;
}
function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : string(value, label);
}
function timestamp(value: unknown, label: string): string {
  const text = string(value, label);
  if (!Number.isFinite(Date.parse(text))) throw new Error(`${label} must be a timestamp`);
  return text;
}
function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function records(value: unknown, dataset: string): ObjectRecord[] {
  const document = object(value, `${dataset} export`);
  requireThat(document.dataset === dataset && string(document.syntheticDataNotice, "synthetic notice").includes("Synthetic demo data only"), "Expected authenticated synthetic export format");
  return list(document.records, `${dataset} records`);
}
function one(entries: ObjectRecord[], predicate: (entry: ObjectRecord) => boolean, label: string): ObjectRecord {
  const found = entries.filter(predicate);
  requireThat(found.length === 1, `Expected exactly one ${label}`);
  return found[0]!;
}

/** Validate the actual export projections before selecting public fields. Raw IDs stay in memory. */
export function projectCapture(input: unknown) {
  const raw = object(input, "capture");
  const stages = object(raw.stages, "UI stages");
  requireThat(stages.pendingStatus === "Pending review" && stages.queueCleared === true, "Pending review and resolved queue must be observed");
  requireThat(stages.confidence === "70%" && stages.fieldKey === "previous-repair-reference", "Expected authored previous-repair confidence");
  requireThat(stages.commentRequired === true, "High-risk comment gate was not observed");
  const comment = string(stages.approvalComment, "approval comment");
  requireThat(comment.startsWith("Synthetic automated approval"), "Approval comment must disclose synthetic automation");
  const pending = one(records(raw.pending, "cases"), () => true, "pending case");
  const final = one(records(raw.final, "cases"), (entry) => entry.id === pending.id, "final case");
  requireThat(pending.workspaceId === final.workspaceId, "Case workspace changed");
  const proposal = one(list(pending.decisions, "pending decisions"), (entry) => entry.riskLevel === "critical", "critical proposal");
  requireThat(proposal.status === "awaiting-approval" && proposal.decidedAt === null && list(pending.approvals, "pending approvals").length === 0, "Proposal must await approval without an existing Approval");
  const decision = one(list(final.decisions, "final decisions"), (entry) => entry.id === proposal.id, "final decision");
  requireThat(decision.status === "approved" && decision.decisionType === proposal.decisionType && decision.approvalPolicyId === proposal.approvalPolicyId && decision.riskLevel === proposal.riskLevel, "Decision identity or approved state is inconsistent");
  const approval = one(list(final.approvals, "approvals"), (entry) => entry.decisionId === decision.id, "matching approval");
  requireThat(approval.outcome === "approved" && approval.comment === comment && approval.approvedAt === decision.decidedAt, "Approval outcome, comment or time does not match decision");
  const entries = records(raw.audit, "audit");
  requireThat(entries.every((entry) => entry.workspaceId === final.workspaceId), "Audit export scope mismatch");
  const data = (entry: ObjectRecord) => object(entry.data, "audit data");
  const subject = (entry: ObjectRecord) => object(entry.subject, "audit subject");
  const review = one(entries, (entry) => entry.action === "observation-accepted" && data(entry).schemaKey === stages.fieldKey, "review acceptance audit");
  requireThat(subject(review).type === "observation" && data(review).previousReviewStatus === "pending" && data(review).reviewStatus === "accepted" && object(review.actor, "review actor").type === "human", "Review audit does not establish governed acceptance");
  const proposed = one(entries, (entry) => entry.action === "decision-proposed" && subject(entry).id === proposal.id, "proposal audit");
  requireThat(data(proposed).caseId === final.id && data(proposed).ruleId === stages.ruleId && data(proposed).ruleVersion === stages.ruleVersion && data(proposed).riskLevel === proposal.riskLevel && data(proposed).approvalPolicyId === proposal.approvalPolicyId, "Proposal audit reference mismatch");
  const approved = one(entries, (entry) => entry.action === "decision-approved" && subject(entry).id === decision.id, "approval audit");
  requireThat(data(approved).approvalId === approval.id && data(approved).caseId === final.id && data(approved).outcome === "approved" && data(approved).previousDecisionStatus === "awaiting-approval" && approved.occurredAt === approval.approvedAt && object(approved.actor, "approval actor").type === "human" && object(approved.actor, "approval actor").id === approval.approver, "Approval audit reference mismatch");
  const ruleEntries = entries.filter((entry) => entry.action === "rule-evaluated" && data(entry).ruleId === stages.ruleId && data(entry).ruleVersion === stages.ruleVersion && data(entry).result === true && subject(entry).id === stages.ruleEventId);
  requireThat(ruleEntries.length === 1, "Missing or ambiguous displayed rule evaluation audit");
  const rule = ruleEntries[0]!;
  const condition = object(data(rule).condition, "rule condition");
  requireThat(condition.kind === "all" && condition.result === true, "Rule must retain ALL predicate");
  const children = list(condition.children, "rule comparisons");
  requireThat(children.length === 2, "Unexpected rule predicate shape");
  const severity = children[0]!;
  const aggregate = children[1]!;
  const severityFact = object(severity.fact, "severity trace");
  const aggregateFact = object(aggregate.fact, "aggregate trace");
  const severityReference = object(severityFact.fact, "severity reference");
  const aggregateReference = object(aggregateFact.fact, "aggregate reference");
  requireThat(severity.kind === "comparison" && severity.result === true && severity.operator === "equals" && severity.expected === "safety-critical" && severityFact.exists === true && severityFact.value === stages.severityValue && stages.severityValue === "safety-critical" && severityReference.kind === "observation" && severityReference.schemaKey === "severity-indicator", "Severity predicate mismatch");
  requireThat(aggregate.kind === "comparison" && aggregate.result === true && aggregate.operator === "greater-than-or-equal" && aggregate.expected === 2 && aggregateFact.exists === true && aggregateReference.kind === "aggregate" && aggregateReference.aggregate === "related-event-count" && aggregateReference.withinHours === 1440 && aggregateReference.eventType === undefined && aggregateFact.value === stages.aggregateValue && typeof aggregateFact.value === "number" && aggregateFact.value >= 2, "Related-event aggregate mismatch");
  requireThat(Array.isArray(aggregateFact.relatedEventIds) && aggregateFact.relatedEventIds.length === aggregateFact.value && new Set(aggregateFact.relatedEventIds).size === aggregateFact.value, "Aggregate event count does not match its references");
  requireThat(Array.isArray(final.relatedEventIds) && final.relatedEventIds.includes(subject(rule).id), "Matched rule event is not related to the case");
  requireThat(final.status === "open", "Final case must remain open");
  const actions = list(final.actionItems, "action items");
  requireThat(actions.length > 0, "Final action items are missing");
  for (const action of actions) requireThat(["open", "in-progress", "completed", "cancelled"].includes(String(action.status)), "Unknown exported action-item state");
  const selected = [review, rule, proposed, approved];
  const publicAudit = selected.map((entry, index) => ({ ref: `audit-${index + 1}`, action: string(entry.action, "audit action"), occurredAt: timestamp(entry.occurredAt, "audit time"), subjectRef: entry === review ? "observation-1" : entry === rule ? "event-1" : "decision-1", actorType: string(object(entry.actor, "actor").type, "actor type") }));
  return {
    review: { ref: "observation-1", fieldKey: string(stages.fieldKey, "field"), displayedConfidence: string(stages.confidence, "confidence"), excerpt: string(stages.excerpt, "excerpt"), before: "pending", after: "accepted", queueCleared: true, auditRef: publicAudit[0]!.ref },
    rule: { id: string(stages.ruleId, "rule ID"), version: string(stages.ruleVersion, "rule version"), matched: true, severityValue: string(stages.severityValue, "severity"), relatedEventCount: aggregateFact.value, withinHours: 1440, minimumRelatedEvents: 2, eventRef: "event-1", selection: "The Rule Inspector displayed its latest matched evaluation. This does not identify the initial evaluation that first created the idempotent decision proposal.", relatedEventRefs: aggregateFact.relatedEventIds.map((id, index) => id === subject(rule).id ? "event-1" : `related-event-${index + 1}`), auditRef: publicAudit[1]!.ref },
    proposal: { ref: "decision-1", caseRef: "case-1", decisionType: string(proposal.decisionType, "decision type"), proposal: string(proposal.proposal, "proposal"), riskLevel: "critical", approvalPolicyId: string(proposal.approvalPolicyId, "approval policy"), status: "awaiting-approval", commentRequired: true, auditRef: publicAudit[2]!.ref },
    approval: { ref: "approval-1", decisionRef: "decision-1", outcome: "approved", comment, approvedAt: timestamp(approval.approvedAt, "approval time"), actor: "Scripted visitor exercising human-governed UI", auditRef: publicAudit[3]!.ref },
    case: { ref: "case-1", title: string(final.title, "case title"), caseType: string(final.caseType, "case type"), status: string(final.status, "case status"), severity: string(final.severity, "case severity"), priority: string(final.priority, "case priority"), owner: nullableString(final.owner, "owner"), dueAt: nullableString(final.dueAt, "case due"), decisionStatus: string(decision.status, "final decision status"), actionItems: actions.map((action, index) => ({ ref: `action-${index + 1}`, actionType: string(action.actionType, "action type"), title: string(action.title, "action title"), assignee: nullableString(action.assignee, "assignee"), status: string(action.status, "action status"), dueAt: nullableString(action.dueAt, "action due"), completedAt: nullableString(action.completedAt, "action completion") })) },
    audit: { qualification: "Selected export projection with public aliases; this does not independently verify the original audit hash chain.", entries: publicAudit },
  };
}
export type RecordedProjection = ReturnType<typeof projectCapture>;

export async function saveRecording(destination: string, input: unknown, metadata: object): Promise<void> {
  const projection = projectCapture(input);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify({ ...metadata, ...projection }, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
function publicLog(bytes: Buffer): string {
  return bytes.toString()
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[private database connection]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[private identifier]")
    .replace(/\/w\/[^/\s?]+/g, "/w/[private workspace]");
}
async function run(command: string, args: string[], env: NodeJS.ProcessEnv, cwd = root): Promise<void> {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout?.on("data", (bytes: Buffer) => process.stdout.write(publicLog(bytes)));
  child.stderr?.on("data", (bytes: Buffer) => process.stderr.write(publicLog(bytes)));
  await new Promise<void>((accept, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? accept() : reject(new Error(`${command} exited ${code}`)));
  });
}
async function unusedPort(): Promise<number> {
  const socket = createServer();
  await new Promise<void>((accept, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", accept); });
  const address = socket.address();
  requireThat(address !== null && typeof address === "object", "Could not reserve server port");
  await new Promise<void>((accept, reject) => socket.close((error) => error ? reject(error) : accept()));
  return address.port;
}
async function stop(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) return;
  await new Promise<void>((accept) => {
    const force = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.once("exit", () => { clearTimeout(force); accept(); });
    child.kill("SIGTERM");
  });
}

export async function capture(): Promise<void> {
  const adminUrl = process.env.CASEBOOK_ADMIN_DATABASE_URL;
  requireThat(adminUrl !== undefined, "Set CASEBOOK_ADMIN_DATABASE_URL explicitly; capture creates and drops its own database");
  const url = new URL(adminUrl);
  requireThat(url.protocol === "postgres:" || url.protocol === "postgresql:", "Expected PostgreSQL admin URL");
  const { stdout: dirty } = await exec("git", ["status", "--porcelain"], { cwd: root });
  requireThat(dirty.trim() === "", "Capture requires a clean committed tree; commit the harness and inputs first");
  const { stdout: revision } = await exec("git", ["rev-parse", "HEAD"], { cwd: root });
  const captureRevision = revision.trim();
  const sources = JSON.parse(await readFile(resolve(root, packDirectory, "sources.json"), "utf8")) as FrozenSources;
  requireThat(/^[a-f0-9]{40}$/.test(sources.sourceRevision), "Frozen sources require a full historical source revision");
  for (const file of sources.files) {
    requireThat(sha256(file.text) === file.sha256, `Frozen source checksum mismatch: ${file.id}`);
    requireThat(await readFile(resolve(root, file.path), "utf8") === file.text, `Intentional source refresh required: ${file.id}`);
    const pinned = await exec("git", ["show", `${sources.sourceRevision}:${file.path}`], { cwd: root, maxBuffer: 1024 * 1024 });
    requireThat(pinned.stdout === file.text, `Historical source does not match frozen evidence: ${file.id}`);
  }
  const excerptFile = sources.files.find((file) => file.id === sources.excerpt.fileId);
  requireThat(excerptFile !== undefined && excerptFile.text.includes(sources.excerpt.text), "Excerpt is not in its frozen original source");
  const extractionFile = sources.files.find((file) => file.id === `${sources.excerpt.fileId}-extraction`);
  requireThat(extractionFile !== undefined, "Frozen extraction missing");
  const extraction = ExtractionResultSchema.parse(JSON.parse(extractionFile.text));
  requireThat(extraction.artifactChecksum === excerptFile.sha256, "Extraction is not bound to its original artifact");
  const uncertain = extraction.observations.find((entry) => entry.schemaKey === sources.excerpt.fieldKey);
  requireThat(uncertain?.confidence === sources.excerpt.confidence && uncertain.evidence.some((entry) => entry.excerpt === sources.excerpt.text), "Frozen extraction does not support the selected confidence and excerpt");
  requireThat(JSON.stringify(extraction.provider) === JSON.stringify(sources.provider) && extraction.provider.deterministic === true, "Frozen extraction identity mismatch");
  const story = object(JSON.parse(await readFile(resolve(root, packDirectory, "case.json"), "utf8")), "case presentation");
  const selection = object(story.capture, "capture selection");
  const ruleFile = sources.files.find((file) => file.id === "approval-rule");
  requireThat(ruleFile !== undefined, "Frozen approval rule missing");
  const rules = JSON.parse(ruleFile.text) as unknown[];
  const selectedRule = RuleDefinitionSchema.parse(rules.find((entry) => object(entry, "rule").id === selection.ruleId));
  requireThat(selectedRule.version === selection.ruleVersion, "Selected rule version mismatch");
  const inputPaths = [`${packDirectory}/case.json`, `${packDirectory}/sources.json`, "scripts/casebook/capture.ts", "apps/web/playwright.casebook-capture.config.ts", "apps/web/e2e/casebook-capture.spec.ts"];
  const inputs = await Promise.all(inputPaths.map(async (path) => ({ path, sha256: sha256(await readFile(resolve(root, path), "utf8")) })));
  const databaseName = `oiw_casebook_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const admin = createDatabase(adminUrl);
  url.pathname = `/${databaseName}`;
  const staging = await mkdtemp(resolve(tmpdir(), "oiw-casebook-capture-"));
  const port = await unusedPort();
  const env = { ...process.env, DATABASE_URL: url.toString(), SESSION_SECRET: randomUUID() + randomUUID(), CASEBOOK_CAPTURE: "1", CASEBOOK_CAPTURE_PORT: String(port), CASEBOOK_CAPTURE_RAW: resolve(staging, "raw.json"), OIW_RATE_LIMIT_STORE: "memory" };
  let server: ChildProcess | undefined;
  let created = false;
  let interrupted = false;
  const interrupt = () => { interrupted = true; server?.kill("SIGTERM"); };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    await admin.client.unsafe(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await run("pnpm", ["db:migrate"], env);
    await run("pnpm", ["--filter", "!@oiw/web", "--recursive", "--if-present", "run", "build"], env);
    await run("pnpm", ["--filter", "@oiw/web", "exec", "next", "build"], env);
    requireThat(!interrupted, "Capture interrupted before server startup");
    server = spawn(process.execPath, [resolve(root, "apps/web/node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: resolve(root, "apps/web"), env, stdio: ["ignore", "pipe", "pipe"] });
    const ownedServer = server;
    await new Promise<void>((accept, reject) => {
      const timeout = setTimeout(() => reject(new Error("Owned capture server did not become ready")), 60_000);
      ownedServer.once("error", (error) => { clearTimeout(timeout); reject(error); });
      ownedServer.once("exit", () => { clearTimeout(timeout); reject(new Error("Owned capture server exited before ready")); });
      ownedServer.stderr?.on("data", (bytes: Buffer) => process.stderr.write(publicLog(bytes)));
      ownedServer.stdout?.on("data", (bytes: Buffer) => {
        process.stdout.write(publicLog(bytes));
        if (bytes.toString().includes("Ready in")) { clearTimeout(timeout); accept(); }
      });
    });
    await run(process.execPath, [resolve(root, "apps/web/node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.casebook-capture.config.ts"], env, resolve(root, "apps/web"));
    requireThat(!interrupted && server.exitCode === null, "Capture server did not remain owned and running");
    const raw = JSON.parse(await readFile(env.CASEBOOK_CAPTURE_RAW, "utf8")) as unknown;
    const projection = projectCapture(raw);
    requireThat(projection.review.excerpt === sources.excerpt.text && projection.review.fieldKey === sources.excerpt.fieldKey && projection.review.displayedConfidence === `${sources.excerpt.confidence * 100}%`, "Observed review does not match frozen extraction");
    const { stdout: finalDirty } = await exec("git", ["status", "--porcelain"], { cwd: root });
    requireThat(finalDirty.trim() === "", "Capture inputs changed during execution");
    await saveRecording(resolve(root, packDirectory, "recording.json"), raw, {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      sourceRevision: captureRevision,
      evidenceRevision: sources.sourceRevision,
      captureRevision,
      harness: { id: "oiw-casebook-ui-capture", version: "1.0.0", revision: captureRevision },
      pack: sources.pack,
      provider: sources.provider,
      inputs,
      automation: { method: "Playwright exercising authenticated human-governed UI", disclosure: "Synthetic scripted review and approval; no maintenance lead was consulted. No physical execution or measured business impact is established." },
    });
    console.log("Validated casebook recording saved. Temporary private export files will be removed.");
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
    await stop(server);
    try {
      if (created) await admin.client.unsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    } finally {
      await admin.close();
      await rm(staging, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capture().catch(() => {
    // Driver errors can contain connection URLs; never echo raw exceptions or credentials.
    console.error("Casebook capture failed; prior recording preserved. Check clean sources, explicit admin database access and owned application startup.");
    process.exitCode = 1;
  });
}
