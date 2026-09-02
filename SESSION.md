# SESSION — Project State

> Edited only by the lead orchestration thread. Any capable agent reading
> `AGENTS.md` → this file → the open task files can resume the project cold.

## Current milestone

**M1 COMPLETE (2026-09-01): the full Asset Reliability vertical slice.**
Exit criterion (PRD §26 Wave 2) met and continuously enforced: the
north-star Playwright spec (`apps/web/e2e/north-star.spec.ts`) walks the
complete PRD §13 visitor journey — scenario selection → seeded workspace →
artifact processing → evidence-backed review → entity/event/rules/signal →
critical case → hold-from-service decision → human approval → real
dashboards → audit trail — with real state assertions, green in CI.

**M2 NEUTRALITY PROOF MERGED (PR #24 + #25).** Common lifecycle test
11/11 across all three packs, wired into pnpm test/CI; one real engine gap
found+fixed (assembler now honours ADR-010 value discriminators, OIW-703
PR #25); pack-data fixes adversarially reviewed against narrative (zero
semantic drift); asset-reliability byte-untouched throughout.
OIW-702 MERGED (PR #26): all three packs now have full click-through
guided tours, each with its own Playwright journey (9 e2e specs total) —
product-owner tours request delivered. M2 tail items remaining: pack
authoring guide + scaffold template (PRD Wave 3 deliverables) — cut on
owner request or fold into Wave 4 start.

**WAVE 4 (Hardening) IN PROGRESS — resumed 2026-09-02.** OIW-802 merged
(PR #29): `pnpm eval` is real — 1.000 on all ten §21.3 dimensions across
three packs, per-dimension sabotage tests, eval step in CI. Wave 4 batch A:
OIW-810 MERGED (security gates closed with test evidence; security-
reviewer PASS). OIW-808 (accessibility + responsive audit; Claude m900x, ../oiw-ux —
implementation done+lead-verified, remediation run in progress to write
audit doc/handoff and open the PR after the first session ended its turn
with a detached scan). Batch B RUNNING (launched early — no path overlap with 808's
remediation): OIW-811 (exports FR-110; Codex, ../oiw-core) ∥ OIW-805
(product-level prompt-injection test set; Claude m900x, ../oiw-quality).
OIW-808 remediation still running in ../oiw-ux.
Then Wave 5 (deployment + public launch) — needs owner decisions on
Vercel/Supabase projects and CTA destination (see PLAN_AMENDMENTS A9).

## Merged tasks (chronological; 23 PRs total, all lead-verified)

Wave 0: OIW-000, 001(#3), 003(#2), 005(#1), 004a(#4)
Wave 1: OIW-002(#5, contracts v1.1), 101(#7), 103(#6), 201(#8), 004b(#10),
  107(#11), 105(#9)
Wave 2 / M1: OIW-210(#14), 108(#13, v1.2), 301(#12), 406(#16), 408(#18),
  109(v1.3 + seed entities), 110(#19, ambiguity validator), 501(#15, 9/9
  gold parity), 506(#20, engines; contracts v1.4), 509(#21), 601(#22,
  metrics v1.5), 602(#23, dashboards + tour + north-star e2e)

## Contracts

Frozen at **v1.5**: canonical domain (v1.0) + negated/candidates/conflicting
(v1.1) + ObservationSchemaDefinition (v1.2) + EventDefinition/SeedEntity
(v1.3) + CaseDefinition (v1.4) + MetricDefinition (v1.5). ADRs 001–012.
Changes require a dedicated contract-change task.

## Tracked debt / deltas

- Security (non-blocking, from OIW-810 review): (a) IP extraction trusts
  x-forwarded-for on non-Vercel hosts — document as a deployment
  requirement (trusted-proxy config) in Wave 5; (b) credential scan covers
  common key shapes only — keep manual review in release checklist;
  (c) concurrent approvals on one Decision are safe-closed by status
  check but untested under true concurrency — add a concurrency test in
  a later hardening pass.

- `apps/web/src/lib/server/metrics.ts` remains the single UI↔metric-service
  seam (by design); presentation extras (sample records, hrefs) derived in
  the adapter — consider promoting into the service at Wave 3/4 if packs
  two/three dashboards need the same.
- PDF fixtures are text-with-page-markers; real PDF binary parsing deferred
  (A7) — revisit before public launch claims FR-013 fully.

## Next integration sequence (AFTER owner check-in)

1. Wave 3 / M2: run the same lifecycle on process-exceptions +
   document-assurance — expect mostly pack-content tasks (their gold sets,
   expected extractions and event definitions are shipped but never
   exercised end-to-end; the ambiguity validator already passes them);
   common lifecycle contract test against every pack (PRD §10.4); pack
   authoring guide + scaffold template.
2. Wave 4: evaluation runner + full eval suite, prompt-injection/approval-
   bypass/workspace-isolation test hardening, accessibility + responsive
   review, rate limiting, error states, threat-model remediation, exports.
3. Wave 5: Vercel + hosted Supabase deployment, analytics + CTA, README/
   walkthroughs, public launch (repo flips public; enable branch protection).

## Operating rules learned (keep applying)

- Headless Claude launches: `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`,
  sequential work, no detached sub-agents — AND the agent must not end its
  turn with detached work (OIW-004b and OIW-808 both lost their finish
  this way; rule now codified in AGENTS.md Completion Protocol).
- `codex exec` launches: always `</dev/null`.
- Lockfile: single owner per batch or integrator-reconciled at merge with a
  frozen-install verification.
- Resource rule: at most two agents running Playwright/build concurrently
  on this machine — a third plus a lead build OOM-killed a Next build
  worker (SIGKILL) during OIW-808 verification.
- Parallel lanes touching shared pack data: the lead runs the full suite on
  the MERGED tree before any merge (caught the OIW-601×602 conflict).
- BLOCKED protocol works: five blocked cycles all resolved via bounded
  upstream tasks (OIW-107/108/109/110 + 602-remediation), zero boundary
  bypasses.

## Commands currently expected to pass

`pnpm install/lint/typecheck/test/build/validate:packs/architecture:check`,
`pnpm db:migrate`, `pnpm demo:seed --pack asset-reliability` (25 artifacts,
35 entities), `pnpm demo:reset`, `pnpm eval` (1.000 all dimensions), `(cd apps/web &&
pnpm test:e2e)` — 9 specs incl. north-star + per-pack tours. CI runs all
of it per PR.

## Repository notes

- Remote: `https://github.com/shekibahmed/operations-intelligence-workbench`
  (private until M3). Branch protection by convention until public.
- Worktrees: `../oiw-core`, `../oiw-ux`, `../oiw-packs`, `../oiw-quality`
  (all clean, on stale task branches — re-point per task at next wave).
- Accounts: primary Claude (`~/.claude`, lead) + m900x
  (`~/.claude-m900x`, workers via CLAUDE_CONFIG_DIR); Codex via ChatGPT sub.
