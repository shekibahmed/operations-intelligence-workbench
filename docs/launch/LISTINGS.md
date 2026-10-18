# Directory and list submissions

Ready-to-paste text for directories and awesome lists, plus the steps for the
official MCP Registry, GitHub topics and the v0.1.0 release notes.

Rules were read from the live sources on 2026-10-18 where this file quotes
them, but not every rule was re-checked in a final review. Anything marked
"unchecked" is a reminder to read the source. Lists change their rules and
their sections, so re-read the linked file before you submit and match
whatever it says on the day.

Repo claims in this file were refreshed on 2026-10-18 against `main`
(all related pull requests are merged) and were then
cross-checked by two independent passes. Claims that did not hold were
corrected or removed.

Fixed links used in this file:

- Live demo: https://operations-intelligence-workbench.onrender.com (the
  `/demo` route lets a visitor pick a pack). It runs on Render free hosting
  with a Neon free database, as a guest workspace with no sign-in. A keepalive
  workflow pings it every 10 minutes between 06:00 and 22:00 UTC; outside
  those hours, or after 15 minutes idle, the first request can take about a
  minute. Every CI-green merge to `main` migrates the database and redeploys
  (`.github/workflows/deploy.yml`).
- Pages site: https://shekibahmed.github.io/operations-intelligence-workbench/
  (animated nine-stage pipeline, walkthrough videos at `#walkthroughs`,
  rendered casebook at `casebook/a-142-repeat-fault.html`, agent section,
  opt-in background music toggle on the landing page) is live (PR #21,
  OIW-915). The root, `#walkthroughs`, the casebook page, `media/trailer.mp4`
  and `llms.txt` returned 200 on 2026-10-18. The source is in the repo
  (`site/index.html`). Re-run the link check before you paste any URL into a
  submission.
- Repo: https://github.com/shekibahmed/operations-intelligence-workbench
- Agent surface: `llms.txt` at the repo root, also served at
  https://operations-intelligence-workbench.onrender.com/llms.txt.

One placeholder remains:

- `<NPM_PACKAGE>`: the npm package name chosen for the MCP server (see
  section 3). The workspace package is currently named `@oiw/mcp-server` and is
  marked private; the name you publish under is an owner decision.

All submissions are made by the owner, under the owner's own account, after
reading the target's rules. Nothing in this file has been posted.

## Status at a glance

| Target | Can you submit today? | Blocker |
|---|---|---|
| awesome-selfhosted | No | No software release exists. The only release is `media-latest`, which holds the walkthrough videos and trailer. The list requires a first release more than 4 months old. Also bans machine-written entries, so no entry text is drafted here. |
| awesome-mcp-servers | Yes, after your own check | The server is on `main`. Run it from a clean clone and call each tool once from a real MCP client first (section 2). It is not on npm, so expect the maintainers to ask how to install it. |
| awesome-ai-agent-governance (systempromptio) | Yes, with a fit caveat | None blocking. Fit is partial, see section 4. |
| awesome-ai-governance (agentrust-io) | Yes, lower fit | None blocking. Fit is weaker, see section 4. |
| Official MCP Registry | No | Package must be on npm first and must stop being `private`. Owner action. |
| GitHub topics | Mostly done | The repo is at 20 topics. Two candidates are not on it (section 5). |
| GitHub Release v0.1.0 | Yes | None. Creating it also starts the awesome-selfhosted clock. |

Suggested order: Release v0.1.0 (start the 4-month clock as early as you are
willing to call it a release), then the two governance lists, then
awesome-mcp-servers, then npm publish and the MCP Registry.

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
| Software was first released more than 4 months ago (CONTRIBUTING.md) | Fails. The only tag and release is `media-latest` (created 2026-10-18), a bucket for walkthrough videos, not a software release. `v0.1.0` has not been created. The package.json version is 0.1.0 but nothing is published to a package registry. Read how the list starts the count, and whether a media-only release could count (it should not). |
| Actively maintained (unchecked) | Commits on `main` through October 2026. |
| Working installation instructions (unchecked) | The README quick start lists clone, `pnpm install`, `docker compose up -d`, `pnpm db:migrate`, `pnpm dev`. The README only lists the commands. `docs/DEPLOYMENT.md` (line 202) describes a run from a clean release checkout against a local dockerized PostgreSQL. The first-run compose problem was fixed under OIW-914. Re-run the steps on a fresh clone before you file. |
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
interactive demos, not video. The hosted demo at
https://operations-intelligence-workbench.onrender.com/demo qualifies on that
reading: it uses guest sessions with no sign-in. Say in the PR that it runs on
free hosting and the first request after idle can take about a minute. The
walkthrough videos and the recorded casebook are not interactive demos, so
keep them out of `demo_url`.

Facts you can draw on for your own wording (all verifiable in the repo):
licence MIT; Node.js >= 22, pnpm, PostgreSQL 17 via `docker-compose.yml`; a
`Dockerfile` exists; three synthetic Scenario Packs; the intelligence provider
is a deterministic fixture provider with no live model; synthetic data only;
a public demo with guest workspaces and no sign-in. The list will care that the Docker and Node.js platform values exist in their
`platforms/` directory. Check before you write them.

Process: create the file through GitHub's "new file" button on the data repo's
`software/` folder, with a commit message such as `add Operations Intelligence
Workbench`, choose "Create a new branch for this commit and start a pull
request", and tick the PR template boxes truthfully.

Honest note for the PR: it is a demo and a reference platform. If a maintainer
asks about users or production use, the true answer is that there are none to
report. Guest identity in the demo is a session, not a verified person.

---

## 2. awesome-mcp-servers (punkpeye)

Repo: https://github.com/punkpeye/awesome-mcp-servers
Rules read from the raw `CONTRIBUTING.md` and the live `README.md` on
2026-10-18. Check the repository for a pull request template and any policy on
AI-written text before you submit. Neither was checked.

### Gate before you submit

The list is for servers with a public GitHub repository that you install and
run yourself. `packages/mcp-server` is on `main`: a stdio server with seven
tools (`list_packs`, `get_pack_manifest`, `list_fixtures`, `get_casebook`,
`validate_packs`, `run_eval`, `scaffold_pack`), a root `.mcp.json`, and a
README with client configuration for Claude Code, Claude Desktop and Cursor.
`scaffold_pack` is refused unless `OIW_MCP_ALLOW_WRITE=1`. `run_eval` writes to
the database named by `DATABASE_URL`, so it needs a throwaway database. The
package is not published to npm or the MCP Registry yet (owner step, section 3).

Still yours to do, because only you can:

- [ ] The server runs from a clean clone with the README's commands:
      `pnpm install`, `pnpm build`, `node packages/mcp-server/dist/cli.js`.
      There is no `npx` one-liner until the package is on npm.
- [ ] You have started it from a real MCP client and called each of the seven
      tools once.

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

### Entry draft

Every clause below comes from `packages/mcp-server/README.md` and its tool
list.

```
- [shekibahmed/operations-intelligence-workbench](https://github.com/shekibahmed/operations-intelligence-workbench) 📇 🏠 🍎 🪟 🐧 - Read-mostly stdio server over Operations Intelligence Workbench Scenario Packs: pack manifests, 52 adversarial synthetic fixtures with expected outcomes, an evidence casebook, pack validation and a deterministic evaluation run. Runs from a clone; synthetic data only.
```

Check before pasting: the OS icons (drop any you have not tested) and that
the fixture count still matches `scenario-packs/*/fixtures/edge-cases/index.json`
(20 asset-reliability, 16 process-exceptions, 16 document-assurance). Do not
describe anything the server does not do. The server lives in a subfolder, so
link the repo root.

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
Adds an MCP server that exposes Operations Intelligence Workbench Scenario
Packs, an adversarial synthetic fixture corpus with expected outcomes, the
evidence casebook, pack validation and evaluation to MCP clients. It has seven
tools, runs locally over stdio, and is read-mostly: scaffolding is refused
unless OIW_MCP_ALLOW_WRITE=1. MIT licensed, TypeScript. It is run from a clone
and is not published to npm yet.

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

- [ ] `packages/mcp-server` works from a clean clone and from a real client
      (same check as section 2). It is on `main`.
- [ ] The package is on the public npm registry. The registry holds metadata
      only, so the npm package must be published first. Only
      `https://registry.npmjs.org` is accepted.
- [ ] You have an npm account that can publish the chosen name. On 2026-10-18
      `@oiw/mcp-server` (the current workspace name), `@shekibahmed/oiw-mcp-server`,
      `oiw-mcp-server` and `oiw-mcp` all returned 404 from the npm registry, so
      none was published then. A scoped name needs that npm scope to exist under
      your account, and `@oiw` may not be yours; if it is not, rename the
      package before publishing.
- [ ] The workspace package is not `"private": true`. Today
      `packages/mcp-server/package.json` has `"private": true`, so
      `npm publish` will refuse it until you remove that line. It also has no
      `mcpName` yet (step 1). The root `package.json` is private, which is fine
      for the root.

### Step 1. Add `mcpName` to the MCP server's `package.json`

For npm packages the registry verifies ownership by reading `mcpName`. It must
equal the server name in `server.json`. With GitHub login the name must start
with `io.github.<your-github-username>/`. The draft `server.json` already in
`packages/mcp-server` uses `io.github.shekibahmed/oiw-mcp`, so use that value
in both files unless you change both.

```json
{
  "name": "<NPM_PACKAGE>",
  "version": "0.1.0",
  "mcpName": "io.github.shekibahmed/oiw-mcp",
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
`shekibahmed`, so the namespace is `io.github.shekibahmed/`. Remove
`"private": true` from the same file. The `files: ["dist"]` list and the `bin`
entry (`oiw-mcp`) are already there. Note that `validate_packs`, `run_eval` and
`scaffold_pack` shell out to the repo's `pnpm` scripts, so a package installed
from npm without a checkout can use only the read tools unless `OIW_REPO_ROOT`
points at one. Say so in the npm README.

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

A draft already exists at `packages/mcp-server/server.json`. Edit that file
rather than starting over; `mcp-publisher init` is only useful to compare
against the current template. The draft's `identifier` is the placeholder
`@oiw/mcp-server`: set it to `<NPM_PACKAGE>`. The registry limits the length of
`description`; check the limit against the current schema. The draft's
description is 225 characters, so shorten it to something like the one below if
the limit is lower. `name` must equal `mcpName`. `version` must be unique per
publication. Target shape:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.shekibahmed/oiw-mcp",
  "title": "Operations Intelligence Workbench",
  "description": "Scenario Packs, adversarial synthetic fixtures and evaluation for Operations Intelligence Workbench.",
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

That description is 100 characters. Count again after any edit:
`node -e "console.log(require('./server.json').description.length)"`.

The draft's `environmentVariables` block is real: the server reads
`OIW_REPO_ROOT`, `SCENARIO_PACKS_DIR` and `OIW_MCP_ALLOW_WRITE`, all optional.
Keep it. `subfolder` is the documented field for a server inside a monorepo.

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
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.shekibahmed/oiw-mcp"
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
application services and in the database. The shared contract only requires a
non-empty approver string; whitespace-only handling there is open issue #48. It is not a runtime
that sits in front of someone else's agent. Describe it as what it is. A
maintainer who says it is out of scope is making a fair call.

### 4a. systempromptio/awesome-ai-agent-governance

Repo: https://github.com/systempromptio/awesome-ai-agent-governance
Rules read from the raw `CONTRIBUTING.md`:

- Scope (paraphrased): runtime governance of AI agents, meaning policy
  enforcement, audit trails, access control, cost management and compliance
  tooling, for "systems where AI agents operate in production".
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
in the application and the database, with an append-only audit trail.

Why it meets the scope: it is a working implementation of an approval gate
and an audit trail for AI-assisted decisions. A Decision cannot be set to
approved unless an Approval row with outcome "approved" and a non-blank
approver exists (trigger decisions_require_human_approval, migration 0000,
tightened in migration 0004). A CHECK constraint rejects blank approvers,
including non-breaking-space and zero-width characters. Approvals are
append-only: UPDATE is rejected, and DELETE only when the whole Decision or
Workspace is removed. Audit entries reject updates and deletes (trigger
audit_entries_append_only). Rules and providers can only propose decisions.
The design is in docs/decisions/ADR-013-database-enforced-approval-integrity.md.

The bypass attempts are tests against real PostgreSQL:
tests/security/approval-governance.test.ts (an Approval for one Decision
cannot authorise another; empty, whitespace-only, "system" and "provider"
approvers are rejected in the application layer and write nothing; raw SQL
changes are rejected by the triggers), tests/security/provider-approval-shaped-output.test.ts
(approval-shaped provider output never creates an Approval) and
tests/security/approval-concurrency.test.ts (parallel opposing approvals end
with one Approval and one final status).

Where each check sits: whitespace-only, "system" and "provider" approvers are
rejected in the application layer (`packages/application/src/decisions.ts`).
The contract layer rejects only an empty approver (issue #48 asks for more).
In the database, a CHECK blocks blank approvers.

Limits, so the scope call is easy: it is a reference platform and demo, not a
runtime that sits in front of third-party agents. A table owner or superuser
can still drop the triggers or TRUNCATE the table, and the database cannot
tell a real person from a non-blank string. In the public demo the approver is
the guest session; there is no single sign-on. The intelligence provider in
the demo is a deterministic fixture provider (no live model is wired in), and
all data is synthetic. MIT licensed. No customers or production deployments to
report.

Disclosure: I am the author of this project. It is designed, built and
maintained by Shekib and Kaamchor (https://bekaamchor.com), an AI consultancy.
```

The attack list and the test that covers each one are in the README ("Where
does human approval happen?") and `docs/EVALUATION.md` section 9. Edit the
disclosure line to say how you describe your own role at Kaamchor.

If you prefer a PR, the line is:

```
- [Operations Intelligence Workbench](https://github.com/shekibahmed/operations-intelligence-workbench) - Reference platform where AI-derived proposals cannot become approved decisions without a recorded human approval, enforced in the application and database layers, with append-only Approvals and audit trail. Fixture provider and synthetic data only. MIT.
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
- [Operations Intelligence Workbench](https://github.com/shekibahmed/operations-intelligence-workbench) - Reference platform with a human-approval gate for AI-proposed decisions, enforced in the application and database layers, plus append-only Approvals and audit trail. Deterministic fixture provider and synthetic data only; demo, not production.
```

PR title: `Add Operations Intelligence Workbench`

PR description:

```
Adds one entry under Agent Frameworks with Governance Features. It is an
open-source (MIT) reference platform where a Decision cannot be approved
without a recorded human Approval, enforced in the application and database
layers (ADR-013), with append-only Approvals and audit trail. It is a
demo with a deterministic fixture provider and synthetic data, not a runtime
for third-party agents. The demo approver is a guest session, not a verified
person. I am the author. Happy to move it or drop it if it is
out of scope.
```

---

## 5. GitHub topics

Read with `gh repo view` on 2026-10-18, the repo has 20 topics: ai,
ai-agents, ai-governance, audit-trail, document-ai, drizzle, evidence,
human-in-the-loop, llm-evaluation, llms-txt, mcp-server, nextjs, open-source,
operations, pnpm, postgres, scenario-packs, self-hosted, typescript,
workflow-automation. Check GitHub's current per-repository topic limit before
assuming you can add more; the repo is at 20 and I have not confirmed the limit. The repo's website
field already points at the live demo,
https://operations-intelligence-workbench.onrender.com/.

Candidate topics that are not on the repo:

| Add | Why |
|---|---|
| `approval-workflow` | Matches the core feature. |
| `model-context-protocol` | Pairs with `mcp-server`, which is already set. |

Adding either means removing a topic first. The least descriptive of the
current set are `pnpm` and `operations`. Your call. `llm-evaluation` is on the
repo and is accurate for the harness, but `pnpm eval` runs on fixtures with a
deterministic provider, not a live model, so be ready to say so.

Commands (need the `gh` CLI logged in as the repo owner):

```bash
gh repo edit shekibahmed/operations-intelligence-workbench \
  --remove-topic pnpm \
  --add-topic approval-workflow
gh repo view shekibahmed/operations-intelligence-workbench --json repositoryTopics,homepageUrl
```

Optional: the Pages site is live (200 on 2026-10-18), so you may prefer the
Pages URL as the website field, since it carries the videos and the casebook.
The demo URL is a fine value too. Pick one.

---

## 6. GitHub Release v0.1.0

Why: releases show up in the Releases feed, in the "Watch > Custom > Releases"
option, and in package-list checks such as awesome-selfhosted's first-release
rule. The repo has one release today, `media-latest` (tag `media-latest`,
2026-10-18), which holds `trailer.mp4`, `asset-reliability.mp4`,
`process-exceptions.mp4` and `document-assurance.mp4`. Keep it: it holds the
walkthrough videos. It is not a software release. The README and `site/index.html`
did not link to the release assets when checked, so confirm the video links
before launch.
Creating `v0.1.0` makes that the newest release, and GitHub will then flag it
"Latest" instead of `media-latest`; that is fine.

Before tagging:

- [ ] `main` is green in CI.
- [ ] Landing page and Pages deploy, agent surface, adversarial corpus,
      database approval hardening and security updates are all merged to
      `main` (checked 2026-10-18), so the tag points at what the notes
      describe. The notes below describe that state.
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
- Approval enforced by the application services and the database. A
  Decision cannot be set to approved without a recorded Approval from a named
  approver. Whitespace-only, `system` and `provider` approvers are rejected in
  the application services, the shared contract only requires a non-empty
  approver string (issue #48 is open), and a database CHECK blocks blank
  approvers. An Approval for one Decision cannot authorise
  another, approval-shaped provider output never creates an Approval, and parallel opposing approvals
  end with one Approval and one final status
  (`tests/security/approval-governance.test.ts`,
  `tests/security/provider-approval-shaped-output.test.ts`,
  `tests/security/approval-concurrency.test.ts`, run against real PostgreSQL).
  In the database, migration `0004` and
  `docs/decisions/ADR-013-database-enforced-approval-integrity.md` add a CHECK
  that rejects blank approvers (including non-breaking and zero-width
  characters), a Decision trigger that needs an approved Approval with a
  non-blank approver, and append-only Approvals (UPDATE is rejected; DELETE only
  when the whole Decision or Workspace is removed). Audit entries are
  append-only, also enforced by a trigger.
- Pack-neutral core. Entity types, rules, workflows, dashboards and tour steps
  come from a validated Scenario Pack. `pnpm architecture:check` scans the
  non-test sources of every package under `packages/` for pack IDs (read from
  the manifests) and industry terms, confirms no TypeScript project compiles a
  scenario-pack file, and confirms the pack registry still loads every other
  pack with any one removed. A fourth template pack, `scenario-packs/_template`,
  holds a starting set of schemas, rules, workflows, dashboards and a smoke
  fixture.
- An adversarial test corpus: 52 edge-case artifacts (20 Asset Reliability,
  16 Process Exceptions, 16 Document Assurance) with expected outcomes, 143
  expected observations (130 extracted, 10 insufficient-evidence, 3 negated),
  and 12 instruction-style prompt-injection fixtures (4 formats times 3 packs),
  part of a 30-fixture injection matrix (10 classes times 3 packs). Fixture
  text is untrusted data and contains instruction-like strings on purpose.
- An evaluation harness (`pnpm eval`) covering 11 dimensions, including field
  precision and recall,
  classification, evidence spans, entity resolution, abstention, rule
  execution, approval policy, duplicate prevention and case state, for all
  three packs.
- A recorded evidence casebook you can read with no setup, rendered at
  https://shekibahmed.github.io/operations-intelligence-workbench/casebook/a-142-repeat-fault.html
  (source in the repo at `apps/web/public/casebook/a-142-repeat-fault.html`).
- Guided tour and free exploration in the web app. Live demo, guest workspace,
  no sign-in: https://operations-intelligence-workbench.onrender.com/demo (free
  hosting; the first request after idle can take about a minute).
- Project site with an animated nine-stage pipeline and a walkthroughs section
  (`site/index.html`), live at
  https://shekibahmed.github.io/operations-intelligence-workbench/#walkthroughs.
  A 25-second trailer (burned-in captions, labelled synthetic demo data) and
  three walkthroughs of about 128 seconds each (captions embedded as a soft
  track) are assets on the `media-latest` release. The `.vtt` caption files are
  in `docs/media`, not on the release. Optional background music is Erik Satie,
  Gymnopedie No. 1, performed by Robin Alciatore (Musopen), public domain;
  credits in `docs/media/CREDITS.md`.
- An MCP server in `packages/mcp-server` (stdio, seven tools: `list_packs`,
  `get_pack_manifest`, `list_fixtures`, `get_casebook`, `validate_packs`,
  `run_eval`, `scaffold_pack`). It is read-mostly; `scaffold_pack` works only
  with `OIW_MCP_ALLOW_WRITE=1`. A root `.mcp.json` registers it for Claude Code
  in a checkout. It is run from a clone and is not published to npm or the MCP
  Registry.
- A Claude Code pack-authoring plugin:
  `claude plugin marketplace add shekibahmed/operations-intelligence-workbench`
  then `claude plugin install oiw-pack-authoring@oiw`.
- `llms.txt` at the repository root, also served by the live demo.
- Six good-first-issue seeds are open as issues #40 to #45; see
  `docs/contributing/FIRST_CONTRIBUTIONS.md`.

## Limits you should know about

- No live language model is wired in. The intelligence provider is a
  deterministic fixture provider: each fixture is keyed by checksum to a
  recorded extraction, so the same input always gives the same output. The
  `IntelligenceProvider` interface can take a live one; none is implemented.
- Recorded evaluation scores (README and run notes in docs/agent-runs) are
  1.000 on every dimension for every pack. That is expected, because the provider
  replays recorded extractions keyed to each fixture. The harness tests the
  pipeline, rules and approval logic, not model quality. These are recorded
  results, not a fresh run for this release.
- All data is synthetic. Do not upload real or confidential data.
- The approval gate checks that an approver is a non-blank name. It cannot
  tell a real person from a non-blank string, and in the public demo the
  approver is the guest session; there is no single sign-on. A table owner or
  superuser can still drop the database triggers or TRUNCATE the table
  (ADR-013).
- The hosted demo is on free hosting. A keepalive ping runs every 10 minutes
  from 06:00 to 22:00 UTC; otherwise the first request after 15 minutes idle
  can take about a minute.
- Known wording issue (#47): the `safety-critical-removal-approval` rule
  description says "at least one other related event", but the engine needs two
  other related events. The predicate is a safety-critical severity indicator
  plus at least two related events within 60 days.
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

To use the MCP server, run `pnpm build` and then
`node packages/mcp-server/dist/cli.js`, or start Claude Code in the checkout.

## Licence and maker

MIT. Designed, built and maintained by Shekib and Kaamchor
(https://bekaamchor.com), an AI consultancy. Issues and pull requests are welcome; see
docs/CONTRIBUTING.md.
```

Check before publishing the notes:

- The 1.000 evaluation figure comes from the README ("it reports 1.000 on
  every dimension") and from run notes in docs/agent-runs. Run `pnpm eval` on
  the commit you are tagging and edit the figure if it differs.
- The Pages links returned 200 on 2026-10-18. Re-check them before you publish.
- The 52 artifacts and 143 observations were counted from
  `scenario-packs/*/fixtures/edge-cases/index.json` and
  `scenario-packs/*/evaluations/edge-cases.gold.json`. The 30 injection
  matrix fixtures (10 classes per pack) were counted by the
  `suspicious-content-detected` warning in
  `scenario-packs/*/fixtures/edge-cases/extractions/`; this matches
  `docs/SECURITY.md` line 89 and `docs/quality/INJECTION_TEST_MATRIX.md`. The
  README's 12 is correct and means something narrower: the instruction-style
  fixtures (4 formats times 3 packs). Recount if any of these files changed after
  2026-10-18.

After publishing: in the repo, open Watch, Custom, tick Releases, so the
release shows in your own feed too. The release page URL
(`https://github.com/shekibahmed/operations-intelligence-workbench/releases/tag/v0.1.0`)
is a better link for the awesome-list PRs than the repo root where a list
asks for a version.

---

## Verification log

What was checked on 2026-10-18, and what was not.

Checked against `main` and live sources:

- Repository: the only tag and release is `media-latest` (walkthrough media);
  no `v0.1.0`. `package.json` version 0.1.0, MIT, root package private;
  Node.js >= 22, `postgres:17-alpine` in `docker-compose.yml`, a `Dockerfile`;
  three Scenario Packs plus `_template`; workflows `ci.yml`, `deploy.yml`,
  `keepalive.yml`, `pages.yml`, `expire-demo.yml`.
- Approval gate: `tests/security/approval-governance.test.ts`,
  `tests/security/provider-approval-shaped-output.test.ts` and
  `tests/security/approval-concurrency.test.ts` exist;
  `db/migrations/0004_approval_db_hardening.sql` and
  `docs/decisions/ADR-013-database-enforced-approval-integrity.md` exist; the
  `docs/EVALUATION.md` section 9 table maps each attack to its test, including
  replay of an Approval against an unrelated Decision. The tests were not
  re-run for this refresh.
- `pnpm architecture:check`: `scripts/architecture-check.ts` scans every
  package under `packages/`, and its success message lists the registry check
  with any one pack removed.
- Adversarial corpus: 20, 16 and 16 entries in the three
  `fixtures/edge-cases/index.json` files (52); the three `edge-cases.gold.json`
  files hold 143 expected observations (130 extracted, 10 insufficient-evidence,
  3 negated); 30 injection-matrix fixtures (10 per pack) by their
  `suspicious-content-detected` warnings, of which 12 are instruction-style
  (4 per pack: message, CSV cell, JSON field, PDF text page), the README figure.
- MCP server: seven registered tools, `OIW_MCP_ALLOW_WRITE` gate, root
  `.mcp.json`, draft `server.json` (`io.github.shekibahmed/oiw-mcp`, 225
  character description, identifier `@oiw/mcp-server`), `private: true`, no
  `mcpName`. Plugin marketplace entry `oiw` / `oiw-pack-authoring`.
- `llms.txt` at the repo root, and the live demo returned HTTP 200 for
  `/llms.txt`.
- The `safety-critical-removal-approval` rule: description says "at least one
  other related event"; the predicate is `severity-indicator` equals
  `safety-critical` and `related-event-count` within 1440 hours greater than or
  equal to 2 (issue #47).
- GitHub: topics (20) and website field read with `gh repo view`; open issues
  #40 to #48 read with `gh issue list`.
- awesome-selfhosted `CONTRIBUTING.md`: first release more than 4 months old,
  LLM-generated contributions banned, human attestation, first-tag rule in
  single-page mode.
- punkpeye/awesome-mcp-servers: scope, `🤖🤖🤖` marker, alphabetical order,
  Developer Tools section, legend emojis.
- systempromptio/awesome-ai-agent-governance and
  agentrust-io/awesome-ai-governance: contribution rules and section names.
- MCP Registry: only `https://registry.npmjs.org` is accepted.
- npm: `@oiw/mcp-server`, `@shekibahmed/oiw-mcp-server`, `oiw-mcp-server` and
  `oiw-mcp` returned 404.

Not checked, or still open:

- Whether the MCP server runs from a clean clone and from a real client, and
  the OS icons for the awesome-mcp-servers line. Owner steps.
- awesome-selfhosted pull request template, `addition.md`, `licenses.yml`,
  description length limit, merge timing and `demo_url` rule.
- MCP Registry quickstart steps and the `description` length limit. The
  registry reference read on 2026-10-18 states no limit, so whether the
  100-character description is near one is unknown.
- Governance list issue counts and last-commit dates.
- Whether the earlier six topic candidates were all considered; only the two
  listed in section 5 are confirmed absent.
- GitHub's current topic limit.
- Evaluation scores come from the README's recorded run, not a re-run.
- Publishing to npm and the MCP Registry has not been done (owner step).
