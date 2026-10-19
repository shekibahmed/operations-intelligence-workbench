# Agent Run: mcp-http-publish

## State
COMPLETE

## Changed files
- `packages/mcp-server` — streamable HTTP transport, tool allow list, publishable package metadata, bundle and pack scripts, HTTP tests, README, `server.json`
- `.github/workflows/release.yml` — publish `@oiw/mcp-server` on a `v*.*.*` tag using `NPM_TOKEN`
- `RELEASING.md` — maintainer commands for npm and the MCP registry
- `docs/launch/mcp-listings.md` — paste-ready listings
- `.claude/skills/pack-authoring/SKILL.md` — copy of the existing plugin skill
- `README.md`, `llms.txt`, `apps/web/public/llms.txt`, `site/index.html`, `docs/ARCHITECTURE.md`, `glama.json`, `eslint.config.mjs`, `pnpm-lock.yaml`

## Commits
- `66f3c2c3083357df3dbac5b88e41e1d78a5ae309` on `cursor/mcp-http-npm-f530` — streamable HTTP, publishable package, docs.

## Tests run and results
- `pnpm --filter @oiw/mcp-server exec tsc -b --pretty false` — pass
- `pnpm exec vitest run packages/mcp-server` — 45 passed (includes streamable HTTP, allow list, bearer token, `/health`, pack discovery, `server.json` identity)
- `pnpm exec eslint . --max-warnings 0` — pass
- `pnpm typecheck` — pass
- `pnpm architecture:check` — pass
- `pnpm build` — pass (Next.js traced-filesystem warning in `packages/scenario-sdk` is pre-existing)
- `pnpm exec vitest run` — 310 passed, 62 skipped. One real failure, `scripts/llms-txt.test.ts` drift, fixed by copying `llms.txt` to `apps/web/public/llms.txt`. Re-run of `scripts/llms-txt.test.ts` and `packages/mcp-server` — 49 passed.
- Postgres integration suites failed with `connect ECONNREFUSED 127.0.0.1:5432` / `::1:5432` because this environment has no database. They are not part of this change. CI provides Postgres.
- Packed tarball `/tmp/oiw-mcp-server-0.1.0.tgz` installed in a temp directory (not a checkout): `GET /health` returned ok, `tools/list` was the five read-only tools, `list_packs` returned `asset-reliability`, `document-assurance`, `process-exceptions`.
- Bundled `node packages/mcp-server/dist/cli.js` printed stdio ready and, with `--http`, served the same read-only set.

`pnpm eval` was not re-run. This change does not touch the evaluation harness.

## Acceptance criteria status
- Streamable HTTP beside stdio, read-only default, write and eval opt-in, allow-list docs — pass
- Publishable package (no `private`, bin/files/exports, version aligned with `server.json`, `mcpName`) — pass. Nothing was published.
- `RELEASING.md` and tag workflow using `secrets.NPM_TOKEN` — pass
- `.claude/skills/pack-authoring/SKILL.md` copy; plugin path unchanged — pass
- README pitch, three-command quickstart, Claude Code / Codex / Grok snippets, limitations and Kaamchor link kept, Render free-tier sleep stated — pass
- `docs/launch/mcp-listings.md` — pass
- HTTP test — pass
- MIT licence unchanged. No secrets committed.

## Architectural decisions
- HTTP is stateless: one `McpServer` and one `StreamableHTTPServerTransport` per request, with `sessionIdGenerator` omitted. POST responses are SSE. GET returns the SDK's 405, which the official client treats as "no standalone SSE session".
- stdio still registers all seven tools. HTTP starts with `list_packs`, `get_pack_manifest`, `list_fixtures`, `get_casebook`, `validate_packs`. `run_eval` and `scaffold_pack` need `--allow-eval` / `--allow-write` (or the matching env vars). `--allowed-tools` intersects that set and cannot enable a tool the flags have not turned on.
- A non-loopback bind refuses write or eval tools unless `OIW_MCP_AUTH_TOKEN` or `--auth-token` is set. `/health` stays unauthenticated.
- The published package bundles `@oiw/scenario-sdk` and `@oiw/contracts` with esbuild and depends on `yaml` at runtime, because the `yaml` package's dynamic `require` does not survive an ESM bundle. `prepack` strips devDependencies so the tarball does not depend on the unpublished workspace package.
- Shipped `scenario-packs/` (copied at pack time, gitignored) are the default pack directory when the process is not inside a checkout. Command tools still need `OIW_REPO_ROOT`.
- No `remotes` URL in `server.json`. There is no hosted MCP endpoint. The Render demo is the web app.

## Assumptions and deviations
- Package name stays `@oiw/mcp-server`, matching the existing `server.json`. Shekib must own the `@oiw` npm scope. If he does not, both identities have to change together before publish.
- `validate_packs` is in the HTTP read-only set. It runs `pnpm validate:packs` and does not write. It fails without a checkout.
- No new ADR. The transport is an entrypoint on the existing package, not a new core boundary.
- Lockfile was updated for direct `esbuild@0.28.2` and `yaml` on `@oiw/mcp-server`. This task is the only publisher of that change.

## Dependency requests
None outstanding. `esbuild` 0.28.2 (already in the lockfile as a transitive) and `yaml` ^2.6.0 are now direct dependencies of `@oiw/mcp-server`.

## Known limitations / follow-up
- npm and the MCP registry are not published. The `npx` commands 404 until the tag workflow or the manual publish in `RELEASING.md` runs.
- Smithery and Glama URL listings need an HTTPS server Shekib runs. Do not submit the Render demo URL.
- Glama's sandbox build may fail on this monorepo until a Dockerfile they accept exists. `glama.json` is in the repo root for the claim step.
- `--provenance` on the release workflow needs the GitHub repo to be allowed to sign provenance. If that step fails, drop the flag and publish again at the next version.
