# Task OIW-004b: Schema-Bound Scenario Pack Content

## Owner
Claude Code (Sonnet, second account)

## Branch
`agent/claude/OIW-004b-scenario-packs`

## Worktree
`../oiw-quality`

## Objective
Convert the merged OIW-004a narrative content into complete, contract-valid
Scenario Pack bundles for all three packs: manifests, labels, schemas,
workflows, rules, dashboards, fixtures with checksum-keyed expected
extractions (amendment A1), and gold evaluation sets.

## Background
Second half of the A6 split. Contracts v1.1 are merged (including negated
findings, alternative candidates, conflicting review state — use them for
the edge cases that motivated them). The `narrative/` directories are the
source material; `narrative/expected-outcomes.md` is the prose gold set to
formalise. OIW-103 (validator) is being built in parallel — structure packs
per PRD §11.1 and `packages/contracts/src/configuration.ts`; final
validator reconciliation happens at merge.

## Inputs
- `AGENTS.md`, `docs/PLAN_AMENDMENTS.md` (A1, A2, A5, A7),
  `docs/PRD.md` §11–12, §21.2, `packages/contracts/src/configuration.ts` and
  `extraction.ts` (v1.1), `scenario-packs/*/narrative/`,
  `docs/agent-runs/OIW-004a.md`, `docs/UX_SPEC.md` §widget catalogue

## Owned Paths
- `scenario-packs/asset-reliability/` (all non-narrative content)
- `scenario-packs/process-exceptions/` (all non-narrative content)
- `scenario-packs/document-assurance/` (all non-narrative content)
- `docs/agent-runs/OIW-004b.md`

## Prohibited Paths
- `scenario-packs/*/narrative/` (read-only source; do not edit),
  `packages/*`, `apps/`, migrations, root config, lockfile.

## Functional Requirements
1. Per pack, the PRD §11.1 layout: `manifest.yaml`, `labels.json`,
   `schemas/` (observations, events, cases, entities), `workflows/`,
   `rules/` (severity, escalation, approval), `dashboards/`
   (leadership/operations/technical, widgets ONLY from the A5 catalogue),
   `fixtures/{smoke,demo,edge-cases}/`, `evaluations/`, `README.md`.
2. Fixtures: copy each narrative artifact into `fixtures/` in its final
   ingestible form with a fixture index (id, artifact type, mime type,
   source metadata, sha256 checksum). PDF-destined artifacts remain
   text-with-page-markers plus `artifact_type: pdf` and pre-extracted
   `raw_text`; actual PDF binary generation is deferred to the Wave 2 PDF
   adapter task (record this in your agent-run).
3. Expected extractions (A1): for every fixture artifact, a checksum-keyed
   `ExtractionResult` JSON conforming to contracts v1.1 — evidence spans
   using the correct locator kind per format, confidences, abstention
   (`insufficient-evidence`) where the narrative says so, `negated` for the
   edge-004 cases, `alternativeCandidates` for the edge-003 cases.
4. Gold evaluation sets: formalise `expected-outcomes.md` into
   `evaluations/` JSON — expected observations, entities, events, signals,
   fired rules, and which Decisions require approval (≥20 gold examples for
   asset-reliability; ≥12 each for the other two, per A7).
5. Rules use only fact-catalogue v1 facts; every rule expectation in the
   gold set names its rule id. Approval rules must make the three high-risk
   demo decisions require human approval.
6. Workflows: states/transitions/closure requirements per pack matching the
   storylines (e.g. reliability case cannot close without completed
   inspection action).
7. Labels: complete UI label sets per PRD §10.2/§11.2 — no industry terms
   leak into anything outside `scenario-packs/`.
8. Prompt-injection fixtures stay verbatim (they are test material).
9. Stable IDs preserved from narrative; every fixture cross-referenced in
   its pack README.

## Non-Goals
No TypeScript implementation. No tours (deferred until the tour framework
task). No PDF binaries. No validator changes (flag mismatches instead).

## Acceptance Criteria
- Every fixture has a checksum-keyed expected extraction; spot-checkable by
  `sha256sum`.
- Manifests/schemas/rules/dashboards parse against contracts v1.1 (validate
  with a small throwaway zod script if OIW-103 isn't merged yet; do not add
  dependencies).
- Gold volumes met; edge cases exercise negated/candidates/conflicting.
- Dashboard definitions use only A5 widget types.
- `pnpm architecture:check` still passes (no core changes).

## Required Tests
Self-validation script output captured in the agent-run file (not committed
as a package).

## Required Commands
`pnpm architecture:check` (and your self-validation).

## Documentation
Per-pack `README.md` updated to describe the full bundle.

## Handoff
`docs/agent-runs/OIW-004b.md` per template, including any contract or
validator mismatches found. PR titled
`OIW-004b: schema-bound scenario pack content`.
