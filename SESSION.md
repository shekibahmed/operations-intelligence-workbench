# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**Wave 2 (Asset Reliability vertical slice) — batch A in flight.**
Wave 1 COMPLETE and exit-reviewed against PRD §26: three packs load, seed +
reset live-verified (25 artifacts), all routes render, core neutral. Carried
gap: selector UI still stub-wired → first item of Wave 2 batch A (OIW-210).
Batch A: OIW-301 (ingestion+adapters+fixture provider, Codex) ∥ OIW-210
(web wiring to real services, Claude m900x). Batch B after A: entity/event/
rules/signals engines + review-queue UI. Batch C: case/action/decision
engines + case/decision UI + north-star e2e.

## Merged tasks

- OIW-000 — Repository bootstrap and coordination layer (lead thread)
- OIW-001 — Monorepo scaffold and contract freeze (PR #3; neutrality +
  test reviewers PASS; commands verified by lead)
- OIW-003 — UX specification and demonstration narrative (PR #2)
- OIW-005 — Evaluation, threat-model and quality plan (PR #1)
- OIW-004a — Synthetic narrative content for three packs (PR #4;
  evaluation-reviewer PASS)
- OIW-002 — Contract amendments v1.1 + ADR-008 (PR #5)
- OIW-101 — DB schema, migrations, persistence repositories (PR #7; six
  DB-boundary guarantee tests verified incl. approval guard; CI has a
  Postgres service; docker-compose for local dev)
- OIW-103 — Scenario pack validator and registry (PR #6; A8 core-track
  review PASS)
- OIW-201 — App shell, lens switcher, navigation (PR #8; ux-accessibility
  reviewer PASS; screenshots committed under apps/web/e2e/screenshots/)
- OIW-107 — Seed/reset API extensions (PR #11; zero breaking changes)
- OIW-105 — Guest workspace lifecycle, seed and reset (PR #9; BLOCKED→
  COMPLETE; demo:seed/demo:reset live-verified by lead)
- OIW-004b — Schema-bound scenario pack content (PR #10; remediation run
  after headless-ceiling failure; two mechanical integration fixes by lead
  (dashboard widget shape, fixture dir layout) + tours made optional in
  contracts (A7); final validate:packs = 3 loaded / 0 invalid / 0 warnings
  with checksum-verified extractions; v1.1 negated/candidates exercised in
  edge-003/004)

## Active tasks

| Task | Harness | Branch | Worktree | Status |
|---|---|---|---|---|
| OIW-109 | Codex (high) | `agent/codex/OIW-109-event-defs-seed-entities` | `../oiw-core` | running (unblocks OIW-501; contracts v1.3 + seed entities) |
| OIW-501 | Codex (high) | `agent/codex/OIW-501-entity-event-rules` | parked | BLOCKED on OIW-109 (PR #15 holds blocker record: no event-definition contract, no occurredAt mapping, no seeded entities) |
| OIW-406 | Claude Code (Sonnet, m900x) | `agent/claude/OIW-406-review-queue` | `../oiw-ux` | running (batch B UI: Process action, review queue, corrections) |

Merged this batch: OIW-210 (PR #14, security PASS), OIW-108 (PR #13, contracts v1.2), OIW-301 (PR #12, test-reviewer PASS on all 9 criteria incl. smoke parity + injection inertness). Merge order for batch B: by completion (no shared paths). After batch B: batch C = case/action/decision/approval engines (Codex, executes the pending rule outcomes via the ActionExecutor seam) ∥ case+decision UI, then dashboards wiring + north-star e2e (M1).

## Frozen contracts

`packages/contracts/` frozen at **v1.2** (v1.1 + additive OIW-108 PR #13:
ObservationSchemaDefinition, validateObservationValue; ADR-009). Previously (v1.0 PR #3 + additive PR #5:
negated observation status, alternativeCandidates, conflicting review
state). Covers: canonical domain schemas (14 objects), pack manifest,
workflow definition, rule schema + closed fact catalogue v1, checksum-keyed
expected-extraction contract (A1), IntelligenceProvider. Changes require a
dedicated contract-change task. ADRs 001–008 in `docs/decisions/`.
OIW-107 is pre-authorized for an additive v1.2 seed-bundle schema if needed.

## Known blockers

None.

Resolved incidents (kept for takeover context):
- OIW-105 BLOCKED→COMPLETE cycle: blocked on missing upstream APIs,
  unblocked by OIW-107 (PR #11), resumed and merged (PR #9). Both merged.
- OIW-107 first launch stalled on stdin (fix: `</dev/null`, now an
  operating rule).
- OIW-004b first session terminated by the headless 600s background-wait
  ceiling while its detached sub-agents were authoring. Remediation run is
  in progress over the intact partial worktree output.

## Operating rules learned

- Headless launches: always set `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`
  for `claude -p` agent runs, and instruct agents to work sequentially, not
  via detached background sub-agents.
- `codex exec` launches must redirect stdin (`</dev/null`) or codex may
  block forever "reading additional input from stdin".
- Lockfile: one owner per batch (OIW-101 held it this batch); other tasks
  edit only their own package.json; integrator verifies frozen install
  after every merge involving the lockfile.

## Next integration sequence

1. Merge OIW-004b (evaluation-reviewer gate; then run `pnpm validate:packs`
   against the real packs on the merged tree — first true validator×content
   integration check)
2. Merge OIW-107 (zero-breaking-changes gate), resume + merge OIW-105
3. Wave 1 exit review against PRD §26 Wave 1 criteria
4. Lead thread cuts Wave 2 packets (vertical slice): ingestion service +
   format adapters, fixture intelligence provider + validation/abstention,
   review queue UI, entity resolution, event assembly, rules/signals, case/
   action/decision engines, dashboards wiring, north-star e2e (PRD §27
   epics 3–6, amendments A3/A7/A8)

## Commands currently expected to pass

`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm architecture:check`, `pnpm validate:packs` (loads all three real packs), `pnpm db:migrate` /
`pnpm db:reset` (docker Postgres via `docker compose up -d`). CI runs the
suite incl. persistence integration tests on every PR. `pnpm eval` remains
a stub until the evaluation runner task.

## Ownership rules in force

- Migrations owner: unassigned (was OIW-101; next assignment at Wave 2 if
  schema changes needed).
- Lockfile/root config: integrator between batches; batch owner when
  explicitly granted in a packet.
- `SESSION.md`: lead thread only.

## Repository notes

- Remote: `https://github.com/shekibahmed/operations-intelligence-workbench`
  (private until M3).
- Branch protection unavailable on this plan for private repos; `main`
  protected by convention (PR-only, lead integrator merges) until public.
- OpenCode cannot authenticate against a Claude Max subscription; packs
  track runs on Claude Code (m900x). OpenCode/cursor-agent remain available
  as overflow with other providers.
- Two Claude accounts on this machine: primary (`~/.claude`, lead thread)
  and m900x (`~/.claude-m900x`, worker threads via CLAUDE_CONFIG_DIR).
