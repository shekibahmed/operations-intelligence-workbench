import type { Lens } from "@/lib/lens";

/**
 * Guided tours (UX_SPEC §4, DEMO_SCRIPT.md), one step list per pack, all
 * driven by the same overlay (`TourOverlay`) and the same mechanics:
 * dismissable, resumable via sessionStorage, keyboard accessible,
 * focus-managed. `TOUR_STEPS_BY_PACK` is the only per-pack switch — there is
 * no second tour mechanism.
 *
 * Every `target` below is a `data-tour="..."` attribute already present on
 * its real screen (Inbox, Review Queue, Rule trace, Cases, Case Detail,
 * Decisions, Overview, Audit, the shell's Adapt CTA) — these are generic
 * core components, so the tour never renders content that doesn't already
 * exist on the real route for any pack.
 */
export interface TourStep {
  id: string;
  lens: Lens;
  /** Does the current pathname belong to this step's screen? */
  match: (pathname: string, base: string) => boolean;
  /** A CSS selector for the element to spotlight — usually `[data-tour="..."]`, but any selector works. */
  target: string;
  title: string;
  body: string;
  actionHint?: string;
  next:
    | { kind: "same-page" }
    | { kind: "static"; path: (base: string) => string }
    | { kind: "dynamic"; selector: string }
    | { kind: "none" };
  /**
   * Runs when Next is pressed on this step, before navigating: processes the
   * named fixture artifacts for real (through the same `processArtifact`
   * path a manual click would use), so later steps reflect real, non-
   * fabricated data without the visitor manually hunting through the inbox.
   */
  beforeNext?: { fixtureIds: readonly string[] };
}

/** Steps common to every pack's tour, worded with no pack-specific noun. */
const TECHNICAL_TRACE_STEP: TourStep = {
  id: "technical-trace",
  lens: "technical",
  match: (pathname, base) => pathname === `${base}/audit`,
  target: '[data-tour="tour-audit-list"]',
  title: "The full trace, end to end",
  body: "Extraction, review, event assembly, rule execution, case and decision creation, and the approval — every step is here, in order, with the actor and affected object recorded.",
  next: { kind: "same-page" },
};

const ADAPT_CTA_STEP: TourStep = {
  id: "adapt-cta",
  lens: "leadership",
  match: () => true,
  target: '[data-tour="tour-adapt-cta"]',
  title: "See it applied to your own operations",
  body: "The same lifecycle — artifact, review, event, signal, case, decision, approval — is what Adapt this workflow is about: applying this to your own operational data.",
  next: { kind: "none" },
};

const ASSET_RELIABILITY_TOUR_STEPS: readonly TourStep[] = [
  {
    id: "inbox-arrival",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-inbox-table"]',
    title: "New artifacts have arrived",
    body: "Three of today's new artifacts describe the same asset from different angles: an informal message about a braking problem, a maintenance record, and an inspection note. None of this is structured yet — it's raw input.",
    actionHint: "The highlighted row below is the informal message about a braking problem.",
    next: { kind: "same-page" },
  },
  {
    id: "inbox-process",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-process-target"]',
    title: "Process the artifact",
    body: "Click Process. The fixture intelligence provider extracts structured fields from the raw text — deterministically, with no external model call required.",
    actionHint: "Click Process on the highlighted row.",
    next: { kind: "static", path: (base) => `${base}/review` },
  },
  {
    id: "review-ambiguity",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/review`,
    target: '[data-tour="tour-review-panel"]',
    title: "Review uncertainty",
    body: "One field came back ambiguous, so it's been routed to the Review Queue instead of becoming fact automatically. On the left is the original text; on the right, the extracted value, an alternative candidate, the system's confidence and the exact evidence span. Nothing here is quietly assumed — a human confirms it.",
    actionHint: "Review the evidence, then Accept.",
    next: { kind: "static", path: (base) => `${base}/technical/rules/safety-critical-removal-approval` },
    beforeNext: {
      fixtureIds: [
        "asset-reliability-demo-002",
        "asset-reliability-demo-003",
        "asset-reliability-demo-004",
        "asset-reliability-demo-005",
      ],
    },
  },
  {
    id: "rule-trace",
    lens: "technical",
    match: (pathname, base) => pathname === `${base}/technical/rules/safety-critical-removal-approval`,
    target: '[data-tour="tour-condition-tree"]',
    title: "A deterministic rule fired",
    body: "A rule checked two things: whether the same component had a related fault recently, and whether the current report contains a safety indicator. Both are true here. The result: critical severity, a repeat-fault signal, a required inspection, and a proposed hold-from-service decision.",
    next: { kind: "static", path: (base) => `${base}/cases` },
  },
  {
    id: "case-list",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/cases`,
    target: '[data-tour="tour-case-list"]',
    title: "A Reliability Case was created",
    body: "A case now groups the fault report together with an owner, a due date, priority, the supporting evidence and the required actions.",
    actionHint: "Click into the case to see it.",
    next: { kind: "dynamic", selector: '[data-tour="tour-case-list"] tbody tr a' },
  },
  {
    id: "case-detail",
    lens: "operations",
    match: (pathname, base) => pathname.startsWith(`${base}/cases/`),
    target: '[data-tour="tour-case-summary"]',
    title: "Case created and tasks assigned",
    body: "A Reliability Case has been created automatically, with an owner, a due date, priority, the supporting evidence, related history and the required actions already attached.",
    next: { kind: "static", path: (base) => `${base}/decisions` },
  },
  {
    id: "decision-approval",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/decisions`,
    target: '[data-tour="tour-decision-card"]',
    title: "Approve a decision",
    body: "The system proposes holding the asset from service — but it will not act on its own. You must explicitly approve or reject this, with a comment, since it's high risk.",
    actionHint: "Review the decision, then Approve it (a comment is required).",
    next: { kind: "static", path: (base) => `${base}/overview` },
  },
  {
    id: "dashboard-update",
    lens: "leadership",
    match: (pathname, base) => pathname === `${base}/overview`,
    // StatCard sets `aria-labelledby="stat-<slugified label>"`
    // (components/widgets/StatCard.tsx) — spotlighting one real stat card
    // reads better than the entire dashboard grid.
    target: '[aria-labelledby="stat-critical-signals"]',
    title: "The dashboard reflects the approval",
    body: "Switch to the Leadership lens. Critical cases, pending work, repeat-fault count and the risk summary have all updated from the single approval you just made.",
    next: { kind: "static", path: (base) => `${base}/audit` },
  },
  TECHNICAL_TRACE_STEP,
  ADAPT_CTA_STEP,
];

const PROCESS_EXCEPTIONS_TOUR_STEPS: readonly TourStep[] = [
  {
    id: "inbox-arrival",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-inbox-table"]',
    title: "New artifacts have arrived",
    body: "Tomas Reyes's operator note flags a viscosity trend climbing mid-mix on batch B-2205, Kestrel lot KM-LOT-448 — not yet out of spec, but trending the wrong way. None of this is structured yet — it's raw input.",
    actionHint: "The highlighted row below is Tomas's operator note.",
    next: { kind: "same-page" },
  },
  {
    id: "inbox-process",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-process-target"]',
    title: "Process the artifact",
    body: "Click Process. The fixture intelligence provider extracts structured fields from the raw text — batch, line, supplier lot, trend — deterministically, with no external model call required.",
    actionHint: "Click Process on the highlighted row.",
    next: { kind: "static", path: (base) => `${base}/review` },
    beforeNext: { fixtureIds: ["process-exceptions-demo-002"] },
  },
  {
    id: "review-ambiguity",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/review`,
    target: '[data-tour="tour-review-panel"]',
    title: "Review uncertainty",
    body: "QC's confirmation record for B-2205 came in too: an 8.2% viscosity deviation, 4,200 units affected — but the reported cause is explicitly \"under investigation.\" That's routed to the Review Queue instead of becoming a determined root cause automatically. On the left is the original record; on the right, the field, the system's confidence and the exact evidence. Nothing here is quietly assumed — a human confirms it.",
    actionHint: "Review the evidence, then Accept.",
    next: { kind: "static", path: (base) => `${base}/technical/rules/hold-affected-output-approval` },
    beforeNext: {
      fixtureIds: [
        "process-exceptions-demo-003",
        "process-exceptions-demo-004",
        "process-exceptions-demo-005",
        "process-exceptions-demo-006",
        "process-exceptions-demo-007",
        "process-exceptions-demo-008",
        "process-exceptions-demo-009",
      ],
    },
  },
  {
    id: "rule-trace",
    lens: "technical",
    match: (pathname, base) => pathname === `${base}/technical/rules/hold-affected-output-approval`,
    target: '[data-tour="tour-condition-tree"]',
    title: "A deterministic rule fired",
    body: "A rule checked whether a formal hold request had been recorded for a supplier lot. Priya's escalation — citing two consecutive deviations on KM-LOT-448 and the mounting quarantine backlog — made that true. The result: a high-risk Hold Affected Output decision awaiting supervisor/QC approval.",
    next: { kind: "static", path: (base) => `${base}/cases` },
  },
  {
    id: "case-list",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/cases`,
    target: '[data-tour="tour-case-list"]',
    title: "An Exception Case was created",
    body: "An Exception Case now tracks B-2205 and B-2210 together, with an owner, a due date, priority, the supporting evidence and the required investigation actions.",
    actionHint: "Click into the case to see it.",
    next: { kind: "dynamic", selector: '[data-tour="tour-case-list"] tbody tr a' },
  },
  {
    id: "case-detail",
    lens: "operations",
    match: (pathname, base) => pathname.startsWith(`${base}/cases/`),
    target: '[data-tour="tour-case-summary"]',
    title: "Case created and tasks assigned",
    body: "The Exception Case links the KM-LOT-448 pattern across both batches, the quarantine backlog, the supporting evidence, and the required investigation actions already attached.",
    next: { kind: "static", path: (base) => `${base}/decisions` },
  },
  {
    id: "decision-approval",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/decisions`,
    target: '[data-tour="tour-decision-card"]',
    title: "Approve a decision",
    body: "The system proposes holding all remaining KM-LOT-448 output and material — but it will not act on its own. You must explicitly approve or reject this, with a comment, since it's high risk.",
    actionHint: "Review the decision, then Approve it (a comment is required).",
    next: { kind: "static", path: (base) => `${base}/overview` },
  },
  {
    id: "dashboard-update",
    lens: "leadership",
    match: (pathname, base) => pathname === `${base}/overview`,
    target: '[aria-labelledby="stat-critical-signals"]',
    title: "The dashboard reflects the approval",
    body: "Switch to the Leadership lens. Open Exceptions, critical signals and decisions awaiting approval have all updated from the single approval you just made.",
    next: { kind: "static", path: (base) => `${base}/audit` },
  },
  TECHNICAL_TRACE_STEP,
  ADAPT_CTA_STEP,
];

const DOCUMENT_ASSURANCE_TOUR_STEPS: readonly TourStep[] = [
  {
    id: "inbox-arrival",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-inbox-table"]',
    title: "New artifacts have arrived",
    body: "Nadia Okonkwo signs the Project Falcon Master Services Agreement with Vantage Logistics Partners — the liability cap, insurance and reporting obligations that will matter later are all set here. None of this is structured yet — it's raw input.",
    actionHint: "The highlighted row below is the Project Falcon MSA.",
    next: { kind: "same-page" },
  },
  {
    id: "inbox-process",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/inbox`,
    target: '[data-tour="tour-process-target"]',
    title: "Process the artifact",
    body: "Click Process. The fixture intelligence provider extracts the document reference and its clauses — deterministically, with no external model call required.",
    actionHint: "Click Process on the highlighted row.",
    next: { kind: "static", path: (base) => `${base}/review` },
    beforeNext: {
      fixtureIds: ["document-assurance-demo-002", "document-assurance-demo-003", "document-assurance-demo-004"],
    },
  },
  {
    id: "review-ambiguity",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/review`,
    target: '[data-tour="tour-review-panel"]',
    title: "Review uncertainty",
    body: "As the insurance certificate deadline approaches, Nadia asks Vantage's counsel to confirm the renewal date — but the reply gives no locked date, only a range. That's routed to the Review Queue instead of becoming a determined due date automatically. On the left is the original email; on the right, the field, the system's confidence and the exact evidence. Nothing here is quietly assumed — a human confirms it.",
    actionHint: "Review the evidence, then Accept.",
    next: { kind: "static", path: (base) => `${base}/technical/rules/accept-exception-approval` },
    beforeNext: {
      fixtureIds: [
        "document-assurance-demo-005",
        "document-assurance-demo-006",
        "document-assurance-demo-007",
        "document-assurance-demo-008",
        "document-assurance-demo-009",
        "document-assurance-demo-010",
        "document-assurance-demo-011",
      ],
    },
  },
  {
    id: "rule-trace",
    lens: "technical",
    match: (pathname, base) => pathname === `${base}/technical/rules/accept-exception-approval`,
    target: '[data-tour="tour-condition-tree"]',
    title: "A deterministic rule fired",
    body: "A rule checked whether a reviewer had formally proposed accepting an exception. Nadia's proposal — citing the MSA's liability cap against the internal policy's higher figure, the outreach history, and three explicit conditions — made that true. The result: a high-risk Accept Exception decision awaiting an authorised reviewer's approval.",
    next: { kind: "static", path: (base) => `${base}/cases` },
  },
  {
    id: "case-list",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/cases`,
    target: '[data-tour="tour-case-list"]',
    title: "A Review Case was created",
    body: "A Review Case now tracks the Project Falcon engagement, with an owner, a due date, priority, the supporting evidence and correspondence attached.",
    actionHint: "Click into the case to see it.",
    next: { kind: "dynamic", selector: '[data-tour="tour-case-list"] tbody tr a' },
  },
  {
    id: "case-detail",
    lens: "operations",
    match: (pathname, base) => pathname.startsWith(`${base}/cases/`),
    target: '[data-tour="tour-case-summary"]',
    title: "Case created and tasks assigned",
    body: "The Review Case links the liability-cap conflict, the missing insurance certificate, the supporting evidence and the required follow-up actions to Project Falcon.",
    next: { kind: "static", path: (base) => `${base}/decisions` },
  },
  {
    id: "decision-approval",
    lens: "operations",
    match: (pathname, base) => pathname === `${base}/decisions`,
    target: '[data-tour="tour-decision-card"]',
    title: "Approve a decision",
    body: "The system proposes accepting the liability-cap exception, scoped to Project Falcon only — but it will not act on its own. You must explicitly approve or reject this, with a comment, since it's high risk.",
    actionHint: "Review the decision, then Approve it (a comment is required).",
    next: { kind: "static", path: (base) => `${base}/overview` },
  },
  {
    id: "dashboard-update",
    lens: "leadership",
    match: (pathname, base) => pathname === `${base}/overview`,
    target: '[aria-labelledby="stat-critical-signals"]',
    title: "The dashboard reflects the approval",
    body: "Switch to the Leadership lens. Open review cases and exceptions awaiting approval reflect the single approval you just made.",
    next: { kind: "static", path: (base) => `${base}/audit` },
  },
  TECHNICAL_TRACE_STEP,
  ADAPT_CTA_STEP,
];

export const TOUR_STEPS_BY_PACK: Readonly<Record<string, readonly TourStep[]>> = {
  "asset-reliability": ASSET_RELIABILITY_TOUR_STEPS,
  "process-exceptions": PROCESS_EXCEPTIONS_TOUR_STEPS,
  "document-assurance": DOCUMENT_ASSURANCE_TOUR_STEPS,
};

export function getTourSteps(packId: string): readonly TourStep[] | undefined {
  return TOUR_STEPS_BY_PACK[packId];
}

/** The guided tour's pinned artifact per pack (UX_SPEC §4, DEMO_SCRIPT.md): the one row the visitor Processes by hand. */
export const TOUR_TARGET_FIXTURE_IDS: Readonly<Record<string, string>> = {
  "asset-reliability": "asset-reliability-demo-001",
  "process-exceptions": "process-exceptions-demo-001",
  "document-assurance": "document-assurance-demo-001",
};

export function tourTargetFixtureId(packId: string): string | undefined {
  return TOUR_TARGET_FIXTURE_IDS[packId];
}
