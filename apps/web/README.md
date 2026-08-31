# `@oiw/web`

The application shell: navigation, lens switcher, guest session lifecycle,
and every P0 route from `docs/UX_SPEC.md` §1.1. As of OIW-210, guest
sessions, workspace creation/seeding/reset and the artifact inbox and
technical artifact inspector are wired to real persisted data
(`@oiw/persistence` + `@oiw/application` + `@oiw/scenario-sdk`). Review
queue, cases, entities, decisions, rule trace, audit's supporting narrative
and about-pack's rules/metrics section have no upstream engine yet (OIW-301
processing) and remain on in-repo stub data — those screens carry a visible
"Demo preview" notice.

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

## What's real vs. stub-marked

| Screen | Data |
| --- | --- |
| Guest session, workspace create/seed/reset | Real (`@oiw/application` + `@oiw/persistence`) |
| Inbox | Real artifacts/sources; linked-entity/observation/review-required/related-case columns are genuinely empty (no processing engine yet — OIW-301), not fabricated |
| Technical artifact inspector | Real raw content, metadata, checksum, segments; proposed-observations/entity-resolution sections show "not yet run" rather than stub data |
| Overview | Real artifact/source counts, real (zero) case/decision counts, real audit-derived activity feed; severity breakdown, SLA table, trend line and pattern/impact cards remain stub-marked (no signal/case engine yet) |
| Pack labels (top bar, breadcrumbs, nav, About this pack's entity/event/workflow sections) | Real, from the loaded pack's registry entry |
| Audit | Real audit entries (`workspace-seeded`/`workspace-reset` etc.) |
| Review queue, Cases, Case detail, Entities, Entity detail, Decisions, Rule trace, About this pack's rules/metrics/dashboard sections | Stub (`src/lib/stub/`), visibly marked "Demo preview" |

`?state=empty|loading|error` remains supported on the stub-marked screens
only, to demonstrate those states without a live backend (unchanged from
Wave 1). The real-data screens (Overview, Inbox, Technical artifact
inspector, Audit) get real loading state via Next's `loading.tsx` file
convention (automatic Suspense around the page while the DB fetch is in
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
