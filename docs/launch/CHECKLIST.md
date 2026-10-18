# Two-week launch checklist

This is the working plan for getting the Operations Intelligence Workbench in
front of people over fourteen days. Tick boxes as you go. Every post is made
by the owner personally; the drafts in this folder are starting points, not
final copy.

Links used throughout. Only the live demo and its `/llms.txt` were confirmed
live on 2026-10-18; the Pages site was not (see below):

- Live demo: https://operations-intelligence-workbench.onrender.com . The
  `/demo` page selects a pack and starts a guest workspace. No sign-in. It runs
  on Render free with a Neon free database. Every CI-green merge to `main`
  migrates Neon and redeploys (`.github/workflows/deploy.yml`), provided the
  owner secrets `DATABASE_URL` and `RENDER_DEPLOY_HOOK_URL` are set. They are.
- Pages site: https://shekibahmed.github.io/operations-intelligence-workbench/
  (planned content: animated nine-stage pipeline, walkthrough videos at
  `#walkthroughs`, rendered casebook at `casebook/a-142-repeat-fault.html`, an
  agent section and opt-in background music). It is not live: on 2026-10-18 the
  root and the casebook page returned 404, and PR #21 (OIW-915) was still open.
  Do not post a Pages link until PR #21 has merged and the D0 link check
  resolves it. The README on `main` already links to these Pages URLs.
- Videos, on the GitHub release `media-latest`: `trailer.mp4` (25 s, burned-in
  captions labelled Synthetic demo data) and the walkthroughs
  `asset-reliability.mp4`, `process-exceptions.mp4` and
  `document-assurance.mp4` (about 128 s each, WebVTT captions). The README hero
  is `docs/media/hero.gif`.
- Repo: https://github.com/shekibahmed/operations-intelligence-workbench

No `<LIVE_DEMO_URL>` placeholder is left in this file. Other drafts in this
folder may still carry one; D0 has a step to find them.

## Before you start

### What to say about the project, every time

Say these plainly wherever the project comes up. They are true today and
people will find out anyway.

- The intelligence provider is a deterministic fixture provider. No live LLM
  is wired in yet. Extraction results are replayed from recorded fixtures, and
  the evaluation suite runs without a model.
- The demo runs on Render's free tier. The first request after 15 minutes idle
  can take about a minute. A keepalive pings it every 10 minutes between 06:00
  and 21:50 UTC (the last scheduled ping) and does nothing outside that window.
  Scheduled runs can be delayed or skipped.
- All data is synthetic. The three scenario packs (Asset Reliability, Process
  Exceptions, Document Assurance) use fictional sites and companies. The
  Process Exceptions pack is named "Process Exception Management" in its
  manifest. The fictional content has not been audited line by line, so do
  not say it has.
- It is a demo and a reference platform, not a production system.
- The approver in the demo is the guest session. There is no SSO. The system
  records who approved, but the database cannot tell a real person from a
  non-blank string. Do not describe the approver as a verified person. The
  demo approver identity has not been traced end to end in code; keep to what
  ADR-013 and the README say.
- There are no customers, no users to point to, and no measured outcomes.
  Dashboard figures are classified Observed, Calculated, Estimated or
  Hypothetical, and the UI has a badge for each. Check on screen that the
  figure you quote shows a badge before you quote it, and say which one. Do
  not turn any of them into results.
- Mention Kaamchor (bekaamchor.com), the AI consultancy through which Shekib
  builds this, once per post at most and only where it explains who made the
  thing. Never as a pitch.

### Claims you can make, and where each one is backed

Quote these as written or in your own plain words. Each points to a file.

- **The approval gate is enforced at the application and database layers, and
  partly at the contract layer.** The contract (`approver: z.string().min(1)`
  in `packages/contracts/src/domain.ts`) rejects only an empty approver.
  Whitespace-only and no-break-space approvers pass the contract and are
  rejected by the application and the database (open issue #48 asks for the
  contract to reject them too). Say "three layers" only with that qualifier.
  Migration `db/migrations/0004_approval_db_hardening.sql` and
  `docs/decisions/ADR-013-database-enforced-approval-integrity.md` add a CHECK
  that rejects blank approvers (including no-break space and zero-width
  characters), make the decision trigger require an approved Approval with a
  non-blank approver, and make Approvals append-only: UPDATE is rejected, and
  DELETE is allowed only when the whole Decision or Workspace is removed.
  The tests below check empty and whitespace approvers at the application
  layer, not the contract layer.
- **Tests behind that claim**:
  `tests/security/approval-governance.test.ts` (cross-decision replay is
  rejected; empty, whitespace, `system` and provider approvers are rejected),
  `tests/security/provider-approval-shaped-output.test.ts` (approval-shaped
  provider output never creates an Approval) and
  `tests/security/approval-concurrency.test.ts` (parallel opposing approvals).
- **Honest limits of that claim, say them with it**: a table owner or
  superuser can drop the triggers, and TRUNCATE is not covered by the row triggers; the database cannot tell a real
  person from a non-blank string; the demo approver is the guest session.
- **The adversarial corpus**: 52 edge-case artifacts (20 Asset Reliability, 16
  Process Exceptions, 16 Document Assurance), each with an expected outcome.
  They carry 143 expected observations: 130 extracted, 10
  insufficient-evidence and 3 negated. Prompt-injection-style artifacts are
  among them, but do not quote an injection count until you have re-counted:
  the edge-case narratives list 4 per pack, while the product injection
  matrix (`tests/security/injection/product-injection-matrix.test.ts`) expects
  10 fixtures per pack, 30 in total. Counts come from
  `scenario-packs/*/fixtures/edge-cases/index.json` and
  `scenario-packs/*/evaluations/edge-cases.gold.json`. Re-count before you
  quote them (D0).
- **`pnpm architecture:check`** scans the non-test sources of every package
  under `packages/` for pack IDs (read from the manifests) and for industry
  terms, confirms that no TypeScript project compiles a scenario-pack file,
  and confirms that the pack registry still loads every other pack with any
  one removed. Older drafts may say it checks only industry terms; if so, fix
  the draft to match the script (`scripts/architecture-check.ts`).
- **Agent surface**: `llms.txt` at the repo root, also served at the live
  demo's `/llms.txt`; `packages/mcp-server` (stdio MCP server, 7 tools:
  `list_packs`, `get_pack_manifest`, `list_fixtures`, `get_casebook`,
  `validate_packs`, `run_eval`, `scaffold_pack`; `scaffold_pack` only works
  with `OIW_MCP_ALLOW_WRITE=1`); a root `.mcp.json`; and the Claude Code
  plugin, installed with
  `claude plugin marketplace add shekibahmed/operations-intelligence-workbench`
  then `claude plugin install oiw-pack-authoring@oiw`. It is not published to
  npm or the MCP registry yet. That is an owner step (D5), so do not say it is.
- **Music**: the optional background music is Erik Satie, Gymnopedie No. 1,
  performed by Robin Alciatore (Musopen), public domain. Credits are in
  `docs/media/CREDITS.md`. It is off until a reader presses play.
- **Rule wording**: the `safety-critical-removal-approval` rule description
  says "at least one other related event", but the engine requires two other
  related events (issue #47). Describe the rule by its predicate, not by its
  description text.
- **Security**: OIW-922 (PR #39) is meant to clear the 17 open Dependabot
  alerts (next 16.3.8, sharp 0.35.5, dev transitive floors). On 2026-10-18 the
  PR was open and the 17 alerts were still open on `main`. Say nothing about
  it until the PR has merged and the alert list is empty.

### Files this checklist points to

Before a day's tasks, check the file exists on `main`. As of 2026-10-18 only
`docs/contributing/FIRST_CONTRIBUTIONS.md`, `docs/media/CREDITS.md` and
`docs/media/hero.gif` are in the integration tree. The `docs/launch/` files
(this checklist, the drafts and `carousels/`) live only on the OIW-917 branch
until it merges.

| File | Used on |
|---|---|
| `docs/launch/LINKEDIN.md` and `docs/launch/carousels/` | D1, D6 to D14 |
| `docs/launch/ARTICLE.md` | D2 |
| `docs/launch/REDDIT.md` | D3 to D5 |
| `docs/launch/SHOW_HN.md` | D4 |
| `docs/launch/LISTINGS.md` | D5 |
| `docs/contributing/FIRST_CONTRIBUTIONS.md` | D6 to D14 |
| `docs/media/CREDITS.md`, `docs/media/hero.gif` | any post that shows the video, hero or music |

The drafts above were written before the demo, MCP server and videos were
live. Where they still say "no hosted demo", "`packages/mcp-server` does not
exist", or "replay against a different decision is not yet tested", the
current state in this file wins. "Pages returns 404" is still true until PR
#21 merges. Fix the draft before
you use it, in your own words.

### What is shipped, and what is still an owner step

The animated landing pipeline (OIW-910), walkthrough videos, `llms.txt`, MCP
server and Claude Code plugin are merged to `main`, so they can be mentioned
once the D0 checks pass. The Pages site is not merged. Facts to keep straight:

- Not published: the MCP server is not on npm or in the MCP registry. Do not
  announce it as installable from either. D5 covers the owner steps.
- PR #21 (Pages) and PR #39 (OIW-922, dependency alerts) were both open on
  2026-10-18. Check their state when you post. If either has not merged, leave
  out what depends on it.
- Do not announce anything as coming soon.

### Calendar assumption

The plan assumes D0 is Sunday 18 October 2026, so D1 is Monday and D4 is Thursday. Show HN
goes on a Tuesday, Wednesday or Thursday, and this puts it on Thursday. That
is a scheduling choice, not a Hacker News rule. If you start on a different
day, keep the order and slide the whole plan, and avoid stacking other big
posts on the Show HN day.

| Day | Weekday and date (2026) |
|---|---|
| D0 | Sun 18 Oct |
| D1 | Mon 19 Oct |
| D2 | Tue 20 Oct |
| D3 | Wed 21 Oct |
| D4 | Thu 22 Oct |
| D5 | Fri 23 Oct |
| D6 | Sat 24 Oct |
| D7 | Sun 25 Oct |
| D8 | Mon 26 Oct |
| D9 | Tue 27 Oct |
| D10 | Wed 28 Oct |
| D11 | Thu 29 Oct |
| D12 | Fri 30 Oct |
| D13 | Sat 31 Oct |
| D14 | Sun 1 Nov |

---

## D0 (Sunday): soak and set up the repo

Nothing gets posted today. The goal is that anyone who clicks a link finds a
working thing.

### Live demo soak

- [ ] Open https://operations-intelligence-workbench.onrender.com/demo on a
      laptop. Pick each pack and start its guided tour (Asset Reliability,
      Process Exceptions, Document Assurance). Go end to end, including the
      approval step and the dashboard update after it.
- [ ] Repeat all three tours on a phone, on mobile data rather than home wifi.
- [ ] Open the demo in a private window to check a first-time visitor path
      (pack selector, guest workspace with no sign-in, reset demo).
- [ ] Check cold-start behavior. The keepalive
      (`.github/workflows/keepalive.yml`) pings every 10 minutes from 06:00 to
      22:00 UTC. Outside that window, or if a scheduled run was skipped (GitHub
      can delay or skip them), the first request after 15 minutes idle can
      take about a minute. Time one cold load, and load the demo by hand about
      five minutes before any post goes out. 07:00 to 10:00 Pacific is 14:00 to
      17:00 UTC while US daylight time lasts (until 1 Nov) and 15:00 to 18:00
      UTC after, so Show HN falls inside the keepalive window.
- [ ] Check the latest `deploy.yml` run on `main` succeeded, so what you are
      testing is what is deployed.
- [ ] Run the link check over every URL in the launch drafts and the README.
      It must report the Pages root, `#walkthroughs`,
      `casebook/a-142-repeat-fault.html` and the live demo's `/llms.txt`. Until
      PR #21 has merged and deployed, the Pages links return 404; wait for it. Do not
      post any link that does not resolve. The casebook source is
      `apps/web/public/casebook/a-142-repeat-fault.html`, in the repo.
- [ ] On a phone, check `#walkthroughs` loads and the three walkthroughs play
      with captions on. Check `trailer.mp4` from the `media-latest` release
      plays on mute with its burned-in captions readable.
- [ ] Re-count the corpus: 52 artifacts (20, 16, 16), 143 expected observations
      (130 extracted, 10 insufficient-evidence, 3 negated), and settle the
      injection fixture count (4 per pack in the narratives, 10 per pack in the
      product injection matrix), from `scenario-packs/*/fixtures/edge-cases/index.json`
      and `scenario-packs/*/evaluations/edge-cases.gold.json`. Run `pnpm eval`
      and `pnpm architecture:check` before you quote anything from them.
- [ ] From a clean machine or fresh clone, follow the agent instructions as a
      stranger would: `pnpm build`, then start `packages/mcp-server` through
      the root `.mcp.json`; then the two `claude plugin` commands. Do not
      announce either until both work.
- [ ] Submit the Adapt this workflow form once from the demo with obviously
      fake details, then check it shows up in `pnpm analytics:summary`
      (see Measurement). Delete or note the test row so it is not counted as
      interest. Known issue #46: the analytics session can split on a visitor's
      first page load, so expect session counts to run slightly high.
- [ ] Find leftover placeholders in the other drafts with
      `grep -rn "LIVE_DEMO_URL" docs/launch` and replace each with
      https://operations-intelligence-workbench.onrender.com (or `/demo` where
      the text means "try it").
- [ ] Check CI is green on `main`:
      https://github.com/shekibahmed/operations-intelligence-workbench/actions

### Repo presentation

- [ ] Upload the social preview image: repo Settings, General, Social preview
      (1280 by 640 px). The file is `docs/media/social-preview.png`.
- [ ] Check the topics. The repo already carries 20, including `mcp-server`,
      `llms-txt`, `human-in-the-loop`, `audit-trail` and `llm-evaluation`.
      Remove any that are not accurate (`llm-evaluation` needs the caveat that
      the harness runs on fixtures, not a live model). Do not add more.
- [ ] Check the repo description and website field. The website field already
      points at the live demo. Keep it; switch it to the Pages site only after
      that site resolves.
- [ ] Publish GitHub Release v0.1.0 with short honest notes: what is in it
      (three packs, the evaluation suite, the database-enforced approval gate,
      the MCP server and plugin, the walkthrough videos), that the provider is
      a deterministic fixture, that data is synthetic, and that the npm
      package is not published. Only the `media-latest` release exists today,
      and it holds the videos; leave it alone. Example:
      `gh release create v0.1.0 --title "v0.1.0" --notes-file <notes-file>`
- [ ] Pin the repo on your GitHub profile (Customize your pins).
- [ ] Skim the README top section as a stranger would: the hero GIF, the demo
      and Pages links, the status paragraph. It should match this file. If
      something is wrong, fix it in a separate task, because it is outside
      `docs/launch`.

### Baseline numbers (do this before anything is posted)

- [ ] Record the D0 baseline in the measurement table: views, uniques,
      referrers, stars, forks, demo host request count, analytics summary,
      LinkedIn follower count. GitHub's traffic endpoints report only a recent
      window (documented as 14 days), so capturing it now matters.

---

## D1 (Monday): LinkedIn carousel 1

- [ ] Re-read the carousel PDF on a phone. Text must be legible at phone size.
- [ ] Rewrite the post caption in your own voice. No hashtags. No closing
      generic question.
- [ ] Post the carousel from `docs/launch/carousels/`. Put the link in the
      first comment, not the post body.
- [ ] Be at the keyboard for the first hour. Answer every comment yourself,
      in your own words.
- [ ] Monday measurement: record numbers (see Measurement).

## D2 (Tuesday): article and LinkedIn text post

- [ ] Final read of `ARTICLE.md` ("What a human-approval gate looks like when
      the database enforces it"). Check each repo claim against the code once
      more. The constraint and trigger claims now have a file to point to:
      `db/migrations/0004_approval_db_hardening.sql`, ADR-013 and the three
      tests under `tests/security/` named above. Link them. Keep the limits in
      the text (owner or superuser can drop triggers, and TRUNCATE is not covered by the row triggers; the database
      cannot tell a real person from a non-blank string; the demo approver is a
      guest session). Remove what you cannot point to a file for.
- [ ] Replace `<LIVE_DEMO_URL>` in the article with the live demo URL, and
      add the walkthroughs (`#walkthroughs`) and casebook links once the D0
      link check passes.
- [ ] Publish on dev.to first. This is the canonical copy.
- [ ] Publish on Hashnode with the canonical URL set to the dev.to post.
- [ ] Add the repo link and, once only, one plain line about who made it.
- [ ] Post one LinkedIn text post (from `LINKEDIN.md`, rewritten by you). No
      hashtags and no closing generic question. Link to the article in the
      first comment.
- [ ] Answer comments on all three places.

## D3 (Wednesday): Reddit, first sub

- [ ] Open `REDDIT.md` and re-read the rules of the target sub today. Rules
      change, and some subs restrict self-promotion or AI-related posts. If
      the rules forbid it or require a prior-participation threshold you have
      not met, skip the sub and say so in your notes.
- [ ] Post to r/opensource using the sub-specific draft. Write the title and
      body fresh for this sub. Do not paste text used elsewhere.
- [ ] Stay in the thread for the first few hours.

## D4 (Thursday): Show HN

- [ ] Submit between 07:00 and 10:00 Pacific, on a Tuesday, Wednesday or
      Thursday. This is your own scheduling rule, not a Hacker News one.
- [ ] Use the title you picked from `SHOW_HN.md`. The URL is the repo or
      the live demo, as decided in that file. Warm the demo first (D0).
- [ ] Post your first comment immediately. You rewrite the Show HN text in
      your own words; the draft is a starting point only.
- [ ] Stay in the thread for the whole morning. Answer each question directly
      and state limits without defending them: fixture provider, synthetic
      data, demo only, guest approver rather than a verified person, and the
      database gate's limits (owner or superuser can drop triggers, and TRUNCATE is not covered by the row triggers).
- [ ] Do not ask anyone to upvote, in any channel, ever. Do not share the HN
      link in group chats asking for support.
- [ ] If the submission gets no traction, leave it. Do not resubmit it.
- [ ] Reddit r/selfhosted: post in the afternoon only if the HN thread is
      quiet enough that you can look after both. If not, move it to D6 and
      keep the rest of the order. Check that sub's rules first and make sure
      the post is about something that can be self-hosted (compose setup
      exists).

## D5 (Friday): awesome-list PRs, MCP registry, domain sub

- [ ] Open `LISTINGS.md`. For each awesome list, read its CONTRIBUTING file
      today (alphabetical order, one entry per PR, description length, required
      sections) and match it exactly.
- [ ] Open the PRs. One PR per list. Use the text prepared in `LISTINGS.md`,
      adjusted to the list's format.
- [ ] MCP registry: the server is on `main` but not published. Do this only
      after you have published `packages/mcp-server` to npm (owner step) and
      the package installs from a clean directory. Follow the registry steps in
      `LISTINGS.md`. If it is not published, skip this and move it to the first
      day it is. The same applies to awesome-mcp-servers. Until then, the
      install route is the clone plus `.mcp.json`, or the Claude Code plugin.
      `LISTINGS.md` was drafted before the server landed, so re-check what it
      says about the package.
- [ ] Reddit domain sub: pick the one pack whose sub allows project posts
      (see `REDDIT.md`). Check rules first. Skip if none fits.
- [ ] Reply to anything outstanding from D1 to D4.

---

## D6 to D14: steady posting and contributors

Post to LinkedIn twice a week, on weekdays. Do not post on weekends. Space the
posts out by at least two days.

### D6 (Saturday) and D7 (Sunday)

- [ ] No posts. Answer comments and issues.
- [ ] The six good-first-issue seeds are already open as GitHub issues
      #40 to #45 (source: `docs/contributing/FIRST_CONTRIBUTIONS.md`). Check
      each is labelled, still names the file to touch, the command that proves
      it works and how big it is, and that nobody has opened a duplicate. Do not
      improvise new issue text. Follow-ups #46 (analytics session split on first
      load), #47 (casebook refresh for rule wording) and #48 (approver
      whitespace in the contract) are bugs and enhancements, not seeds; leave
      them off the good-first list.
- [ ] Check that `pnpm install`, `pnpm lint` and `pnpm test` from a clean
      clone work as the CONTRIBUTING doc says, before any contributor tries.

### D8 (Monday)

- [ ] Monday measurement: record numbers.
- [ ] Review the first-week table (below) and decide which channels earn
      more time. Drop one channel if it produced nothing.

### D9 (Tuesday)

- [ ] LinkedIn carousel 2. Link in first comment. No hashtags. Rewrite the
      caption.
- [ ] Reply to every comment.

### D10 (Wednesday)

- [ ] Triage GitHub issues and PRs. Respond to every contributor within a day.
      Label and welcome first-time contributors.

### D11 (Thursday)

- [ ] LinkedIn text post (from `LINKEDIN.md`, rewritten). Choose one that
      shows a specific piece of the work, such as the review queue, the
      rule trace or the database-enforced approval gate, rather than a general
      announcement. If it names a rule, describe it by its predicate (issue
      #47).
- [ ] Reply to every comment.

### D12 (Friday)

- [ ] Check awesome-list PRs for maintainer feedback. Fix requested changes
      the same day.
- [ ] Check the MCP registry listing if submitted.

### D13 (Saturday) and D14 (Sunday)

- [ ] No posts.
- [ ] D14: write a short end-of-fortnight note (below) and decide what
      carries into weeks three and four.

### What does not fit in fourteen days

The kit has more material than two posts a week can use in this window. The
rest carries over at the same pace, in this order:

1. Carousel 3.
2. LinkedIn video post with `trailer.mp4`, uploaded natively (download it
   from the `media-latest` release; do not link out to the video). Its
   captions are burned in and say Synthetic demo data. Check them on mute on a
   phone before posting. Put the demo link in the first comment.
3. Carousel 4.
4. Remaining text posts, one at a time.

---

## Answering comments

- [ ] Reply to every comment, on every channel, yourself.
- [ ] Write the replies in your own words. Do not paste text from an AI
      assistant. People can tell, and on HN and Reddit it costs credibility.
- [ ] When someone points out a real limit, agree with it and say what is and
      is not done. When someone is wrong, say so politely once with a link to
      the file or doc.
- [ ] Bug reports become GitHub issues the same day.
- [ ] If someone asks for a live LLM, say it is not wired in yet and that
      the fixture provider exists so the demo and the evaluation suite behave
      the same every time.
- [ ] If someone asks whether the approval gate can be bypassed, answer with
      the layers (and that the contract only rejects an empty approver), link ADR-013 and the three test files, and state the
      limits: owner or superuser can drop triggers, and TRUNCATE is not covered by the row triggers, the database
      cannot tell a real person from a non-blank string, the demo approver is
      the guest session. Never say "tamper-proof".
- [ ] If the demo is slow, say it is on Render free and was asleep.

---

## Measurement

### Each Monday (D1, D8, and a final pass on D15)

Record these in the table below. GitHub's traffic data covers only a recent
window (documented as 14 days), so do not skip a week.

1. GitHub views and clones:
   ```bash
   gh api repos/shekibahmed/operations-intelligence-workbench/traffic/views
   gh api repos/shekibahmed/operations-intelligence-workbench/traffic/clones
   ```
2. Where visitors came from:
   ```bash
   gh api repos/shekibahmed/operations-intelligence-workbench/traffic/popular/referrers
   gh api repos/shekibahmed/operations-intelligence-workbench/traffic/popular/paths
   ```
3. Stars and forks:
   ```bash
   gh repo view shekibahmed/operations-intelligence-workbench --json stargazerCount,forkCount
   ```
4. Request count for the demo service, from the Render dashboard for the
   past seven days. The keepalive adds about 96 requests a day (every 10
   minutes for 16 hours), so subtract them. Neon free is a separate
   dashboard and only matters if the demo stops responding.
5. Demo use and Adapt this workflow submissions. Run against the demo
   database from a trusted shell with `DATABASE_URL` set to it:
   ```bash
   pnpm analytics:summary
   ```
   The output has event counts, the funnel by scenario and an "Assessment
   submissions" line. That line is the Adapt count. It prints aggregates
   only. Separate real submissions from your own tests.
6. LinkedIn impressions per post, from the post analytics.
7. Hours spent on each channel that week, from your own log. Write the hours
   down as you go, not at the end.

### Record

| Date | Day | GitHub views | Uniques | Clones | Stars | Forks | Host requests | Demos started | Tours completed | Adapt submissions | LinkedIn impressions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | D0 baseline | | | | | | | | | | |
| | D1 | | | | | | | | | | |
| | D8 | | | | | | | | | | |
| | D15 | | | | | | | | | | |

### Per-channel log

Fill in the hours as you spend them. At the end, divide visits by hours.

| Channel | Hours spent | Visits attributed (referrers, UTM-free estimate) | Stars after | Visits per hour |
|---|---|---|---|---|
| LinkedIn | | | | |
| dev.to / Hashnode | | | | |
| Show HN | | | | |
| Reddit | | | | |
| Awesome lists and MCP registry | | | | |
| Good-first-issues | | | | |

Attribution here is rough. GitHub referrers show the source domain, not the
specific post, and some traffic arrives with no referrer. Treat the numbers as
a ranking, not an accounting.

### Decide what to keep

On D8 and D15, rank the channels by visits per hour. Keep the ones at the
top and cut the bottom one. If a channel produced visits but no stars, that
is still worth knowing and still counts toward the ranking. A channel with no
visits after real effort gets dropped, not retried with louder copy.

### End-of-fortnight note (D14 or D15)

- [ ] Write five lines: what was posted, what the numbers were, what each
      channel returned per hour, what you will stop doing, what you will do
      in weeks three and four. Keep it factual. If the numbers are small,
      write that they are small.

---

## Do not

- [ ] No upvote or star requests. Not on HN, Reddit, LinkedIn, Discord or in
      private messages.
- [ ] No bought stars, bought followers or engagement pods.
- [ ] No identical cross-posts. Every channel gets text written for that
      channel and that audience.
- [ ] No AI-written comment replies. Drafts in this folder are for posts only,
      and even those are rewritten in your own words before publishing.
- [ ] No ROI, savings, accuracy or time-saved claims, and no customer or user
      claims. The only figures that exist are test counts, corpus counts,
      evaluation scores on synthetic fixtures, and dashboard figures on
      synthetic data that carry a provenance badge. Say which when you quote
      one. The corpus and eval figures describe fixtures, not real-world
      accuracy.
- [ ] Do not describe the fixture provider as an AI model, or the demo as
      production.
- [ ] Do not post on a weekend, and do not post the same day on more than two
      channels unless you can stay in both threads.
- [ ] Do not resubmit a Show HN that did not land, and do not delete and
      repost a Reddit thread.
- [ ] Do not say the MCP server is on npm or in the MCP registry until you
      have published it. Today it runs from a clone, and the plugin installs
      from the repo marketplace.
- [ ] Do not call the approval gate tamper-proof or say the database can verify
      who approved. State the limits whenever you state the gate.
- [ ] Do not describe a rule by its description text if it is
      `safety-critical-removal-approval`. Use its predicate (issue #47).
- [ ] Do not edit the product to chase attention mid-launch. Fixes for real
      bugs are fine.
