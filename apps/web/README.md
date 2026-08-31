# `@oiw/web`

The application shell: navigation, lens switcher, and every P0 route from
`docs/UX_SPEC.md` §1.1, rendered against static in-repo stub data. No live
backend yet (Wave 2 non-goal) — every `/w/[workspace]/*` route renders the
same fixture workspace regardless of the `workspace` URL segment's value.

## Dev commands

Run from the repository root (they delegate to this package):

```bash
pnpm install        # once, from the repo root
pnpm dev             # next dev
pnpm --filter @oiw/web run build   # next build (also runs via root `pnpm build`)
pnpm --filter @oiw/web run test    # vitest (component/unit tests)
pnpm --filter @oiw/web run test:e2e  # Playwright: route smoke tests + screenshots
```

`pnpm lint`, `pnpm typecheck` and `pnpm test` at the repo root already include
this package.

## Stub data

`src/lib/stub/` contains a small, internally consistent Asset Reliability
fixture (one workspace, a handful of artifacts/observations/events/entities/
cases/decisions/audit entries) typed against `@oiw/contracts` where the shape
matches a frozen contract, and local types where it doesn't (pack labels,
review-queue alternative candidates, rule-execution traces — none of these
are contracts yet; see the docstrings in `src/lib/pack-labels.ts`,
`src/lib/stub/observations.ts` and `src/lib/stub/rule-trace.ts`).

Every `/w/[workspace]/*` page accepts a `?state=default|empty|loading|error`
query param to demonstrate the non-default states named in UX_SPEC §5,
since there is no live backend yet to produce them from real request
failures.

## Lens

`?lens=leadership|operations|technical` is resolved server-side
(`src/lib/resolve-lens.ts`): if missing or invalid, the request redirects to
the route's default lens (UX_SPEC §1.3), except Decision Centre, which falls
back to the `oiw-last-lens` cookie (kept current by
`src/components/shell/LensCookieSync.tsx`) and then `leadership`.
