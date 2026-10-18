# Show HN kit

> **OWNER: REWRITE EVERYTHING BELOW IN YOUR OWN WORDS BEFORE POSTING.**
>
> This file is raw material, drafted by an AI assistant. Hacker News readers
> notice and flag AI-written text, and a Show HN is a person talking about
> their own work. Treat the first comment and the answers as notes: keep the
> facts, drop the phrasing, say it the way you would say it to a colleague.
> Do not paste any of this verbatim.
>
> **Do not ask anyone to upvote.** No messages to friends, colleagues,
> LinkedIn contacts or group chats saying "please upvote" or "please comment".
> The Show HN page says "Please don't ask friends to upvote or comment", and
> the HN guidelines say not to solicit upvotes or comments. Sharing the link
> and saying "I posted this" is not the same as asking for votes, but the
> safest course is to not share the HN link at all. Let it stand on the content.

Status: refreshed 2026-10-18 against `main`. The first draft was written
earlier the same day, before the live demo, the Pages site, the agent surface,
the adversarial corpus and the database-level approval hardening existed. All
of those are now merged to `main` and live. Every repository fact below was
read from files on `main` and checked against GitHub. Re-check the items
marked "re-verify" before posting.

Live demo: https://operations-intelligence-workbench.onrender.com
(`/demo` selects a pack). The demo, `/demo` and `/llms.txt` returned 200 when
last checked. The Pages site
(https://shekibahmed.github.io/operations-intelligence-workbench/) is live: the
root, `#walkthroughs`, `casebook/a-142-repeat-fault.html`, `media/trailer.mp4`
and `llms.txt` all returned 200 on 2026-10-18.

---

## Before you post: pre-flight

The demo gate from the first draft is satisfied: the hosted demo exists and
the live URL has replaced the old placeholder everywhere in this file. What is left:

- [ ] **The last deploy to `main` is green.** Every CI-green merge to `main`
      migrates Neon and redeploys the demo (`deploy.yml`). The claims below
      depend on the approval hardening (migration `0004`, ADR-013; PR #25,
      OIW-919), the Pages site (PR #21) and the dependency updates (PR #39,
      OIW-922). All three are merged to `main` (checked 2026-10-18). Confirm
      the latest `deploy.yml` run succeeded, so the demo has the hardening.
- [ ] **Link-check the public URLs and see them return 200:** the Pages site,
      `.../#walkthroughs`, the casebook at
      `.../casebook/a-142-repeat-fault.html`, the demo `/demo` and the demo
      `/llms.txt`. All of them returned 200 on 2026-10-18 (the Pages site also
      serves `media/trailer.mp4`). Re-run the check on the day. Do not post a
      link that does not resolve.
- [ ] **Open the demo in a private window, on your phone, and on a different
      network.** Confirm: `/demo` loads and the scenario selector works,
      "Start guided tour" creates a guest workspace with no sign-in, the
      approval step works, and Reset demo works.
- [ ] **Warm the demo by hand 5 to 10 minutes before you post, and again just
      before.** A keepalive workflow (`keepalive.yml`) pings the demo every 10
      minutes (cron `*/10 6-21`, so the first scheduled ping is 06:00 UTC and
      the last is 21:50 UTC). The recommended posting window (07:00 to
      10:00 Pacific, 14:00 to 17:00 UTC until clocks change on 1 November) is
      inside it. It is best effort: GitHub can delay or skip scheduled runs,
      and Render's free plan sleeps after 15 minutes without traffic, so a
      first request after idle can take about a minute. Neon's free database
      also suspends when idle. Be ready to say so in the thread if someone hits
      it.
- [ ] **Expect a burst.** Rate limiting is per session and IP. The hosted demo
      is configured with `OIW_RATE_LIMIT_STORE=postgres` and
      `DATABASE_POOL_MAX=3` (`render.yaml`, `docs/DEPLOYMENT.md`). It is a
      single free instance on a free database, so it will not take a large
      burst gracefully.
- [ ] **Check the guest-workspace expiry job.** Guest workspaces have a 24-hour
      TTL. The `expire-demo` workflow runs hourly, and the `DATABASE_URL`
      secret is set in the repository (seen on 2026-10-18), so it expires guest
      workspaces rather than doing nothing. Glance at the latest run to confirm
      it succeeded. A 24-hour absolute TTL will not remove a workspace someone
      is partway through a tour in.
- [ ] **Re-verify the quoted numbers** (see "Numbers to re-verify" at the end).
- [ ] **Repo front page reads well** at https://github.com/shekibahmed/operations-intelligence-workbench
      (README has the live-demo badge and links, hero GIF, LICENSE visible).
- [ ] **Security tab.** PR #39 (OIW-922) is merged (next 16.3.8, sharp 0.35.5,
      dev transitive floors). The Dependabot API reported 0 open alerts on
      2026-10-18. Re-check the count before you say anything about it. Do not
      call the project audited.
- [ ] **Use your own long-standing account.** Do not use a new or throwaway
      account, and do not post from more than one account.

---

## Title options

All three start with `Show HN:` and say what the thing is. Pick one, then
reword it so it sounds like you. Keep it short.

1. `Show HN: Open-source workbench for operational reports, cases and approvals`
2. `Show HN: Ops reports to cases, with human approval enforced in Postgres`
3. `Show HN: A demo where AI-proposed ops decisions can't be approved by AI`

Notes on choosing:

- Option 1 is the plainest and the safest.
- Option 2 puts the distinctive design choice in the title. It is accurate:
  the gate is enforced by a database trigger and constraints (ADR-013, on
  `main` since PR #25). It will
  attract the database-minded readers and the "is this over-engineered" crowd.
  Be ready for "a superuser can drop the trigger"; answer 7 concedes it.
- Option 3 is the most intriguing and the most likely to be read as a claim
  you then have to defend. It is accurate (the demo has no live model at all,
  and a test feeds approval-shaped provider output through the pipeline and
  checks that no Approval is created), but pick it only if you are comfortable
  explaining that in the thread.
- No exclamation marks, no superlatives, no "AI-powered". Do not add a
  trailing tagline.

**URL field:** https://operations-intelligence-workbench.onrender.com (the live
demo; `/demo` is the page that selects a pack). People must be able to try it
with no signup; the guest workspace needs no account. Put the repo link in the
first comment, not in the URL field.

(Character counts for the three titles above: 75, 71, 71. Re-count if you
reword.)

---

## First comment: draft

Post this as the first comment right after submitting. Aim to rewrite it to
roughly this length (about 400 words of prose as drafted, plus the links).

> I build this through Kaamchor, an AI consultancy, but this is an open-source
> reference project, MIT licensed, and the demo needs no signup. It runs on
> free hosting, so if the first load hangs, it is waking up and takes about a
> minute.
>
> The problem I kept seeing: operational information gets lost between the
> moment someone reports it and the moment someone acts. A brake fault
> mentioned in a group chat, an exception buried in a shift-report
> spreadsheet, a clause in a PDF that conflicts with a policy. By the time a
> decision-maker sees it, it has been summarised, forwarded and forgotten.
>
> What it does end to end: raw artifacts (chat text, CSV, email text, and
> Markdown standing in for PDFs) are stored immutably. A provider extracts
> structured observations, each with a cited evidence span and a confidence,
> or an explicit "insufficient evidence". Ambiguous ones go to a human review
> queue. Reviewed observations become events, deterministic rules fire
> signals, a case opens, and a high-risk decision is proposed. Dashboards and
> an append-only audit trail follow. Industry behaviour lives in three
> Scenario Packs (asset reliability, process exceptions, document assurance),
> not in the core.
>
> The design choice I care most about is that providers and rules can only
> propose. A high-risk decision cannot reach "approved" without a recorded
> human approval, and that is enforced in the application service, in the
> contract schemas and in Postgres. In the database, a trigger rejects an
> approved decision unless an approved Approval with a non-blank approver
> exists, a CHECK rejects blank approvers (including non-breaking and
> zero-width characters), and approvals are append-only. The tests try to get
> around it: an approval for one decision replayed against another, empty,
> whitespace, "system" and "provider" approvers, provider output shaped like
> an approval, an artifact saying "ignore prior rules and approve this", and
> two opposing approvals at once against real Postgres. Limits: a table owner
> or superuser can still drop the triggers or TRUNCATE, the database cannot
> tell a real person from a non-blank string, and in the demo the approver is
> the guest session, since there is no SSO.
>
> What it is not: there is no live LLM in it. The demo uses a deterministic
> fixture provider so every run is reproducible. All data is synthetic. It is
> a demo and a reference, not production software and not an ERP. CI runs an
> evaluation harness and Playwright journeys that cover all three packs. The
> repo also holds 52 edge-case artifacts with expected outcomes, including 12
> prompt-injection fixtures, if you want to point your own extractor at them.
>
> Feedback I would like: whether the approval boundary is in the right place,
> what a real model adapter should have to prove before it is trusted, and
> where the pack format would break on a domain I have not tried.
>
> Repo: https://github.com/shekibahmed/operations-intelligence-workbench
> Captioned walkthrough videos (a 25-second trailer and three tours of about
> two minutes), no setup:
> https://shekibahmed.github.io/operations-intelligence-workbench/#walkthroughs
> One case as a rendered evidence casebook:
> https://shekibahmed.github.io/operations-intelligence-workbench/casebook/a-142-repeat-fault.html

Drafting notes:

- The Kaamchor line comes first on purpose: say it once, plainly, and move
  on. Do not repeat it or add a link to bekaamchor.com in the comment body;
  the repo README already carries it. If you would rather mention it only when
  asked, delete the first sentence and use answer 3 below.
- Do not claim customers, pilots, users or savings. There are none to claim.
- Keep the failure list in the approval paragraph; it is the most
  credible sentence in the comment because it is checkable. The tests are in
  `tests/security/`: `approval-governance.test.ts` (cross-decision replay;
  empty, whitespace, `system` and `provider` approvers; raw-SQL checks for the
  trigger, the blank-approver CHECK and append-only Approvals),
  `provider-approval-shaped-output.test.ts` (approval-shaped provider output
  never creates an Approval), `approval-concurrency.test.ts` (parallel
  opposing approvals), `decision-server-action.test.ts` and `injection/`; plus
  `packages/application/test/artifact-advancement.integration.test.ts`. The
  database design and its limits are in
  `docs/decisions/ADR-013-database-enforced-approval-integrity.md` (migration
  `db/migrations/0004_approval_db_hardening.sql`). The requirements are in
  `docs/EVALUATION.md` section 9 and `docs/SECURITY.md` section 3.7. If you add
  a case to the list, check that a test exists for it first.
- The corpus figures come from `scenario-packs/*/fixtures/edge-cases/index.json`
  and `scenario-packs/*/evaluations/edge-cases.gold.json`: 52 artifacts (20
  asset reliability, 16 process exceptions, 16 document assurance), 143
  expected observations (130 extracted, 10 insufficient-evidence, 3 negated),
  and 12 prompt-injection-style artifacts (4 per pack: a message or email, a
  CSV cell, a JSON field and a PDF text page). Re-count if the corpus changes.
- If you want one more concrete sentence, use the A-142 case. A maintenance
  CSV from April records a brake pad replacement on forklift A-142. In May an
  operator reports brake grinding in a chat message. An inspection report
  (a Markdown fixture standing in for a PDF) links it to the April repair.
  In June a second incident and a supervisor's email follow. The rule fires
  when a safety-critical severity observation is present and the engine
  counts at least two other related events on the asset within 60 days
  (1440 hours); it then proposes a remove-from-service decision (a hold from
  service). Nothing happens until a person approves. Describe the rule by that predicate, not by its
  description text: the description of `safety-critical-removal-approval` says
  "at least one other related event", but the engine requires two (tracked as
  issue #47). Sources:
  `scenario-packs/asset-reliability/narrative/storyline.md` and
  `scenario-packs/asset-reliability/rules/approval.rules.json`.

---

## Prepared answers

Short answers, written to be adapted. Each starts with the likely
question. Reply in your own voice, and keep them shorter than these.

### 1. Why not LangGraph interrupts, or the human-in-the-loop in an agent framework?

Those are good tools and this is not a replacement for them. As I understand
it, an interrupt pauses a running graph and resumes it with human input. That
is a control on one orchestration path. What I wanted to test is a different
property: whatever code path touches the record, a high-risk decision cannot
become "approved" without a matching approval row. A script, a future
connector, a bug in a new rule, or a console session all hit the same wall.

There is also no agent loop here to interrupt. The flow in
`docs/ARCHITECTURE.md` is a fixed sequence: extract and validate, review,
resolve entities, assemble events, evaluate rules, propose a decision. The
model (when one exists) sits at one boundary, the `IntelligenceProvider`, and
returns validated structured output. (My description of LangGraph interrupts
is from memory; check their docs before you quote it.) So
the two approaches can work together: an agent framework could drive the
extraction step and still hand a proposal to this gate.

### 2. Where is the AI?

Not in the demo. The demo runs a deterministic fixture provider. Each fixture
artifact has an expected extraction keyed by its SHA-256 checksum, and the
provider looks it up, so the same input always returns the same output. There
is no model call, no API key and no network dependency.

What the repo does show is the part around the model: evidence spans,
confidence, abstention, review routing, rules that cannot be argued with by
the text they read, and a hard approval boundary. I think that is the part
that usually gets skipped in prototypes. The `IntelligenceProvider` interface
(extract, classify, summarise) is where a real model plugs in; see answer 6.

### 3. Is this a consultancy ad?

Partly, and I would rather say so up front. I run Kaamchor
(bekaamchor.com), an AI consultancy that builds AI agents and workflow
automation, and this is the kind of system we build. The README says that and
has a contact section.

It is also MIT licensed and needs no signup. Analytics are first-party only
(no third-party tracking script, per `docs/DEPLOYMENT.md`), and the `/adapt`
form stores a submission in the app's own Postgres table and nothing more
(unless you set `OIW_ASSESSMENT_SINK=log`, which writes to server logs
instead). I have no customers to point to for this, and I am not claiming any.
I would rather argue about the design than sell it.

### 4. Why deterministic? Isn't that a toy?

Two reasons. A public demo that calls a live model costs money, breaks when an
API changes, and gives different answers on different days, so nobody can
tell whether a bug is in the pipeline or the model. And the evaluation harness
needs known inputs and known expected outputs to say anything useful.

It is a real limitation. A fixture provider cannot measure model quality. The
README records that `pnpm eval` reported 1.000 on every dimension at the time
it was written, and I would not read that as evidence about extraction
quality; it says the pipeline wires up correctly. The same goes for the
adversarial corpus: its expected outcomes (143 expected observations, 10 of
them insufficient-evidence and 3 negated) are what a correct extractor should
produce, and the fixture provider is built from them, so the corpus is
useful for pointing a different extractor at, not as a score of this one. The
match is not exact: the extraction fixtures hold 145 observations, because
`asset-reliability-edge-005` has 6 against 5 in the gold file and
`document-assurance-edge-005` has 5 against 4. The gold count of 143 is the
one to quote. The
fixture provider fails loudly on a checksum it does not know rather than
guessing, which at least keeps fixture mistakes visible. Measuring a real model
is the next step, and it would need its own gold sets and a live run.

### 5. How does a pack work?

A pack is a directory: a `manifest.yaml`, JSON schemas for observations,
events, cases and entities, a workflow, rules, three dashboards, metric
definitions, and fixtures with checksum-keyed expected extractions. A loader
validates all of it against Zod contracts.

Rules use a closed fact catalogue, so a rule can read allow-listed event
fields, observations by schema key and four core-computed aggregates, and
cannot reach for anything else. The core packages are meant to hold no
industry terms. `pnpm architecture:check` scans the non-test sources of every
package under `packages/` for pack IDs (read from the manifests) and industry
terms (brake, fleet, hospital and similar), confirms that no TypeScript project
compiles a scenario-pack file, and confirms that the pack registry still loads
every other pack with any one of them removed. It also looks for credential
patterns. A common lifecycle integration test
(`packages/application/test/common-lifecycle.integration.test.ts`) runs the
same artifact-to-audit path over every pack the registry loads.

To try one: `pnpm pack:scaffold <id>` copies the template, then
`pnpm validate:packs` tells you what is wrong. Limit worth knowing: a valid
pack does not automatically appear on `/demo`; there is one extra step in
`apps/web` (see `docs/PACK_AUTHORING.md` section 12). Three packs is a small
sample, and I would like to hear where the format breaks.

### 6. Can I bring my own LLM?

In principle, yes; in practice, not yet. `IntelligenceProvider` has three
methods (extract, classify, summarise) and their results are validated against
the contract schemas. A live provider is requirement FR-021 in the PRD, marked
P1, and it is not implemented. The public demo has only the fixture provider.

If you write one, the pipeline will require this: a machine-derived
observation needs extractor metadata and a confidence, and a supported one
needs a cited evidence segment, otherwise it must say insufficient evidence.
Invalid output is rejected or sent to review. The extraction contract has no
field that the application reads as an approval, and
`tests/security/provider-approval-shaped-output.test.ts` checks that
approval-shaped output (extra fields, statuses and values, including every
prompt-injection fixture in the shared matrix) creates no Approval and approves
no Decision. I have not run any of this against a real model, so I expect
messier output than the fixtures show.

### 7. Why enforce approval in Postgres? Isn't the application layer enough?

The application layer is enough until someone adds a second code path. The
database holds three controls, from migration `0004` and ADR-013
(`docs/decisions/ADR-013-database-enforced-approval-integrity.md`):

- a trigger on the decisions table (`decisions_require_human_approval`, calling
  `require_human_approval_for_approved_decision`) rejects any row moving to
  `approved` unless an approved Approval exists for that exact decision with a
  non-blank approver;
- a CHECK on `approvals.approver` rejects blank values, including whitespace,
  non-breaking spaces and zero-width characters;
- Approvals are append-only: every UPDATE is rejected, and a DELETE is only
  allowed when the whole Decision or Workspace is being removed (demo expiry
  and reset).

The raw-SQL tests are in `tests/security/approval-governance.test.ts`: an
approval for decision X does not let a raw write approve decision Y, a
raw insert of an already-approved decision with no Approval fails, and a blank
approver cannot be used to approve anything. Parallel opposing approvals are
tested against real Postgres (`tests/security/approval-concurrency.test.ts`)
and produce one approval and one final status. Audit entries get an
append-only trigger and artifact source fields get an immutability trigger in
the first migration.

Limits, so nobody has to ask: a table owner or superuser can drop the
triggers or TRUNCATE the table, so this guards against code-path mistakes, not
a malicious admin. The database also cannot tell a real person from a
non-blank string, and the demo has guest sessions, not real identity or SSO, so
"human" here means a recorded approver and an audit entry, and the approver in
the demo is the guest session. Tying that to real authentication is a
deployment concern, and the repo does not claim to have done it. A known
follow-up, issue #48, covers approver whitespace handling in the contract.

### 8. What is the licence?

MIT. The `LICENSE` file is at the repo root, copyright 2026 Shekib Ahmed. Use
it, fork it, build a pack for your own domain. The demo data is synthetic.

### 9. How can I contribute, or use it with an agent?

Six good-first-issue seeds are open as GitHub issues #40 to #45, described in
`docs/contributing/FIRST_CONTRIBUTIONS.md`. Follow-ups already filed: #46
(analytics session split on first load), #47 (casebook refresh for rule
wording) and #48 (approver whitespace in the contract). For agents there is an
`llms.txt` at the repo root and at `/llms.txt` on the live demo, and a
read-mostly stdio MCP server in `packages/mcp-server` (see the next section).
Pack scaffolding through it only works when the owner sets
`OIW_MCP_ALLOW_WRITE=1`.

---

## Agent surface and media (shipped; mention only if asked)

These are in the repository and describe things around the core product, not
features of it. Do not present them as part of the core.

- `llms.txt` at the repo root, also served at `/llms.txt` on the live demo.
- An MCP server, `packages/mcp-server` (stdio), with seven tools:
  `list_packs`, `get_pack_manifest`, `list_fixtures`, `get_casebook`,
  `validate_packs`, `run_eval` and `scaffold_pack`. `scaffold_pack` writes only
  when `OIW_MCP_ALLOW_WRITE=1` is set. A project-scoped `.mcp.json` is at the
  repo root. **It is not published to npm or the MCP registry yet** (an owner
  step), so do not say "install it from npm" or "listed in the registry"; say
  it runs from a checkout.
- A Claude Code plugin for pack authoring:
  `claude plugin marketplace add shekibahmed/operations-intelligence-workbench`
  then `claude plugin install oiw-pack-authoring@oiw`.
- Captioned walkthrough videos: a 25-second trailer (burned-in captions
  labelled "Synthetic demo data") and three walkthroughs of about 128 seconds
  each (`asset-reliability.mp4`, `process-exceptions.mp4`,
  `document-assurance.mp4`, WebVTT captions), in the GitHub release
  `media-latest` (the MP4s are release assets; the WebVTT files are committed
  in `docs/media/`). They are on the live Pages site at `#walkthroughs`
  (the trailer is also at `media/trailer.mp4`). The README hero is
  `docs/media/hero.gif`. Use the trailer for the native video upload on
  LinkedIn, not here.
- The Pages site (source in `site/`, live) has an animated nine-stage
  pipeline, the rendered casebook, an agent section and an opt-in background
  music toggle on the landing page. The music is off unless a
  visitor turns it on: Erik Satie, Gymnopedie No. 1, performed by Robin
  Alciatore (Musopen), public domain; credits are in `docs/media/CREDITS.md`.

---

## Posting mechanics

- **Day and time:** Tuesday, Wednesday or Thursday, between 07:00 and 10:00
  Pacific (14:00 to 17:00 UTC until 1 November), which is inside the keepalive
  window. The earliest sensible date from the refresh date, a Sunday, is
  Tuesday 2026-10-20, provided the pre-flight list above is done and the demo
  is warm. Avoid Monday mornings and Fridays.
- **Submit once.** Use the demo URL in the URL field and leave the text field
  empty; the first comment is where the explanation goes. Do not resubmit if
  it sinks; one clean attempt is better than several.
- **Comment right away.** Post the first comment within a minute or two of
  submitting so readers have context.
- **Stay in the thread at least three hours,** longer if it is moving. Be at
  the keyboard with the demo's logs and the repo open.
- **Reply to every substantive comment.** Be specific, concede real limits
  quickly ("you're right, that is not covered"), and link to the file or test
  rather than restating it. Thank people for bug reports, then fix and say so
  in the thread when it is fixed.
- **Do not argue with a dismissive comment.** One calm, factual reply at most.
- **Do not ask for upvotes**, anywhere, in any form. Do not coordinate
  voting, and do not ask people to comment either. If someone offers, decline.
- **Do not edit the title after posting to chase attention.** Fix typos only.
- **Do not delete and repost.** If the post is flagged, do not argue about it
  in the thread.
- **Do not mention it on LinkedIn in a way that links to the HN page and asks
  for support.** The LinkedIn plan in this launch kit links to the demo and
  the repo, not to the HN thread.
- **Keep an eye on the demo** for the first hours: Render logs, error rate,
  database connections, rate-limit 429s. If it is struggling or cold-starting,
  say so in the thread rather than hiding it.
- **Afterwards:** note what people asked, then turn the repeated questions into
  README or docs changes. That is the real return on the day.

---

## What the thread will probably bring up

Be ready, with a file to point at:

- "No hosted LLM, so what is the point": answers 2, 4 and 6.
- "Looks like an ERP/BPM tool with an AI sticker": the PRD section 5
  non-goals; the project is a reference for the evidence and approval pattern,
  not a workflow engine.
- "The fixture provider makes the eval meaningless": agree (answer 4).
- "Synthetic data proves nothing about messy real data": agree. The 52
  edge-case artifacts (conflicting dates, degraded OCR, prompt-injection text
  in a message, a CSV cell, a JSON field and a PDF page, near-duplicate
  artifacts, a Spanish-language artifact) are a start, not proof.
- "A superuser can drop your trigger": agree (answer 7). The claim is
  protection against code-path mistakes and non-privileged writers, not
  against the database owner.
- "Your approver is just a string": agree (answer 7). The demo approver is the
  guest session; there is no SSO and the repo does not claim real identity.
- "PDF handling": fixture PDFs are Markdown text with page markers, not real
  PDF binary parsing (amendment A7). Say so before they find it.
- "Why TypeScript and Next.js and not X": a modular monolith for a single
  deployable demo (ADR-001); no strong claim beyond that.
- "Security of the public demo": synthetic data only, no uploads of real data,
  guest workspaces that expire, rate limits, security headers; the threat model
  is in `docs/SECURITY.md`. Do not call it audited.
- "The rule says one related event but needs two": correct, the description
  wording is wrong and the predicate is right (issue #47).

---

## Numbers to re-verify before posting

Do not quote these without checking; they will drift. Counts of the test suite
are deliberately not in the draft; if you want to mention one, take it from the
latest CI run.

| Claim | Source | Check with |
|---|---|---|
| All P0 scope complete on `main`; a free hosted demo is live | README status, `SESSION.md` | read both; open the demo |
| Every CI-green merge to `main` migrates Neon and redeploys | `.github/workflows/deploy.yml` | latest Actions run |
| Keepalive pings every 10 min; first ping 06:00 UTC, last 21:50 UTC | `.github/workflows/keepalive.yml` | read it; Actions tab |
| 52 edge-case artifacts (20 / 16 / 16) | `scenario-packs/*/fixtures/edge-cases/index.json` | count entries per pack |
| 143 expected observations (130 extracted, 10 insufficient-evidence, 3 negated) | `scenario-packs/*/evaluations/edge-cases.gold.json` | count by `status` |
| 12 prompt-injection-style artifacts (4 per pack) | `scenario-packs/*/narrative/edge-cases.md`; `tests/security/injection/product-injection-matrix.test.ts` | the matrix covers 10 suspicious-content classes per pack; 4 per pack are prompt-injection text |
| `pnpm eval` reported 1.000 on every dimension (README snapshot) | README "How are AI conclusions checked?" | `pnpm eval` |
| Three packs; Playwright journeys cover all three | README | `ls apps/web/e2e` |
| Approval trigger requires an approved Approval with a non-blank approver; blank-approver CHECK; Approvals append-only | `db/migrations/0004_approval_db_hardening.sql`, ADR-013 | read both |
| Audit append-only trigger and artifact immutability trigger exist | `db/migrations/0000_dear_the_liberteens.sql` | read the migration |
| Replay, approver identity, approval-shaped provider output and parallel approvals are tested | `tests/security/approval-governance.test.ts`, `provider-approval-shaped-output.test.ts`, `approval-concurrency.test.ts` | run `pnpm test` with Postgres |
| `pnpm architecture:check` behaviour (pack IDs, industry terms, no pack file compiled, registry loads without any one pack) | `scripts/architecture-check.ts` | run it |
| MCP server has 7 tools; `scaffold_pack` needs `OIW_MCP_ALLOW_WRITE=1`; not published to npm or the MCP registry | `packages/mcp-server`, `llms.txt` | read the README; search npm |
| Good-first-issue seeds #40 to #45; follow-ups #46 to #48 | GitHub issues, `docs/contributing/FIRST_CONTRIBUTIONS.md` | open the issues |
| Dependabot open alerts: 0 on 2026-10-18, after PR #39 (OIW-922, merged) | Security tab, `gh api repos/shekibahmed/operations-intelligence-workbench/dependabot/alerts?state=open` | re-run the API call |
| Pages root, `#walkthroughs`, casebook, `media/trailer.mp4` and `llms.txt` return 200 | `.github/workflows/pages.yml` | `curl -sIL` each URL |
| Fixture extractions hold 145 observations against 143 in gold (two artifacts differ) | `scenario-packs/*/fixtures/edge-cases/extractions/`, `evaluations/edge-cases.gold.json` | count both |
| FR-021 is P1 and not implemented | `docs/PRD.md` section 15, README limitations | grep FR-021 |
| MIT, copyright 2026 Shekib Ahmed | `LICENSE` | read it |

The first-comment draft uses the corpus and approval figures above. If you add
any other figure, add it from a fresh run, not from this file.
