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

**WAVE 4 (Hardening) COMPLETE (2026-09-03).** Merged: OIW-802 #29 (eval
runner, 1.000 all dimensions + sabotage tests), OIW-810 #30 (rate limits,
input policy, expiry sweep, adversarial HTTP tests), OIW-808 #31 (axe in
CI-spec, 16 a11y fixes, tablet drawer, keyboard tours), OIW-811 #32
(exports FR-110 w/ formula neutralisation), OIW-805 #33 (injection matrix
across formats × payloads × packs), OIW-812 (threat-model sign-off: all
17 SECURITY.md rows closed/accepted with evidence; DEPLOYMENT.md runbook;
approval-concurrency test; trusted-proxy policy; credential-scan breadth).
Suite: 375+ tests, 22 e2e specs, eval 1.000.

**WAVE 5 (Public Launch / M3) — NEXT.** First task (no owner input
needed): OIW-901 — add a Playwright e2e job to CI (Postgres service +
seed) and fix the security.spec 'tampered cookie' sub-step flake. Then
deployment tasks GATED ON OWNER DECISIONS: (1) Vercel project + Supabase
project (owner-created, or provision via Supabase MCP on request) and
repo flip to public at launch; (2) CTA submission destination (email /
Supabase table / form service). Remaining Wave 5 scope per PRD §26:
analytics events + CTA (FR-120/121), README + architecture diagram +
walkthroughs, launch content, branch protection once public.

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

- e2e: `security.spec.ts` "tampered cookie" sub-step is flaky (passes
  on rerun; same build) → determinism fix in OIW-901.
- CI has no Playwright job — e2e enforced only by lead/agent local runs
  → OIW-901.
- Accepted risk (SECURITY.md): rate-limit store is process-local; Wave 5
  deployment notes cover multi-instance implications.

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
