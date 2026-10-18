# Two-week launch checklist

This is the working plan for getting the Operations Intelligence Workbench in
front of people over fourteen days. Tick boxes as you go. Every post is made
by the owner personally; the drafts in this folder are starting points, not
final copy.

Placeholders used throughout:

- `<LIVE_DEMO_URL>`: the hosted demo. Fill in once D0 soak passes.
- Pages site: https://shekibahmed.github.io/operations-intelligence-workbench/
  (walkthrough videos at `#walkthroughs`, casebook at
  `casebook/a-142-repeat-fault.html`). Not confirmed live. The root returned
  404 when this checklist was last checked, and no workflow in this repo
  publishes it. The casebook source is
  `apps/web/public/casebook/a-142-repeat-fault.html`.
- Repo: https://github.com/shekibahmed/operations-intelligence-workbench

## Before you start

### What to say about the project, every time

Say these plainly wherever the project comes up. They are true today and
people will find out anyway.

- The intelligence provider is a deterministic fixture provider. No live LLM
  is wired in yet. Extraction results are replayed from recorded fixtures, and
  the evaluation suite runs without a model.
- All data is synthetic. The three scenario packs (Asset Reliability, Process
  Exceptions, Document Assurance) use fictional sites and companies. The
  Process Exceptions pack is named "Process Exception Management" in its
  manifest.
- It is a demo and a reference platform, not a production system.
- There are no customers, no users to point to, and no measured outcomes.
  Every figure in the dashboards carries a provenance badge in the UI
  (Observed, Calculated, Estimated or Hypothetical). Do not turn any of them
  into results, and say which badge a figure has when you quote it.
- Mention Kaamchor (bekaamchor.com), the AI consultancy through which Shekib
  builds this, once per post at most and only where it explains who made the
  thing. Never as a pitch.

### Files this checklist points to

Some of these land in parallel with this checklist. Before a day's tasks,
check the file exists on `main` or in the launch branch. The last column is
what was in the working tree when this checklist was edited.

| File | Used on | Present when edited |
|---|---|---|
| `docs/launch/LINKEDIN.md` and `docs/launch/carousels/` | D1, D6 to D14 | No |
| `docs/launch/ARTICLE.md` | D2 | Yes |
| `docs/launch/REDDIT.md` | D3 to D5 | Yes |
| `docs/launch/SHOW_HN.md` | D4 | Yes |
| `docs/launch/LISTINGS.md` | D5 | No |
| `docs/contributing/FIRST_CONTRIBUTIONS.md` | D6 to D14 (once merged) | No |

### Optional items that may or may not be merged

None of these were in the repo when this checklist was edited. Mention one in
a post only after confirming it is on `main` and working. If one is not
ready, leave it out. Do not announce it as coming soon.

- Animated landing page on the Pages site.
- Walkthrough videos with captions (Pages site, `#walkthroughs`).
- MCP server exposing packs, fixtures and evaluation to agents
  (`packages/mcp-server`).
- Claude Code pack-authoring plugin:
  `claude plugin marketplace add shekibahmed/operations-intelligence-workbench`
- `llms.txt`.

### Calendar assumption

The plan assumes D0 is a Sunday, so D1 is Monday and D4 is Thursday. Show HN
goes on a Tuesday, Wednesday or Thursday, and this puts it on Thursday. That
is a scheduling choice, not a Hacker News rule. If you start on a different
day, keep the order and slide the whole plan, and avoid stacking other big
posts on the Show HN day.

| Day | Weekday |
|---|---|
| D0 | Sun |
| D1 | Mon |
| D2 | Tue |
| D3 | Wed |
| D4 | Thu |
| D5 | Fri |
| D6 | Sat |
| D7 | Sun |
| D8 | Mon |
| D9 | Tue |
| D10 | Wed |
| D11 | Thu |
| D12 | Fri |
| D13 | Sat |
| D14 | Sun |

---

## D0 (Sunday): soak and set up the repo

Nothing gets posted today. The goal is that anyone who clicks a link finds a
working thing.

### Live demo soak

- [ ] Open `<LIVE_DEMO_URL>` on a laptop. Click through all three guided tours
      end to end (Asset Reliability, Process Exceptions, Document Assurance),
      including the approval step and the dashboard update after it.
- [ ] Repeat all three tours on a phone, on mobile data rather than home wifi.
- [ ] Open the demo in a private window to check a first-time visitor path
      (scenario selector, guest session, reset demo).
- [ ] Check cold-start behavior. The repo has no keepalive job
      (`.github/workflows/expire-demo.yml` is manual-only), so a host that
      scales to zero will be slow after idle. Load the demo after it has sat
      for a while, note the cold-start time, and decide whether to warm it by
      hand before each post goes out.
- [ ] Confirm the Pages site is up and the casebook opens. If it is not
      deployed, either publish it first or point posts at the repo instead:
      https://shekibahmed.github.io/operations-intelligence-workbench/casebook/a-142-repeat-fault.html
- [ ] If the Pages site is up, check that `#walkthroughs` loads and, if videos
      are merged, that they play with captions on a phone.
- [ ] Submit the Adapt this workflow form once from the demo with obviously
      fake details, then check it shows up in `pnpm analytics:summary`
      (see Measurement). Delete or note the test row so it is not counted as
      interest.
- [ ] Replace every `<LIVE_DEMO_URL>` in the launch drafts with the real URL.
- [ ] Check CI is green on `main`:
      https://github.com/shekibahmed/operations-intelligence-workbench/actions

### Repo presentation

- [ ] Upload the social preview image: repo Settings, General, Social preview
      (1280 by 640 px).
- [ ] Add topics. Suggested set, trim to what is accurate:
      `operations`, `workflow`, `human-in-the-loop`, `audit-trail`,
      `rules-engine`, `postgres`, `nextjs`, `typescript`, `synthetic-data`,
      `mcp`. Example:
      `gh repo edit shekibahmed/operations-intelligence-workbench --add-topic operations,human-in-the-loop,audit-trail,rules-engine,typescript,nextjs,postgres`
- [ ] Check the repo description and website field. Set the website field to
      the Pages site or `<LIVE_DEMO_URL>`.
- [ ] Publish GitHub Release v0.1.0 with short honest notes: what is in it,
      that the provider is a deterministic fixture, that data is synthetic.
      Example:
      `gh release create v0.1.0 --title "v0.1.0" --notes-file <notes-file>`
- [ ] Pin the repo on your GitHub profile (Customize your pins).
- [ ] Skim the README top section as a stranger would. The Status paragraph
      still says there is no hosted demo; if that is now wrong, it needs fixing
      in a separate task before D1, because it is outside docs/launch.

### Baseline numbers (do this before anything is posted)

- [ ] Record the D0 baseline in the measurement table: views, uniques,
      referrers, stars, forks, demo host request count, analytics summary,
      LinkedIn follower count. GitHub keeps traffic data for only 14 days, so
      capturing it now matters.

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
      more, especially anything about constraints or triggers. Remove what you
      cannot point to a file for.
- [ ] Publish on dev.to first. This is the canonical copy.
- [ ] Publish on Hashnode with the canonical URL set to the dev.to post.
- [ ] Add the repo link and, once only, one plain line about who made it.
- [ ] Post one LinkedIn text post (from `LINKEDIN.md`, rewritten by you). Link
      to the article in the first comment.
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
      `<LIVE_DEMO_URL>`, as decided in that file.
- [ ] Post your first comment immediately (rewritten in your own words).
- [ ] Stay in the thread for the whole morning. Answer each question directly
      and state limits without defending them: fixture provider, synthetic
      data, demo only.
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
- [ ] MCP registry: only after the npm publish of `packages/mcp-server` has
      happened and the package installs from a clean directory. Follow the
      registry steps in `LISTINGS.md`. If the package is not published, skip
      this and move it to the first day it is.
- [ ] Reddit domain sub: pick the one pack whose sub allows project posts
      (see `REDDIT.md`). Check rules first. Skip if none fits.
- [ ] Reply to anything outstanding from D1 to D4.

---

## D6 to D14: steady posting and contributors

Post to LinkedIn twice a week, on weekdays. Do not post on weekends. Space the
posts out by at least two days.

### D6 (Saturday) and D7 (Sunday)

- [ ] No posts. Answer comments and issues.
- [ ] Open the good-first-issues using the commands in
      `docs/contributing/FIRST_CONTRIBUTIONS.md` once that file is merged. If
      it is not merged, wait. Do not improvise issue text. Each issue should
      name the file to touch, the command that proves it works, and how big
      it is.
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
      shows a specific piece of the work, such as the review queue or the
      rule trace, rather than a general announcement.
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
2. Trailer video post. Check captions on mute before posting.
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

---

## Measurement

### Each Monday (D1, D8, and a final pass on D15)

Record these in the table below. GitHub traffic data covers only the last 14
days, so do not skip a week.

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
4. Request count for the demo service, from your host's metrics for the past
   seven days. `docs/DEPLOYMENT.md` names Google Cloud Run or equivalent as
   the supported target. No host is chosen yet, so use whichever one you
   deploy to.
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
      claims. The only figures that exist are test counts, evaluation scores
      on synthetic fixtures, and dashboard figures on synthetic data that
      carry a provenance badge. Say which when you quote one.
- [ ] Do not describe the fixture provider as an AI model, or the demo as
      production.
- [ ] Do not post on a weekend, and do not post the same day on more than two
      channels unless you can stay in both threads.
- [ ] Do not resubmit a Show HN that did not land, and do not delete and
      repost a Reddit thread.
- [ ] Do not announce the MCP server, plugin or videos until they are merged
      and tested from a clean machine.
- [ ] Do not edit the product to chase attention mid-launch. Fixes for real
      bugs are fine.
