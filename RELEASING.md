# Releasing `@oiw/mcp-server`

This is the maintainer checklist for putting the MCP server on npm and on the
official MCP registry. Nothing in CI publishes until you create the secret and
push a version tag. Do not commit tokens, `.npmrc` lines that contain a token,
or the output of `npm whoami` if it includes a credential.

The package name is `@oiw/mcp-server`. `packages/mcp-server/server.json` `name`
is `io.github.shekibahmed/oiw-mcp`. Those two identities are checked against
each other by `packages/mcp-server/src/http.test.ts` and by the release
workflow. Change them together or not at all.

The `@oiw` npm scope has to belong to the account that publishes. If
`npm access` or the first publish says the scope is not yours, stop. Do not
publish under a different name without editing `package.json` `name`,
`server.json` `packages[0].identifier`, and the docs that name the package.

## 1. Version

In one commit, set the same version in all of these:

- `packages/mcp-server/package.json` `version`
- `packages/mcp-server/server.json` `version`
- `packages/mcp-server/server.json` `packages[0].version`

Leave `mcpName` as `io.github.shekibahmed/oiw-mcp` unless you also change
`server.json` `name`. The server description must be 1 to 100 characters
(registry schema).

Merge that commit to `main` before tagging. The tag must be `v` plus that
version, for example `v0.1.0`.

## 2. npm token

Create an npm access token that can publish `@oiw/mcp-server`. An automation
token, or a granular token with read and write for that package, is enough.
Do not use a token that has more access than publish.

In the GitHub repository settings, add an Actions secret named `NPM_TOKEN`.
The release workflow reads `${{ secrets.NPM_TOKEN }}` and passes it as
`NODE_AUTH_TOKEN` for that one step. The workflow file does not contain a
token value.

## 3. Publish with GitHub Actions

From `main`, after the version commit is pushed:

```bash
git checkout main
git pull
git tag v0.1.0
git push origin v0.1.0
```

Use the version you actually set. The workflow
[`.github/workflows/release.yml`](.github/workflows/release.yml) runs on tags
that look like `v*.*.*`. It installs with the frozen lockfile, refuses the tag
if it disagrees with `package.json` or `server.json`, then runs:

```bash
pnpm --filter @oiw/mcp-server publish --access public --no-git-checks --provenance
```

`prepublishOnly` builds the package. `prepack` copies `scenario-packs/` into
the tarball so the read tools work from `npx` without a clone, and removes
`devDependencies` from the published `package.json` so it does not depend on
the private workspace package `@oiw/scenario-sdk`. `postpack` restores the
working `package.json` and deletes the staged copy. Both the copy and the
backup are gitignored. Do not add `--ignore-scripts`. The published runtime
dependencies are `@modelcontextprotocol/sdk`, `yaml` and `zod`.

Confirm:

```bash
npm view @oiw/mcp-server version
npm view @oiw/mcp-server mcpName
```

`mcpName` must print `io.github.shekibahmed/oiw-mcp`. The registry checks that
field on the published tarball.

## 4. Publish from a machine instead

Use this only if you are not using the tag workflow. You still need an npm
login for an account that owns `@oiw`. Run it from a clean checkout of the
version you intend to publish.

```bash
cd packages/mcp-server
pnpm install
pnpm build
npm publish --access public
```

`npm publish` runs `prepublishOnly` and `prepack`. Check the same `npm view`
commands as above.

## 5. Official MCP registry

Install `mcp-publisher` and publish `packages/mcp-server/server.json` after the
npm package is public. The registry rejects a server whose npm package is
missing or whose `mcpName` does not equal `server.json` `name`.

```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
sudo mv mcp-publisher /usr/local/bin/mcp-publisher
mcp-publisher --help
```

Homebrew: `brew install mcp-publisher`.

From `packages/mcp-server`:

```bash
mcp-publisher login github
mcp-publisher publish
```

`login github` prints a device code. Open https://github.com/login/device,
enter it, and authorise the account that owns `shekibahmed`. The name
`io.github.shekibahmed/oiw-mcp` only matches that GitHub login.

Optional, before publish: `mcp-publisher validate` if that command is in
`mcp-publisher --help` on the day you run it.

Confirm:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.shekibahmed/oiw-mcp"
```

There is no hosted MCP URL to put in `remotes`. The npm package transport is
stdio. Operators who need streamable HTTP run `oiw-mcp --http` themselves.

## 6. If publish fails

| Message | What to do |
|---|---|
| Scope or package name not available | The `@oiw` scope is not yours, or the name is taken. Stop and rename both files together. |
| `mcpName` mismatch, or registry validation failed for the package | The published tarball does not carry `mcpName`, or it differs from `server.json` `name`. Publish a new npm version with the field set, bump every version field, retry. |
| Invalid or expired registry JWT | Run `mcp-publisher login github` again. |
| You do not have permission to publish this server | `server.json` `name` does not start with `io.github.<the-login-you-used>/`. |
| Tag job failed the version check | The tag, `package.json` and both version fields in `server.json` disagree. Delete the remote tag only if nothing was published, fix the commit, and tag again. Do not force-push `main`. |
| `NPM_TOKEN` missing | The Actions secret is unset or not visible to this repository. The workflow will not print the token. |

Listing text for the registry, awesome-mcp-servers, Smithery and Glama is in
[docs/launch/mcp-listings.md](docs/launch/mcp-listings.md).
