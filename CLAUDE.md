# Claude Code Instructions

Follow `AGENTS.md` as the primary repository instruction source. This file
contains only Claude Code-specific additions. Do not duplicate or contradict
`AGENTS.md`.

## Claude-specific workflow

- Review subagents live in `.claude/agents/` (architecture-neutrality,
  security, ux-accessibility, evaluation, test). They are advisory and
  read-only: they report findings; the owning implementation thread applies
  fixes.
- The lead orchestration thread is the only thread that edits `SESSION.md`,
  writes task packets under `docs/tasks/`, and sequences merges.
- Implementation threads work only their assigned task packet. Never perform
  another thread's task because it happens to be available — mark yourself
  BLOCKED instead.
- For UI work, verify against `docs/UX_SPEC.md` and include screenshots in
  the PR for visible changes.
