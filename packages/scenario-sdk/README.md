# @oiw/scenario-sdk

Loads, validates and registers Scenario Packs (PRD §11) against the frozen
`@oiw/contracts` manifest schema. This is the neutrality enforcement point
(FR-001/FR-002): a pack that fails validation never loads.

## Loading a single pack

```ts
import { loadPackFromDirectory } from "@oiw/scenario-sdk";

const result = await loadPackFromDirectory("scenario-packs/asset-reliability");

switch (result.status) {
  case "loaded":
    // result.pack: LoadedScenarioPack — manifest, labels, workflows,
    // rules and the three dashboard lenses, all schema-validated.
    // result.warnings: non-fatal issues (e.g. an absent fixture set,
    // tolerated until OIW-004b lands).
    break;
  case "invalid":
    // result.errors / result.warnings: PackIssue[], each path-annotated
    // to the offending file (and field, after a `#`).
    break;
  case "skipped":
    // Pack directory has only narrative/ content (pre-OIW-004b). Not a
    // failure — result.reason explains why.
    break;
}
```

`loadPackFromDirectory` never throws for pack-content problems; IO/parse/
schema failures all surface as `invalid` issues so a caller can enumerate
many pack directories without one bad pack crashing the process.

## Registry

```ts
import { buildPackRegistry } from "@oiw/scenario-sdk";

const registry = await buildPackRegistry("scenario-packs");

registry.loaded; // PackRegistryEntry[] — id, version, directory, pack, warnings
registry.invalid; // packs that failed validation, with their issues
registry.skipped; // narrative-only packs, pending OIW-004b

registry.get("asset-reliability", "1.0.0"); // LoadedScenarioPack | undefined
registry.list(); // all loaded packs, in stable (sorted directory name) order
```

`scripts/validate-packs.ts` (`pnpm validate:packs`) runs the registry over
`scenario-packs/`, prints a per-pack `OK` / `FAIL` / `SKIP` line, and exits
non-zero only if any pack is `invalid`.

## What gets validated

Per PRD §11.3 and the amendments in `docs/PLAN_AMENDMENTS.md`:

- **Manifest** — `manifest.yaml` against `ScenarioPackManifestSchema`
  (`@oiw/contracts`).
- **Referenced files exist and parse** — labels, entity/event type schemas,
  observation schemas, case definitions, evaluation sets and tours are read
  and must be valid JSON.
- **Workflow state** — each `workflows[*]` file against
  `WorkflowDefinitionSchema`; transitions and `initialState` must reference
  declared states (enforced by the frozen contract itself).
- **Rule references (A2)** — each `rules[*]` file must be a non-empty list
  of `RuleDefinition`s. The fact catalogue is closed by
  `FactReferenceSchema`, so an unrecognised fact `kind`/`field` fails
  schema validation. Additionally, every `eventType` referenced by an
  `event-field` or `aggregate` fact must match a declared `eventTypes[].id`.
- **Dashboard widgets (A5)** — each `dashboards[*]` file's widgets must use
  one of the eight fixed widget types (`DashboardWidgetTypeSchema`).
- **Fixture/extraction cross-check (A1)** — for each fixture set
  (`smoke`/`demo`/`edgeCases`) that exists on disk, every file under
  `<set>/artifacts/` must have a matching `<set>/extractions/<artifact-id>.json`
  whose `artifactChecksum` equals the artifact's SHA-256. A missing fixture
  set or `artifacts/` directory is a **warning**, not an error — the real
  `scenario-packs/*` directories only carry `narrative/` content until
  OIW-004b lands.

## Error format

Every issue is `{ path, message, severity }`. `path` is the pack-relative
file path exactly as declared in the manifest, optionally suffixed with
`#<field.path>` for a specific field inside that file (e.g.
`./rules/default.rules.json#[0].when`). `formatIssue(issue)` renders
`[severity] path: message`.

## Test fixtures

`test/fixtures/packs/` holds one valid pack and one invalid pack per failure
mode (bad manifest, undeclared event type, unknown fact kind, undeclared
workflow state, unknown widget type, missing expected extraction), plus a
narrative-only pack and an empty directory. `test/fixtures/registry/` holds
a miniature `scenario-packs/`-shaped directory (one loaded, one invalid, one
skipped) for the registry enumeration test.
