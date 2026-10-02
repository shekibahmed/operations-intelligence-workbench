import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import { ExtractionResultSchema, RuleDefinitionSchema } from "../../packages/contracts/src/index.js";
import type { CasebookDocument, CasebookFact, CasebookSection } from "../../packages/ui/src/casebook.js";
import { FIRM } from "../../apps/web/src/lib/firm.js";
import type { FrozenSources, projectCapture } from "./capture.js";

const repository = "https://github.com/shekibahmed/operations-intelligence-workbench";
const root = resolve(import.meta.dirname, "../..");
type RecordObject = Record<string, unknown>;
interface Definition {
  schemaVersion: number;
  id: string;
  title: string;
  question: string;
  summary: string;
  attribution: string;
  disclosures: string[];
  sources: Array<{ fileId: string; date: string; label: string; context: string }>;
  stages: Array<{ id: string; title: string; explanation: string }>;
  capabilities: Array<{ title: string; explanation: string; paths: string[] }>;
  capture: { ruleId: string; ruleVersion: string; approvalComment: string };
}
interface RecordingMetadata {
  schemaVersion: number;
  capturedAt: string;
  sourceRevision: string;
  evidenceRevision: string;
  captureRevision: string;
  harness: { id: string; version: string; revision: string };
  pack: FrozenSources["pack"];
  provider: FrozenSources["provider"];
  inputs: Array<{ path: string; sha256: string }>;
  automation: { method: string; disclosure: string };
}
type Recording = ReturnType<typeof projectCapture> & RecordingMetadata;

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, label: string): RecordObject {
  requireThat(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value as RecordObject;
}
function text(value: unknown, label: string): string {
  requireThat(typeof value === "string" && value.trim().length > 0, `${label} must be nonempty text`);
  return value;
}
function array(value: unknown, label: string): unknown[] {
  requireThat(Array.isArray(value), `${label} must be an array`);
  return value;
}
function strings(value: unknown, label: string): string[] {
  return array(value, label).map((entry) => text(entry, label));
}
function timestamp(value: string, label: string): void {
  requireThat(/^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)), `${label} must be an ISO timestamp`);
}
function revision(value: string): void {
  requireThat(/^[a-f0-9]{40}$/.test(value), "Expected a full historical revision");
}
function checksum(value: string): void {
  requireThat(/^[a-f0-9]{64}$/.test(value), "Expected a SHA-256 checksum");
}
function path(value: string): string {
  requireThat(!value.startsWith("/") && value.split("/").every((part) => part !== ".." && part !== "." && part.length > 0) && !/[\\?#]/.test(value) && !Array.from(value).some((character) => character.charCodeAt(0) <= 32), "Expected a repository-relative evidence path");
  return value;
}
function anchor(value: string): void {
  requireThat(/^[a-z0-9][a-z0-9-]*$/.test(value), "Expected a safe evidence identifier");
}
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function definition(input: unknown): Definition {
  const value = object(input, "definition");
  const capture = object(value.capture, "capture selection");
  requireThat(value.schemaVersion === 1, "Unsupported definition version");
  const result = {
    schemaVersion: 1,
    id: text(value.id, "case id"), title: text(value.title, "title"), question: text(value.question, "question"),
    summary: text(value.summary, "summary"), attribution: text(value.attribution, "attribution"), disclosures: strings(value.disclosures, "disclosures"),
    sources: array(value.sources, "sources").map((entry) => {
      const source = object(entry, "source selection");
      return { fileId: text(source.fileId, "fileId"), date: text(source.date, "date"), label: text(source.label, "label"), context: text(source.context, "context") };
    }),
    stages: array(value.stages, "stages").map((entry) => {
      const stage = object(entry, "stage");
      return { id: text(stage.id, "stage id"), title: text(stage.title, "stage title"), explanation: text(stage.explanation, "stage explanation") };
    }),
    capabilities: array(value.capabilities, "capabilities").map((entry) => {
      const capability = object(entry, "capability");
      return { title: text(capability.title, "capability title"), explanation: text(capability.explanation, "capability explanation"), paths: strings(capability.paths, "implementation paths").map(path) };
    }),
    capture: { ruleId: text(capture.ruleId, "ruleId"), ruleVersion: text(capture.ruleVersion, "ruleVersion"), approvalComment: text(capture.approvalComment, "approvalComment") },
  };
  anchor(result.id);
  requireThat(result.disclosures.length > 0 && result.sources.length > 0 && result.capabilities.length > 0, "Essential presentation content is missing");
  for (const source of result.sources) requireThat(/^\d{4}-\d\d-\d\d$/.test(source.date) && Number.isFinite(Date.parse(source.date)), "Source date must be an ISO date");
  requireThat(new Set(result.sources.map((source) => source.fileId)).size === result.sources.length, "Duplicate source selection");
  return result;
}

// Only the bounded public projection is validated here; it is not a full domain object.
function projectionShape(value: unknown, sample: unknown, label: string): void {
  if (sample === null) {
    requireThat(value === null || typeof value === "string", `${label} must be nullable text`);
  } else if (Array.isArray(sample)) {
    for (const item of array(value, label)) projectionShape(item, sample[0], label);
  } else if (typeof sample === "object") {
    const entry = object(value, label);
    for (const [key, child] of Object.entries(sample)) projectionShape(entry[key], child, `${label}.${key}`);
  } else {
    requireThat(typeof value === typeof sample, `${label} has an invalid type`);
    if (typeof sample === "string") text(value, label);
    if (typeof sample === "number") requireThat(Number.isFinite(value), `${label} must be finite`);
  }
}
const recordingShape = {
  schemaVersion: 1, capturedAt: "text", sourceRevision: "text", evidenceRevision: "text", captureRevision: "text",
  harness: { id: "text", version: "text", revision: "text" }, pack: { id: "text", version: "text" },
  provider: { providerId: "text", providerVersion: "text", model: null, deterministic: true },
  inputs: [{ path: "text", sha256: "text" }], automation: { method: "text", disclosure: "text" },
  review: { ref: "text", fieldKey: "text", displayedConfidence: "text", excerpt: "text", before: "text", after: "text", queueCleared: true, auditRef: "text" },
  rule: { id: "text", version: "text", matched: true, severityValue: "text", relatedEventCount: 1, withinHours: 1, minimumRelatedEvents: 1, eventRef: "text", selection: "text", relatedEventRefs: ["text"], auditRef: "text" },
  proposal: { ref: "text", caseRef: "text", decisionType: "text", proposal: "text", riskLevel: "text", approvalPolicyId: "text", status: "text", commentRequired: true, auditRef: "text" },
  approval: { ref: "text", decisionRef: "text", outcome: "text", comment: "text", approvedAt: "text", actor: "text", auditRef: "text" },
  case: { ref: "text", title: "text", caseType: "text", status: "text", severity: "text", priority: "text", owner: null, dueAt: null, decisionStatus: "text", actionItems: [{ ref: "text", actionType: "text", title: "text", assignee: null, status: "text", dueAt: null, completedAt: null }] },
  audit: { qualification: "text", entries: [{ ref: "text", action: "text", occurredAt: "text", subjectRef: "text", actorType: "text" }] },
};
const sourcesShape = {
  schemaVersion: 1, sourceRevision: "text", pack: recordingShape.pack, provider: recordingShape.provider,
  files: [{ id: "text", kind: "text", path: "text", text: "text", sha256: "text" }],
  excerpt: { fileId: "text", fieldKey: "text", text: "text", confidence: 1 },
};
function equalMetadata(left: { providerId: string; providerVersion: string; model: string | null; deterministic: boolean }, right: FrozenSources["provider"]): boolean {
  return left.providerId === right.providerId && left.providerVersion === right.providerVersion && left.model === right.model && left.deterministic === right.deterministic;
}

export function assembleCasebook(definitionInput: unknown, sourcesInput: unknown, recordingInput: unknown): CasebookDocument {
  const story = definition(definitionInput);
  projectionShape(sourcesInput, sourcesShape, "frozen sources");
  projectionShape(recordingInput, recordingShape, "recording");
  const sources = sourcesInput as FrozenSources;
  const recording = recordingInput as Recording;
  requireThat(sources.schemaVersion === 1 && recording.schemaVersion === 1, "Unsupported evidence version");
  for (const value of [sources.sourceRevision, recording.sourceRevision, recording.evidenceRevision, recording.captureRevision, recording.harness.revision]) revision(value);
  requireThat(recording.evidenceRevision === sources.sourceRevision && recording.sourceRevision === recording.captureRevision && recording.sourceRevision === recording.harness.revision, "Recording revision relationship mismatch");
  requireThat(sources.pack.id === recording.pack.id && sources.pack.version === recording.pack.version && equalMetadata(sources.provider, recording.provider) && recording.provider.deterministic === true && recording.provider.model === null, "Pack or provider identity mismatch");
  timestamp(recording.capturedAt, "capture date");
  const files = new Map(sources.files.map((file) => [file.id, file]));
  requireThat(files.size === sources.files.length && files.size > 0, "Duplicate or missing frozen evidence");
  for (const file of sources.files) {
    anchor(file.id); path(file.path); checksum(file.sha256);
    requireThat(sha256(file.text) === file.sha256, `Frozen source checksum mismatch: ${file.id}`);
  }
  const file = (fileId: string) => {
    const found = files.get(fileId);
    requireThat(found, `Unresolved evidence reference: ${fileId}`);
    return found;
  };
  const excerptSource = file(sources.excerpt.fileId);
  requireThat(excerptSource.text.includes(sources.excerpt.text), "Excerpt does not match its frozen original");
  requireThat(sources.excerpt.confidence >= 0 && sources.excerpt.confidence <= 1, "Invalid authored confidence");
  const extractions = new Map(sources.files.filter((entry) => entry.kind === "extraction").map((entry) => {
    const extraction = ExtractionResultSchema.parse(JSON.parse(entry.text));
    const artifact = sources.files.find((candidate) => candidate.kind === "artifact" && candidate.sha256 === extraction.artifactChecksum);
    requireThat(artifact && equalMetadata(extraction.provider, sources.provider), "Extraction source or provider identity mismatch");
    return [artifact.id, { file: entry, extraction }] as const;
  }));
  const selectedExtraction = extractions.get(excerptSource.id);
  requireThat(selectedExtraction, "Selected extraction missing");
  const uncertain = selectedExtraction.extraction.observations.find((entry) => entry.schemaKey === sources.excerpt.fieldKey);
  requireThat(uncertain?.confidence === sources.excerpt.confidence && uncertain.evidence.some((entry) => entry.excerpt === sources.excerpt.text), "Authored confidence or excerpt is unsupported");
  requireThat(uncertain.evidence.some((entry) => entry.excerpt === sources.excerpt.text && entry.locator.kind === "text-range" && excerptSource.text.slice(entry.locator.start, entry.locator.end) === entry.excerpt), "Selected excerpt coordinates do not match its frozen original");
  requireThat(recording.review.excerpt === sources.excerpt.text && recording.review.fieldKey === sources.excerpt.fieldKey && recording.review.displayedConfidence === `${sources.excerpt.confidence * 100}%`, "Recorded review differs from frozen extraction");
  requireThat(recording.review.before === "pending" && recording.review.after === "accepted" && recording.review.queueCleared, "Recorded review transition missing");
  requireThat(recording.rule.id === story.capture.ruleId && recording.rule.version === story.capture.ruleVersion && recording.rule.matched, "Selected rule does not match the recording");
  const ruleFiles = sources.files.filter((entry) => entry.kind === "rule");
  const selectedRules = ruleFiles.flatMap((entry) => array(JSON.parse(entry.text), "rules").map((rule) => ({ file: entry, rule: RuleDefinitionSchema.parse(rule) }))).filter((entry) => entry.rule.id === recording.rule.id);
  requireThat(selectedRules.length === 1, "Expected exactly one selected frozen rule");
  const selectedRule = selectedRules[0]!;
  requireThat(selectedRule.rule.version === recording.rule.version && "all" in selectedRule.rule.when && selectedRule.rule.when.all.length === 2, "Frozen rule version or predicate mismatch");
  const conditions = selectedRule.rule.when.all;
  const severity = conditions.find((condition) => "fact" in condition && condition.fact.kind === "observation");
  const aggregate = conditions.find((condition) => "fact" in condition && condition.fact.kind === "aggregate");
  requireThat(severity && "fact" in severity && severity.fact.kind === "observation" && severity.fact.field === "value" && severity.operator === "equals" && severity.value === recording.rule.severityValue, "Recorded severity does not satisfy the frozen predicate");
  requireThat(aggregate && "fact" in aggregate && aggregate.fact.kind === "aggregate" && aggregate.fact.aggregate === "related-event-count" && aggregate.fact.withinHours === recording.rule.withinHours && aggregate.operator === "greater-than-or-equal" && aggregate.value === recording.rule.minimumRelatedEvents, "Recorded aggregate predicate differs from frozen rule");
  requireThat(Number.isInteger(recording.rule.relatedEventCount) && recording.rule.relatedEventCount >= recording.rule.minimumRelatedEvents && new Set(recording.rule.relatedEventRefs).size === recording.rule.relatedEventCount, "Recorded aggregate references or count mismatch");
  const proposalAction = selectedRule.rule.then.find((action) => action.type === "propose-decision");
  requireThat(proposalAction?.parameters?.decisionType === recording.proposal.decisionType && proposalAction.parameters.approvalPolicyId === recording.proposal.approvalPolicyId && proposalAction.parameters.riskLevel === recording.proposal.riskLevel, "Recorded proposal differs from the frozen rule action");
  requireThat(recording.proposal.status === "awaiting-approval" && recording.proposal.commentRequired && recording.proposal.caseRef === recording.case.ref && recording.approval.decisionRef === recording.proposal.ref && recording.approval.outcome === "approved" && recording.case.decisionStatus === "approved" && recording.approval.comment === story.capture.approvalComment, "Recorded proposal or approval relationship mismatch");
  timestamp(recording.approval.approvedAt, "approval date");
  requireThat(Date.parse(recording.approval.approvedAt) <= Date.parse(recording.capturedAt), "Approval occurs after capture");
  requireThat(recording.case.actionItems.length > 0 && new Set(recording.case.actionItems.map((action) => action.ref)).size === recording.case.actionItems.length, "Missing or duplicate recorded work");
  for (const action of recording.case.actionItems) {
    if (action.dueAt !== null) timestamp(action.dueAt, "action due date");
    if (action.completedAt !== null) timestamp(action.completedAt, "action completion date");
  }
  if (recording.case.dueAt !== null) timestamp(recording.case.dueAt, "case due date");
  requireThat(new Set(recording.audit.entries.map((entry) => entry.ref)).size === recording.audit.entries.length, "Duplicate audit reference");
  for (const entry of recording.audit.entries) {
    timestamp(entry.occurredAt, "audit date");
    requireThat(Date.parse(entry.occurredAt) <= Date.parse(recording.capturedAt), "Audit occurs after capture");
  }
  const audit = (ref: string, action: string, subject: string, actor: string) => {
    const found = recording.audit.entries.find((entry) => entry.ref === ref);
    requireThat(found && found.action === action && found.subjectRef === subject && found.actorType === actor, `Recorded audit relationship mismatch: ${ref}`);
    return found;
  };
  const reviewAudit = audit(recording.review.auditRef, "observation-accepted", recording.review.ref, "human");
  const ruleAudit = audit(recording.rule.auditRef, "rule-evaluated", recording.rule.eventRef, "system");
  const proposalAudit = audit(recording.proposal.auditRef, "decision-proposed", recording.proposal.ref, "system");
  const approvalAudit = audit(recording.approval.auditRef, "decision-approved", recording.proposal.ref, "human");
  requireThat(approvalAudit.occurredAt === recording.approval.approvedAt && Date.parse(proposalAudit.occurredAt) <= Date.parse(approvalAudit.occurredAt), "Approval audit time relationship mismatch");
  requireThat(recording.inputs.length > 0 && new Set(recording.inputs.map((input) => input.path)).size === recording.inputs.length, "Capture input checksums missing or duplicated");
  for (const input of recording.inputs) { path(input.path); checksum(input.sha256); }
  const permalink = (value: string) => `${repository}/blob/${recording.sourceRevision}/${path(value).split("/").map(encodeURIComponent).join("/")}`;
  const fact = (label: string, value: unknown, reference: string): CasebookFact => ({ label, value: value === null ? "Not recorded" : String(value), reference });
  const stageFacts: Record<string, { facts: CasebookFact[]; qualifications: string[]; excerpts: CasebookSection["excerpts"]; evidenceIds: string[] }> = {
    review: {
      facts: [fact("Field under review", recording.review.fieldKey, "recording.review.fieldKey"), fact("Authored confidence", recording.review.displayedConfidence, "frozen extraction → recording.review.displayedConfidence"), fact("Recorded transition", `${recording.review.before} → ${recording.review.after}`, "recording.review.before / after"), fact("Review queue cleared", recording.review.queueCleared, "recording.review.queueCleared"), fact("Acceptance audit", `${reviewAudit.ref} · ${reviewAudit.action} · ${reviewAudit.occurredAt}`, "recording.audit.entries")],
      qualifications: [recording.automation.disclosure], excerpts: [{ text: sources.excerpt.text, sourceId: sources.excerpt.fileId }], evidenceIds: [sources.excerpt.fileId, selectedExtraction.file.id],
    },
    rule: {
      facts: [fact("Rule / version", `${recording.rule.id} / ${recording.rule.version}`, "recording.rule.id / version"), fact("Severity observation", recording.rule.severityValue, "recording.rule.severityValue"), fact("Resolved related-event count", recording.rule.relatedEventCount, "recording.rule.relatedEventCount"), fact("Required minimum", recording.rule.minimumRelatedEvents, "frozen rule → recording.rule.minimumRelatedEvents"), fact("Window", `${recording.rule.withinHours} hours (${recording.rule.withinHours / 24} days)`, "frozen rule → recording.rule.withinHours"), fact("Matched", recording.rule.matched, "recording.rule.matched"), fact("Related event aliases", recording.rule.relatedEventRefs.join(", "), "recording.rule.relatedEventRefs"), fact("Evaluation audit", `${ruleAudit.ref} · ${ruleAudit.occurredAt}`, "recording.rule.auditRef → recording.audit.entries")],
      qualifications: [recording.rule.selection], excerpts: [], evidenceIds: [selectedRule.file.id],
    },
    proposal: {
      facts: [fact("Proposal", recording.proposal.proposal, "recording.proposal.proposal"), fact("Risk / policy", `${recording.proposal.riskLevel} / ${recording.proposal.approvalPolicyId}`, "recording.proposal.riskLevel / approvalPolicyId"), fact("Before authorization", recording.proposal.status, "recording.proposal.status"), fact("Comment required", recording.proposal.commentRequired, "recording.proposal.commentRequired"), fact("Proposal / case aliases", `${recording.proposal.ref} / ${recording.proposal.caseRef}`, "recording.proposal.ref / caseRef"), fact("Proposal audit", `${proposalAudit.ref} · ${proposalAudit.occurredAt}`, "recording.proposal.auditRef → recording.audit.entries")],
      qualifications: [], excerpts: [], evidenceIds: [selectedRule.file.id],
    },
    approval: {
      facts: [fact("Outcome", recording.approval.outcome, "recording.approval.outcome"), fact("Approval / decision aliases", `${recording.approval.ref} / ${recording.approval.decisionRef}`, "recording.approval.ref / decisionRef"), fact("Actor", recording.approval.actor, "recording.approval.actor"), fact("Approval comment", recording.approval.comment, "recording.approval.comment"), fact("Approved at", recording.approval.approvedAt, "recording.approval.approvedAt"), fact("Approval audit", `${approvalAudit.ref} · ${approvalAudit.action} · ${approvalAudit.occurredAt}`, "recording.approval.auditRef → recording.audit.entries")],
      qualifications: [recording.audit.qualification], excerpts: [], evidenceIds: [],
    },
    remaining: {
      facts: [fact("Recorded case", recording.case.title, "recording.case.title"), fact("Case status", recording.case.status, "recording.case.status"), fact("Severity / priority", `${recording.case.severity} / ${recording.case.priority}`, "recording.case.severity / priority"), fact("Owner", recording.case.owner, "recording.case.owner"), fact("Due at", recording.case.dueAt, "recording.case.dueAt"), fact("Decision status", recording.case.decisionStatus, "recording.case.decisionStatus"), ...recording.case.actionItems.flatMap((action, index) => [fact(`Action ${index + 1}`, `${action.ref} · ${action.title}`, `recording.case.actionItems[${index}].ref / title`), fact("Assigned to / status", `${action.assignee ?? "Not recorded"} / ${action.status}`, `recording.case.actionItems[${index}].assignee / status`), fact("Action due at", action.dueAt, `recording.case.actionItems[${index}].dueAt`), fact("Completed at", action.completedAt, `recording.case.actionItems[${index}].completedAt`)])],
      qualifications: [recording.automation.disclosure], excerpts: [], evidenceIds: [],
    },
  };
  requireThat(story.stages.length === Object.keys(stageFacts).length && new Set(story.stages.map((stage) => stage.id)).size === story.stages.length, "Required recorded stages are missing or duplicated");
  return {
    title: story.title, question: story.question, summary: story.summary, attribution: story.attribution, disclosures: story.disclosures,
    sources: story.sources.map((source) => {
      const original = file(source.fileId);
      requireThat(original.kind === "artifact", "Selected source is not an artifact");
      requireThat(original.text.includes(source.date), "Selected source date is unsupported by its frozen original");
      const extraction = extractions.get(original.id);
      requireThat(extraction, `Source extraction missing: ${original.id}`);
      // Only exact excerpts are promoted into the readable account. Full authored objects remain embedded.
      const exact = [...new Set(extraction.extraction.observations.flatMap((observation) => observation.evidence.map((entry) => entry.excerpt)).filter((excerpt) => original.text.includes(excerpt)))];
      const excerpts = exact.sort((left, right) => right.length - left.length).slice(0, 2);
      requireThat(excerpts.length > 0, `No exact source excerpts: ${original.id}`);
      return { id: source.fileId, date: source.date, label: source.label, context: source.context, excerpts, evidenceIds: [original.id, extraction.file.id] };
    }),
    sections: story.stages.map((stage) => {
      const details = stageFacts[stage.id];
      requireThat(details, `Unresolved recorded stage: ${stage.id}`);
      return { ...stage, ...details };
    }),
    capabilities: story.capabilities.map((capability) => ({ title: capability.title, explanation: capability.explanation, links: capability.paths.map((value) => ({ label: value, href: permalink(value) })) })),
    evidence: sources.files.map((entry) => ({ id: entry.id, kind: entry.kind, path: entry.path, text: entry.text, checksum: entry.sha256, href: permalink(entry.path) })),
    provenance: [fact("Application source revision", recording.sourceRevision, "recording.sourceRevision"), fact("Frozen evidence revision", recording.evidenceRevision, "recording.evidenceRevision → sources.sourceRevision"), fact("Captured at", recording.capturedAt, "recording.capturedAt"), fact("Pack / version", `${recording.pack.id} / ${recording.pack.version}`, "recording.pack"), fact("Extraction provider / version", `${recording.provider.providerId} / ${recording.provider.providerVersion}`, "recording.provider"), fact("Model / deterministic", `${recording.provider.model ?? "No live model"} / ${recording.provider.deterministic}`, "recording.provider.model / deterministic"), fact("Capture harness / version", `${recording.harness.id} / ${recording.harness.version}`, "recording.harness"), fact("Harness revision", recording.harness.revision, "recording.harness.revision"), fact("Method", recording.automation.method, "recording.automation.method"), fact("Selected audit qualification", recording.audit.qualification, "recording.audit.qualification")],
    inputHashes: recording.inputs.map((input) => ({ path: input.path, checksum: input.sha256 })),
    implementation: { label: "Inspect the implementation", href: `${repository}/tree/${recording.sourceRevision}` },
    consultancy: { label: FIRM.name, href: FIRM.site }, contact: { label: "Discuss a workflow pilot", href: `mailto:${FIRM.email}` },
  };
}

export async function loadCasebook(definitionPath: string): Promise<CasebookDocument> {
  const location = resolve(definitionPath);
  const directory = dirname(location);
  const [definitionText, sourcesText, recordingText] = await Promise.all([readFile(location, "utf8"), readFile(resolve(directory, "sources.json"), "utf8"), readFile(resolve(directory, "recording.json"), "utf8")]);
  const recordingInput: unknown = JSON.parse(recordingText);
  const document = assembleCasebook(JSON.parse(definitionText), JSON.parse(sourcesText), recordingInput);
  const recording = recordingInput as Recording;
  // Bind the actual frozen data consumed here. Harness hashes describe capture-time inputs,
  // not a requirement that later code remains byte-identical. No git/history/network reads.
  for (const [locationPath, bytes] of [[location, definitionText], [resolve(directory, "sources.json"), sourcesText]] as const) {
    const input = recording.inputs.find((entry) => entry.path === relative(root, locationPath).replaceAll("\\", "/"));
    requireThat(input && input.sha256 === sha256(bytes), `Capture input checksum mismatch: ${relative(root, locationPath)}`);
  }
  return document;
}
