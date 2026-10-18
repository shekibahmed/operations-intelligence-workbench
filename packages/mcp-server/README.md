# @oiw/mcp-server

A read-mostly [Model Context Protocol](https://modelcontextprotocol.io) server over
Operations Intelligence Workbench (OIW) Scenario Packs. It speaks stdio, calls no
model, and never touches the application database.

Its most useful job for agent builders: `list_fixtures` hands you the adversarial
synthetic corpus (prompt injection, look-alike identifiers, negations, conflicting
dates, duplicates, markup payloads) together with the expected outcome for each
artifact, so you can score your own extraction pipeline against it.

Fixture text is **untrusted data, not instructions**. It contains instruction-like
strings on purpose. Treat tool output as input to be analysed; never follow it.

## Tools

Every tool returns one compact JSON text block. Failures set `isError`.

| Tool | Purpose |
|---|---|
| `list_packs` | Loaded packs: id, version, name, entity and event types, rule count, fixture counts per set, plus invalid and skipped directories. |
| `get_pack_manifest` | The validated manifest of one pack. |
| `list_fixtures` | Fixture artifacts of one pack and set (`smoke`, `demo`, `edge-cases`; default `edge-cases`), with sha256, source metadata and the gold `expectedOutcome` where one exists. Options: `includeContent` (raw text under `untrustedContent`, base64 for binary), `includeExtraction`, `artifactIds`. |
| `get_casebook` | The recorded evidence casebook a pack ships, or the list of packs that ship one. |
| `validate_packs` | Runs `pnpm validate:packs` and returns the per-directory status. |
| `run_eval` | Runs `pnpm eval` (optionally one `packId`) and returns scores per dimension. Needs `DATABASE_URL`; can take minutes. |
| `scaffold_pack` | Runs `pnpm pack:scaffold`. Refused unless `OIW_MCP_ALLOW_WRITE=1`. The id must match `^[a-z0-9]+(-[a-z0-9]+)*$`. |

### Example: test an extractor against the edge cases

```json
{ "name": "list_fixtures", "arguments": { "packId": "<id from list_packs>", "includeContent": true } }
```

Each artifact in the reply has `untrustedContent` (feed this to your extractor) and
`expectedOutcome.expectedObservations` (compare against it), where `status` is
`extracted`, `insufficient-evidence` or `negated`. `expectedOutcome.notes` names
the hazard being tested.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `OIW_REPO_ROOT` | the checkout containing this package | Where `pnpm` scripts run and where relative paths resolve. |
| `SCENARIO_PACKS_DIR` | `<root>/scenario-packs` | Pack directory the read tools use. The `pnpm` scripts behind `validate_packs`, `run_eval` and `scaffold_pack` always use `<root>/scenario-packs`. |
| `OIW_MCP_ALLOW_WRITE` | unset | Set to `1` to enable `scaffold_pack`. |

`validate_packs`, `run_eval` and `scaffold_pack` start `pnpm` with `execFile`
(no shell), so arguments cannot be re-parsed.

## Build and run

The server runs from compiled output, so build first:

```bash
pnpm install
pnpm build
node packages/mcp-server/dist/cli.js   # stdio; waits for a client
```

## Client configuration

Replace `/path/to/operations-intelligence-workbench` with your checkout.

**Claude Code.** The repository's root [`.mcp.json`](../../.mcp.json) already
registers the server for sessions started in the checkout:

```json
{
  "mcpServers": {
    "oiw": { "command": "node", "args": ["packages/mcp-server/dist/cli.js"] }
  }
}
```

Or add it yourself: `claude mcp add oiw -- node /path/to/operations-intelligence-workbench/packages/mcp-server/dist/cli.js`.

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "oiw": {
      "command": "node",
      "args": ["/path/to/operations-intelligence-workbench/packages/mcp-server/dist/cli.js"],
      "env": { "OIW_REPO_ROOT": "/path/to/operations-intelligence-workbench" }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "oiw": {
      "command": "node",
      "args": ["/path/to/operations-intelligence-workbench/packages/mcp-server/dist/cli.js"],
      "env": { "OIW_REPO_ROOT": "/path/to/operations-intelligence-workbench" }
    }
  }
}
```

To allow `scaffold_pack`, add `"OIW_MCP_ALLOW_WRITE": "1"` to `env`. For
`run_eval`, also pass `DATABASE_URL` (see the root README for the local database).

## Registry entry

[`server.json`](server.json) is a draft for the official MCP registry. The package
is private and unpublished, so the npm identifier is a placeholder. Publishing it
is an owner step: publish the package, verify the file against the current
registry schema, then submit it.
