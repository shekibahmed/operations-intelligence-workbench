# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**M0 — Contract Freeze (Wave 0): 3 of 4 tasks merged.** Contracts are FROZEN
as of PR #3. OIW-004a (narrative fixtures) still in progress.

## Merged tasks

- OIW-000 — Repository bootstrap and coordination layer (lead thread)
- OIW-001 — Monorepo scaffold and contract freeze (PR #3, Codex; both
  reviewer subagents PASS; all required commands verified by the lead thread)
- OIW-003 — UX specification and demonstration narrative (PR #2)
- OIW-005 — Evaluation, threat-model and quality plan (PR #1)

## Active tasks

| Task | Harness | Branch | Worktree | Status |
|---|---|---|---|---|
| OIW-004a | Claude Code (Sonnet, m900x) | `agent/claude/OIW-004a-narrative-fixtures` | `../oiw-packs` | running |

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

1. Review + merge OIW-004a when its agent completes (evaluation-reviewer
   subagent pass; reconcile its contract-needs notes against the frozen
   contracts)
2. Lead thread reconciles contract-needs flagged in agent-runs OIW-003/004a/005
   (contract-change task only if needed)
3. Lead thread cuts OIW-004b + Wave 1 task packets (see `docs/PRD.md` §26–27
   and `docs/PLAN_AMENDMENTS.md` A6–A8)

## Commands currently expected to pass

`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm architecture:check` (CI runs these on every PR). `pnpm eval` and
`pnpm validate:packs` are placeholder stubs until Wave 1.

## Ownership rules in force

- Lockfile + root config: integrator only (declare dependency needs in
  agent-run files).
- Migrations: no owner assigned yet (first assigned in Wave 1, OIW-101).
- `SESSION.md`: lead thread only.
