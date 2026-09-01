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
semantic drift); asset-reliability byte-untouched throughout. Remaining
for the tours request: OIW-702 (running, m900x) — click-through tours for
process-exceptions + document-assurance with per-pack Playwright journeys.
M2 formal exit review after OIW-702 merges (pack authoring guide +
scaffold template remain as M2 tail items).

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

- Review-queue tablet collapsible drawer (UX_SPEC §5.6) → Wave 4 responsive
  pass.
- `apps/web/src/lib/server/metrics.ts` remains the single UI↔metric-service
  seam (by design); presentation extras (sample records, hrefs) derived in
  the adapter — consider promoting into the service at Wave 3/4 if packs
  two/three dashboards need the same.
- PDF fixtures are text-with-page-markers; real PDF binary parsing deferred
  (A7) — revisit before public launch claims FR-013 fully.
- `pnpm eval` remains a stub; evaluation runner (core track per A8) is
  Wave 4 scope with gold sets already in packs.

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
  sequential work, no detached sub-agents.
- `codex exec` launches: always `</dev/null`.
- Lockfile: single owner per batch or integrator-reconciled at merge with a
  frozen-install verification.
- Parallel lanes touching shared pack data: the lead runs the full suite on
  the MERGED tree before any merge (caught the OIW-601×602 conflict).
- BLOCKED protocol works: five blocked cycles all resolved via bounded
  upstream tasks (OIW-107/108/109/110 + 602-remediation), zero boundary
  bypasses.

## Commands currently expected to pass

`pnpm install/lint/typecheck/test/build/validate:packs/architecture:check`,
`pnpm db:migrate`, `pnpm demo:seed --pack asset-reliability` (25 artifacts,
35 entities), `pnpm demo:reset`, `(cd apps/web && pnpm test:e2e)` — 7 specs
incl. north-star. CI runs all of it per PR.

## Repository notes

- Remote: `https://github.com/shekibahmed/operations-intelligence-workbench`
  (private until M3). Branch protection by convention until public.
- Worktrees: `../oiw-core`, `../oiw-ux`, `../oiw-packs`, `../oiw-quality`
  (all clean, on stale task branches — re-point per task at next wave).
- Accounts: primary Claude (`~/.claude`, lead) + m900x
  (`~/.claude-m900x`, workers via CLAUDE_CONFIG_DIR); Codex via ChatGPT sub.
