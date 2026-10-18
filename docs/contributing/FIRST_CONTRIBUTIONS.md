# First contributions

Four small, bounded ways to improve OIW without learning the whole codebase. Each
changes one visible outcome in a Scenario Pack or one documented claim, and each
has a fixed file set so a reviewer can check it quickly.

All data stays synthetic. All industry content stays inside `scenario-packs/`. Read
[`docs/CONTRIBUTING.md`](../CONTRIBUTING.md) for the general review bar and
[`docs/PACK_AUTHORING.md`](../PACK_AUTHORING.md) for the pack file formats. If you
use an AI coding agent, point it at [`AGENTS.md`](../../AGENTS.md) and the
`oiw-pack-authoring` plugin (see [`packages/mcp-server/README.md`](../../packages/mcp-server/README.md)
for the MCP server that lists the existing adversarial fixtures).

## The issue-first rule

Open or claim an issue before you open a pull request. State the behaviour you
think is correct and why, and wait for a maintainer to confirm the intended
outcome. A fixture or gold change is a claim about what the system should do;
agreeing on that claim first is cheaper than reworking a finished pull request.
Pull requests with no linked issue may be closed with a request to start there.

A counterexample or a competing interpretation of an existing fixture is a
welcome issue by itself, with no code attached.

## What every pull request needs

- The linked issue and the single challenge type below that it implements.
- The exact commands you ran and their results: `pnpm validate:packs`,
  `pnpm eval --pack <pack-id>`, and `pnpm test` plus `pnpm architecture:check` when
  the change is not confined to `scenario-packs/`. You need a reachable
  `DATABASE_URL` for `pnpm eval` and `pnpm test` (see the root README).
- Nothing outside the file set for your challenge type.
- Synthetic content only; no real organisations, people or customer text.
- Checksums and evidence offsets computed from the real file bytes, never typed by hand
  (`docs/PACK_AUTHORING.md` section 4).

## Challenge types

### 1. Contradictory or hazardous artifact

Add one new synthetic artifact to an existing pack's `edge-cases` set whose correct
outcome is to abstain, flag a conflict or route to review, for example two
same-day statements that disagree, or text in a language the pack does not support.

File set, all under `scenario-packs/<pack-id>/`:

- `fixtures/edge-cases/artifacts/<pack-id>-edge-NNN.<ext>`
- `fixtures/edge-cases/extractions/<pack-id>-edge-NNN.json`
- `fixtures/edge-cases/index.json` (one new entry with the file's `sha256`)
- `evaluations/edge-cases.gold.json` (one new entry with a `notes` field naming the hazard)
- `narrative/edge-cases.md` and `narrative/expected-outcomes.md` (one row or entry each)

Reviewers need: one sentence stating the contradiction and the intended outcome, why
it is a different failure boundary from the existing edge cases (list the existing
ones with the MCP `list_fixtures` tool or `narrative/edge-cases.md`), and passing
`pnpm validate:packs` and `pnpm eval --pack <pack-id>`.

### 2. Independently justified evidence span

Pick one existing fixture and show, from the source text alone, that each evidence
span in its expected extraction supports the value it is attached to. Fix any span
that is too wide, too narrow or attached to the wrong value.

Today the evidence locators used by evaluation come from the extraction files
themselves (`packages/evals/README.md`, "Merged-design deltas"; `expectedObservations`
in `packages/evals/src/runner.ts`), so an internally consistent but wrong span cannot
fail. A careful human reading is the only check.

File set: `scenario-packs/<pack-id>/fixtures/<set>/extractions/<artifact-id>.json`
for the one artifact. If you change a span's offsets, keep the artifact bytes
unchanged so its checksum stays valid.

Reviewers need: the artifact id, a table of schema key, value, quoted source passage
and start/end offsets that you derived by reading the file (not by copying the
extraction), and a statement of each span you changed and why.

### 3. Missing expected outcome

Find a place where the expected outcome of a fixture, set or pack is not written down
or cannot be evaluated, and add it. Examples: a gold entry missing for a fixture, a
gold set a pack needs in order to pass `pnpm eval --pack`, or a notes field that does
not say what the system should do.

File set: `scenario-packs/<pack-id>/evaluations/*.gold.json` for the fixtures
concerned, and the narrative `expected-outcomes.md` entry if the prose is missing.
Pack scaffolding (`scripts/pack-scaffold.ts`, `scenario-packs/_template/`) is in scope
only where an issue says so.

Reviewers need: the fixture id, the expected observations with their status
(`extracted`, `insufficient-evidence` or `negated`), the expected event type, signals,
case linkage and decision, and the reasoning for each, written from the artifact
rather than from the current extraction output (`docs/PACK_AUTHORING.md` section 9).

### 4. Source-backed documentation correction

Correct a claim in the documentation that no longer matches the merged code, tests or
pack contents. Cite the evidence.

File set: the one document containing the claim (for example a pack's
`narrative/*.md`, `docs/*.md` or a package `README.md`), and nothing else.

Reviewers need: the exact sentence before and after, and the file and line, test or
command output that shows the new sentence is true.

## Seed issues

Six ready-to-file issues, each tied to a gap you can verify in the repository. The
maintainer files them; contributors can claim one by commenting on it. Run these from
a clone with the GitHub CLI authenticated, at the repository root.

### Seed 1: Add a same-day conflicting-status edge case to the process-exceptions pack (type 1)

```bash
gh issue create --label "good first issue" \
  --title "Add a same-day conflicting-status edge case to the process-exceptions pack" \
  --body "$(cat <<'EOF'
Challenge type: contradictory artifact (docs/contributing/FIRST_CONTRIBUTIONS.md, type 1).

## Gap

The asset-reliability pack tests two same-day statements about one subject that disagree and have no stated winner (`scenario-packs/asset-reliability/narrative/edge-cases.md`, `edge-010`). The process-exceptions pack has no equivalent: its edge cases (`scenario-packs/process-exceptions/narrative/edge-cases.md`) cover conflicting dates (`edge-002`) but not two conflicting same-day status claims about one batch or line.

## Proposed behaviour

One new synthetic artifact in `scenario-packs/process-exceptions/fixtures/edge-cases/` containing two same-day claims about one batch that disagree (for example released and on hold), written by someone who says they do not know which is right. Expected outcome: the conflict is surfaced for review and neither status is silently chosen.

## File set

See "Contradictory or hazardous artifact" in docs/contributing/FIRST_CONTRIBUTIONS.md. The next id is `process-exceptions-edge-017`.

## Done when

`pnpm validate:packs` and `pnpm eval --pack process-exceptions` pass and the gold `notes` field names the hazard. Please comment with your intended expected outcome before opening a pull request.
EOF
)"
```

### Seed 2: Add an unsupported-language edge case to the document-assurance pack (type 1)

```bash
gh issue create --label "good first issue" \
  --title "Add an unsupported-language edge case to the document-assurance pack" \
  --body "$(cat <<'EOF'
Challenge type: contradictory or hazardous artifact (docs/contributing/FIRST_CONTRIBUTIONS.md, type 1).

## Gap

`docs/PACK_AUTHORING.md` section 9 says edge cases should cover, at minimum, an unsupported language and a low-quality or garbled extraction. The asset-reliability pack does (`scenario-packs/asset-reliability/narrative/edge-cases.md`, `edge-008` and `edge-009`). The document-assurance pack does not: `scenario-packs/document-assurance/narrative/edge-cases.md` lists no unsupported-language or garbled-text case, and `scenario-packs/document-assurance/evaluations/edge-cases.gold.json` has none either.

## Proposed behaviour

One short synthetic email or reviewer note written entirely in a language other than English. Expected outcome: abstain (`insufficient-evidence` observations, no event, no signal, no decision) rather than a confident silent translation. A garbled-text case can be a separate follow-up issue.

## File set

See "Contradictory or hazardous artifact" in docs/contributing/FIRST_CONTRIBUTIONS.md. The next id is `document-assurance-edge-017`.

## Done when

`pnpm validate:packs` and `pnpm eval --pack document-assurance` pass and the gold `notes` field names the hazard.
EOF
)"
```

### Seed 3: Independently check the evidence spans of one process-exceptions edge case (type 2)

```bash
gh issue create --label "good first issue" \
  --title "Independently check the evidence spans of process-exceptions-edge-001" \
  --body "$(cat <<'EOF'
Challenge type: independently justified evidence span (docs/contributing/FIRST_CONTRIBUTIONS.md, type 2).

## Gap

`packages/evals/README.md` ("Merged-design deltas") says gold has no independent evidence locator, so the checksum-validated extraction file is the oracle. In `packages/evals/src/runner.ts`, `expectedObservations` takes `evidenceLocator` from the extraction itself. A wrong but self-consistent span therefore passes. All 285 `text-range` locators in the current extractions match their excerpts mechanically; whether each excerpt actually justifies its value has not been checked by an independent reader.

## Task

Read `scenario-packs/process-exceptions/fixtures/edge-cases/artifacts/process-exceptions-edge-001.txt` without looking at the extraction. Then compare it with `scenario-packs/process-exceptions/fixtures/edge-cases/extractions/process-exceptions-edge-001.json`. For each observation, state whether the span supports the value, and fix any that do not. Pay particular attention to the `insufficient-evidence` observations: the span should point at the text that shows the information is missing.

## Done when

The pull request has a table of schema key, value, quoted passage and offsets, and `pnpm validate:packs` and `pnpm eval --pack process-exceptions` pass. Artifact bytes are unchanged.
EOF
)"
```

### Seed 4: Make a freshly scaffolded pack pass `pnpm eval --pack` (type 3)

```bash
gh issue create --label "good first issue" \
  --title "A freshly scaffolded pack fails pnpm eval --pack: demo and edge-cases gold files are missing" \
  --body "$(cat <<'EOF'
Challenge type: missing expected outcome (docs/contributing/FIRST_CONTRIBUTIONS.md, type 3).

## Gap

`loadGold` in `packages/evals/src/runner.ts` reads `evaluations/<set>.gold.json` for every fixture set (smoke, demo, edge-cases). `scenario-packs/_template/` ships only `evaluations/smoke.gold.json` and has no `fixtures/demo` or `fixtures/edge-cases` directories (see its `manifest.yaml` comment and `README.md`). `pnpm pack:scaffold <id> ...` copies it, so `pnpm validate:packs` reports the new pack `OK` but `pnpm eval --pack <id>` fails with `ENOENT` opening a missing `evaluations/<set>.gold.json`. The README that the scaffold writes into the new pack and `docs/PACK_AUTHORING.md` (section 12) both send authors to `pnpm eval --pack <id>`.

## Task

Propose the smallest fix and confirm it in this issue first. Options: add valid, minimal demo and edge-cases fixtures and gold to the template, or have the evaluation runner skip sets whose fixture directory does not exist (that touches `packages/evals`, so a maintainer must agree). Either way, record the choice in the troubleshooting table in `docs/PACK_AUTHORING.md` section 11.

## Done when

`pnpm pack:scaffold probe-pack --name Probe --description Probe` followed by `pnpm eval --pack probe-pack` passes (delete the probe pack afterwards), and `pnpm validate:packs`, `pnpm test` and `pnpm architecture:check` pass.
EOF
)"
```

### Seed 5: Fix stale artifact counts in the pack narrative indexes (type 4)

```bash
gh issue create --label "good first issue" \
  --title "Fix stale artifact counts in the pack narrative edge-case indexes" \
  --body "$(cat <<'EOF'
Challenge type: source-backed documentation correction (docs/contributing/FIRST_CONTRIBUTIONS.md, type 4).

## Gap

Three narrative files state an edge-case count that disagrees with the pack:

- `scenario-packs/asset-reliability/narrative/edge-cases.md` line 3 says "11 edge-case artifacts"; its table has 20 rows and `fixtures/edge-cases/index.json` has 20 entries.
- `scenario-packs/document-assurance/narrative/edge-cases.md` line 3 says "7 edge-case artifacts"; `evaluations/edge-cases.gold.json` has 16 entries.
- `scenario-packs/process-exceptions/narrative/edge-cases.md` line 3 says "7 edge-case artifacts"; `evaluations/edge-cases.gold.json` has 16 entries.

`narrative/expected-outcomes.md` in the two newer packs also says "all 28" artifacts (line 3); please check that count against the `index.json` files under `fixtures/` and correct it if it is wrong.

## Task

Correct the counts, or remove the number if it will go stale again. In the pull request, show the command output you used to count (for example `node -e` over `index.json`, or `grep -c`).

## Done when

Only those narrative files change, and every number in them can be verified from a file in the same pack.
EOF
)"
```

### Seed 6: Remove the finished-task reference from the fixture-set warning (type 4)

```bash
gh issue create --label "good first issue" \
  --title "Fixture-set warning still says tolerated until OIW-004b lands" \
  --body "$(cat <<'EOF'
Challenge type: source-backed documentation correction (docs/contributing/FIRST_CONTRIBUTIONS.md, type 4).

## Gap

`validateFixtureSet` in `packages/scenario-sdk/src/fixtures.ts` (the two `issueWarning` calls near lines 247 and 257) tells pack authors a missing fixture set is "tolerated until OIW-004b lands". OIW-004b has landed (`docs/agent-runs/OIW-004b.md`) and all three shipped packs have full fixture sets, so the message points at finished internal work and does not say what an author should do. The same wording is repeated in `packages/scenario-sdk/README.md` (line 20), `docs/PACK_AUTHORING.md` (troubleshooting table, line 407) and `scenario-packs/_template/README.md` (line 51).

## Task

Agree a replacement message in this issue, for example one that says a shipped pack should author the set. Update the message and the three documents together. If a test asserts the old string, update it in the same pull request. Message text only: no behaviour change.

## Done when

`grep -rn "OIW-004b lands" packages docs scenario-packs` finds only historical agent-run records, and `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm validate:packs` pass.
EOF
)"
```
