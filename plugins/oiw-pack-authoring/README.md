# oiw-pack-authoring

A Claude Code plugin with one skill, `pack-authoring`, that walks an agent through
scaffolding, authoring, validating and evaluating an Operations Intelligence
Workbench Scenario Pack. The skill points at the guide and template in your
checkout instead of copying them, so it stays current.

## Install

```bash
claude plugin marketplace add shekibahmed/operations-intelligence-workbench
claude plugin install oiw-pack-authoring@oiw
```

Run Claude Code from an OIW checkout so the skill can read
`docs/PACK_AUTHORING.md` and `scenario-packs/_template/`. For tool access to pack
listings, adversarial fixtures and evaluation, also enable the MCP server
described in [`packages/mcp-server/README.md`](../../packages/mcp-server/README.md).
