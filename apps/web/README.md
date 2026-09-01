# `@oiw/web`

The application shell: navigation, lens switcher, guest session lifecycle,
and every P0 route from `docs/UX_SPEC.md` §1.1. As of OIW-210, guest
sessions, workspace creation/seeding/reset and the artifact inbox and
technical artifact inspector are wired to real persisted data
(`@oiw/persistence` + `@oiw/application` + `@oiw/scenario-sdk`). As of
OIW-406, the Inbox's Process action, the Review Queue and the Technical
Inspector's extraction sections are wired to the real `processArtifact`
orchestration (`@oiw/application` + `@oiw/ingestion` + `@oiw/intelligence`,
OIW-301) and the real accept/correct/reject/mark-insufficient-evidence
review write path.

As of OIW-509, every remaining P0 screen this task owns is wired to real
data: Cases, Entities, Decisions and the Technical rule-trace inspector all
read the real `@oiw/persistence` repositories, and the Inbox/Review actions
now also call `@oiw/application`'s `ArtifactAdvancementService` (OIW-501) —
entity resolution, Event assembly and fact-catalogue rule evaluation — so
processing an artifact (or resolving its last pending review item) produces
real Events, Signals and rule-evaluation Audit Entries, visible immediately
in Entity Detail's timeline and the Rule trace screen. `create-case`,
`create-action` and `propose-decision` remain persisted
`rule-action-pending` Audit Entries rather than real Cases/Decisions — no
executor exists for them yet (batch-C case/decision engine, OIW-506) — so
Case List and Decision Centre correctly render their real *empty* state
against the seeded packs today; this is a marked integration point, not a
missing feature, and the lead reconciles it once OIW-506 merges. Decision
Centre's Approve/Reject/Request-more-information write a real, audited
Approval directly against `@oiw/persistence` (no application-layer service
needed, same pattern as the Review Queue's write path) for whatever
Decisions do exist. About-pack's rules/metrics/dashboard sections remain on
in-repo stub data (out of this task's scope) and keep a visible
"Demo preview" notice.

OIW-506 (case/action/decision engines) has since merged, so the
"usually-empty" caveat above no longer applies: processing the demo fixture
set's related artifacts produces real Cases, Action items and Decisions, and
Case List/Decision Centre show them.

**OIW-602 — dashboard wiring and guided tour.** `src/lib/server/metrics.ts`
is a clearly marked ADAPTER MODULE: OIW-601 (the real metric evaluation
service in `@oiw/application`) had not merged at this branch's cut, so this
file re-implements the same A5 closed aggregation vocabulary
(`count-records`/`count-by-field`/`average-duration`/`time-series-count`/
`due-date-risk`/`recent-activity`/`ratio`) directly against
`@oiw/persistence` repositories, reading each pack's real
`dashboards/metrics.json`. `src/components/widgets/DashboardGrid.tsx`
generically renders any pack's `dashboards/{leadership,operations,technical}.json`
against the evaluated values — no widget type or pack ID is hard-coded. The
Leadership/Operations/Technical Overview dashboards (`/w/[workspace]/overview`)
now render real values for whichever lens is active; when OIW-601 merges,
the lead swaps `evaluateMetrics`'s implementation for a call into the real
service — every caller only depends on the exported `MetricValue`/
`evaluateMetrics` shape.

The guided tour (`src/lib/tour/steps.ts` + `src/components/tour/TourOverlay.tsx`,
mounted in `WorkspaceShell`) is a lightweight, dependency-free overlay
(UX_SPEC §4). Amendment A7/L1-L2 originally scoped it to Asset Reliability
only; OIW-702 (product-owner request, 2026-09-01) supersedes that and gives
Process Exception Management and Document Assurance their own full tours
through the same overlay — `TOUR_STEPS_BY_PACK` (`steps.ts`) is the only
per-pack switch, there is no second mechanism. Each pack's typed step list
(target element, title, body, action hint, how to advance, and which real
fixture artifacts to process for real before advancing) spotlights a real
`data-tour="..."` element already present on the real screen — every one of
those elements lives in a generic, pack-neutral component (Inbox, Review
Queue, Rule trace, Cases, Case Detail, Decisions, Overview, Audit, the
shell's Adapt CTA), so no second implementation was needed per pack.
`sessionStorage` carries progress across the full-page navigations between
steps (a hard reload intentionally exits the tour, per UX_SPEC §4), and
pathname-based reconciliation lets it resume correctly even when a visitor
navigates by clicking a real product link (e.g. into a Case Detail whose ID
isn't known ahead of time) instead of the tour's own Next button.

## Local run

```bash
pnpm install                                    # once, from the repo root
docker compose up -d                            # local Postgres (repo root docker-compose.yml)
pnpm db:migrate                                  # apply Drizzle migrations
pnpm demo:seed --pack asset-reliability          # optional: seed a workspace via CLI for manual testing
pnpm dev                                          # next dev (delegates to this package)
```

Then visit `/demo` → Asset Reliability → Start guided tour / Explore
freely. That action creates and seeds a real guest workspace and sets the
session cookie; it does not require the CLI seed step above (that's only
useful for `pnpm demo:reset`-style manual testing against a known slug).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No (defaults to `postgresql://postgres:postgres@localhost:5432/oiw`) | Postgres connection string, per `packages/persistence/README.md`. |
| `SESSION_SECRET` | Yes in production (`NODE_ENV=production`, i.e. `next build`/`next start`) | HMAC secret (≥32 bytes) for the ADR-007 guest session cookie (`src/lib/server/session.ts`). In `next dev`, a process-local random secret is generated automatically if unset — guest sessions never need to survive a dev-server restart. |
| `SESSION_SECRET_PREVIOUS` | No | Optional previous secret accepted during rotation, alongside `SESSION_SECRET`. |
| `SCENARIO_PACKS_DIR` | No (defaults to `<repo-root>/scenario-packs`, derived from `process.cwd()`) | Override for the pack-registry directory (`src/lib/server/pack-registry.ts`). |

## Guest sessions and workspace scoping (ADR-007 / PLAN_AMENDMENTS A4)

- `src/lib/server/session.ts` issues/reads the signed, `httpOnly`, `Secure`,
  `SameSite=Lax` `oiw_session` cookie via `@oiw/application`'s
  `issueSessionToken`/`verifySessionToken`.
- `src/lib/server/workspace.ts`'s `requireWorkspace(slug)` is the guard:
  every `/w/[workspace]/*` request (enforced centrally in
  `src/app/w/[workspace]/layout.tsx`, so it applies uniformly even to
  stub-marked screens) verifies the session cookie resolves to a workspace
  whose ID and slug match the requested URL and which has not expired,
  else redirects to `/demo`. A cookie bound to one workspace can never
  read another workspace's URL.
- `src/lib/server/db.ts` holds one process-local `@oiw/persistence`
  connection (`globalThis`-cached to survive `next dev` module reloads).
- `src/lib/server/pack-registry.ts` loads the real Scenario Pack registry
  (`@oiw/scenario-sdk`) and maps a workspace's active pack's `labels.json`
  + manifest into the `PackLabels` shape every screen renders from — no
  screen hard-codes pack labels.

## Server Actions

- `src/app/demo/[pack]/actions.ts` — `startGuestWorkspace`: creates +
  seeds a workspace via `WorkspaceService`/`SeedService`, sets the session
  cookie, redirects per UX_SPEC §2.3 entry intent. Deletes the partial
  workspace if seeding fails (no orphaned rows on retry).
- `src/app/w/[workspace]/actions.ts` — `resetWorkspace`: re-validates the
  session, then calls `ResetService.reset` (workspace menu's "Reset demo",
  behind a confirm dialog per UX_SPEC).
- `src/app/w/[workspace]/inbox/actions.ts` — `processArtifactAction`:
  re-validates the session, then runs `ArtifactProcessingService.processArtifact`
  (`src/lib/server/artifact-processing.ts` wires `@oiw/persistence` repositories,
  `@oiw/ingestion`'s `FormatAdapterRegistry` and `@oiw/intelligence`'s
  `FixtureIntelligenceProvider`/`StructuredOutputValidator`/
  `ConfidenceAbstentionPolicy` against the workspace's active pack). Returns a
  typed `{ ok, ... }` result instead of throwing, so a processing failure
  renders the Inbox row's real failed state with Retry (NFR §16.1) rather than
  a generic server-action error.
- `src/app/w/[workspace]/review/actions.ts` — `acceptObservation`,
  `correctObservation`, `rejectObservation`, `markInsufficientEvidence`,
  `getObservationRevisions`: re-validate the session, record the ADR-007 guest
  session ID as the human reviewer, and write through
  `ObservationRepository.correct` — which already implements ADR-006 (revision
  snapshot + downstream Event/Case re-evaluation marking) in one transaction.
  Once an artifact's last pending/conflicting Observation is resolved, these
  also flip its `processingStatus` back from `needs-review` to `processed` (no
  other public API recomputes this after processing finishes). The same file
  adds `linkEntityAction`, `createEntityAction`, `addReviewerNote` and
  `getObservationNotes` (OIW-408, UX_SPEC §5.6's remaining three Review Queue
  actions): Link/Create entity set an Observation's `entityId` through the
  same `ObservationRepository.correct` path but — unlike Accept/Correct/
  Reject/Mark insufficient evidence — never touch `reviewStatus`, so linking
  does not resolve the item or remove it from the queue; Create entity also
  inserts a new workspace-scoped `Entity` (typed from the pack manifest's
  `entityTypes`) and audits the creation and the link as two entries. Add
  reviewer note writes a plain Audit Entry (`observation-note-added`,
  `subject: { type: "observation", id }`) with the note text as `cause` — it
  does not mutate the Observation, so the Audit Explorer (an unfiltered,
  already-generic audit list) and a per-observation notes fetch both show it
  with no other code changes needed.
- `src/lib/server/artifact-advancement.ts` (OIW-509) —
  `advanceArtifactForWorkspace`/`tryAdvanceArtifact`: wires
  `@oiw/application`'s `ArtifactAdvancementService` (OIW-501) against the
  workspace's active pack and `@oiw/rules`' `RuleEngine`. The Inbox's
  `processArtifactAction` and every Review Queue action that resolves an
  Observation call `tryAdvanceArtifact` afterwards (best-effort — a failure
  here must not fail the Process/Review action itself, and re-running it is
  idempotent) so real Events, Signals and rule-evaluation Audit Entries
  exist as soon as a workspace's Observations are reviewed.
- `src/app/w/[workspace]/cases/[caseId]/actions.ts` (OIW-509) —
  `toggleActionItemAction`, `addCaseNoteAction`/`getCaseNotes`: real,
  audited Case Detail actions (UX_SPEC §5.8) against `@oiw/persistence`
  directly — completing/reopening an Action item and adding a free-text
  Case note, mirroring the Review Queue's note pattern.
- `src/app/w/[workspace]/decisions/actions.ts` (OIW-509) —
  `decideOnDecision`: Approve/Reject/Request-more-information (UX_SPEC
  §5.11). Re-validates the session, inserts a real Approval *before*
  updating the Decision's status (required — `@oiw/persistence`'s own
  trigger refuses an `approved` Decision without a matching Approval
  already present) and audits the outcome. Requires a non-empty comment for
  a high/critical-risk Decision server-side too, not only via the client's
  confirmation dialogue (PRD §22.4).
- `src/app/w/[workspace]/inbox/actions.ts` (OIW-602) — `processFixtureArtifacts`:
  the guided tour's one convenience action. Runs the exact same
  `processArtifactForWorkspace`/`tryAdvanceArtifact` path a manual Process
  click would use, for a small list of known fixture ids (matched via
  `lib/fixture-artifact.ts`'s stable `rawReference` suffix, not content
  sniffing), so the tour doesn't ask a visitor to hunt through a 25-row inbox
  five times to build the repeat-fault pattern the rest of the tour walks
  through. Idempotent — already-processed fixtures are skipped.

## What's real vs. stub-marked

| Screen | Data |
| --- | --- |
| Guest session, workspace create/seed/reset | Real (`@oiw/application` + `@oiw/persistence`) |
| Inbox | Real artifacts/sources/observation-counts; the Process action runs real extraction (OIW-301/OIW-406) and now also real entity resolution/Event assembly/rule evaluation (OIW-501/OIW-509). Linked-entity/related-case columns are genuinely empty (no case engine yet), not fabricated |
| Review queue | Real: lists Observations with `reviewStatus` pending/conflicting; evidence is highlighted from the real persisted `ArtifactSegment`; Accept/Correct/Reject/Mark insufficient evidence write real, audited, schema-validated corrections, and now also trigger real operational advancement (OIW-509). Link entity/Create entity/Add reviewer note (OIW-408) are also real: entities come from the real, workspace-scoped `EntityRepository`; a created entity and a linked Observation are both real persisted rows; notes are real, audited, append-only entries |
| Technical artifact inspector | Real raw content, metadata, checksum, segments, proposed observations (value, confidence, evidence, review status, extractor), a processing trace derived from the real audit trail, and (OIW-509) real entity-resolution outcomes — resolved Entity links and ambiguous/`conflicting` candidates, both real absence/presence, never fabricated |
| Technical rule trace (OIW-509) | Real: built from the workspace's persisted `rule-evaluated` Audit Entries (OIW-501) — fact evaluation, condition tree, outcome and linked audit entries are all derived from that one real record, not reconstructed or guessed. A rule id with no evaluation yet 404s (UX_SPEC §5.12: "a trace only exists for an executed rule") |
| Entities, Entity detail (OIW-509) | Real: seeded + resolved Entities, event history, related artifacts (via Observations), open/closed Cases, repeated-pattern Signals (a Signal referencing more than one of the Entity's Events) and related Entities (sharing an Event). An Entity with no Events yet honestly shows "No event history yet" |
| Cases, Case detail (OIW-509, engine merged OIW-506) | Real: `@oiw/persistence`'s `CaseRepository`/`DecisionRepository`/etc. are fully wired, and the rule engine's `create-case`/`create-action`/`propose-decision` actions execute for real (OIW-506's case/action/decision engine) — processing the demo fixture set's related artifacts produces real Cases, Action items and Decisions |
| Decisions (OIW-509, engine merged OIW-506) | Real: real proposed Decisions, real triggering-rule links (`lib/rule-trace.ts` correlates `create-case`/`create-action`/`propose-decision` to their own real Audit Entries). Approve/Reject/Request-more-information write a real Approval + Decision status change directly against `@oiw/persistence` |
| Overview (OIW-602) | Real: renders the active pack's own `dashboards/{leadership,operations,technical}.json` for whichever lens is active, via the generic `DashboardGrid` and the `lib/server/metrics.ts` adapter (see above) — all eight A5 widget types, real provenance badges, a real zero-state before any processing |
| Pack labels (top bar, breadcrumbs, nav, About this pack's entity/event/workflow sections) | Real, from the loaded pack's registry entry |
| Audit | Real audit entries (`workspace-seeded`/`workspace-reset`/`artifact-processing-*`/`observation-*`/`rule-evaluated`/`signal-created`/`case-created`/`action-item-created`/`decision-*` etc.) |
| About this pack's rules/metrics/dashboard sections | Stub (`src/lib/stub/`), visibly marked "Demo preview" — out of this task's scope |
| Guided tour (OIW-602, all three packs OIW-702) | Real: one tour per registered pack, spotlights real `data-tour` elements on real screens; never fabricates a value not reachable by the same route/state without the tour running |

`?state=empty|loading|error` remains supported on About this pack's
stub-marked sections only, to demonstrate those states without a live
backend (unchanged from Wave 1). The real-data screens (Overview, Inbox,
Review Queue, Cases, Entities, Decisions, Technical artifact inspector,
Technical rule trace, Audit) get real loading state via Next's `loading.tsx`
file convention (automatic Suspense around the page while the DB fetch is in
flight) and real error state via `error.tsx` route error boundaries; their
`?state=` support is limited to `error` (to demonstrate the error boundary
on demand).

## Lens

`?lens=leadership|operations|technical` is resolved server-side
(`src/lib/resolve-lens.ts`): if missing or invalid, the request redirects to
the route's default lens (UX_SPEC §1.3), except Decision Centre, which falls
back to the `oiw-last-lens` cookie (kept current by
`src/components/shell/LensCookieSync.tsx`) and then `leadership`.

## Dev commands

Run from the repository root (they delegate to this package):

```bash
pnpm install        # once, from the repo root
pnpm dev             # next dev
pnpm --filter @oiw/web run build   # next build (also runs via root `pnpm build`)
pnpm --filter @oiw/web run test    # vitest (component/unit tests)
pnpm --filter @oiw/web run test:e2e  # Playwright: journey + cross-workspace + screenshot tests, against local Postgres
```

`pnpm lint`, `pnpm typecheck` and `pnpm test` at the repo root already include
this package.
