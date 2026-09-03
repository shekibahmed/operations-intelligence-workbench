# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**ALL P0 CODE COMPLETE — M3 (public launch) GATED ON OWNER DECISIONS.**
As of 2026-09-03: Waves 0–4 complete and Wave 5 code complete (37 PRs,
all lead-verified, CI-gated incl. Playwright). No agents running.

Owner decisions required before the remaining (mechanical) launch steps:
1. Hosting: Vercel project + Supabase project (owner-created, or Supabase
   provisioned via the connected MCP with cost confirmation); flip repo to
   public at launch (yes/no).
2. CTA destination: postgres table (shipped default) | email | form
   service — email/webhook are interfaces only until chosen.

Then, in order: configure env per `docs/DEPLOYMENT.md` → deploy → run
DEPLOYMENT.md smoke checks against the live URL → enable real branch
protection once public → hand over live demo link. Launch posts/outreach
are owner-authored (PRD §38 patterns; walkthroughs provide material).

## Milestones achieved

- **M0** Contract freeze (Wave 0) — contracts, UX spec, quality plan,
  narrative fixtures.
- **Wave 1** Platform skeleton — DB/persistence, validator/registry, app
  shell, seed/reset, three validated packs.
- **M1** Asset Reliability vertical slice (Wave 2) — north-star Playwright
  journey enforced in CI.
- **M2** Neutrality proof (Wave 3) — common lifecycle 11/11 across three
  packs, tours for all three, pack authoring guide + `_template`.
- **Wave 4** Hardening — eval runner (1.000 all dimensions + sabotage
  tests), rate limits/input policy/expiry sweep, a11y audit (axe in CI),
  exports (FR-110), injection matrix, threat-model sign-off (all 17
  SECURITY.md rows), DEPLOYMENT.md runbook.
- **Wave 5 code** — Playwright CI gate + flake fix (OIW-901), public
  README/architecture/walkthroughs (OIW-905), analytics + assessment CTA
  with pluggable sink + migration 0002 (OIW-904).

## Merged tasks (37 PRs)

Wave 0: 000, 001(#3), 003(#2), 005(#1), 004a(#4)
Wave 1: 002(#5), 101(#7), 103(#6), 201(#8), 004b(#10), 107(#11), 105(#9)
Wave 2: 210(#14), 108(#13), 301(#12), 406(#16), 408(#18), 109, 110(#19),
  501(#15), 506(#20), 509(#21), 601(#22), 602(#23)
Wave 3: 701(#24), 703(#25), 702(#26), 705(#27), 706(#28)
Wave 4: 802(#29), 810(#30), 808(#31), 811(#32), 805(#33), 812
Wave 5: 901(#35), 905(#36), 904(#37)

## Contracts

Frozen at **v1.5** (ADRs 001–012). Changes require a dedicated
contract-change task. Migrations: 0000 (schema), 0002 (analytics +
assessment tables, OIW-904).

## Tracked debt / accepted risks

- `accessibility.spec.ts` #main-content 5s wait times out under
  `--workers=2` repeats (single-worker + CI green) → raise wait/networkidle.
- Rate-limit store is process-local (accepted risk, SECURITY.md); multi-
  instance implications documented in DEPLOYMENT.md.
- PDF fixtures are text-with-page-markers; binary PDF parsing deferred
  (A7) — README states this honestly.
- `apps/web/src/lib/server/metrics.ts` remains the single UI↔metric seam.
- Email/webhook assessment sinks are interfaces only (owner decision).

## Operating rules (keep applying)

- Headless Claude: `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`, sequential,
  no detached work at turn end (codified in AGENTS.md).
- `codex exec`: always `</dev/null`.
- Lead merge procedure: both `quality` and `e2e` checks must EXIST and
  pass; run the full suite on the merged tree first.
- Resource rule: max two Playwright/build-heavy agents concurrently; kill
  orphaned vitest/chrome workers before lead verification (never the
  owner's own Chromium).
- Lockfile: single owner per batch or integrator-reconciled.
- BLOCKED protocol: bounded upstream fix tasks; zero boundary bypasses.

## Commands expected to pass

`pnpm install/lint/typecheck/test/build/validate:packs/eval/architecture:check`,
`pnpm db:migrate`, `pnpm demo:seed --pack <id>`, `pnpm demo:reset`,
`pnpm demo:expire`, `pnpm analytics:summary`, `(cd apps/web && pnpm
test:e2e)` — 23 specs. CI runs quality + e2e per PR.

## Repository notes

- Remote: `https://github.com/shekibahmed/operations-intelligence-workbench`
  (private until launch). Branch protection by convention until public.
- Worktrees `../oiw-core`, `../oiw-ux`, `../oiw-packs`, `../oiw-quality`
  (clean; on stale task branches — re-point per task).
- Accounts: primary Claude (lead) + m900x (`~/.claude-m900x`, workers);
  Codex via ChatGPT sub. OpenCode unusable with Claude Max.
