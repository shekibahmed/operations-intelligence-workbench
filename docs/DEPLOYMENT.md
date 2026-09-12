# Public Demo Deployment

Status: Wave 4 deployment runbook for the P0 synthetic public demo. It does
not authorize client data, live operational connectors, authentication/SSO or
external write-back. Those require the client-deployment threat-model addendum
described in `docs/SECURITY.md` §6.

The supported target is Vercel plus a Supabase-hosted plain PostgreSQL
database. Supabase Auth, Storage and RLS are not used on the P0 critical path
(Plan Amendment A4).

## 1. Preconditions

- The release commit passes the command chain in §6 and the security launch
  checks in `docs/quality/RELEASE_CHECKLIST.md`.
- The deployment contains synthetic Scenario Pack data only.
- The operator has a Supabase project, a Vercel project linked to this GitHub
  repository, and permission to manage both projects' secrets.
- Production and Preview use separate databases. Never point a Preview
  deployment at the production database.
- Node.js 22 and pnpm 11.25.0 are selected to match CI.

## 2. Create and migrate Supabase PostgreSQL

1. Create a Supabase project and retain its database password in the team's
   secret manager. In the project dashboard, select **Connect** and copy the
   Session pooler URI (port 5432). Supabase documents the available connection
   modes in its [Postgres connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
2. Use the Session pooler for the current application. The repository's
   `postgres` client is process-cached and currently uses prepared statements;
   Supabase transaction mode (port 6543) does not support prepared statements.
   Moving to transaction mode therefore requires a separate persistence change
   that sets `prepare: false` and reruns the full database suite.
3. Add `sslmode=require` to the URI if it is not already present. A placeholder
   shape is:

   ```text
   postgresql://postgres.[PROJECT-REF]:[DATABASE-PASSWORD]@aws-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
   ```

4. From a trusted operator machine or one-off release job, check out the exact
   release commit, install with `pnpm install --frozen-lockfile`, set
   `DATABASE_URL` to the target URI, and run:

   ```bash
   pnpm db:migrate
   ```

5. Run `pnpm db:migrate` again and confirm it is clean/idempotent. Never run
   `pnpm db:reset` against Supabase; that command is for disposable local
   databases only.

The application creates and seeds a guest Workspace on demand, so production
does not need `pnpm demo:seed` before first use.

## 3. Configure Vercel

1. Import the GitHub repository into Vercel. Set the project Root Directory to
   `apps/web`, keep the Next.js framework preset, and enable **Include source
   files outside of the Root Directory** so workspace packages and
   `scenario-packs/` are available. See Vercel's
   [monorepo guide](https://vercel.com/docs/monorepos) and
   [monorepo FAQ](https://vercel.com/docs/monorepos/monorepo-faq).
2. Keep install/build commands on their detected pnpm defaults unless the
   preview build proves they were overridden incorrectly. The deploy must build
   `@oiw/web` and its workspace dependencies from the root lockfile.
3. Set the variables in §4 independently for Preview and Production. Vercel
   applies variable changes only to subsequent deployments; redeploy after any
   change. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
4. Deploy Preview first. Inspect build and function logs, then complete §7.
5. Promote/deploy the same reviewed commit to Production only after the Preview
   checks pass. Vercel's CLI sequence is documented in its
   [deployment guide](https://vercel.com/docs/projects/deploy-from-cli).

## 4. Runtime configuration

All values are server-only. Do not create `NEXT_PUBLIC_` copies of secrets.

| Variable | Requirement | Value / purpose |
|---|---|---|
| `DATABASE_URL` | Required | Supabase Session pooler URI from §2. Use a different database/project per environment. |
| `SESSION_SECRET` | Required | Random high-entropy value of at least 32 bytes. Signs guest session tokens. |
| `SESSION_SECRET_PREVIOUS` | Optional, rotation only | Previous signing secret accepted temporarily while cookies issued under it expire. Remove after 24 hours. |
| `OIW_RATE_LIMIT_IP_SALT` | Required for deployment | Independent random high-entropy HMAC salt for privacy-preserving IP bucket keys. Do not reuse it outside rate limiting. |
| `OIW_TRUSTED_PROXY_HEADER` | Required explicitly for deployment | Set `x-vercel-forwarded-for` on Vercel. Allowed values are `x-vercel-forwarded-for`, `x-forwarded-for`, `x-real-ip`, or `none`. An invalid value fails closed. |
| `SCENARIO_PACKS_DIR` | Normally unset | Override only if the runtime working directory differs from `apps/web`; it must resolve to the deployed read-only `scenario-packs/` directory. |
| `OIW_ASSESSMENT_SINK` | Optional | `postgres` (default) stores submissions in the migrated first-party table. `log` writes the submitted form record to server logs. No email or webhook delivery is implemented. |

When the runtime exposes `VERCEL=1`, the code defaults to
`x-vercel-forwarded-for`. Set `OIW_TRUSTED_PROXY_HEADER` explicitly so the
trust decision does not depend on system-variable exposure. Vercel documents that
this header remains stable when another proxy overwrites `x-forwarded-for` in
its [request-header reference](https://vercel.com/docs/headers/request-headers).

For non-Vercel hosting, the default is to ignore all forwarded IP headers and
place requests in the `unknown` IP bucket. Set a header only when a trusted edge
proxy strips any client-supplied copy and writes the authoritative value. Never
select `x-forwarded-for` merely because a request happens to contain it.

### Rate-limit overrides

Defaults are in `docs/SECURITY.md` §5. Override only after load review:

```text
OIW_RATE_LIMIT_<MUTATION>_SESSION_CAPACITY
OIW_RATE_LIMIT_<MUTATION>_IP_CAPACITY
OIW_RATE_LIMIT_<MUTATION>_REFILL_INTERVAL_MS
```

`<MUTATION>` is one of `WORKSPACE_CREATE`, `ARTIFACT_PROCESS`, `REVIEW`,
`DECISION`, `RESET`, `CASE_ACTION`, `EXPORT`, `ANALYTICS`, or `ASSESSMENT`. Values must be positive
integers; invalid values fail closed when that policy is used.

### Analytics and assessment sink

Product analytics is first-party: the browser posts allow-listed events to the
same-origin `/api/analytics` route and no third-party tracking script is loaded.
The `oiw_analytics_session` cookie is an anonymous UUID used to connect events
that occur before and after Workspace creation. It is `HttpOnly`,
`SameSite=Lax`, `Secure` in production and expires after 30 days. Workspace
scope is always derived from the separately signed guest session. IP addresses
are HMAC-derived only for rate-limit buckets and are never written to either
new table.

Keep `OIW_ASSESSMENT_SINK=postgres` unless server logs are the intentionally
chosen destination. The `log` sink contains the form fields, including contact
details, so log access and retention must be treated as personal-data storage.
Email and webhook extension interfaces exist, but there is no outbound delivery
implementation or network call in this release. A future destination must add
its own security review and deployment configuration.

Run the aggregate-only admin report from a trusted environment:

```bash
pnpm analytics:summary
```

The command prints counts by event and the total assessment-submission count;
it never prints organisation, workflow or contact fields.

### TTL and cleanup

Guest session tokens and Workspaces both have a 24-hour absolute TTL
(`DEFAULT_SESSION_TTL_SECONDS` and `DEFAULT_GUEST_TTL_MS`). These are code
constants, not environment variables in P0, so changing them requires a tested
application change; this avoids accidentally configuring a cookie to outlive
its Workspace.

Schedule the following at least hourly from a trusted runner with production
`DATABASE_URL`:

```bash
pnpm install --frozen-lockfile
pnpm demo:expire
```

The job deletes only expired `public-demo` Workspaces. Do not expose it as an
unauthenticated HTTP endpoint. Record job success/failure in the deployment's
operations log and alert if two consecutive runs fail. Vercel Cron calls HTTP
routes rather than shell commands; using it would require a separately scoped,
`CRON_SECRET`-protected Route Handler, which is not part of Wave 4. See
[Vercel Cron security guidance](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 5. Known deployment constraint: distributed rate limiting

The default `InMemoryTokenBucketStore` is process-local. On multiple
instances, each instance has its own allowance, so the configured numbers are
not a global ceiling. Two supported configurations:

- **Single instance (the public demonstration):** the default memory store is
  correct; no action needed.
- **Multiple instances:** set `OIW_RATE_LIMIT_STORE=postgres` so all
  instances share the atomic `rate_limit_buckets` table (applied by
  `pnpm db:migrate`; exact under concurrency per
  `postgres-rate-limit-store.test.ts`). The store uses the same
  `DATABASE_URL` connection pool as the app; size `DATABASE_POOL_MAX`
  accordingly.

`docs/SECURITY.md` records the residual acceptance for the synthetic,
no-upload public demo. Before production promotion, the owner must:

- acknowledge that acceptance in the release record;
- enable appropriate platform traffic controls and alerts;
- keep the demo synthetic and the upload/manual-create surface disabled; and
- re-review limits before higher-volume or any client-data deployment.

## 6. Pre-deployment verification

Run against local dockerized PostgreSQL from a clean release checkout:

```bash
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm validate:packs
pnpm eval
pnpm architecture:check
(cd apps/web && CI=1 pnpm test:e2e)
```

Confirm `pnpm eval` reports 1.000 on every dimension and inspect any build
warning rather than treating a successful exit alone as sufficient. Review the
repository diff and full Git history for secrets and real organisation data;
`architecture:check` is a backstop, not proof that history is clean.

## 7. Preview and production smoke checks

For each environment:

1. Open `/demo`; confirm the synthetic-data notice is visible.
2. Start **Explore freely** for each of the three packs. Confirm a distinct
   Workspace URL and `oiw_session` cookie with `Secure`, `HttpOnly` and
   `SameSite=Lax` attributes.
3. Complete the Asset Reliability north-star path through human Approval;
   confirm the Decision, dashboard and Audit Explorer update.
4. Export Cases and Audit in CSV and JSON. Confirm the response is an
   attachment, `Cache-Control: private, no-store`,
   `X-Content-Type-Options: nosniff`, and `X-Synthetic-Data: true`.
5. Without a session cookie, request a Workspace export URL and confirm an
   opaque 404. With a second Workspace cookie, request the first Workspace's
   page/export URL and confirm no existence or content disclosure.
6. Confirm repeated guest mutations eventually return 429 and that raw client
   IP addresses do not appear in logs or Audit data. Verify the selected proxy
   header matches §4.
7. Run the expiry job with a cutoff that cannot select active Workspaces; then
   verify normal access still works. Separately create a disposable expired
   Workspace in Preview, run the job, and confirm it is inaccessible.
8. Inspect runtime logs for database, pack-loading, rate-limit and secret-
   configuration errors. Confirm the deployed Scenario Pack registry lists all
   three packs.
9. Confirm HTTPS redirects/enforcement at the edge and no mixed-content
   requests. Do not promote if TLS or secure-cookie checks fail.
10. Complete one guided tour and one assessment submission. Run
    `pnpm analytics:summary` against the environment and confirm tour, CTA and
    submission counts increased without raw IP or assessment contents in the
    report.

## 8. Rotation, rollback and incident notes

- To rotate session signing, set the old value as
  `SESSION_SECRET_PREVIOUS`, set a new `SESSION_SECRET`, redeploy, wait at least
  24 hours, remove the previous value, and redeploy again.
- Rotate `DATABASE_URL` and `OIW_RATE_LIMIT_IP_SALT` in the provider dashboards
  and redeploy; existing rate-limit buckets intentionally reset on restart.
- Application rollback is safe only while database migrations remain backward
  compatible. This runbook does not authorize schema rollback or
  `pnpm db:reset` in production.
- If secret exposure is suspected, rotate first, then inspect Vercel/Supabase
  access logs and repository history. Do not paste secret values into issues,
  PRs or agent-run files.
- If expiry or isolation fails, disable public access until the cause is fixed;
  synthetic-only scope reduces confidentiality impact but does not make a
  workspace-boundary failure acceptable.
