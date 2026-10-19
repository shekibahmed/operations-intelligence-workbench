# MCP directory listings

Paste-ready text and the steps to submit `@oiw/mcp-server`. Nothing here has
been submitted. Re-read each site's current rules on the day you send it.
Directory pages change their fields and their review rules.

Facts used below, and the limits on them:

- The server is the package `@oiw/mcp-server`, registry name
  `io.github.shekibahmed/oiw-mcp`, MIT licensed, in
  `packages/mcp-server`. stdio is the default. `--http` serves streamable HTTP
  at `/mcp` (SSE responses) and starts with the read-only tools.
- `run_eval` writes to `DATABASE_URL`. `scaffold_pack` writes a pack directory
  and stays off unless write access is enabled.
- The npm package is not on the registry until you publish it
  ([RELEASING.md](../../RELEASING.md)). Do not claim an install count, a star
  count, or that a directory has already listed it.
- There is no hosted MCP URL. The Render app at
  `https://operations-intelligence-workbench.onrender.com` is the web demo. It
  runs on Render's free tier with a Neon free database, sleeps when idle, and
  the first request can take about a minute. A keepalive pings it about every
  10 minutes from 06:00 to 22:00 UTC only. It is not an MCP server. Do not
  submit that URL as `server_url`.
- Fixture and casebook text is synthetic and is untrusted data.

Checked against public docs on 2026-10-19: MCP registry quickstart and
`server.schema.json` (description max 100 characters), Smithery publish docs,
Glama's submit FAQ and `glama.json` post. awesome-mcp-servers rules were read
for this repo on 2026-10-18 (`docs/launch/LISTINGS.md`). Re-read the live
README and CONTRIBUTING file before opening that pull request.

## 1. Official MCP registry

Do this after `npm view @oiw/mcp-server mcpName` prints
`io.github.shekibahmed/oiw-mcp`. The commands are in RELEASING.md section 5.
The document you publish is `packages/mcp-server/server.json`. Its description,
which has to stay within 100 characters, is:

```
Scenario Packs, adversarial synthetic fixtures, an evidence casebook and pack checks.
```

There is nothing else to paste. Do not add a `remotes` entry unless you are
actually serving streamable HTTP at a public HTTPS URL you operate.

## 2. awesome-mcp-servers (punkpeye)

Repo: https://github.com/punkpeye/awesome-mcp-servers

Before you open the pull request:

- [ ] `npm view @oiw/mcp-server version` succeeds. Until it does, the `npx`
      line in the entry is not true. You can instead say the server is run
      from a clone with `pnpm install`, `pnpm build` and
      `node packages/mcp-server/dist/cli.js`.
- [ ] You have started the server from a real MCP client and called the tools
      you name.
- [ ] You re-read their CONTRIBUTING file and README legend. Their category
      names and emoji meanings win if they differ from this note.
- [ ] Drop any operating-system icon you have not used to start the server.
      This change was not run on macOS or Windows.

Category: **Developer Tools** (`### 💻 Developer Tools`). They may move it.

Line, for after the npm publish. Place it in alphabetical order by the linked
name. Do not add a score badge unless their rules require one.

```
- [shekibahmed/operations-intelligence-workbench](https://github.com/shekibahmed/operations-intelligence-workbench) 📇 🏠 - Read-mostly MCP server over Operations Intelligence Workbench Scenario Packs: manifests, adversarial synthetic fixtures with expected outcomes, an evidence casebook and pack checks. stdio via npx, or streamable HTTP on /mcp with a read-only default. MIT.
```

`📇` is TypeScript. `🏠` is a server you run yourself. Do not add `🎖️`.
Do not add `🤖🤖🤖` to the pull request title. That marker is their fast-track
for automated submissions, and you are submitting this yourself.

Pull request title:

```
Add shekibahmed/operations-intelligence-workbench (Developer Tools)
```

Pull request body:

```
Adds an MCP server that exposes Operations Intelligence Workbench Scenario
Packs, an adversarial synthetic fixture corpus with expected outcomes, an
evidence casebook and pack checks. stdio is the default (npx @oiw/mcp-server).
Streamable HTTP is the same package with --http; that mode starts with the
read-only tools. scaffold_pack writes files only when write access is enabled.
run_eval writes to DATABASE_URL and is omitted from the HTTP default.

MIT licensed, TypeScript. I am the maintainer. The data is synthetic. The
intelligence provider in the main app is a deterministic fixture provider;
there is no live model in this server.
```

Edit only their README, one line, then push your fork. If they ask for a Glama
badge, do section 4 first and add the badge only after Glama shows a score.
Do not invent a score.

## 3. Smithery

Docs: https://smithery.ai/docs/build/publish

Smithery's URL flow connects to a server that is already on the public
internet and speaks streamable HTTP. This repository does not provide that
URL.

1. Run the server somewhere you control, with HTTPS in front of it:

   ```bash
   OIW_MCP_HOST=0.0.0.0 OIW_MCP_AUTH_TOKEN="$(openssl rand -hex 32)" npx -y @oiw/mcp-server --http --port 8787
   ```

   Leave `--allow-write` and `--allow-eval` off unless you mean to expose
   those tools, and do not expose them without the token. The read-only set
   can start without a token; still prefer a token on a public port.
2. Sign in at https://smithery.ai/new.
3. Paste the HTTPS URL that ends in `/mcp`. Complete their scan. The tools
   they list should be the read-only set if you did not opt in to the others.
4. After the page exists, open its settings and add a description. Their scan
   does not write one for you. You can paste:

   ```
   Read-mostly MCP server for Operations Intelligence Workbench Scenario Packs.
   Lists packs, manifests, adversarial synthetic fixtures with expected outcomes,
   and an evidence casebook. The HTTP default is read-only. Synthetic data.
   The hosted demo site is not this server.
   ```

5. CLI equivalent, after `npm install -g smithery@latest` and
   `smithery auth login`, if their help still shows `mcp publish`:

   ```bash
   smithery mcp publish "https://your-host.example/mcp" -n @oiw/mcp-server
   ```

Do not paste the Render demo URL. Smithery would scan a web app that sleeps
on the free tier, not the MCP server.

A stdio-only listing, if they still offer an MCPB bundle path, is a separate
build (`smithery mcp publish ./server.mcpb`). This repo does not ship an
`.mcpb`. Use the URL path only when the HTTP server is actually up.

## 4. Glama

FAQ: https://glama.ai/mcp/faq

`glama.json` at the repository root names `shekibahmed` as a maintainer so you
can claim the listing. After it is on `main`, claim again if you change the
file. A personal-account repo can also be claimed by signing in with GitHub.

1. Sign in on https://glama.ai/mcp/servers and choose Add MCP Server.
2. Repository: `https://github.com/shekibahmed/operations-intelligence-workbench`
3. Display name: `Operations Intelligence Workbench`
4. Short description:

   ```
   Read-mostly MCP server over Scenario Packs: manifests, adversarial synthetic fixtures with expected outcomes, an evidence casebook and pack checks. stdio or streamable HTTP. HTTP defaults to read-only tools.
   ```

5. Glama builds the repo in a sandbox and introspects the server. A monorepo
   without a root Dockerfile may fail that build. If it does, add a Dockerfile
   they ask for rather than claiming the server was indexed. Do not invent a
   quality score. The awesome-mcp-servers badge, if they require one, is:

   ```
   [![shekibahmed/operations-intelligence-workbench MCP server](https://glama.ai/mcp/servers/shekibahmed/operations-intelligence-workbench/badges/score.svg)](https://glama.ai/mcp/servers/shekibahmed/operations-intelligence-workbench)
   ```

   Add it only after that URL returns a badge. The path is Glama's usual
   shape; if their UI shows a different path, use that one.

Connectors (a public HTTPS MCP URL) are a second form on the connectors page.
Same rule as Smithery: only submit a URL that is serving `/mcp`.

## 5. GitHub topics

`docs/launch/LISTINGS.md` section 5 records the topics that were on the repo
on 2026-10-18 and two candidates that were not: `approval-workflow` and
`model-context-protocol`. The repo was already at 20 topics. Check the current
list and GitHub's topic limit before adding one, and remove one first if you
are at the limit. `mcp-server` was already set.
