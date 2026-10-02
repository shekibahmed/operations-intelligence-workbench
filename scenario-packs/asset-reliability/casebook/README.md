# Asset Reliability evidence casebook

The [committed HTML artifact](../../../apps/web/public/casebook/a-142-repeat-fault.html)
is a complete recorded synthetic case, readable by saving and opening the file
in a browser. It embeds its evidence and styles; reading requires no JavaScript,
application server, database, guest session or model credentials. GitHub's file
page displays source: use **Raw** and save as `a-142-repeat-fault.html`, or choose
**Download raw file**, then open the downloaded file in a browser.

The case is attributed to Shekib and Kaamchor and uses the existing public
consultancy destinations from `apps/web/src/lib/firm.ts`. Story, source excerpts
and capability explanations live in this pack. The generic renderer and landing
entry do not contain the scenario narrative.

## Inputs and historical identity

- `case.json` supplies the presentation, evidence references and capture selection.
- `sources.json` freezes original reports, expected extractions and rules with
  checksums, pack/provider identity and the historical evidence revision.
- `recording.json` supplies selected observations from the real UI journey and
  exports, with relationship validation, input hashes and automation disclosure.

The current recording's `sourceRevision` and `captureRevision` are
`2360e1e12c9e70f446957ba4e0b95c78f823dbb2`, the actual clean application and
capture-harness revision. Its `evidenceRevision` is
`d39191038fbe626e6afdd4a54b3a87d2e98cb0e9`, also stored as `sourceRevision` in
`sources.json`. Capture verified that those older frozen source bytes still
matched both their historical revision and the captured checkout. All source,
application and test links in the HTML use the actual captured application
revision, where those older evidence bytes were verified unchanged. Later
commits publishing the recording, HTML or entry points are publication revisions,
not replacement capture identity. Ordinary repository changes do not relabel
this evidence as current.

The 70% confidence is authored fixture output, not a measured live-model result.
Playwright exercised authenticated human-governed review and approval controls
with an explicit synthetic script comment; no maintenance lead was consulted.
Approval authorizes the proposal in this synthetic run. The recorded open case
and action-item states do not establish physical removal, completed repair or
measured savings. The selected audit export projection uses public aliases and
does not independently verify the original audit hash chain.

## Generate and check

Run from the repository root after installing the normal workspace dependencies:

```bash
pnpm casebook:build
pnpm casebook:check
```

Both consume the frozen inputs without a database, network connection or git
history. Generation validates before replacing the HTML; checking regenerates
in memory and compares bytes without writing. Invalid inputs or drift fail while
preserving the last valid artifact. Do not hand-edit the generated HTML.

Both `pnpm build` and `pnpm --filter @oiw/web build` check the committed artifact
before building. They fail on drift and never capture, approve a decision or
refresh evidence. Capture is always a separate, intentional maintainer action.

## Intentionally refresh sources or recording

1. Review the changed source reports, extraction/rule definitions, presentation
   and capture selection. If source evidence changes, deliberately update the
   frozen copies, checksums and historical evidence revision in `sources.json`
   after the original source files exist in that committed revision. Never change
   historical identity merely to point at the latest commit.
2. Commit the capture harness and all input changes before capturing. Capture
   requires a fully clean committed tree, checks the current source files against
   the frozen copies, and requires the pinned historical evidence revision to be
   available locally. The new recording binds its input hashes and application
   identity to that clean commit.
3. Supply an explicit `CASEBOOK_ADMIN_DATABASE_URL` for a PostgreSQL administrator
   with permission to create and drop databases, then run:

   ```bash
   # Replace every placeholder; this is not a usable credential or default URL.
   CASEBOOK_ADMIN_DATABASE_URL='postgresql://<admin-user>:<admin-password>@<db-host>:<db-port>/<admin-database>' pnpm casebook:capture
   ```

   Keep real credentials outside repository files. Capture needs active admin
   database access. The runner creates a uniquely named synthetic database,
   applies migrations, starts an owned production server on an independent port,
   follows the real UI and obtains authenticated case/audit exports. It never
   reuses an existing server, resets a shared database or writes to a shared demo
   workspace. It closes its server and drops its database on success or failure.
   Only a completely validated run replaces the recording.

   To avoid a circular refresh check against the old HTML, capture builds the web
   app through the installed Next builder directly, bypassing the normal filtered
   web build's casebook drift gate. This bypass belongs only to explicit capture;
   ordinary builds retain that gate.
4. Capture leaves a changed `recording.json`. Review its stages, relationships,
   synthetic automation disclosure and remaining work. Review the browser tests'
   hard-coded captured-revision expectations deliberately when refreshing; do not
   weaken pinning checks or rewrite old evidence to make a new run pass.
5. Run `pnpm casebook:build`, then `pnpm casebook:check` and the reader tests below.
   Review the generated HTML and commit the new recording and HTML together with
   any intentionally updated test expectations. That later publication commit
   stays distinct from the clean revision captured in step 3.

Publishing changed `case.json` or `sources.json` inputs requires a deliberate
fresh recording. Later harness-only edits do not invalidate or rewrite an older
run; a new capture binds the new harness hashes to its own clean revision. A
failed prerequisite or capture must be resolved before publishing new outcomes;
authored expectations cannot substitute for observed UI evidence.

## Reader verification

```bash
pnpm --filter @oiw/web test:casebook
```

The default project opens the committed file from disk with JavaScript disabled,
resource requests blocked and no app server. It checks evidence, keyboard/mobile
reading, accessibility and established implementation/contact destinations.
Install the repository's Playwright browser first if it is unavailable locally.

To include the HTTP project, build the current app immediately before running it:

```bash
pnpm build
CASEBOOK_HTTP=1 pnpm --filter @oiw/web test:casebook
```

This project owns a production server on port 4318 and checks the same public HTML
with unavailable database access and no guest cookie. The port must be free; it
does not reuse a running server. The existing governed interactive journey is
covered separately by `pnpm --filter @oiw/web test:e2e`.

Optional screenshot regeneration uses the same committed artifact:

```bash
REGEN_CASEBOOK_SCREENSHOTS=1 pnpm --filter @oiw/web test:casebook
```

Review screenshot changes before committing them. Generating screenshots never
refreshes the recording. Hosting remains deferred; this artifact does not imply
a publicly deployed application or a new publishing destination.
