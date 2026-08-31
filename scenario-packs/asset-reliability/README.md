# Asset Reliability Scenario Pack

Converts fault reports, inspection notes, maintenance records and service
updates from the fictional Northgate Distribution Center into
evidence-backed reliability cases, tracking recurring faults across time
and gating any removal from service behind an explicit human approval.

Full narrative source material — storyline, entities, edge-case index and
the prose gold-set notes this pack's `evaluations/` were formalised from —
lives in `narrative/` (read-only; authored under OIW-004a).

## Bundle layout

| Path | Contents |
|---|---|
| `manifest.yaml` | Pack manifest: entity/event types, schema references, rules, dashboards, fixtures, evaluation sets. |
| `labels.json` | UI label set (entity/event/case types, workflow states, severities, signal/action/decision types, lenses). |
| `schemas/entities/` | `asset`, `component`, `location`, `service-provider`. |
| `schemas/events/` | `fault-reported`, `maintenance-completed`, `inspection-completed`, `repair-scheduled`, `escalation-raised`, `status-changed`, `diagnostic-completed`, `sensor-reading-logged`, `fleet-summary-reported`. |
| `schemas/observations/` | 22 observation schemas (asset-identifier, symptom, severity-indicator, inspection-finding, sensor-reading, etc). |
| `schemas/cases/` | `reliability-case` — closure requires a completed inspection action and any proposed removal-from-service decision to be resolved. |
| `workflows/default.workflow.json` | `open → in-review → awaiting-approval → resolved → closed`, with an approval-gated `awaiting-approval → closed` transition requiring the `asset-removal-approval` policy. |
| `rules/severity.rules.json` | Safety-critical fault flagging; conflicting operating-status detection. |
| `rules/escalation.rules.json` | Repeated-fault, missing-inspection, overdue-repair and high-downtime signals (fact-catalogue aggregates only). |
| `rules/approval.rules.json` | The two rules that propose a human-approval-gated `remove-from-service` Decision: a repeat safety-critical fault, and a thin-evidence structural-integrity flag. |
| `dashboards/` | `leadership.json`, `operations.json`, `technical.json` — A5 widget catalogue only (stat-card, severity-breakdown, list-card, trend-line, sla-table, pending-approvals, activity-feed, text-impact). |
| `dashboards/metrics.json` | The 10 core metric definitions the dashboards reference (folded in here rather than a separate `metrics/` directory — see Deviations below). |
| `fixtures/{smoke,demo,edge-cases}/` | Fixture content, per-set `index.json`, and checksum-keyed `extractions/` (amendment A1). |
| `evaluations/` | Gold evaluation sets, one per fixture set, formalised from `narrative/expected-outcomes.md`. |

## Fixtures

All artifact text/CSV/Markdown/JSON content in `fixtures/**/content/` is a
direct copy of the corresponding `narrative/artifacts/**` file in its
final ingestible form (PDF-destined artifacts remain Markdown with
`--- page N ---` markers and an `artifact_type: pdf` / `sourceFormat:
pdf-text-layer` annotation in the fixture index — see Deviations). Each
`fixtures/<set>/index.json` entry carries the artifact's id, type, mime
type, source metadata and **sha256 checksum of the content file**; each
`fixtures/<set>/extractions/<id>.json` is the checksum-keyed
`ExtractionResult` (contracts v1.1) used by the `FixtureIntelligenceProvider`.

### Smoke set (9 fixtures)

`asset-reliability-smoke-001` … `-009` — one clean, single-asset artifact
per format (chat, CSV, PDF-style report, vendor email, repair-update log,
JSON sensor reading), no signals, no cases, no decisions. `smoke-008` sets
up `edge-004`'s negated follow-up.

### Demo set (25 fixtures) — five storylines

- **Storyline A** (`demo-001`…`-006`) — A-142 repeat brake fault, the
  flagship arc: informal report → prior-repair CSV → inspection with SLA
  → safety-critical repeat occurrence → supervisor hold-from-service email
  → repair-update confirming out-of-service. Drives the pack's primary
  `remove-from-service` Decision (proposed at `demo-005`, unresolved at
  the end of the pack's timeline).
- **Storyline B** (`demo-007`…`-011`) — A-210/A-211 conveyor belt
  slippage; cross-asset reasoning via shared install batch.
- **Storyline C** (`demo-012`…`-015`) — A-301/A-302 dock leveler
  hydraulic leak; temporary-fix-to-scheduled-repair chain, contained risk.
- **Storyline D** (`demo-016`…`-019`) — A-501 generator overheating;
  deliberate conflicting-operating-status pair (`demo-017` vs `demo-018`).
- **Storyline E** (`demo-020`…`-025`) — A-520 compressor leak (clean
  resolution) plus `demo-025`, a fleet rollup tying Storylines A/B/D
  together for a leadership view.

### Edge-case set (11 fixtures)

| ID | Hazard |
|---|---|
| `edge-001` | Missing identifier — no asset ID, vague location only. |
| `edge-002` | Conflicting dates — completion date precedes report date. |
| `edge-003` | Ambiguous entity reference — "A-14_" (A-142 vs A-140). |
| `edge-004` | Negated statement — explicitly not a defect finding. |
| `edge-005` | Duplicate artifact — exact resend of `demo-001`. |
| `edge-006` | Prompt-injection-style content embedded in ordinary text. |
| `edge-007` | High-risk decision on thin, explicitly unconfirmed evidence. |
| `edge-008` | Unsupported language (Spanish). |
| `edge-009` | Low-quality/garbled OCR text. |
| `edge-010` | Conflicting operating status, same-day. |
| `edge-011` | Repeated artifact — near-duplicate (similarity, not exact match). |

Full per-artifact detail (expected observations/events/signals/cases/
decisions) is in `narrative/expected-outcomes.md`; `evaluations/*.gold.json`
is the formalised version of the same material.

## Evaluations

`evaluations/smoke.gold.json` (9), `evaluations/demo.gold.json` (25) and
`evaluations/edge-cases.gold.json` (11) — 45 gold examples total, each
naming expected observations (by `schemaKey`/`status`/`value`), expected
entities, expected event type, expected fired-rule ids (from
`rules/*.rules.json`), expected case linkage, and expected Decision/
approval requirement. Edge-case entries exercise `negated`
(`edge-004`), `alternativeCandidates` (`edge-003`), and conflicting
review state (`edge-010`, and `demo-017`/`demo-018` in the demo set).

## Event matching semantics

Completed maintenance requires an asset, the serviced component and an
explicit completion status; scheduled repairs instead require the requested
action and named service provider. Formal inspections require a named
inspector, while provider diagnostics require a named service provider. These
criteria preserve the narrative distinctions for smoke-004/005, demo-011/015
and demo-023 without artifact-type or pack-specific engine inference.

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
- **No PDF binaries.** `inspection-report` artifacts remain
  Markdown-with-page-markers plus pre-extracted `raw_text`; PDF binary
  generation is deferred to the Wave 2 PDF adapter task (per A7).
