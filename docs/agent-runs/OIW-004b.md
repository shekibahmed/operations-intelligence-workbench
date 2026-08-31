# Agent Run: OIW-004b

## State
COMPLETE

## Changed files
- `scenario-packs/asset-reliability/` — `manifest.yaml`, `labels.json`,
  `schemas/{entities,events,observations,cases}/`, `workflows/`,
  `rules/`, `dashboards/` (incl. `dashboards/metrics.json`),
  `fixtures/{smoke,demo,edge-cases}/` (content + `index.json` +
  checksum-keyed `extractions/`), `evaluations/`, `README.md`. Removed
  `tours/` and top-level `metrics/`. 194 files.
- `scenario-packs/process-exceptions/` — same shape. `manifest.yaml`,
  `rules/`, `schemas/`, `workflows/default.workflow.json` and most
  fixture/dashboard content already existed from the terminated prior
  session; this run completed `fixtures/demo/extractions/` (9 of 12
  missing), `fixtures/edge-cases/extractions/` (all 7 missing),
  `evaluations/`, `README.md`, and removed `tours/`/`metrics/`. 145 files.
- `scenario-packs/document-assurance/` — built from near-scratch:
  `manifest.yaml`, `labels.json`, `schemas/cases/review-case.schema.json`,
  `schemas/observations/checklist-status.schema.json` (gap left by the
  terminated session — see Assumptions), `workflows/`, `rules/`,
  `dashboards/` (incl. `metrics.json`), all of `fixtures/**`
  (content already existed; indexes/extractions built new),
  `evaluations/`, `README.md`. Removed empty `tours/`/`metrics/`. 140 files.
- `docs/agent-runs/OIW-004b.md` (this file).

`scenario-packs/*/narrative/` was not touched (read-only source; verified
via `git diff HEAD -- 'scenario-packs/*/narrative/'` — empty).

## Commits
On branch `agent/claude/OIW-004b-scenario-packs` (see `git log` for hashes;
this run continues a branch whose first session was terminated mid-task
with uncommitted work — see Assumptions and deviations).

## Tests run and results
- `pnpm lint` — pass, 0 warnings.
- `pnpm typecheck` — pass, all 12 packages.
- `pnpm test` — pass, 46/46 (contracts package unit tests; unrelated to
  this task's content but run per the standard gate list).
- `pnpm build` — pass, all 12 packages.
- `pnpm eval` / `pnpm validate:packs` — both run; both print their
  known Wave-0/OIW-103 stub messages (no-op beyond directory discovery),
  confirming they exist but don't yet implement pack validation — exactly
  as recorded in OIW-001's own agent-run. Not a regression from this task.
- `pnpm architecture:check` — pass ("core packages are neutral and domain
  imports respect pack boundaries").
- **Self-validation** (per task packet, "small throwaway zod script since
  OIW-103 isn't merged yet"): wrote a throwaway validator
  (not committed — lived under `/tmp/oiw004b/`, discarded at the end of
  this session) that, per pack: parses `manifest.yaml` against
  `ScenarioPackManifestSchema`; parses every `rules/*.json` entry against
  `RuleDefinitionSchema` (which itself enforces the closed fact catalogue,
  amendment A2); parses every `workflows/*.json` against
  `WorkflowDefinitionSchema`; parses every `dashboards/metrics.json`
  entry against `MetricDefinitionSchema`; checks every dashboard widget's
  `type` against the A5 catalogue and that its `metricId` resolves;
  recomputes the sha256 of every fixture content file and confirms it
  matches both the fixture index and the corresponding extraction's
  `artifactChecksum`, and parses every extraction against
  `ExtractionResultSchema`; and confirms every `evaluationSets` file
  exists and is non-empty. **Result: 0 issues across all three packs**
  (manifest validation used a substituted placeholder `tours.leadership`
  value to isolate the one known, intentional mismatch — see Acceptance
  criteria status).

## Acceptance criteria status
- **Every fixture has a checksum-keyed expected extraction; spot-checkable
  by `sha256sum`** — pass. 101 fixtures total (45 asset-reliability, 28
  process-exceptions, 28 document-assurance), every one with a real
  (non-placeholder) sha256 in its `index.json` and a matching
  `artifactChecksum` in its `extractions/<id>.json`, verified
  programmatically (see Tests). The terminated prior session had left
  `"PLACEHOLDER"` / all-zero checksums throughout asset-reliability's
  smoke set and process-exceptions' existing files; all recomputed.
- **Manifests/schemas/rules/dashboards parse against contracts v1.1** —
  pass, with one named, deliberate exception: `manifest.yaml`'s `tours`
  field, which contracts v1.1 requires but which OIW-004b's own Non-Goals
  forbid populating. See the "tours vs. contracts v1.1" deviation below;
  every other manifest field, every rule, every workflow, every dashboard
  and every metric definition validates cleanly.
- **Gold volumes met; edge cases exercise negated/candidates/conflicting**
  — pass. Asset Reliability 45 gold examples (≥20 required); Process
  Exceptions and Document Assurance 28 each (≥12 required). `negated`
  appears in every pack (asset-reliability `edge-004`, process-exceptions
  `edge-004`, document-assurance `edge-004`); `alternativeCandidates`
  appears in every pack's `edge-003`; conflicting/insufficient review
  state appears repeatedly (e.g. asset-reliability `edge-010` and the
  demo-017/demo-018 pair; process-exceptions `edge-001`/`edge-007`;
  document-assurance `edge-001`/`edge-002`/`edge-007`).
- **Dashboard definitions use only A5 widget types** — pass, verified
  programmatically against `DashboardWidgetTypeSchema`'s 8-member enum
  across all 9 dashboard files (3 lenses × 3 packs).
- **`pnpm architecture:check` still passes** — pass (see Tests).

## Architectural decisions
- **Metrics folded into `dashboards/metrics.json`, not a `metrics/`
  directory.** The task packet's required §11.1 layout (as quoted in the
  packet) does not list a `metrics/` directory, and this remediation run's
  instructions explicitly called it out as out-of-scope alongside `tours/`.
  But `ScenarioPackManifestSchema.metrics` is a required, non-empty array
  of paths (contracts v1.1) and `MetricDefinitionSchema` (`domain.ts`)
  is a real, exercised contract — dashboards need metric definitions to
  reference. Resolution: kept the metric definitions (all validate against
  `MetricDefinitionSchema`) but relocated them to `dashboards/metrics.json`
  — satisfies the manifest's non-empty-array requirement without
  reintroducing a top-level `metrics/` directory.
- **`tours/` removed outright, not relocated.** Unlike metrics, tours have
  no salvageable content to fold anywhere — the task's Non-Goals say "no
  tours" flatly, so the field in `manifest.yaml` is simply omitted rather
  than populated with placeholder content. This is a genuine,
  reproducible contract mismatch (see below), not a workaround.
- **`checklist-status` observation schema added (document-assurance).**
  The terminated prior session's `schemas/events/checklist-filed.schema.json`
  requires an observation `checklist-status` that had no corresponding
  file under `schemas/observations/` — the session appears to have died
  exactly at this point ("document-assurance died mid-schemas" per the
  remediation brief). Added the missing schema; everything else in that
  pack's `schemas/entities/`, `schemas/events/` and the other 11
  `schemas/observations/` files was already well-formed and is reused
  as-is.
- **`review-case` as document-assurance's case type.** Named for
  consistency with the other two packs' `<domain>-case` pattern
  (`reliability-case`, `exception-case`); tracks a document/obligation
  thread from first tracked obligation through to a recorded exception
  decision or routine closure.
- **Extraction fixtures generated via a throwaway script, not hand-typed
  JSON.** Given ~100 fixtures needing checksum-accurate, schema-valid
  extractions, I wrote a small (uncommitted, `/tmp`-only) generator that:
  takes a per-artifact list of `{schemaKey, excerpt, confidence, ...}`
  authored by hand from each pack's `narrative/expected-outcomes.md` and
  the fixture's actual text; locates each excerpt's exact character
  offset in the real content file (for `.txt`, avoiding hand-computed,
  error-prone offsets); passes CSV/Markdown-page/JSON evidence through as
  `table-cell`/`page`/`json-path` locators (matching the locator-kind
  convention the terminated session had already established in
  asset-reliability's smoke set); computes the real sha256 of each
  content file; and validates the assembled `ExtractionResult` against
  `ExtractionResultSchema` before writing it, failing loudly on any
  excerpt-not-found or schema-validation error rather than writing bad
  output. This caught and forced fixes for 6 excerpt/line-wrap mismatches
  during authoring (all fixed; final run is clean).
- **Rule ↔ gold-set fidelity: transcribed from narrative, not
  hand-simulated against the rule engine.** Each gold example's
  `expectedSignals`/`expectedDecision` names the rule id(s) the
  corresponding `narrative/expected-outcomes.md` entry describes as
  firing (e.g. "repeat-fault candidate" → `repeated-fault-escalation`),
  rather than me manually re-deriving rule-engine aggregate-window
  arithmetic artifact-by-artifact. The rules themselves are schema-valid
  and fact-catalogue-closed (enforced by `RuleDefinitionSchema`); actual
  runtime rule-firing verification against these gold sets is properly
  OIW-103/the rule-engine implementation's job, not this content task's.

## Assumptions and deviations
- **Terminated first session.** This is a remediation run: a prior
  session on this same branch/worktree was terminated mid-task, leaving
  uncommitted work. Inventory at the start of this run: asset-reliability
  was substantially authored (manifest, labels, schemas, workflow, rules,
  dashboards, smoke fixtures with placeholder checksums) but missing
  demo/edge-case extractions+indexes, `evaluations/`, and `README.md`;
  process-exceptions had a similar shape with 3 of 12 demo extractions
  present and edge-case extractions entirely missing; document-assurance
  had only `fixtures/**/content/` and a partial `schemas/` (missing
  `schemas/cases/`, one observation schema, and all of `manifest.yaml`,
  `labels.json`, `workflows/`, `rules/`, `dashboards/`, `evaluations/`,
  `README.md`). All three packs also had dead-session-created `tours/`
  and `metrics/` directories, addressed per the Architectural decisions
  above. All good existing content (schemas, rules, workflows, dashboards,
  smoke extractions, process-exceptions' 3 existing demo extractions) was
  reused as-is rather than regenerated, after review confirmed it was
  schema-valid and consistent with the narrative.
- **`tours` vs. contracts v1.1 — known, unresolved mismatch.** Flagging
  explicitly per the task packet's Handoff instruction ("including any
  contract or validator mismatches found"):
  `ScenarioPackManifestSchema.tours` requires a non-optional
  `tours.leadership` path, but OIW-004b's Non-Goals state "No tours." All
  three manifests therefore omit `tours` entirely and will fail strict
  `ScenarioPackManifestSchema` validation on that one field until either
  (a) contracts v1.1 makes `tours` optional pre-OIW-103, or (b) a
  follow-up tour-framework task adds real tour content per pack. Every
  other manifest field validates. This is recorded in-line in each
  `manifest.yaml` as a comment and in each pack's `README.md`.
- **Fixture artifact types are pack-local free text**, not drawn from a
  contracts-level enum (there isn't one — `ArtifactSchema.artifactType`
  is `SlugSchema`, unconstrained). Reused the terminated session's
  existing `artifactType` values in asset-reliability/process-exceptions
  for consistency, and picked analogous kebab-case values for
  document-assurance's newly-authored fixtures.
- **`smoke-009`'s JSON due-date in document-assurance** references
  `2026-02-10`, earlier than the `smoke-007` service order's own
  `March 20, 2026` delivery deadline text. This mismatch originates in
  `narrative/artifacts/smoke/document-assurance-smoke-009.json` (read-only,
  authored under OIW-004a) — the fixture content is a faithful copy of
  the narrative source per functional requirement 2, and the extraction
  faithfully reports the value as written rather than "correcting" it.
  Flagging for OIW-004a/narrative owners rather than silently editing
  read-only source.
- **PDF binaries**: not generated (Non-Goal, A7). `inspection-report`/
  contract/policy/report artifacts remain Markdown with `--- page N ---`
  markers; fixture index entries carry `sourceFormat: "pdf-text-layer"`
  (or `artifact_type: pdf` where the terminated session had already used
  that convention) so a future PDF adapter task can render from the same
  page-segmented text.

## Dependency requests
None. No new dependencies; `pnpm install --frozen-lockfile` was run to
populate `node_modules` for local self-validation tooling (`tsx`, `zod`,
`js-yaml` via the pnpm virtual store) — lockfile untouched (verified
`git status` shows no `pnpm-lock.yaml` diff).

## Known limitations / follow-up
- **OIW-103 (validator)**: once merged, run it against all three packs
  and reconcile the one known `tours` mismatch above; everything else in
  this self-validation pass should carry over cleanly since it already
  exercises the same contracts v1.1 schemas OIW-103 will use.
- **Rule-engine runtime verification**: the gold sets' `expectedSignals`/
  `expectedDecision` are transcribed from the prose narrative and are
  fact-catalogue-valid by construction, but have not been executed against
  a real rule engine (doesn't exist yet). When the rule engine lands,
  re-run these gold sets and treat any mismatch as a rule-definition bug
  to fix, not a gold-set bug, unless investigation shows the narrative's
  own expected behavior was wrong.
- **document-assurance's `checklist-status` schema** is new in this task;
  double-check it against whatever `checklist-filed` event-assembly logic
  OIW-1xx eventually implements, since it was reverse-engineered from the
  event schema's `requiredObservations` list rather than designed
  up-front.
- Per OIW-004a's own follow-up note, PDF binary generation remains
  deferred to the Wave 2 PDF adapter task.
