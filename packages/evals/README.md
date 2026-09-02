# Evaluation runner

`@oiw/evals` executes the deterministic fixture provider and the public
application pipeline against every registered Scenario Pack. It creates an
isolated PostgreSQL database, migrates it, creates and seeds fresh workspaces,
processes the gold-covered fixture sets, scores the results, and drops the
database before exiting.

## Commands

```bash
pnpm eval
pnpm eval --pack asset-reliability
pnpm eval --pack process-exceptions
pnpm eval --pack document-assurance
pnpm eval --provider fixture
```

The command prints a per-pack/per-dimension table and writes machine-readable
results to `packages/evals/eval-results.json`. The file is ignored by Git. A
score below its explicit threshold exits non-zero. Deterministic fixture-mode
thresholds default to `1.0` for every dimension.

## Dimensions

- Field precision and recall use `schemaKey` plus exact JSON value matching
  with multiset semantics, so repeated fields are counted correctly.
- Classification accuracy covers pack observation schemas with an `enum`.
- Evidence correctness permits text-range offsets within five characters only
  on the same line. Page, table-cell, JSON-path and attachment locators must
  match exactly.
- Abstention precision and recall score both `insufficient-evidence` and
  explicit `negated` non-assertions, requiring the exact status.
- Entity resolution, fired signal rules, approval gating, duplicate
  suppression and workflow case states are driven through public services
  against PostgreSQL.
- Duplicate fixtures are excluded from extraction scoring and are instead
  resubmitted byte-for-byte; Artifact/Event/Signal/Case counts must remain
  unchanged and the duplicate-suppression trace must be present.

Every failure includes the fixture ID and field or operational dimension. The
unit suite includes deliberately sabotaged synthetic gold and proves that each
dimension independently produces a failing score and precise diagnostic.

## Merged-design deltas

`docs/EVALUATION.md` predates the current pack format. The merged gold JSON
contains values and operational expectations but no independent evidence
locator or exact expected case state. Consequently:

- checksum-validated expected-extraction files are the evidence-locator oracle;
- case-state scoring verifies the authored smoke linkage plus validity against
  the pack workflow, and verifies valid final states for demo lifecycles;
- exact per-fixture entity/rule assertions use smoke gold, the operational
  surface already enforced by the merged common lifecycle test; demo and edge
  fixtures still run through the full pipeline, while their machine-readable
  gold remains insufficient to distinguish newly-created outcomes from later
  storyline reconciliation;
- byte-identical edge duplicates have intentionally different narrative gold
  in two packs, so they are evaluated solely as duplicates rather than as a
  second extraction.

These constraints avoid inventing a second gold schema or changing pack
content from the evaluation-runner task.
