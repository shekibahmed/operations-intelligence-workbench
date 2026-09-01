# Document Assurance Scenario Pack

Converts contracts, policies, checklists, compliance reports and
correspondence into evidence-backed obligation tracking, surfacing
conflicting provisions, missing evidence and missed deadlines, and
gating any exception to a tracked obligation behind an explicit human
approval.

Full narrative source material — storyline, entities, edge-case index and
the prose gold-set notes this pack's `evaluations/` were formalised from —
lives in `narrative/` (read-only; authored under OIW-004a).

## Bundle layout

| Path | Contents |
|---|---|
| `manifest.yaml` | Pack manifest: entity/event types, schema references, rules, dashboards, fixtures, evaluation sets. |
| `labels.json` | UI label set (entity/event/case types, workflow states, severities, signal/action/decision types, lenses, review reasons). |
| `schemas/entities/` | `document`, `jurisdiction`, `obligation`, `party`, `party-contact`, `project`, `review-owner`. |
| `schemas/events/` | 14 event types (`contract-executed`, `conflicting-provision-identified`, `exception-proposed`, `exception-approved`, etc). |
| `schemas/observations/` | 13 observation schemas (document-reference, amendment-reference, financial-threshold, conflicting-provision, required-evidence, etc — `checklist-status` was added in this task to satisfy `checklist-filed`'s required observation, completing a gap left by the terminated prior session). |
| `schemas/cases/` | `review-case` — closure requires a resolved Decision and required evidence on file. |
| `workflows/default.workflow.json` | `open → under-review → awaiting-approval → closed`, with an approval-gated close requiring the `authorised-reviewer-approval` policy. |
| `rules/severity.rules.json` | Conflicting-provisions and missing-evidence flagging; missing/ambiguous-reference review routing. |
| `rules/escalation.rules.json` | Conflicting-dates, missed-deadline and ambiguous-response signals. |
| `rules/approval.rules.json` | The rule that proposes the pack's human-approval-gated `accept-exception` Decision on a formally proposed exception. |
| `dashboards/` | `leadership.json`, `operations.json`, `technical.json` — A5 widget catalogue only. |
| `dashboards/metrics.json` | The 10 core metric definitions the dashboards reference (folded in here rather than a separate `metrics/` directory — see Deviations below). |
| `fixtures/{smoke,demo,edge-cases}/` | Fixture content, per-set `index.json`, and checksum-keyed `extractions/` (amendment A1) — built from scratch in this task; the prior session's work stopped mid-`schemas/`. |
| `evaluations/` | Gold evaluation sets, one per fixture set, formalised from `narrative/expected-outcomes.md`. |

## Fixtures

### Smoke set (9 fixtures)

`document-assurance-smoke-001` … `-009` — two quiet, uneventful vendor
relationships (Meridian Compliance Services, Consolidated Freight
Underwriters) establishing what a clean intake, checklist and quarterly
report look like, with no signals, cases, or decisions. `smoke-005` is a
positive control for a clarification thread that resolves cleanly, in
contrast to `demo-004`'s non-committal reply.

### Demo set (12 fixtures) — the Project Falcon storyline

`demo-001`…`-012` trace the Project Falcon Master Services Agreement with
Vantage Logistics Partners: the governing MSA (Clause 5.3 reporting,
Clause 6.2 insurance, Clause 8.2 liability cap, Clause 12.1 precedence)
and the internal Data Handling Policy that sets a conflicting liability
figure; an onboarding checklist with two open items; a non-committal
insurance-date clarification; a Q1 report flagging missing insurance
evidence; the reviewer note that names the liability-cap conflict
explicitly; an ambiguous "the contract governs" reply; a legitimate
amendment moving the insurance due date; a post-amendment checklist and
Q2 report showing both issues still open; and the formal exception
proposal (`demo-011`) and its approval (`demo-012`) — the pack's primary
`accept-exception` Decision.

### Edge-case set (7 fixtures)

| ID | Hazard |
|---|---|
| `edge-001` | Missing identifier — no contract/project name anywhere in the text. |
| `edge-002` | Conflicting dates — a checklist due date genuinely conflicts with the governing clause, distinct from the legitimate `demo-008` amendment. |
| `edge-003` | Ambiguous entity reference — "the Vantage agreement" (MSA vs. the older Vantage NDA). |
| `edge-004` | Negated statement — Clause 8.2 explicitly does not apply to Project Harbor; must not be read as resolving the still-open Project Falcon conflict. |
| `edge-005` | Duplicate artifact — exact resubmission of `demo-005`. |
| `edge-006` | Prompt-injection-style content embedded in ordinary correspondence. |
| `edge-007` | High-risk decision with no clause citation and no evidence reference at all. |

Full per-artifact detail is in `narrative/expected-outcomes.md`;
`evaluations/*.gold.json` is the formalised version of the same material.

## Evaluations

`evaluations/smoke.gold.json` (9), `evaluations/demo.gold.json` (12) and
`evaluations/edge-cases.gold.json` (7) — 28 gold examples total, each
naming expected observations, expected entities, expected event type,
expected fired-rule ids (from `rules/*.rules.json`), expected case
linkage, and expected Decision/approval requirement. Edge-case entries
exercise `negated` (`edge-004`), `alternativeCandidates` (`edge-003`),
and conflicting/insufficient review state (`edge-001`, `edge-002`,
`edge-007`).

## Event matching semantics

Clarification threads, routine reviewer sign-offs and logged correspondence
share the `review-status` Observation key, so their definitions constrain its
authored value: `resolved`/`unresolved`, `no-escalation-needed`, and
`not-accepted`, respectively. Cross-engagement corrections use their explicit
conflicting-provision and responsible-party facts. Exception proposals and
approvals likewise require their authored `proposed` and `approved` values and
are matched before the more general correction event. Contract amendments use
an explicit amendment reference, keeping the parent agreement linked while
distinguishing an amendment from initial execution. Obligation-status events
use the governing document reference when present. The missed-deadline rule
fires on the second related compliance report: the aggregate counts the prior
report, while the current report supplies the still-missing evidence fact.

## Deviations / contract notes (see `docs/agent-runs/OIW-004b.md`)

- **`schemas/observations/checklist-status.schema.json` added.** The
  prior (terminated) session left `events/checklist-filed.schema.json`
  requiring an observation `checklist-status` with no corresponding
  observation schema file; this task adds it.
- **No `tours/`.** Tours are an explicit OIW-004b non-goal, deferred to
  the tour framework task. `manifest.yaml` therefore omits the `tours`
  field, even though it is required (non-optional) by contracts v1.1's
  `ScenarioPackManifestSchema` — flagged as a contract/validator
  mismatch for OIW-103 reconciliation rather than worked around here.
- **No `metrics/` directory.** The pack's metric definitions live in
  `dashboards/metrics.json` (still referenced from `manifest.yaml`'s
  `metrics` array, which contracts v1.1 requires) rather than a separate
  top-level directory, per the OIW-004b remediation instructions.
- **No PDF binaries.** Contract/policy/report artifacts remain
  Markdown-with-page-markers plus pre-extracted `raw_text`; PDF binary
  generation is deferred to the Wave 2 PDF adapter task (per A7).
