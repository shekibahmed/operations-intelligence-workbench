# OIW-808: Accessibility and Responsive Audit

Status: complete. Criteria source: `docs/quality/ACCESSIBILITY.md`. Scope:
every P0 route (`docs/UX_SPEC.md`) across all three demonstration packs
(Asset Reliability, Process Exception Management, Document Assurance),
plus the pack-agnostic landing/`/demo`/`/adapt` routes.

## 1. Automated axe scan — coverage and baseline

`apps/web/e2e/accessibility.spec.ts` (new, `@axe-core/playwright`) walks the
same guided-tour path already proven by the pack tour specs to reach each
screen's real, populated state (seeded Postgres data, not empty fixtures —
a11y defects concentrate in populated tables, badges and dialogs) and runs
an axe-core scan at each stop. It fails the build on any `serious`/
`critical` impact violation; `moderate`/`minor` findings are collected into
a baseline instead of failing CI, since a portion of those are false
positives axe cannot resolve without visual judgement.

Routes scanned (58 scan points total, ×3 packs where marked):

- `/` (landing), `/demo` (scenario selector), `/adapt`
- `/demo/{pack}` (guided start) ×3
- `{workspace}/inbox` (tour active) ×3
- `{workspace}/review` — populated, desktop; populated, tablet (drawer
  closed); populated, tablet (drawer open) ×3
- `{workspace}/technical/rules/{ruleId}` ×3
- `{workspace}/cases` (populated) ×3
- `{workspace}/cases/[caseId]` ×3
- `{workspace}/entities` ×3
- `{workspace}/entities/[entityId]` ×3
- `{workspace}/technical/artifacts/[id]` ×3
- `{workspace}/decisions` — pending, tour active; Approve confirmation
  dialog open ×3
- `{workspace}/overview` — leadership, operations, technical lenses ×3
- `{workspace}/audit` (populated) ×3
- `{workspace}/about-pack` ×3

**Baseline result (this run, `pnpm exec playwright test
e2e/accessibility.spec.ts --workers=1`): zero `serious`/`critical`
violations and zero `moderate`/`minor` violations across all 58 scan
points.**

One `moderate` finding (`page-has-heading-one` — `/demo` scenario selector
had no `<h1>`, only per-card `<h2>`s) surfaced on the first re-run this
session and was fixed immediately (`apps/web/src/app/demo/page.tsx` — added
`<h1>Choose a scenario</h1>`, matching the `<h1>` pattern already used by
every other top-level page including its sibling `/demo/[pack]`). A
re-scan after the fix confirms the baseline is clean. There are **no
justified deferrals** — the axe baseline is empty and every
manually-identified defect (below) received a code fix, not a documented
exception.

Known test-infra caveat, not a product defect: running the full
`accessibility.spec.ts` file under Playwright's default parallelism (4
workers on this machine) occasionally times out unrelated `toBeVisible()`
assertions later in the same test (e.g. the Entities page heading) under
CPU contention from four concurrent axe-core analyses plus four `next
start` page loads. Serialized (`--workers=1`) the suite is reliably green
(confirmed 3 consecutive runs this session). This is resource contention
on a single dev machine, not a flaky assertion or a real a11y regression —
axe-core's DOM analysis is CPU-heavy and the spec's assertions use the
framework default 5s timeout. `e2e` is not currently wired into
`.github/workflows/ci.yml` (only `lint`/`typecheck`/`test`/`build`/`eval`/
`architecture:check` run there), so this doesn't affect the CI gate today;
flagged here as a known limitation for whoever wires it in.

## 2. Findings table

Severity follows axe-core impact levels where an automated rule applies;
otherwise it reflects the criterion's practical effect per
`docs/quality/ACCESSIBILITY.md` (manual-review-only criteria, as that
document itself specifies).

| # | Criterion (ACCESSIBILITY.md) | Defect | Severity | Where | Fix |
|---|---|---|---|---|---|
| 1 | §1/§5 — valid interactive markup | `<button>` wrapping an `<a>` (nested interactive elements — invalid markup, ambiguous activation for assistive tech) | Serious | `Button` used as a link wrapper: landing CTAs, `/demo` "Start with…" cards, `AdaptCta`, `ErrorState` Retry | Converted to a single real element per control: `Link`/`<a>` styled with the extracted `BUTTON_BASE_CLASSES`/`VARIANT_CLASSES`, or a real `<button onClick>` that navigates. `apps/web/src/components/ui/Button.tsx`, `apps/web/src/app/demo/page.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/components/shell/AdaptCta.tsx`, `apps/web/src/components/ui/ErrorState.tsx` |
| 2 | §4 — heading hierarchy | Widgets and `DecisionCard` used `<h3>` directly under a page `<h1>` with no intervening `<h2>` (heading-order skip) | Moderate | `DecisionCard`, `ActivityFeed`, `ListCard`, `SeverityBreakdown`, `SlaTable`, `StatCard`, `TextImpactCard`, `TrendLine` | Promoted to `<h2>` (these are the top-level sections of their pages) |
| 3 | §4 — heading hierarchy | `/demo` scenario selector had no `<h1>` at all (`page-has-heading-one`) | Moderate | `apps/web/src/app/demo/page.tsx` | Added `<h1>Choose a scenario</h1>`, found and fixed during this session's baseline re-capture |
| 4 | §3 — state not colour-only | Inline links styled `hover:underline` — resting state (the vast majority of a link's visible lifetime) was colour-only against body text, no underline until hover | Moderate–serious (WCAG 1.4.1 use of colour) | All inline text links across widgets, `Breadcrumbs`, `DecisionCard`, case/entity detail pages, overview, technical artifact/rule pages | Changed to a standing `underline` (kept badge/pill-style links, which have a border, as-is) |
| 5 | §2 — accessible names | Repeated row actions (Approve/Reject, "Accept this candidate", Retry/Process) had identical accessible names across every row in a list — indistinguishable out of visual context for a screen-reader user tabbing through | Serious | `DecisionCard` (Approve/Reject/Request more information), `ReviewQueuePanel` ("Accept this candidate"), `InboxTable` (Retry/Process) | Added `aria-label` naming the specific decision/candidate/artifact each control acts on |
| 6 | §5 / ARIA validity | `InspectorTabs`: each `Tabs.Trigger`'s `aria-controls` referenced a `Tabs.Content` id that didn't exist (the real "panel" is a full page navigation, not an in-place switch) — invalid ARIA reference | Serious (`aria-valid-attr-value`) | `apps/web/src/components/ui/InspectorTabs.tsx` | Added empty, `hidden`, `forceMount`ed `Tabs.Content` elements for both tab values so the id pairing is valid |
| 7 | §1 — keyboard reachability | `CopyableJson`'s scrollable `<pre>` (`overflow-auto`, taller than its content) had no way to receive keyboard focus, so keyboard users couldn't scroll it (`scrollable-region-focusable`) | Moderate | `apps/web/src/components/ui/CopyableJson.tsx` | Added `tabIndex={0}` |
| 8 | §6 (adjacent) — reduced motion | Only the tour overlay respected `prefers-reduced-motion`; the skeleton pulse and button/nav hover transitions did not | Moderate (WCAG 2.3.3, applies as a standing user preference, not per-component) | `apps/web/src/app/globals.css` | Added a global `@media (prefers-reduced-motion: reduce)` rule collapsing all animation/transition durations to near-zero |
| 9 | §3 — state not colour-only | Audit explorer's highlighted (linked-from) entry was distinguished only by an accent-coloured border | Moderate | `apps/web/src/app/w/[workspace]/audit/page.tsx` | Added `aria-current="true"` and a visible "Linked entry" text label |
| 10 | §6 — responsive/lens behaviour | Review queue's item list was a fixed left rail at all widths below the desktop three-column grid — no tablet-width affordance (tracked debt, UX_SPEC §5.6) | Serious (tablet usability, PRD §16.3 P0 device scope) | `apps/web/src/app/w/[workspace]/review/ReviewQueuePanel.tsx`, `.../review/loading.tsx` | Implemented the collapsible queue drawer: a `Queue (N items)` toggle button (`aria-expanded`/`aria-controls`) below `xl` width; `xl:contents` keeps the desktop three-column grid unchanged at `xl:` and above |
| 11 | §6 — responsive reflow | `/demo` and landing page card grids used `md:grid-cols-3` (three columns from 768px), cramping cards at tablet width (768–1024px, in-scope per PRD §16.3) | Moderate | `apps/web/src/app/demo/page.tsx` | Changed breakpoint to `xl:grid-cols-3` (1280px) — single-column stacking through the full tablet range, three columns only at desktop-and-up. Intentional, documented responsive-behaviour change, not a defect fix |
| 12 | FR4 (states pass) — no stub-marked remnants | `/w/[workspace]/about-pack` rendered hardcoded stub rule-trace/metric data and a fixed 3-widget list regardless of the active pack's real content, plus a leftover `DemoPreviewNotice` banner | N/A (correctness/states, not a11y severity) | `apps/web/src/app/w/[workspace]/about-pack/page.tsx`, deleted `apps/web/src/components/shell/DemoPreviewNotice.tsx`, `apps/web/src/lib/stub/metrics.ts` | Replaced with real `findPackEntry`-derived rules/metric definitions/dashboard widget types, each with a correct empty state when the pack defines none |

Sixteen distinct fix sites in total across the twelve defect classes above
(counted at the level of "one production file changed for one reason"):
`Button.tsx`, `demo/page.tsx` (×2 reasons: heading + grid breakpoint),
`page.tsx`, `AdaptCta.tsx`, `ErrorState.tsx`, `DecisionCard.tsx`,
`ActivityFeed.tsx`, `ListCard.tsx`, `SeverityBreakdown.tsx`, `SlaTable.tsx`,
`StatCard.tsx`, `TextImpactCard.tsx`, `TrendLine.tsx`,
`InspectorTabs.tsx`, `CopyableJson.tsx`, `globals.css`, `audit/page.tsx`,
`ReviewQueuePanel.tsx`, `about-pack/page.tsx`.

## 3. Manual criteria pass (ACCESSIBILITY.md §1, §5, §6 — not fully
   automatable per that document)

- **Keyboard-only tour completion, all three packs.** `e2e/north-star.spec.ts`,
  `e2e/document-assurance-tour.spec.ts`, `e2e/process-exceptions-tour.spec.ts`
  each drive the tour's "Next" control by keyboard focus + `Enter`
  (`tourNext(page, { keyboard: true })`) rather than click, at multiple
  points per journey, through to the final approval-gated Decision. All
  three pass.
- **Dialog focus management.** `ConfirmDialog` is built on Radix `Dialog`,
  which owns focus-trap-on-open and focus-return-on-close; verified live
  via the axe scan's decisions-dialog stop (`decisions (Approve
  confirmation dialog open)`) and the existing north-star journey's
  approve-with-comment step.
- **Tablet drawer, keyboard and axe.** `accessibility.spec.ts` scans the
  review queue at tablet width both with the drawer closed and, when the
  toggle is visible, with it open — both clean.
- **Reduced motion.** Global CSS rule (finding #8) rather than a
  per-component opt-in, so it necessarily covers the tour overlay along
  with every other transition/animation in the app.

## 4. Responsive pass

Tablet (768–1024px, verified at 800×1000) and desktop (≥1280px) widths
checked for every P0 route via the axe scan's viewport switches and the
pre-existing tour specs' tablet screenshots
(`apps/web/e2e/screenshots/*-tablet.png`). The queue-drawer collapse
(finding #10) was the one structural tablet defect found; everything else
already reflowed correctly. The `/demo` grid breakpoint change (finding
#11) is the one intentional, non-defect responsive behaviour change in
this batch — documented here per the task packet's explicit callout.

## 5. Before/after screenshots

`apps/web/e2e/screenshots/*.png` are regenerated on every e2e run by
`smoke.spec.ts`'s "screenshots of changed screens" test and committed as
documentation, not compared against a stored baseline. The pre-fix
versions are on this branch's parent commit
(`a17ed452e026c36dc075fd2dd6e81f02a21f6c69`); the post-fix versions are
this PR's commits. Most visibly changed: the review-queue tablet
screenshots (drawer) and the leadership-overview tablet/desktop
screenshots (link underline, heading-level changes). See the PR
description for inline before/after comparisons.

## 6. Verification

`docker compose up -d && pnpm db:migrate && pnpm lint && pnpm typecheck &&
pnpm test && pnpm build` — all pass (209 package tests, 128 web tests).
`(cd apps/web && pnpm exec playwright test --workers=1)` — 13/13 e2e pass,
including the new `accessibility.spec.ts` (4 tests / 58 scan points, zero
violations at any severity).
