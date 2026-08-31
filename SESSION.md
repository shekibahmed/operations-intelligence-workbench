# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**M0 — Bootstrap + Contract Freeze (Wave 0)**

Bootstrap (OIW-000) complete: repository initialized, PRD at `docs/PRD.md`
(generation artifacts cleaned), coordination files and Wave 0 task packets
committed, reviewer subagents defined.

## Merged tasks

- OIW-000 — Repository bootstrap and coordination layer (lead thread)

## Active tasks (Wave 0 — all four run in parallel, zero shared paths)

| Task | Harness | Branch | Worktree | Status |
|---|---|---|---|---|
| OIW-001 | Codex (GPT-5.2-Codex, high) | `agent/codex/OIW-001-contracts` | `../oiw-core` | ready to launch |
| OIW-003 | Claude Code (Sonnet, m900x) | `agent/claude/OIW-003-ux-spec` | `../oiw-ux` | ready to launch |
| OIW-004a | OpenCode (Sonnet, m900x) | `agent/opencode/OIW-004a-narrative-fixtures` | `../oiw-packs` | ready to launch |
| OIW-005 | Claude Code (Sonnet, m900x) | `agent/claude/OIW-005-quality-plan` | `../oiw-quality` | ready to launch |

## Frozen contracts

None yet. The Wave 0 freeze lands with OIW-001: canonical domain Zod
contracts, pack manifest schema, workflow-definition schema, rule schema +
fact catalogue v1, fixture expected-extraction contract (amendment A1).
After OIW-001 merges, `packages/contracts/` changes require a dedicated
contract-change task.

## Known blockers

None.

## Next integration sequence

1. Merge OIW-001 (everything downstream depends on it)
2. Merge OIW-003
3. Merge OIW-005
4. Merge OIW-004a
5. Lead thread cuts OIW-004b + Wave 1 task packets (see `docs/PRD.md` §26–27
   and `docs/PLAN_AMENDMENTS.md` A6–A8)

## Commands currently expected to pass

None yet — the toolchain lands with OIW-001. After it merges:
`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Ownership rules in force

- Lockfile + root config: integrator only (declare dependency needs in
  agent-run files).
- Migrations: no owner assigned yet (first assigned in Wave 1, OIW-101).
- `SESSION.md`: lead thread only.
