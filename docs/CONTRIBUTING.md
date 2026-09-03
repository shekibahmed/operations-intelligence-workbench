# Contributing

This repository is developed primarily by a small set of AI coding agents
against a written specification (PRD §24, "Multi-Agent Development Operating
Model"). External contributions are welcome, but read this document first —
the review bar and the source-of-truth hierarchy below apply to every
contributor, human or agent.

## Before you start

1. Read `docs/PRD.md` (the product specification) and
   `docs/PLAN_AMENDMENTS.md` (approved deviations from it) — these are
   authoritative. If your change would contradict either, open an issue
   first rather than a PR; it likely needs an ADR or a plan amendment, not
   just code.
2. Read `docs/ARCHITECTURE.md` and `docs/DOMAIN_MODEL.md` for how the
   packages fit together, and the relevant ADR(s) in `docs/decisions/` for
   *why* a boundary is where it is.
3. Read `AGENTS.md` — it is the primary operating-rules document (product
   rule, task boundaries, implementation style, quality gates) and applies
   to every contributor even though its examples are agent-oriented.
4. Check `SESSION.md` for current project state before assuming a piece of
   the system doesn't exist yet.

## The product rule (non-negotiable)

OIW is a neutral operational-intelligence platform. **Do not add
industry-specific logic to core packages.** Industry terminology, schemas,
rules, workflows, metrics, fixtures and labels belong in
`scenario-packs/`. No pack IDs in core conditionals; no industry-specific
entity names, workflow states, severity calculations or dashboard queries in
core code. `pnpm architecture:check` enforces this mechanically and runs in
CI on every PR — a PR that fails it will not be reviewed further until it
passes.

## Local setup

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm dev
```

See the root [`README.md`](../README.md#how-do-i-run-the-demo) for the full
quick start and demo commands, and `apps/web/README.md` for
`apps/web`-specific environment variables.

## Where to contribute

Per PRD §6.4, the most useful small, bounded contributions are:

- **A new Scenario Pack**, or an improvement to an existing one's fixtures,
  edge cases or gold evaluation set. Start with
  [`docs/PACK_AUTHORING.md`](PACK_AUTHORING.md) and
  [`scenario-packs/_template/`](../scenario-packs/_template/). This is the
  contribution type least likely to touch a package boundary and therefore
  the easiest to review and merge.
- **Test coverage** for an existing gap — check `docs/EVALUATION.md` for the
  FR-to-verification mapping and whether a functional requirement's mapped
  test actually exists yet.
- **Documentation fixes** — a claim in this documentation set that no longer
  matches merged code/tests is itself a bug; open an issue or a PR.
- **Bug fixes** scoped to one package, with a regression test.

Larger architectural changes (a new package, a contract change, a new core
mechanism) should start as an issue describing the problem before any code,
so the change can be checked against the product rule and the ADR set first.

## Making a change

1. One logical change per PR. Don't bundle an unrelated refactor with a bug
   fix.
2. Add or update tests at the narrowest layer that can catch the change
   (`docs/EVALUATION.md` §1, "Ordering rule") — a pack-content bug belongs in
   a contract/lifecycle test, not a new Playwright spec; a UI regression
   belongs in Playwright, not a unit test.
3. Run the relevant quality gates locally before opening a PR:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm validate:packs        # if you touched scenario-packs/
   pnpm eval                  # if you touched extraction, rules, or a pack
   pnpm architecture:check    # if you touched anything outside scenario-packs/
   ```

   CI (`.github/workflows/ci.yml`) runs all of these except a scoped
   `pnpm eval --pack <id>` — it always runs the full `pnpm eval` — against a
   fresh, migrated Postgres service container.
4. If your change touches ingestion, persistence, rendering or the approval
   engine, self-review it against `docs/SECURITY.md` before opening the PR —
   those are the areas its threat model treats as material.
5. If your change touches `apps/web`, verify it against
   [`docs/UX_SPEC.md`](UX_SPEC.md) and include before/after screenshots in
   the PR for any visible change.
6. Open the PR using the template in
   [`.github/pull_request_template.md`](../.github/pull_request_template.md).
   State any deviation from the task or spec explicitly — silent deviation
   is treated as a defect, not a judgment call.

## Neutrality check

Before submitting anything that touches a core package, ask: does this
introduce a branch, a name, or a query that only makes sense for one
Scenario Pack? If yes, it belongs in `scenario-packs/`, not here. This is
the single most common review rejection reason in this repository's history
(see `docs/PACK_AUTHORING.md` §5 and any `docs/agent-runs/*.md` file
mentioning a "neutrality" finding).

## Commit and code style

- TypeScript everywhere; match the surrounding file's style and comment
  density (prefer no comments unless the *why*, not the *what*, is
  non-obvious).
- Shared runtime schemas go through Zod in `@oiw/contracts` — don't
  duplicate a shape that already has a contract.
- Small composable services; no second framework for an existing concern.
- Never place real organisation or customer data in a fixture or test —
  synthetic only, always.

## Reporting issues

Use the issue templates under
[`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/): bug report,
Scenario Pack proposal, or question. Security issues that should not be
disclosed publicly should not go through a public GitHub issue — see
[`docs/SECURITY.md`](SECURITY.md) for the current threat-model scope before
filing, and describe the concern privately to the maintainer first.
