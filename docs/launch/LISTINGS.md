# Directory and list submissions

Ready-to-paste text for directories and awesome lists, plus the steps for the
official MCP Registry, GitHub topics and the v0.1.0 release notes.

Rules were read from the live sources on 2026-10-18 where this file quotes
them, but not every rule was re-checked in a final review. Anything marked
"unchecked" is a reminder to read the source. Lists change their rules and
their sections, so re-read the linked file before you submit and match
whatever it says on the day.

Placeholders used in this file:

- `<LIVE_DEMO_URL>`: the hosted demo, once it exists.
- `<NPM_PACKAGE>`: the npm package name chosen for the MCP server (see section 3).
- Pages site: https://shekibahmed.github.io/operations-intelligence-workbench/
  (walkthrough videos at `#walkthroughs`, casebook at
  `casebook/a-142-repeat-fault.html`). On 2026-10-18 this URL returned 404 and
  `.github/workflows` has no Pages deploy, so do not link it from any
  submission until it resolves. The casebook file is in the repo at
  `apps/web/public/casebook/a-142-repeat-fault.html`.
- Repo: https://github.com/shekibahmed/operations-intelligence-workbench

All submissions are made by the owner, under the owner's own account, after
reading the target's rules. Nothing in this file has been posted.

## Status at a glance

| Target | Can you submit today? | Blocker |
|---|---|---|
| awesome-selfhosted | No | No tagged release exists. The list requires a first release more than 4 months old. Also bans machine-written entries, so no entry text is drafted here. |
| awesome-mcp-servers | Not yet | `packages/mcp-server` is not on `main` in this worktree. List only after it has landed and works from a clean clone. |
| awesome-ai-agent-governance (systempromptio) | Yes, with a fit caveat | None blocking. Fit is partial, see section 4. |
| awesome-ai-governance (agentrust-io) | Yes, lower fit | None blocking. Fit is weaker, see section 4. |
| Official MCP Registry | No | Package must be on npm first. Owner action. |
| GitHub topics | Yes | None. |
| GitHub Release v0.1.0 | Yes | None. Creating it also starts the awesome-selfhosted clock. |

Suggested order: GitHub topics, then Release v0.1.0 (start the 4-month clock as
early as you are willing to call it a release), then the two governance lists,
then npm publish, MCP Registry, awesome-mcp-servers once the server package is
real.

---

## 1. awesome-selfhosted

Data repo where entries live: https://github.com/awesome-selfhosted/awesome-selfhosted-data
Rules read from:
https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md.
The pull request template and `.github/ISSUE_TEMPLATE/addition.md` were not
re-checked. Read them before filing.

### Does OIW qualify? Not yet.

| Requirement | OIW today |
|---|---|
| Software was first released more than 4 months ago (CONTRIBUTING.md) | Fails. The repo has no tags and no GitHub releases (`git tag` is empty, `gh release list` returns nothing). The package.json version is 0.1.0 but nothing is published. Read how the list starts the count. |
| Actively maintained (unchecked) | Commits on `main` through October 2026. |
| Working installation instructions (unchecked) | The README quick start lists clone, `pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm dev`, and the README says these were run against a clean local Postgres. That is the README's own statement. Re-run it on a fresh clone before you file. |
| FOSS licence (unchecked) | MIT. Check it against their `licenses.yml`. |
| Not a library, SDK or something that needs you to write application code first (unchecked) | Arguable. The demo app runs as delivered, but the stated purpose is a reference platform you adapt by writing Scenario Packs. A maintainer may read it either way. Expect that question. |
| Not already listed elsewhere (unchecked) | Read their rules for lists whose entries are excluded as duplicates, and check OIW against them. |
| One item per pull request (unchecked) | There is one item. |

Earliest filing date: the day after the 4-month anniversary of the release you
create. If you publish v0.1.0 on 2026-10-20, the earliest filing date is
2027-02-21. Filing before then does not meet the rule and will probably get the
PR closed.

### Why there is no entry text in this file

The list's CONTRIBUTING.md says: "Machine/LLM-generated contributions are not
allowed and will result in a ban." Its contribution rules also ask for a human
attestation that the submission was done by a human. So the entry and the PR
description have to be written by you, in your own words. This is a rule of
the list, and following it is the point of not drafting one here.

What an AI assistant is allowed to do under that policy, and what this file
does: summarise the rules, check eligibility, and review an entry you wrote
yourself and tell you what looks wrong.

### Rules to apply when you write it yourself

The field list and description conventions below come from the entry template
and were not re-checked. Read `addition.md` and the description rules in
CONTRIBUTING.md first.

Entry file: `software/<kebab-case-name>.yml`, for example
`software/operations-intelligence-workbench.yml`. Expect these fields: `name`,
`website_url`, `source_code_url`, `description`, `licenses`, `platforms` and
`tags`, plus optional ones such as `demo_url`. CONTRIBUTING.md confirms that in
single-page mode the software appears only under the first tag, so tag order
matters.

Description conventions to check (unchecked): leave out redundant words such
as open-source, free and self-hosted; keep it short; no leading "A" and no
"$PROJECT is a ..." phrasing; add "(alternative to $PRODUCT)" only if the
project presents itself as one, which OIW does not; stay under the template's
length limit.

`demo_url` (unchecked): the template is understood to reserve it for
interactive demos, not video. The hosted demo at `<LIVE_DEMO_URL>` would
qualify if it uses guest sessions with no login. The walkthrough videos and
the recorded casebook are not interactive demos, so keep them out of
`demo_url`.

Facts you can draw on for your own wording (all verifiable in the repo):
licence MIT; Node.js >= 22, pnpm, PostgreSQL 17 via `docker-compose.yml`; a
`Dockerfile` exists; three synthetic Scenario Packs; the intelligence provider
is a deterministic fixture provider with no live model; synthetic data only.
The list will care that the Docker and Node.js platform values exist in their
`platforms/` directory. Check before you write them.

Process: create the file through GitHub's "new file" button on the data repo's
`software/` folder, with a commit message such as `add Operations Intelligence
Workbench`, choose "Create a new branch for this commit and start a pull
request", and tick the PR template boxes truthfully.

Honest note for the PR: it is a demo and a reference platform. If a maintainer
asks about users or production use, the true answer is that there are none to
report.

---

## 2. awesome-mcp-servers (punkpeye)

Repo: https://github.com/punkpeye/awesome-mcp-servers
Rules read from the raw `CONTRIBUTING.md` and the live `README.md` on
2026-10-18. Check the repository for a pull request template and any policy on
AI-written text before you submit. Neither was checked.

### Do not submit yet

The list is for servers with a public GitHub repository that you install and
run yourself. `packages/mcp-server` is described as landing this week but is
not present in this worktree. Submit only when all of these are true:

- [ ] `packages/mcp-server` is merged to `main`.
- [ ] Its README gives a one-command way to run it (for example `npx <NPM_PACKAGE>`
      or a documented `pnpm` command) that works from a clean clone.
- [ ] You have started it from a real MCP client and called each tool once.

### Category

Use **Developer Tools** (`### 💻 Developer Tools`). The server is meant to
help an agent author and check Scenario Packs against fixtures and the
evaluation harness, which is development work. The category is the
maintainers' call and they may move it.

### Line format

From the live README: one entry per line, name linked to the repo, then
language, scope and OS emojis from the Legend, then ` - ` and a short
description. Copy the shape of a neighbouring entry in the live list. Leave
out any score badge unless the maintainers ask for it.

Legend values for this server: 📇 (TypeScript or JavaScript codebase), 🏠 (local
service, since it is meant to run on the user's machine over stdio), and the OS
icons 🍎 🪟 🐧 if you have tested all three. Drop any OS you have not tested. Do
not add 🎖️ (official implementation); that is for vendors' own servers of their
own product.

### Entry draft (write the final description after the server ships)

The server is not on `main` yet, so every clause below describes intent and
is unverified until the server exists.

```
- [shekibahmed/operations-intelligence-workbench](https://github.com/shekibahmed/operations-intelligence-workbench) 📇 🏠 🍎 🪟 🐧 - Gives agents read access to the Scenario Pack contract, synthetic fixtures and the evaluation harness of Operations Intelligence Workbench, so a pack can be authored and checked against deterministic fixtures. Synthetic data only.
```

Check before pasting: the tool names and what they actually do in
`packages/mcp-server/README.md`. If the server cannot run the evaluation
harness, delete that clause. Do not describe anything the server does not do
today. If the server lives in a subfolder, link the repo root.

### Pull request

Steps, from CONTRIBUTING.md: fork, branch (for example `add-oiw-mcp-server`),
edit `README.md` only, place the line in Developer Tools in alphabetical order
by name, commit, push, open a PR.

The stated rule is alphabetical order within each category. Follow it and let
the maintainers adjust.

PR title:

```
Add shekibahmed/operations-intelligence-workbench (Developer Tools)
```

Do not add the `🤖🤖🤖` suffix. That marker is the fast-track opt-in for
automated agents, and you are submitting this yourself.

PR description:

```
Adds an MCP server that exposes the Scenario Pack contract, synthetic
fixtures and the evaluation harness of Operations Intelligence Workbench to
MCP clients. It runs locally over stdio. MIT licensed, TypeScript.

Placed under Developer Tools in alphabetical position, as one line. Data is
synthetic and the intelligence provider in the main app is a deterministic
fixture provider; there is no live model.

I am the maintainer of this project.
```

---

## 3. Official MCP Registry

Docs to read on the day (modelcontextprotocol/registry): the quickstart,
package types, authentication, versioning and official registry requirements
pages. Only the requirement that npm packages come from
`https://registry.npmjs.org` was re-checked. The steps, the `mcpName` check,
the error table and the `server.json` schema below follow the docs as last
read and were not re-verified, so compare each with the current quickstart.
Registry tooling changes quickly.

**This is an owner action.** It needs your npm login and your GitHub login. An
assistant should not run steps 2, 5 or 6 for you.

### Preconditions

- [ ] `packages/mcp-server` has landed and works (same gate as section 2).
- [ ] The package is on the public npm registry. The registry holds metadata
      only, so the npm package must be published first. Only
      `https://registry.npmjs.org` is accepted.
- [ ] You have an npm account that can publish the chosen name. On 2026-10-18
      `@shekibahmed/oiw-mcp-server` and `oiw-mcp-server` both returned 404 from
      the npm registry, so neither was published then. A scoped name needs the
      npm scope `@shekibahmed` to exist under your account.
- [ ] The workspace package is not `"private": true`. The root `package.json`
      is private, which is fine for the root, but the MCP server package must be
      publishable.

### Step 1. Add `mcpName` to the MCP server's `package.json`

For npm packages the registry verifies ownership by reading `mcpName`. It must
equal the server name in `server.json`. With GitHub login the name must start
with `io.github.<your-github-username>/`.

```json
{
  "name": "<NPM_PACKAGE>",
  "version": "0.1.0",
  "mcpName": "io.github.shekibahmed/oiw-mcp-server",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/shekibahmed/operations-intelligence-workbench.git",
    "directory": "packages/mcp-server"
  },
  "description": "MCP server for Operations Intelligence Workbench Scenario Packs, fixtures and evaluation."
}
```

Use your GitHub login exactly as GitHub shows it. The repo URL shows
`shekibahmed`, so the namespace is `io.github.shekibahmed/`.

### Step 2. Publish the package to npm (owner)

```bash
cd packages/mcp-server
pnpm build
npm adduser            # only if not already logged in
npm publish --access public
```

Confirm at `https://www.npmjs.com/package/<NPM_PACKAGE>`. The `mcpName` field
must be in the published tarball. Check with `npm view <NPM_PACKAGE> mcpName`.

### Step 3. Install `mcp-publisher`

```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
mcp-publisher --help
```

Homebrew also works: `brew install mcp-publisher`.

### Step 4. Create `server.json`

Run `mcp-publisher init` inside `packages/mcp-server` to get a template, then
edit it to this shape. The registry limits the length of `description`; check
the limit against the current schema. `name` must equal `mcpName`. `version`
must be unique per publication.

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.shekibahmed/oiw-mcp-server",
  "title": "Operations Intelligence Workbench",
  "description": "Scenario Packs, synthetic fixtures and evaluation for Operations Intelligence Workbench.",
  "repository": {
    "url": "https://github.com/shekibahmed/operations-intelligence-workbench",
    "source": "github",
    "subfolder": "packages/mcp-server"
  },
  "version": "0.1.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "<NPM_PACKAGE>",
      "version": "0.1.0",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

That description is 88 characters. Count again after any edit:
`node -e "console.log(require('./server.json').description.length)"`.

Remove the template's example `environmentVariables` block unless the server
really reads environment variables. `subfolder` is the documented field for a
server inside a monorepo.

Optionally validate without publishing: `mcp-publisher validate`.

### Step 5. Log in with GitHub (owner)

```bash
mcp-publisher login github
```

It prints a device code. Open https://github.com/login/device, enter the code,
and authorise. A successful login prints "Successfully authenticated!". The
personal namespace `io.github.shekibahmed/*` goes with the GitHub login.

### Step 6. Publish (owner)

```bash
mcp-publisher publish
```

Expected: "Successfully published" and the server name and version.

### Step 7. Verify

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.shekibahmed/oiw-mcp-server"
```

### If it fails

| Error | Action |
|---|---|
| "Registry validation failed for package" | `mcpName` missing from the published npm package, or not equal to `server.json` `name`. Publish a new npm version with the field, update both versions in `server.json`, retry. |
| "Invalid or expired Registry JWT token" | `mcp-publisher login github` again. |
| "You do not have permission to publish this server" | Name does not start with `io.github.<your-login>/`. |

---

## 4. Awesome lists for agents, human approval and governance

### Search result, stated plainly

An earlier search of GitHub for awesome lists on human-in-the-loop, document
AI, AI agents and LLM evaluation turned up mostly stale, off-topic or
product-oriented lists. The specifics (last-push dates, issue counts, star
counts) were not re-verified, so none are repeated here. For any list you add
beyond the two below, check for recent commits and written contribution rules.

The two lists below have written contribution rules and cover human approval
and audit trails. Both have a fit gap that you should know about before you
submit.

Fit gap, in both cases: these lists are about governing AI agents at runtime.
OIW is a reference platform where AI-derived proposals cannot become approved
decisions without a recorded human approval, and the rule is enforced in the
application and in a database trigger. It is not a runtime that sits in front
of someone else's agent. Describe it as what it is. A maintainer who says it is
out of scope is making a fair call.

### 4a. systempromptio/awesome-ai-agent-governance

Repo: https://github.com/systempromptio/awesome-ai-agent-governance
Rules read from the raw `CONTRIBUTING.md`:

- Scope: "runtime governance of AI agents: policy enforcement, audit trails,
  access control, cost management, and compliance tooling".
- Submit by opening an issue titled `[Submission]: Tool Name` with: name, URL,
  one-sentence description, which section it belongs in, and why it meets the
  scope criteria. "PRs are also accepted", with the entry in alphabetical
  order within its section.
- Quality bar: publicly accessible; commit within 12 months; description
  "factual, no marketing language, no unverified performance claims";
  "If you are the author of a tool, disclose that in the issue."
- Excluded: vendor marketing, general safety research, CI gates over
  AI-generated code.

Best section: **Agentic Architecture Patterns** (it already holds reference
implementations such as Impri and HumanLayer). Second choice: **Open-Source
Governance Toolkits**. Their entry style is `- [Name](url) - description.`

Issue title:

```
[Submission]: Operations Intelligence Workbench
```

Issue body:

```
Name: Operations Intelligence Workbench
URL: https://github.com/shekibahmed/operations-intelligence-workbench
Suggested section: Agentic Architecture Patterns

One sentence: Open-source reference platform in which AI-derived proposals
cannot become approved decisions without a recorded human approval, enforced
in the application layer and by a PostgreSQL trigger, with an append-only
audit trail.

Why it meets the scope: it is a working implementation of an approval gate
and an audit trail for AI-assisted decisions. A Decision cannot be set to
approved unless an Approval row with outcome "approved" exists (migration
0000, trigger decisions_require_human_approval), and audit entries reject
updates and deletes (trigger audit_entries_append_only). Rules and providers
can only propose decisions. The test suite includes attempts to bypass the
gate: direct state transitions, an approver with no authenticated identity,
prompt-injection text posing as approval (which also covers provider output
posing as approval), replaying the same approval request, and concurrent
opposing approvals against real PostgreSQL.

Limits, so the scope call is easy: it is a reference platform and demo, not a
runtime that sits in front of third-party agents. The intelligence provider
in the demo is a deterministic fixture provider (no live model is wired in),
and all data is synthetic. MIT licensed. No customers or production
deployments to report.

Disclosure: I am the author of this project. It is built through Kaamchor
(https://bekaamchor.com), an AI consultancy.
```

Check before you send: the list of bypass attempts comes from the README
("Where does human approval occur?") and `docs/EVALUATION.md` section 9. Open
the test files under `tests/security` and confirm each case is still there.
Section 9 calls for replaying an approval against a different decision, but
the only replay test found replays the same request against the same decision,
so that case is left out above. Edit the disclosure line to say how you
describe your own role at Kaamchor.

If you prefer a PR, the line is:

```
- [Operations Intelligence Workbench](https://github.com/shekibahmed/operations-intelligence-workbench) - Reference platform where AI-derived proposals cannot become approved decisions without a recorded human approval, enforced in the application and by a PostgreSQL trigger, with an append-only audit trail. Fixture provider and synthetic data only. MIT.
```

Insert in alphabetical order. "Operations ..." goes after entries starting
"Ope", so find the right gap in the live section before committing.

### 4b. agentrust-io/awesome-ai-governance

Repo: https://github.com/agentrust-io/awesome-ai-governance. Rules read from
the raw `CONTRIBUTING.md`:

- Fork, add the tool in the appropriate category, use the format
  `- [Name](url) - One-line description of governance-relevant functionality.`,
  keep descriptions short and neutral, open a PR.
- "The tool or resource must be actively maintained", "Links must work".
- Not wanted: "General AI/ML tools with no governance, safety or trust angle".
- No author-disclosure rule and no rule about AI-written text.

Fit is weaker than 4a. The README has sections named **Governance Frameworks**
and **Agent Frameworks with Governance Features**. OIW is neither exactly. If
you submit, put it in Agent Frameworks with Governance Features and expect the
maintainers might decline or move it. It is reasonable to submit to 4a first
and only do 4b if 4a is accepted.

Line:

```
- [Operations Intelligence Workbench](https://github.com/shekibahmed/operations-intelligence-workbench) - Reference platform with a human-approval gate for AI-proposed decisions, enforced in the application and by a PostgreSQL trigger, plus an append-only audit trail. Deterministic fixture provider and synthetic data only; demo, not production.
```

PR title: `Add Operations Intelligence Workbench`

PR description:

```
Adds one entry under Agent Frameworks with Governance Features. It is an
open-source (MIT) reference platform where a Decision cannot be approved
without a recorded human Approval, with an append-only audit trail. It is a
demo with a deterministic fixture provider and synthetic data, not a runtime
for third-party agents. I am the author. Happy to move it or drop it if it is
out of scope.
```

---

## 5. GitHub topics

Current topics (14): ai, ai-agents, audit-trail, drizzle, evidence,
human-in-the-loop, nextjs, open-source, operations, pnpm, postgres,
scenario-packs, typescript, workflow-automation.

GitHub limits the number of topics per repository. Check the current limit
before adding more. Candidates, none added yet:

| Add | Why |
|---|---|
| `ai-governance` | Closest to what the approval gate and audit trail are about. |
| `llm-evaluation` | `pnpm eval` runs an evaluation harness with 11 metrics. It runs on fixtures, not a live model, so the topic is accurate for the harness, but be ready to say so. |
| `document-ai` | The Document Assurance pack and PDF/text ingestion. |
| `approval-workflow` | Matches the core feature. |
| `mcp-server` | Add only after `packages/mcp-server` is on `main`. |
| `model-context-protocol` | Same condition as `mcp-server`. |

If `packages/mcp-server` has not landed, use `agentic-workflows` and
`reference-architecture` in the last two slots instead, and add the MCP topics
later, removing the least useful existing topics if you hit the limit.

Commands (needs the `gh` CLI logged in as the repo owner):

```bash
gh repo edit shekibahmed/operations-intelligence-workbench \
  --add-topic ai-governance \
  --add-topic llm-evaluation \
  --add-topic document-ai \
  --add-topic approval-workflow \
  --add-topic mcp-server \
  --add-topic model-context-protocol
gh repo view shekibahmed/operations-intelligence-workbench --json repositoryTopics
```

Also check Settings, General. The website field currently points to
https://bekaamchor.com. Change it to the Pages URL only once the Pages site
resolves.

---

## 6. GitHub Release v0.1.0

Why: releases show up in the Releases feed, in the "Watch > Custom > Releases"
option, and in package-list checks such as awesome-selfhosted's first-release
rule. The repo currently has no releases and no tags.

Before tagging:

- [ ] `main` is green in CI.
- [ ] The launch kit and any landing page or walkthrough PRs you want in this
      release are merged, so the tag points at what the notes describe.
- [ ] Edit the bracketed lines below to match what has actually merged. Delete
      any that have not.
- [ ] `package.json` version is already `0.1.0`. No bump needed.

Command:

```bash
git checkout main && git pull
gh release create v0.1.0 \
  --repo shekibahmed/operations-intelligence-workbench \
  --target main \
  --title "v0.1.0: first tagged release" \
  --notes-file docs/launch/release-v0.1.0-notes.md
```

Save the notes block below as `docs/launch/release-v0.1.0-notes.md`, or pass
them with `--notes` or paste them into the web form. Do not mark it as a
pre-release unless you want to; a pre-release may not count toward a list's
"first release" rule, so ask each list if it matters.

### Notes draft

```markdown
First tagged release of Operations Intelligence Workbench, an open-source
reference platform that turns messages, files and records into evidence-backed
observations, cases and decisions, with a human approval before any high-risk
decision goes through.

This is a demo and a reference implementation. It is not a production system.

## What is in it

- Three Scenario Packs, each with a fictional site and synthetic data:
  Asset Reliability (repeat brake fault on asset A-142), Process Exceptions
  (viscosity deviation on supplier lot KM-LOT-448), Document Assurance
  (liability-cap conflict in a fictional master services agreement).
- One ten-step journey that works the same way for every pack: raw artifacts
  arrive, one is processed, an ambiguous field goes to a review queue, an
  event is assembled, a rule fires and creates a signal, a case and a
  proposed decision, a person approves it, and the Leadership, Operations and
  Technical dashboards update from that one approval.
- Approval enforced at two layers. A Decision cannot be set to approved
  without a recorded Approval, in the application services and in a
  PostgreSQL trigger. Audit entries are append-only, also enforced by a
  trigger.
- Pack-neutral core. Entity types, rules, workflows, dashboards and tour steps
  come from a validated Scenario Pack. `pnpm architecture:check` scans the
  core packages for pack names and industry-specific terms, and checks that
  the domain package imports no pack code. A fourth template pack,
  `scenario-packs/_template`, holds one example of each contract type.
- An evaluation harness (`pnpm eval`) covering field precision and recall,
  classification, evidence spans, entity resolution, abstention, rule
  execution, approval policy, duplicate prevention and case state, for all
  three packs.
- A recorded evidence casebook you can read with no setup, in the repo at
  `apps/web/public/casebook/a-142-repeat-fault.html`. [Once the Pages site
  resolves, add the link:
  https://shekibahmed.github.io/operations-intelligence-workbench/casebook/a-142-repeat-fault.html]
- Guided tour and free exploration in the web app. Live demo: <LIVE_DEMO_URL>
- [Include only if merged: walkthrough videos with captions. Link
  https://shekibahmed.github.io/operations-intelligence-workbench/#walkthroughs
  only once the Pages site resolves.]
- [Include only if merged: MCP server in `packages/mcp-server`, exposing
  Scenario Packs, fixtures and the evaluation harness to agents]
- [Include only if merged: Claude Code pack-authoring plugin, installed with
  `claude plugin marketplace add shekibahmed/operations-intelligence-workbench`]
- [Include only if merged: `llms.txt`]

## Limits you should know about

- No live language model is wired in. The intelligence provider is a
  deterministic fixture provider: each fixture is keyed by checksum to a
  recorded extraction, so the same input always gives the same output. The
  `IntelligenceProvider` interface can take a live one; none is implemented.
- Recorded evaluation scores (README and run notes in docs/agent-runs) are
  1.000 on every metric for every pack. That is expected, because the provider
  replays recorded extractions keyed to each fixture. The harness tests the
  pipeline, rules and approval logic, not model quality. These are recorded
  results, not a fresh run for this release.
- All data is synthetic. Do not upload real or confidential data.
- PDF handling is text-layer only. Fixture PDFs are Markdown with page
  markers, not parsed binaries.
- The default rate-limit store is process-local. Set
  `OIW_RATE_LIMIT_STORE=postgres` for more than one instance.
- Email and webhook delivery for the "Adapt this workflow" form are interfaces
  without an implementation. Submissions are stored in Postgres.
- No customers, no measured outcomes. Dashboard figures labelled hypothetical
  or estimated are exactly that.

## Run it

Node.js 22 or later, pnpm, Docker for Postgres.

    git clone https://github.com/shekibahmed/operations-intelligence-workbench.git
    cd operations-intelligence-workbench
    pnpm install
    docker compose up -d
    pnpm db:migrate
    pnpm dev

Then open http://localhost:3000/demo.

## Licence and maker

MIT. Built by Shekib through Kaamchor (https://bekaamchor.com), an AI
consultancy. Issues and pull requests are welcome; see
docs/CONTRIBUTING.md.
```

Check before publishing the notes:

- The 1.000 evaluation figure comes from the README ("it reported 1.000 on
  every dimension against every pack at the time this was written") and from
  run notes in docs/agent-runs. Run `pnpm eval` on the commit you are tagging
  and edit the figure if it differs.
- The Pages URL returned 404 on 2026-10-18 and `.github/workflows` has no Pages
  deploy. Set up and deploy Pages, confirm the URLs resolve, then keep the
  bracketed Pages lines. Delete them until then.

After publishing: in the repo, open Watch, Custom, tick Releases, so the
release shows in your own feed too. The release page URL
(`https://github.com/shekibahmed/operations-intelligence-workbench/releases/tag/v0.1.0`)
is a better link for the awesome-list PRs than the repo root where a list
asks for a version.

---

## Verification log

What was checked on 2026-10-18, and what was not.

Checked against the repository and live sources:

- Repository: no git tags and no GitHub releases; `package.json` version
  0.1.0, MIT, root package private; Node.js >= 22, `postgres:17-alpine` in
  `docker-compose.yml`, a `Dockerfile`; three Scenario Packs plus `_template`;
  quick-start commands match the README; 14 GitHub topics; commits on `main`
  through October 2026; migration `db/migrations/0000_dear_the_liberteens.sql`
  with triggers `decisions_require_human_approval` and
  `audit_entries_append_only`; the limits listed in the release notes;
  `docs/EVALUATION.md` section 9 exists.
- awesome-selfhosted `CONTRIBUTING.md`: first release more than 4 months old,
  LLM-generated contributions banned, human attestation, first-tag rule in
  single-page mode.
- punkpeye/awesome-mcp-servers: scope, `🤖🤖🤖` marker, alphabetical order,
  Developer Tools section, legend emojis.
- systempromptio/awesome-ai-agent-governance and
  agentrust-io/awesome-ai-governance: contribution rules and section names.
- MCP Registry: only `https://registry.npmjs.org` is accepted.
- npm: `@shekibahmed/oiw-mcp-server` and `oiw-mcp-server` returned 404.
- The `server.json` description is 88 characters.

Not checked, or found not to hold:

- `packages/mcp-server`, the Claude Code plugin, `llms.txt` and the walkthrough
  videos are not in this worktree. `apps/web/src/app/page.tsx` exists, but
  whether the landing page is animated was not checked.
- The GitHub Pages URL returned 404 and there is no Pages workflow.
- awesome-selfhosted pull request template, `addition.md`, `licenses.yml`,
  description length limit, merge timing and `demo_url` rule.
- MCP Registry quickstart steps and description length limit.
- Governance list issue counts and last-commit dates.
- GitHub topic counts and the topic limit.
- The test suite has no test that replays an approval against a different
  decision. It replays the same request against the same decision.
- `pnpm architecture:check` does not compile the tree with a pack removed,
  although the README says it does.
- Evaluation scores come from recorded runs, not a re-run.
