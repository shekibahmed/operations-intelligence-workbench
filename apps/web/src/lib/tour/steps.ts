import type { Lens } from "@/lib/lens";

/**
 * The Asset Reliability guided tour (UX_SPEC §4, DEMO_SCRIPT.md). Amendment
 * A7/L1-L2: Asset Reliability is the only pack with a full tour in P0, so
 * this step list — and the tour overlay that reads it — only ever mounts
 * when the active workspace's pack id is `asset-reliability`
 * (`TourOverlay`).
 *
 * Every `target` below is a `data-tour="..."` attribute already present on
 * its real screen (Inbox, Review Queue, Rule trace, Cases, Case Detail,
 * Decisions, Overview, Audit, the shell's Adapt CTA) — the tour never
 * renders content that doesn't already exist on the real route.
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
  /** Runs when Next is pressed on this step, before navigating. */
  beforeNext?: "process-related-fixtures";
}

export const TOUR_PACK_ID = "asset-reliability";

export const TOUR_STEPS: readonly TourStep[] = [
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
    beforeNext: "process-related-fixtures",
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
  {
    id: "technical-trace",
    lens: "technical",
    match: (pathname, base) => pathname === `${base}/audit`,
    target: '[data-tour="tour-audit-list"]',
    title: "The full trace, end to end",
    body: "Extraction, review, event assembly, rule execution, case and decision creation, and the approval — every step is here, in order, with the actor and affected object recorded.",
    next: { kind: "same-page" },
  },
  {
    id: "adapt-cta",
    lens: "leadership",
    match: () => true,
    target: '[data-tour="tour-adapt-cta"]',
    title: "See it applied to your own operations",
    body: "The same lifecycle — artifact, review, event, signal, case, decision, approval — is what Adapt this workflow is about: applying this to your own operational data.",
    next: { kind: "none" },
  },
];
