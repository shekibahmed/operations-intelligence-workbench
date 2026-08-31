# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**Wave 0 COMPLETE (M0). Wave 1 in progress.** Contracts frozen at PR #3;
one approved contract-change task (OIW-002) in flight for three additive
amendments surfaced by fixture authoring (see `docs/tasks/OIW-002.md`).

## Merged tasks

- OIW-000 — Repository bootstrap and coordination layer (lead thread)
- OIW-001 — Monorepo scaffold and contract freeze (PR #3, Codex; both
  reviewer subagents PASS; all required commands verified by the lead thread)
- OIW-003 — UX specification and demonstration narrative (PR #2)
- OIW-005 — Evaluation, threat-model and quality plan (PR #1)
- OIW-004a — Synthetic narrative content for three packs (PR #4;
  evaluation-reviewer PASS on all criteria)

## Active tasks (Wave 1, first batch)

| Task | Harness | Branch | Worktree | Status |
|---|---|---|---|---|
| OIW-201 | Claude Code (Sonnet, m900x) | `agent/claude/OIW-201-app-shell` | `../oiw-ux` | running |
| OIW-004b | Claude Code (Sonnet, m900x) | `agent/claude/OIW-004b-scenario-packs` | `../oiw-quality` | running (remediation: first session hit headless background-wait ceiling; relaunched with CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 and sequential-work instruction over intact partial output) |
| OIW-105 | Codex (high) | `agent/codex/OIW-105-workspace-seed-reset` | `../oiw-core` | running |

Merged this wave so far: OIW-002 (PR #5, contracts v1.1 + ADR-008),
OIW-101 (PR #7, DB schema/persistence — six DB-boundary guarantee tests
verified incl. approval guard), OIW-103 (PR #6, validator/registry — A8
core-track review PASS). Lockfile reconciliation at merges: integrator
verified frozen install after each.

Remaining merge order: OIW-201 → OIW-004b → OIW-105.
Headless-launch rule (learned from OIW-004b failure): always set
CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 for `claude -p` agent launches, and
instruct agents to work sequentially rather than spawning detached
background sub-agents.

## Frozen contracts

Frozen at PR #3 (`packages/contracts/`): canonical domain Zod schemas for the
14 neutral objects, pack manifest schema, workflow-definition schema, rule
schema + closed fact catalogue v1, checksum-keyed fixture expected-extraction
contract, `IntelligenceProvider` interface. Changes now require a dedicated
contract-change task merged before dependents rebase. ADRs 001–007 in
`docs/decisions/`.

## Known blockers

None.

## Repository notes

- Remote: `https://github.com/shekibahmed/operations-intelligence-workbench`
  (private until M3).
- GitHub branch protection is unavailable on this plan for private repos;
  until M3, `main` is protected by convention — merges only via PR, performed
  only by the lead integrator. Enable real protection when the repo goes public.
- Harness note: OpenCode cannot authenticate against a Claude Max
  subscription (Anthropic restricts sub sign-in to Claude Code), so the packs
  track runs on Claude Code (m900x account) instead. OpenCode/cursor-agent
  remain available as overflow workers with other providers if needed.

## Next integration sequence

1. Merge OIW-002 (contract amendments; unblocks OIW-004b and Wave 1 engines)
2. Merge OIW-103 (core-track review required per A8), then OIW-201
3. Lead thread cuts + launches OIW-004b (schema-bound packs) and OIW-101
   (DB schema + persistence, Codex) after OIW-002 merges

Contract-needs reconciliation (Wave 0 close-out): items 1/2/4 from
agent-runs/OIW-004a.md → OIW-002; near-duplicate handling and source-quality
flags deliberately deferred to Wave 1/2 engine packets (to be recorded in
ADR-008); evidence locators, awaiting-approval state, currency values —
already covered by frozen contracts.

## Commands currently expected to pass

`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm architecture:check` (CI runs these on every PR). `pnpm eval` and
`pnpm validate:packs` are placeholder stubs until Wave 1.

## Ownership rules in force

- Lockfile + root config: integrator only (declare dependency needs in
  agent-run files).
- Migrations: no owner assigned yet (first assigned in Wave 1, OIW-101).
- `SESSION.md`: lead thread only.
