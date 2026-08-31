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
    // result.pack: LoadedScenarioPack — manifest, labels, observation and
    // Event catalogues, seed Entities, workflows, rules and the three
    // dashboard lenses, all schema-validated.
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

## Observation-schema catalogue (contracts v1.2)

Every manifest-referenced observation-schema file is parsed against
`ObservationSchemaDefinitionSchema` while the pack loads. A loaded pack exposes
the definitions by `schemaKey` without requiring consumers to read pack files:

```ts
import {
  getObservationSchema,
  validateObservationValue,
} from "@oiw/scenario-sdk";

const definition = getObservationSchema(loadedPack, "record-id");
// Equivalent direct catalogue access:
loadedPack.observationSchemas.get("record-id");

if (definition !== undefined) {
  const result = validateObservationValue(definition, proposedValue);
  if (!result.ok) {
    result.issues; // value-relative paths and diagnostic messages
  }
}
```

`validateObservationValue` is synchronous, pure and performs no filesystem
access. It implements the constrained JSON Schema subset used by the packs:
strings (including enum, date and pattern constraints), finite numbers and
integers (including minimum/maximum), booleans, and structured objects with
declared/required properties. `null` is not a valid supported value;
insufficient-evidence and negated nulls remain explicit extraction states.

The definition's existing `displayName` is its pack-supplied label, and
`entityType` is the optional entity-link hint. `evidenceRequired` defaults to
`true` when omitted, preserving the platform provenance rule without requiring
mechanical edits to the three shipped packs. `confidenceThreshold`, when
present, must be between zero and one and is exposed unchanged for the
application-layer abstention policy.

## Event and seed Entity catalogues (contracts v1.4)

Every manifest-declared Event file is validated as an `EventDefinition`. The
definition identifies required and optional Observation schema keys, the
Observation used for `occurredAt` (plus the deterministic Artifact-received
fallback), and the Observation that supplies the primary Entity reference.
When key presence alone cannot encode the distinction, a definition may
constrain a required key to a finite set of `requiredObservationValues`.
Consumers use the public catalogue rather than importing pack files:

```ts
import { getEventDefinition } from "@oiw/scenario-sdk";

const fault = getEventDefinition(loadedPack, "fault-reported");
loadedPack.eventDefinitions.get("fault-reported"); // equivalent
```

The loader rejects duplicate or indistinguishable Event definitions, manifest
ID/label mismatches, unknown Observation schema keys, and primary-Entity
mappings to Observations without an `entityType` hint. Ambiguity comparison is
order-independent and includes required keys, their value constraints, and any
required primary-Entity match.

Packs may declare `seedEntities` in their manifest. That JSON catalogue is
validated with `SeedEntityCatalogueSchema`, checked for duplicate stable IDs
and undeclared Entity types, and exposed as `loadedPack.seedEntities`.
`loadFixtureSet` also returns the same validated list as
`fixtureSet.entities`, so application seeding needs no pack filesystem access.

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

## Loading a fixture set

```ts
import { loadFixtureSet } from "@oiw/scenario-sdk";

const result = await loadFixtureSet(loadedPack, "demo");

if (result.status === "loaded") {
  // Stable artifact-id order. Each item contains the validated index fields,
  // exact artifact bytes, and its validated ExtractionResult.
  result.fixtureSet.artifacts;
  result.fixtureSet.entities; // validated, stable pack seed definitions
  result.warnings;
} else {
  // Invalid index, unsafe/missing paths, checksum mismatches and invalid
  // expected extractions are returned as path-annotated PackIssues.
  result.errors;
}
```

`loadFixtureSet` accepts the manifest names `smoke`, `demo` and `edge-cases`.
The SDK owns index parsing, safe path resolution, artifact reads, SHA-256
verification and expected-extraction validation. Callers do not read the pack
filesystem themselves. A pack with no directory for the requested set returns
a typed empty artifact list and a warning. The loader supports the normalized
OIW-004b `artifacts/` layout while retaining compatibility with its
narrative-authored `content/` index paths.

`scripts/validate-packs.ts` (`pnpm validate:packs`) runs the registry over
`scenario-packs/`, prints a per-pack `OK` / `FAIL` / `SKIP` line, and exits
non-zero only if any pack is `invalid`.

## What gets validated

Per PRD §11.3 and the amendments in `docs/PLAN_AMENDMENTS.md`:

- **Manifest** — `manifest.yaml` against `ScenarioPackManifestSchema`
  (`@oiw/contracts`).
- **Referenced files exist and parse** — labels, Entity type schemas, case
  definitions, evaluation sets and tours are read and must be valid JSON.
- **Observation schemas (contracts v1.2)** — every `observationSchemas[]`
  reference must conform to `ObservationSchemaDefinitionSchema`; duplicate
  `schemaKey` values fail load, and valid definitions populate the public
  schema-keyed catalogue.
- **Event definitions (contracts v1.4)** — every `eventTypes[].schema`
  reference must conform to `EventDefinitionSchema`, match its manifest ID and
  label, reference only known Observation schema keys, and have matching
  criteria distinguishable from every other Event in the pack. Valid
  definitions populate the public event-type-keyed catalogue.
- **Seed Entities (contracts v1.3)** — an optional manifest `seedEntities`
  catalogue must conform to `SeedEntityCatalogueSchema`; stable IDs are unique
  and every `entityType` is declared by the manifest.
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
