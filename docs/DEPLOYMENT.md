# Public Demo Deployment

Status: Wave 4 deployment runbook for the P0 synthetic public demo. It does
not authorize client data, live operational connectors, authentication/SSO or
external write-back. Those require the client-deployment threat-model addendum
described in `docs/SECURITY.md` §6.

The supported targets are a container host (Google Cloud Run or equivalent)
plus a Neon-hosted plain PostgreSQL database, and, for the free public
synthetic demo, Render's free web tier plus Neon free (§9). The app reads Scenario Packs
from the filesystem at runtime, so edge runtimes and file-tracing-based
serverless hosts are poor fits; the previous Vercel plus Supabase runbook is
retained as Appendix A for teams that already run there. Supabase Auth,
Storage and RLS are not used on the P0 critical path (Plan Amendment A4).

## 1. Preconditions

- The release commit passes the command chain in §6 and the security launch
  checks in `docs/quality/RELEASE_CHECKLIST.md`.
- The deployment contains synthetic Scenario Pack data only.
- The operator has a container-host project, a Neon project, and permission
  to manage both projects' secrets and service settings.
- Preview and Production use separate services and databases. Never point a
  Preview service at the production database.
- Node.js 22 and pnpm 11.25.0 are selected to match CI.

## 2. Create and migrate Neon PostgreSQL

1. Create a Neon project in the same region as the planned container
   service and retain its database password in the team's secret manager.
2. Copy the **direct (unpooled)** connection string, not the pooled one.
   Neon's pooled endpoint runs PgBouncer in transaction mode, which does
   not support prepared statements; this repository's `postgres` client
   currently uses prepared statements, so the pooled endpoint fails. Use
   the direct host with `sslmode=require`. A placeholder shape is:

    ```text
    postgresql://[USER]:[DATABASE-PASSWORD]@[DIRECT-HOST]/[DB]?sslmode=require
    ```

3. From a trusted operator machine or one-off release job, check out the exact
   release commit, install with `pnpm install --frozen-lockfile`, set
   `DATABASE_URL` to the target URI, and run:

    ```bash
    pnpm db:migrate
    ```

4. Run `pnpm db:migrate` again and confirm it is clean/idempotent. Never run
   `pnpm db:reset` against Neon; that command is for disposable local
   databases only.

The application creates and seeds a guest Workspace on demand, so production
does not need `pnpm demo:seed` before first use.

## 3. Deploy the container

1. Build the image from the repository root and push it to the host's
   container registry:

    ```bash
    docker build -t oiw-web .
    ```

   The `Dockerfile` already bakes the Next.js standalone output plus the
   read-only `scenario-packs/` directory the app reads at runtime
   (`SCENARIO_PACKS_DIR=/app/scenario-packs`).
2. Create the service from that image. The standalone server listens on
   `$PORT`, which Cloud Run sets automatically — no image change is
   needed. Cap cost and database connections: set max instances low
   (3 is plenty for the synthetic demo) and keep the default concurrency
   unless load review says otherwise. Place the service in the same
   region as the Neon project.
3. Set the variables in §4 independently for Preview and Production.
   Redeploy after any change; variable edits never apply retroactively.
4. Deploy Preview first. Inspect build and runtime logs, then complete §7.
5. Promote the same reviewed image to Production only after the Preview
   checks pass. Never promote by rebuilding from a different commit.

## 4. Runtime configuration

All values are server-only. Do not create `NEXT_PUBLIC_` copies of secrets.

| Variable | Requirement | Value / purpose |
|---|---|---|
| `DATABASE_URL` | Required | Neon direct (unpooled) URI from §2. Use a different project/branch per environment. |
| `SESSION_SECRET` | Required | Random high-entropy value of at least 32 bytes. Signs guest session tokens. |
| `SESSION_SECRET_PREVIOUS` | Optional, rotation only | Previous signing secret accepted temporarily while cookies issued under it expire. Remove after 24 hours. |
| `OIW_RATE_LIMIT_IP_SALT` | Required for deployment | Independent random high-entropy HMAC salt for privacy-preserving IP bucket keys. Do not reuse it outside rate limiting. |
| `OIW_TRUSTED_PROXY_HEADER` | Required explicitly for deployment | Set `x-forwarded-for` on Cloud Run or Render (the platform edge appends the viewer address there; see §9.5 for the Render residual). Allowed values are `x-vercel-forwarded-for`, `x-forwarded-for`, `x-real-ip`, or `none`. An invalid value fails closed. |
| `OIW_RATE_LIMIT_STORE` | Required for deployment | Always `postgres` on hosted services: revisions overlap during deploys, so the process-local default would silently multiply allowances. |
| `DATABASE_POOL_MAX` | Required for deployment | Small bound (5 is plenty with max instances at 3) so scaled instances stay below the database connection ceiling. Must be a positive integer. |
| `SCENARIO_PACKS_DIR` | Normally unset | Override only if the runtime working directory differs from the baked `/app/scenario-packs` copy. |
| `OIW_ASSESSMENT_SINK` | Optional | `postgres` (default) stores submissions in the migrated first-party table. `log` writes the submitted form record to server logs. No email or webhook delivery is implemented. |

Set `OIW_TRUSTED_PROXY_HEADER` explicitly so the trust decision does not
depend on system-variable exposure. Known residual on Cloud Run: the edge
appends the viewer address to any client-supplied `X-Forwarded-For` chain
rather than overwriting it, and the app reads the leftmost entry — so a
determined visitor could rotate IP buckets. Accepted for the synthetic demo
because every bucket is additionally bound to the signed session cookie;
revisit before any higher-volume or client-data deployment, and never select
`x-forwarded-for` merely because a request happens to contain it. With no
header configured the default is to ignore all forwarded headers and place
requests in the `unknown` IP bucket.

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

The command prints counts by event, funnel aggregates by scenario, and the
total assessment-submission count; it never prints organisation, workflow
or contact fields.

### TTL and cleanup

Guest session tokens and Workspaces both have a 24-hour absolute TTL
(`DEFAULT_SESSION_TTL_SECONDS` and `DEFAULT_GUEST_TTL_MS`). These are code
constants, not environment variables in P0, so changing them requires a tested
application change; this avoids accidentally configuring a cookie to outlive
its Workspace.

Expiry runs from the
[`.github/workflows/expire-demo.yml`](../.github/workflows/expire-demo.yml)
workflow, hourly at minute 17, and on manual dispatch with an optional
`--before` override. With no `DATABASE_URL` repository secret the run is a
successful no-op (a notice, not a failure), so the schedule is safe to leave
enabled before hosting exists; once the secret holds the production Neon URI
it expires for real. GitHub disables scheduled workflows in a public
repository after 60 days without repository activity; re-enable it from the
Actions tab (or push any commit). The job deletes only expired `public-demo`
Workspaces. Do not expose it as an unauthenticated HTTP endpoint. Record job
success/failure in the deployment's operations log and alert if two
consecutive runs fail. (Cron-via-HTTP products such as Vercel Cron call
routes rather than shell commands; using one would require a separately
scoped, `CRON_SECRET`-protected Route Handler, which is not part of this
runbook. See
[Vercel Cron security guidance](https://vercel.com/docs/cron-jobs/manage-cron-jobs).)

## 5. Known deployment constraint: distributed rate limiting

The default `InMemoryTokenBucketStore` is process-local. On multiple
instances, each instance has its own allowance, so the configured numbers are
not a global ceiling. Two supported configurations:

- **Local single process (development, `pnpm dev`):** the default memory
  store is correct; no action needed.
- **Hosted (always):** set `OIW_RATE_LIMIT_STORE=postgres` so all
  instances share the atomic `rate_limit_buckets` table (applied by
  `pnpm db:migrate`; exact under concurrency per
  `postgres-rate-limit-store.test.ts`). Hosted revisions overlap during
  deploys even with min instances at zero, so the shared store is required
  from the first deployment, not only at scale. The store uses the same
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
    submission counts — including the funnel-by-scenario breakdown —
    increased without raw IP or assessment contents in the report.

## 8. Rotation, rollback and incident notes

- To rotate session signing, set the old value as
  `SESSION_SECRET_PREVIOUS`, set a new `SESSION_SECRET`, redeploy, wait at least
  24 hours, remove the previous value, and redeploy again.
- Rotate `DATABASE_URL` and `OIW_RATE_LIMIT_IP_SALT` in the provider dashboards
  and redeploy; existing rate-limit buckets intentionally reset on restart.
- Application rollback is safe only while database migrations remain backward
  compatible. This runbook does not authorize schema rollback or
  `pnpm db:reset` in production.
- If secret exposure is suspected, rotate first, then inspect the host and
  database provider access logs and repository history. Do not paste secret
  values into issues, PRs or agent-run files.
- If expiry or isolation fails, disable public access until the cause is fixed;
  synthetic-only scope reduces confidentiality impact but does not make a
  workspace-boundary failure acceptable.

## 9. Render free tier + Neon (public demo)

Everything in the repository needed to host the synthetic public demo for
$0: Render's free web service runs the repository `Dockerfile`, Neon's free
tier hosts PostgreSQL, and GitHub Actions migrates the database, deploys,
keeps the service warm and expires guest Workspaces. The container image
cannot migrate (its final stage has no `tsx` or migration sources), so
migrations run from [`deploy.yml`](../.github/workflows/deploy.yml) before the
Render deploy hook fires. Account creation and secrets are owner steps; none
of them are committed. §1 to §8 still apply (smoke checks are §7).

Files: [`render.yaml`](../render.yaml) (Blueprint),
[`deploy.yml`](../.github/workflows/deploy.yml),
[`keepalive.yml`](../.github/workflows/keepalive.yml),
[`expire-demo.yml`](../.github/workflows/expire-demo.yml).

### 9.1 Owner steps, in order

Run the shell commands from any machine with `gh` authenticated as a
repository admin; they are copy-pasteable as written.

1. **Create the Neon database.** In the Neon console create a project named
   `oiw-demo`, Postgres 17, region **AWS US West 2 (Oregon)** so it matches
   the `region: oregon` in `render.yaml`. In **Connect**, turn **Connection
   pooling off** so the host has no `-pooler` suffix (the repository's client
   uses prepared statements, which Neon's pooled endpoint does not support).
   Copy the URI. It must look like
   `postgresql://[USER]:[PASSWORD]@ep-xxxx.us-west-2.aws.neon.tech/neondb?sslmode=require`.
   If Neon appended `&channel_binding=require`, delete that parameter.

2. **Store the database URL as a GitHub secret.** The command prompts for
   the value; paste the URI from step 1.

    ```bash
    gh secret set DATABASE_URL --repo shekibahmed/operations-intelligence-workbench
    ```

3. **Migrate the database.** With no `RENDER_DEPLOY_HOOK_URL` yet, the
   workflow migrates and then reports that no deploy was triggered.

    ```bash
    gh workflow run deploy.yml --repo shekibahmed/operations-intelligence-workbench --ref main
    gh run watch --repo shekibahmed/operations-intelligence-workbench "$(gh run list --repo shekibahmed/operations-intelligence-workbench --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
    ```

4. **Create the Render service from the Blueprint.** In the Render
   dashboard choose **New > Blueprint**, connect the GitHub repository,
   branch `main`; Render reads `render.yaml` and shows one free web service,
   `oiw-demo`. Render prompts for the two values marked `sync: false`:
   - `DATABASE_URL`: the same Neon URI as step 1.
   - `NEXT_PUBLIC_SITE_URL`: `https://oiw-demo.onrender.com` (no trailing
     slash). If the name `oiw-demo` was already taken, Render appends a
     suffix: after the service exists, copy its real URL from the service
     page, update this variable, and redeploy (step 7).

   `SESSION_SECRET` and `OIW_RATE_LIMIT_IP_SALT` are generated by Render; the
   other variables are set by the Blueprint. Click **Deploy Blueprint**. The
   first build takes several minutes; wait until the service shows **Live**.

5. **Store the deploy hook.** On the service page open **Settings > Deploy
   Hook**, copy the URL (treat it as a credential), then:

    ```bash
    gh secret set RENDER_DEPLOY_HOOK_URL --repo shekibahmed/operations-intelligence-workbench
    ```

6. **Tell the keepalive where the app is.** Use the service's real URL:

    ```bash
    gh variable set RENDER_APP_URL --repo shekibahmed/operations-intelligence-workbench --body "https://oiw-demo.onrender.com"
    ```

7. **Run the first full deploy (migrate, then deploy hook).**

    ```bash
    gh workflow run deploy.yml --repo shekibahmed/operations-intelligence-workbench --ref main
    ```

   From now on every successful CI run on `main` does this automatically.

8. **Exercise the other workflows once.**

    ```bash
    gh workflow run keepalive.yml --repo shekibahmed/operations-intelligence-workbench --ref main
    gh workflow run expire-demo.yml --repo shekibahmed/operations-intelligence-workbench --ref main
    ```

9. **Smoke-check** (replace the URL if yours differs):

    ```bash
    curl -sS -o /dev/null -w '%{http_code}\n' https://oiw-demo.onrender.com/        # 200 (first call after idle takes about a minute)
    curl -sS https://oiw-demo.onrender.com/robots.txt
    curl -sSI https://oiw-demo.onrender.com/demo | grep -i -E '^(HTTP|x-frame|x-content)'
    ```

   Then walk §7 in a browser (start Explore freely for each pack, one
   export, one assessment submission). Secure cookies require the `https://`
   URL.

To change `NEXT_PUBLIC_SITE_URL` or any other variable later, edit it in
the Render dashboard (**Environment**), then run
`gh workflow run deploy.yml --ref main` so a deploy picks it up.

### 9.2 What each piece does

| Piece | Behaviour |
|---|---|
| `render.yaml` | One free Docker web service built from `./Dockerfile`, `autoDeployTrigger: "off"` (the current spelling of the deprecated `autoDeploy: false`), health check on `/robots.txt` (rendered by the app without touching the database). Runtime configuration matches §4: `OIW_RATE_LIMIT_STORE=postgres`, `DATABASE_POOL_MAX=3`, `OIW_ASSESSMENT_SINK=postgres`, `OIW_TRUSTED_PROXY_HEADER=x-forwarded-for`; `SESSION_SECRET` and `OIW_RATE_LIMIT_IP_SALT` use `generateValue` (random 256-bit values created once and kept across deploys). |
| `deploy.yml` | Triggers: CI success on a push to `main` (`workflow_run`; fork PRs are excluded because the job holds secrets), or manual dispatch from `main`. Checks out the commit CI validated, runs `pnpm install --frozen-lockfile` and `pnpm db:migrate` with `secrets.DATABASE_URL`, then POSTs `secrets.RENDER_DEPLOY_HOOK_URL` with `ref` set to the validated commit SHA, so Render builds exactly the commit CI passed. Successful no-op when `DATABASE_URL` is unset; migrates only when the hook is unset. One run at a time (`deploy-demo` concurrency group), `contents: read` only. |
| `keepalive.yml` | Every 10 minutes from 06:00 to 21:50 UTC, requests `${RENDER_APP_URL}/` with up to 6 attempts (cold start is about a minute). Successful no-op when the variable is unset. Ends with a warning, not a failure, if the app never answers, so an outage does not alert every 10 minutes. |
| `expire-demo.yml` | Hourly guest-Workspace expiry (§4). Successful no-op when `DATABASE_URL` is unset. |

### 9.3 Free-tier behaviour and limits

- **Cost: $0.** Render free web service plus Neon free (1 GB storage per
  project, 100 compute-unit-hours per project per month) plus GitHub Actions
  minutes (free for public repositories). Watch Render's bandwidth and build
  minutes if the demo gets heavy traffic.
- **Cold starts.** Render spins a free web service down after 15 minutes
  without inbound traffic and takes about a minute to wake it, during which
  visitors see Render's loading page. Open the link yourself shortly before
  sending outreach. Outside 06:00-22:00 UTC the keepalive is off, so expect a
  cold start then.
- **Keepalive cannot wake a sleeping service via `/robots.txt`.** While a free
  service is spun down, Render answers `/robots.txt` itself with a
  disallow-all response and does not start the app. The keepalive therefore
  requests `/`. (The Render health check still uses `/robots.txt`, which is
  fine because it targets the running container.)
- **750 free instance hours per workspace per month.** Running 16 hours a
  day is about 490 hours. If the workspace hits 750, Render suspends its free
  web services until the next month. Spun-down time is not counted. Do not
  widen the keepalive window to 24 hours if other free services share the
  workspace.
- **Neon autosuspend.** Free computes suspend after 5 minutes idle and cannot
  be configured otherwise. The keepalive never touches the database, so the
  first real request after idle also resumes Neon (adds a short delay).
- **GitHub pauses scheduled workflows after 60 days of no repository
  activity** in a public repository. Any commit, or re-enabling the workflow
  in the Actions tab, restarts `keepalive.yml` and `expire-demo.yml`.
  Scheduled runs can also be delayed under load.
- Free web services have an ephemeral filesystem, cannot scale past one
  instance, and may be restarted by Render at any time. None of this matters
  here: all state is in Postgres, and `OIW_RATE_LIMIT_STORE=postgres` makes
  the limiter independent of the process.

### 9.4 Build-time configuration

`NEXT_PUBLIC_SITE_URL` is read when `next build` runs: it controls the
`Strict-Transport-Security` header (`apps/web/next.config.ts`) and the
absolute URLs in `robots.txt` and `sitemap.xml`. Render converts a Docker
service's environment variables into Docker build arguments, but a build
argument only reaches `next build` if the `Dockerfile` declares it with
`ARG`. The current `Dockerfile` declares none, so on Render the variable is
present at runtime but not at build time. Verified on a local
`docker build`: the baked `robots.txt` lists
`Sitemap: http://localhost:3000/sitemap.xml`, and no HSTS header is baked.
Consequences until the `Dockerfile` is changed (follow-up; it needs
`ARG NEXT_PUBLIC_SITE_URL` and a matching `ENV` in the build stage, and must
not gain an `ARG` for `DATABASE_URL` or any other secret, because build
arguments can end up in image layers): the app does not send HSTS itself
(Render's edge terminates TLS and redirects HTTP to HTTPS), and the sitemap
URLs point at localhost. Neither affects the demo's function or the
session-cookie `Secure` attribute (driven by `NODE_ENV`).

### 9.5 Rate-limit identity on Render

`OIW_TRUSTED_PROXY_HEADER=x-forwarded-for` makes the app take the client
address from the leftmost `X-Forwarded-For` entry that Render's proxy forwards. Render's documentation does not state how it treats a client-supplied
`X-Forwarded-For`; a Render feedback thread reports that Render appends to
rather than overwrites the incoming chain (staff in that thread describe the
first entry as the real client IP, which is not documented behaviour). If
so, a determined visitor could rotate IP buckets by sending their own
header, the same residual accepted for Cloud Run in §4. Each bucket is also
bound to the signed session cookie, and the demo is synthetic, so the
residual is accepted for this deployment (`docs/SECURITY.md` §3.9). Setting
`none` would be worse: every visitor shares one `unknown` IP bucket, so a
single noisy client can exhaust everyone's allowance. Revisit before any
higher-volume or client-data use.

Sources checked: [Render Blueprint spec](https://render.com/docs/blueprint-spec),
[free instance limits](https://render.com/docs/free),
[Docker builds](https://render.com/docs/docker),
[deploy hooks](https://render.com/docs/deploy-hooks),
[Neon plans](https://neon.com/docs/introduction/plans),
[GitHub: disabling workflows](https://docs.github.com/en/actions/using-workflows/disabling-and-enabling-a-workflow).

## Appendix A. Alternative: Vercel plus Supabase

For teams that already run on Vercel and Supabase, the previous runbook
still applies with these substitutions: use the Supabase Session pooler URI
(port 5432, `sslmode=require`) — never transaction mode (port 6543), which
does not support the prepared statements this repository's client uses.
Set the Vercel project Root Directory to `apps/web` with **Include source
files outside of the Root Directory** enabled so workspace packages and
`scenario-packs/` are available, keep the detected pnpm install/build
commands, and set `OIW_TRUSTED_PROXY_HEADER=x-vercel-forwarded-for`. The
code defaults to that header when `VERCEL=1` is exposed, but set it
explicitly so the trust decision never depends on system-variable
exposure. All other sections (§4–§8) apply unchanged.
