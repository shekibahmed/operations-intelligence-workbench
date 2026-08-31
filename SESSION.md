# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**Wave 1 (Platform Skeleton) — nearly complete.** Wave 0 (M0 contract
freeze) done. Merged so far in Wave 1: contracts v1.1, DB/persistence,
pack validator/registry, app shell. In flight: schema-bound pack content
(OIW-004b), seed/reset API extensions (OIW-107). Parked: OIW-105 (BLOCKED
on OIW-107). Wave 2 (Asset Reliability vertical slice) starts when the
board clears.

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
- OIW-004b — Schema-bound scenario pack content (PR #10; remediation run
  after headless-ceiling failure; two mechanical integration fixes by lead
  (dashboard widget shape, fixture dir layout) + tours made optional in
  contracts (A7); final validate:packs = 3 loaded / 0 invalid / 0 warnings
  with checksum-verified extractions; v1.1 negated/candidates exercised in
  edge-003/004)

## Active tasks

| Task | Harness | Branch | Worktree | Status |
|---|---|---|---|---|
| OIW-107 | Codex (high) | `agent/codex/OIW-107-seed-reset-apis` | `../oiw-core` | running (unblocks OIW-105) |
| OIW-105 | Codex (high) | `agent/codex/OIW-105-workspace-seed-reset` | parked | BLOCKED on OIW-107 (blocker detail: agent-run + PR #9) |

Remaining merge order: OIW-107 → OIW-105 (resume on its existing branch
after 107 merges).

## Frozen contracts

`packages/contracts/` frozen at **v1.1** (v1.0 PR #3 + additive PR #5:
negated observation status, alternativeCandidates, conflicting review
state). Covers: canonical domain schemas (14 objects), pack manifest,
workflow definition, rule schema + closed fact catalogue v1, checksum-keyed
expected-extraction contract (A1), IntelligenceProvider. Changes require a
dedicated contract-change task. ADRs 001–008 in `docs/decisions/`.
OIW-107 is pre-authorized for an additive v1.2 seed-bundle schema if needed.

## Known blockers

- OIW-105 BLOCKED on missing upstream public APIs; OIW-107 (running) is the
  owning-track fix. Resume OIW-105 on its branch once 107 merges.

Resolved incidents (kept for takeover context):
- OIW-004b first session terminated by the headless 600s background-wait
  ceiling while its detached sub-agents were authoring. Remediation run is
  in progress over the intact partial worktree output.

## Operating rules learned

- Headless launches: always set `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`
  for `claude -p` agent runs, and instruct agents to work sequentially, not
  via detached background sub-agents.
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
