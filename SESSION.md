# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**M3 REACHED (repository public, 2026-09-08) — ALL P0 CODE COMPLETE.
HOSTING DEFERRED BY OWNER DECISION.**

Waves 0–5 complete (37 lead-verified, CI-gated PRs in the private
development repo). No agents running. No open tasks.

Owner decisions taken on 2026-09-08:
1. Repository is public; history rewritten to noreply identities (see
   Repository notes).
2. Hosted demo is **deferred** until buyer outreach begins. Chosen target
   when it happens: container host (Google Cloud Run or equivalent) plus
   Neon Postgres — the app reads Scenario Packs from the filesystem at
   runtime, so edge runtimes (Cloudflare Workers) and file-tracing-based
   serverless hosts are poor fits; see `docs/DEPLOYMENT.md` (Vercel/Supabase
   runbook, still valid as an alternative) and the 2026-09-08 hosting
   analysis in the lead thread.
3. CTA destination remains the shipped Postgres table; email/webhook
   remain interfaces only.

Open follow-ups (create task packets when picked up):
- Hosting task: Dockerfile + `NEXT_OUTPUT=standalone` image and the compose
  `web` service now exist (OIW-907); remaining: env-configurable DB pool is
  done (`DATABASE_POOL_MAX`), so what's left is keepalive/expiry GitHub
  Actions job and DEPLOYMENT.md §2–§4 rewrite for the chosen host when the
  owner picks one.
- Old private repo `operations-intelligence-workbench-old-private`: keep
  (holds PR review history and agent branches); archive read-only when
  comfortable; never delete.

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
- **Wave 5** — Playwright CI gate + flake fix (OIW-901), public
  README/architecture/walkthroughs (OIW-905), analytics + assessment CTA
  with pluggable sink + migration 0002 (OIW-904).
- **M3** Public repository (2026-09-08) — pre-publication audit clean
  (gitleaks full history: 2 verified false positives; no real data; CI has
  no secrets, `pull_request` trigger, `contents: read`); root
  `SECURITY.md`; repo security features and branch protection enabled.
- **Post-publication polish (OIW-907, 2026-09-12)** — public funnel
  redesign: visual identity (Inter vendored, refreshed tokens, brand mark,
  favicon, OG/Twitter cards), landing/scenario/adapt pages rebuilt, shell +
  dashboard widget restyle, all seven README screenshots regenerated from
  the real tour (harness: `REGEN_SCREENSHOTS=1 pnpm test:e2e --grep
  regenerate`), shared Postgres rate-limit store (`OIW_RATE_LIMIT_STORE`,
  migration 0003), `DATABASE_POOL_MAX`, Dockerfile + compose `web` service,
  security headers.

## Merged tasks (37 PRs, numbers refer to the old private repo)

Wave 0: 000, 001(#3), 003(#2), 005(#1), 004a(#4)
Wave 1: 002(#5), 101(#7), 103(#6), 201(#8), 004b(#10), 107(#11), 105(#9)
Wave 2: 210(#14), 108(#13), 301(#12), 406(#16), 408(#18), 109, 110(#19),
  501(#15), 506(#20), 509(#21), 601(#22), 602(#23)
Wave 3: 701(#24), 703(#25), 702(#26), 705(#27), 706(#28)
Wave 4: 802(#29), 810(#30), 808(#31), 811(#32), 805(#33), 812
Wave 5: 901(#35), 905(#36), 904(#37)
Post-publication: 907 (this repo)

## Contracts

Frozen at **v1.5** (ADRs 001–012). Changes require a dedicated
contract-change task. Migrations: 0000 (schema), 0002 (analytics +
assessment tables, OIW-904).

## Tracked debt / accepted risks

- `accessibility.spec.ts` #main-content 5s wait times out under
  `--workers=2` repeats (single-worker + CI green) → raise wait/networkidle.
- Rate-limit store defaults to process-local memory (accepted for the
  single-instance demo, SECURITY.md §3.9); multi-instance deployments set
  `OIW_RATE_LIMIT_STORE=postgres` (shared atomic store, migration 0003).
- PDF fixtures are text-with-page-markers; binary PDF parsing deferred
  (A7) — README states this honestly.
- `apps/web/src/lib/server/metrics.ts` remains the single UI↔metric seam.
- Email/webhook assessment sinks are interfaces only (owner decision).
- Next 16 + postgres.js: aborted in-flight renders (navigating away mid-
  mutation) log "destination stream closed early" and can stall DB-backed
  renders temporarily on `next start`; identical pre- and post-OIW-907,
  CI e2e unaffected — investigate with a minimal repro if ever seen in
  real use.

## Operating rules (keep applying)

- **Public repo.** Everything pushed — commits, branches, PR bodies — is
  public. Synthetic data only; no absolute local paths, machine or account
  nicknames in committed docs.
- **Identity.** Commit only as `149814333+shekibahmed@users.noreply.github.com`
  (set locally and globally). GitHub blocks pushes exposing the personal
  address.
- **`main` is protected.** No force-push or deletion; changes land via PR
  with `quality` and `e2e` passing — this now includes lead-thread docs
  commits.
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
  — **public** since 2026-09-08. History rewritten with
  `git filter-repo --mailmap` (trees, messages, dates identical; all SHAs
  changed). Pre-2026-09-08 SHAs, `agent/*` branch names, `../oiw-*`
  worktree paths and `refs/t3/checkpoints/*` are all invalid.
- Old repo: `shekibahmed/operations-intelligence-workbench-old-private`
  (private) — holds the 38 `agent/*` branches and the 37 PRs referenced by
  `(#N)` in commit messages.
- Worktrees: none. Recreate per task from the new `main` as
  `../oiw-<name>` on `agent/<harness>/<id>-<slug>`.
- Accounts: primary Claude (lead) + a second Claude Max account for
  workers (`CLAUDE_CONFIG_DIR` pointed at its own config dir); Codex via
  ChatGPT subscription. OpenCode unusable with Claude Max.
