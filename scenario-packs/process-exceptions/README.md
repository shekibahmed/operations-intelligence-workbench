# Process Exceptions Scenario Pack

Converts shift reports, quality-control records, operator notes, inventory
exception notes, production summaries and supervisor emails from the
fictional Rivermill Processing Plant into structured exception cases,
tracing a deviation from first symptom through a confirmed cross-batch
pattern to a supervisor-approved hold-affected-output decision.

Full narrative source material — storyline, entities, edge-case index and
the prose gold-set notes this pack's `evaluations/` were formalised from —
lives in `narrative/` (read-only; authored under OIW-004a).

## Bundle layout

| Path | Contents |
|---|---|
| `manifest.yaml` | Pack manifest: entity/event types, schema references, rules, dashboards, fixtures, evaluation sets. |
| `labels.json` | UI label set (entity/event/case types, workflow states, severities, signal/action/decision types, lenses, review reasons). |
| `schemas/entities/` | `process`, `line`, `batch`, `product`, `shift`, `supplier`, `supplier-lot`, `person`. |
| `schemas/events/` | 14 event types (`qc-deviation-confirmed`, `formal-hold-requested`, `held-output-aging-flagged`, etc). |
| `schemas/observations/` | 16 observation schemas (batch-identifier, deviation, disposition-status, etc). |
| `schemas/cases/` | `exception-case` — closure requires a recorded disposition and investigation evidence. |
| `workflows/default.workflow.json` | `open → investigating → awaiting-disposition-approval → closed`, with an approval-gated close requiring the `supervisor-qc-hold-approval` policy. |
| `rules/severity.rules.json` | Threshold-breach and yield-loss flagging; missing/ambiguous/inconsistent-data review routing. |
| `rules/escalation.rules.json` | Repeated-deviation, supplier-linked-pattern and escalating-backlog signals; root-cause-investigation action trigger. |
| `rules/approval.rules.json` | The rule that proposes the pack's human-approval-gated `hold-affected-output` Decision on a formal hold request. |
| `dashboards/` | `leadership.json`, `operations.json`, `technical.json` — A5 widget catalogue only. |
| `dashboards/metrics.json` | The 13 core metric definitions the dashboards reference (folded in here rather than a separate `metrics/` directory — see Deviations below). |
| `fixtures/{smoke,demo,edge-cases}/` | Fixture content, per-set `index.json`, and checksum-keyed `extractions/` (amendment A1). |
| `evaluations/` | Gold evaluation sets, one per fixture set, formalised from `narrative/expected-outcomes.md`. |

## Fixtures

### Smoke set (9 fixtures)

`process-exceptions-smoke-001` … `-009` — one clean, single-batch artifact
per format (shift report, QC CSV, operator note, inventory note,
production summary, supervisor email, analyzer JSON), no signals, no
cases, no decisions.

### Demo set (12 fixtures) — the KM-LOT-448 storyline

`demo-001`…`-012` trace supplier lot KM-LOT-448 through two consecutive
viscosity deviations (batches B-2205, B-2210): an early operator-noted
trend, a confirmed 8.2% deviation, a shift-report escalation, a
root-cause-investigation request that raises (but does not itself
confirm) a supplier-linked-pattern hypothesis, a second confirmed
deviation that elevates the pattern to cross-batch, a backlog-aging flag,
a yield-loss-trend production summary, and `demo-009`'s formal hold
request — the artifact that drives the pack's primary `hold-affected-
output` Decision, still pending supervisor/QC approval as of `demo-012`.
`demo-010`/`demo-011` are a deliberately unrelated minor B-2211 thread on
a different line and stage, included to show the pack is not
single-threaded.

### Edge-case set (7 fixtures)

| ID | Hazard |
|---|---|
| `edge-001` | Missing identifier — no batch ID recorded. |
| `edge-002` | Conflicting dates — `detected_date` after the referenced report's date. |
| `edge-003` | Ambiguous entity reference — Line 2 vs Line 2B. |
| `edge-004` | Negated statement — B-2190's deviation explicitly ruled out as supplier-related; must not feed the KM-LOT-448 pattern. |
| `edge-005` | Duplicate artifact — exact resubmission of `smoke-001`. |
| `edge-006` | Prompt-injection-style content embedded in a backlog note. |
| `edge-007` | High-risk/incomplete decision — inspection interrupted, `observed_value` blank. |

Full per-artifact detail is in `narrative/expected-outcomes.md`;
`evaluations/*.gold.json` is the formalised version of the same material.

## Evaluations

`evaluations/smoke.gold.json` (9), `evaluations/demo.gold.json` (12) and
`evaluations/edge-cases.gold.json` (7) — 28 gold examples total, each
naming expected observations, expected entities, expected event type,
expected fired-rule ids (from `rules/*.rules.json`), expected case
linkage, and expected Decision/approval requirement. Edge-case entries
exercise `negated` (`edge-004`), `alternativeCandidates` (`edge-003`),
and conflicting/insufficient review state (`edge-001`, `edge-007`).

## Event matching semantics

Shift reports require a batch and detection time, while routine handovers use
the reporter and detection time. Production summaries require batch and line
context; inventory exceptions retain their time-based criterion. These keys
keep routine reporting definitions distinguishable without core process logic.

## Deviations / contract notes (see `docs/agent-runs/OIW-004b.md`)

- **No `tours/`.** Tours are an explicit OIW-004b non-goal, deferred to
  the tour framework task. `manifest.yaml` therefore omits the `tours`
  field, even though it is required (non-optional) by contracts v1.1's
  `ScenarioPackManifestSchema` — flagged as a contract/validator
  mismatch for OIW-103 reconciliation rather than worked around here.
- **No `metrics/` directory.** The pack's metric definitions are folded
  into `dashboards/metrics.json` (still referenced from `manifest.yaml`'s
  `metrics` array, which contracts v1.1 requires) rather than a separate
  top-level directory, per the OIW-004b remediation instructions.
