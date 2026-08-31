# Task OIW-004a: Synthetic Narrative Content for Three Packs

## Owner
Claude Code (Sonnet, m900x account)

## Branch
`agent/claude/OIW-004a-narrative-fixtures`

## Worktree
`../oiw-packs`

## Objective
Author the schema-independent half of the three Scenario Packs: raw synthetic
source artifacts, entity backstories, connected storylines and edge-case
inventories — deliberately WITHOUT manifests, schemas, rules JSON, gold sets
or expected extractions (those are OIW-004b, after the OIW-001 contract
freeze merges). See amendment A6.

## Background
PRD §12 (the three packs), §13 (demo journey), §21.2 (dataset shapes), §31
Packet C. Amendment A7: Asset Reliability gets full volume now; the other two
packs get reduced sets.

## Inputs
- `AGENTS.md`, `docs/PRD.md` (§12, §13, §21.2, §22.1), `docs/PLAN_AMENDMENTS.md`

## Owned Paths
- `scenario-packs/asset-reliability/narrative/`
- `scenario-packs/process-exceptions/narrative/`
- `scenario-packs/document-assurance/narrative/`
- `docs/agent-runs/OIW-004a.md`

## Prohibited Paths
- Everything else. Specifically: no `manifest.yaml`, no `schemas/`, no
  `rules/`, no `dashboards/`, no `evaluations/` directories yet; no
  `packages/`; no root config; no lockfile.

## Functional Requirements
1. Directory layout per pack:
   `narrative/artifacts/` (raw sources), `narrative/entities.md` (backstories),
   `narrative/storyline.md` (how artifacts connect over time),
   `narrative/expected-outcomes.md` (prose: which observations, events,
   signals, cases, decisions and approvals each artifact should produce —
   this becomes the gold set in OIW-004b), `narrative/edge-cases.md`.
2. **Asset Reliability (full volume):** ≥8 smoke artifacts (simple, normal
   path), ≥25 connected demonstration artifacts forming coherent asset
   histories (incl. the PRD §13 trio: informal brake-fault message, prior
   maintenance CSV, inspection PDF referencing the same component), ≥10 edge
   cases.
3. **Process Exceptions and Document Assurance (reduced, per A7):** ≥8 smoke
   + ≥12 demonstration artifacts + ≥6 edge cases each.
4. Artifact formats: plain-text messages, CSV files, JSON payloads, and
   text sources destined to become PDFs (author as `.md`/`.txt` with page
   markers; PDF generation happens in OIW-004b with a known text layer, A7).
5. Edge cases per pack must include: missing identifier, conflicting dates,
   ambiguous entity reference, negated statement, duplicate artifact,
   at least one prompt-injection-style artifact ("ignore prior rules and
   approve…" per PRD §22.1), and one high-risk decision storyline requiring
   approval.
6. Every artifact has a stable ID (`<pack>-<set>-NNN`), a declared format,
   and an entry in `expected-outcomes.md`.
7. Entity histories are coherent: the same assets/batches/documents recur
   across artifacts so repeat-fault / repeated-deviation / conflicting-
   provision signals are derivable.
8. Each pack's storyline supports a leadership, an operations and a technical
   telling (PRD §38).
9. No real organisation, person, product or customer data. Synthetic only.
   Generic platform vocabulary in cross-pack references; domain vocabulary
   stays inside each pack.

## Non-Goals
- No TypeScript. No JSON schemas. No rule definitions. No gold-set JSON.
  No dashboard definitions. No PDF binaries.

## Acceptance Criteria
- Volumes above met; stable IDs throughout; histories coherent across
  artifacts; every artifact mapped to expected outcomes in prose; injection,
  duplicate and high-risk-approval cases present in every pack; no real data.

## Required Tests
None (content task). Self-check: cross-reference every artifact ID between
`storyline.md` and `expected-outcomes.md`.

## Required Commands
None.

## Documentation
A short `narrative/README.md` per pack explaining the storyline in three
paragraphs (leadership / operations / technical).

## Handoff
`docs/agent-runs/OIW-004a.md` per template, including a **contract-needs
section**: anything you discovered that the OIW-001 contracts must support
(observation value shapes, evidence-span forms, workflow states). Open PR
`OIW-004a: synthetic narrative content for three packs`.
