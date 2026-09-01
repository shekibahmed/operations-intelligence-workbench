# Pack Authoring Guide

How to author a new Scenario Pack (PRD §11/§12) that loads validly against
the frozen `@oiw/contracts` v1.5 manifest schema and passes
`pnpm validate:packs`. This guide teaches the *current, validator-enforced*
contract, as proven by the three shipped packs (`asset-reliability`,
`process-exceptions`, `document-assurance`) and the defects their
authoring uncovered — not the PRD §11.1/§11.2 illustrative layout, which
predates `PLAN_AMENDMENTS.md` and the real implementation in places (see
"Where this guide differs from PRD §11" below).

Read alongside this guide:

- `scenario-packs/_template/` — a scaffold pack that loads validly today.
  Copy it and follow §3 below in order.
- `packages/contracts/src/configuration.ts` — the frozen manifest, rule,
  workflow, case and observation/event schemas (the actual source of
  truth; this guide describes it in prose).
- `packages/scenario-sdk/README.md` — what the loader validates and how,
  from the SDK's own point of view.
- `docs/PLAN_AMENDMENTS.md` — A1 (fixture/extraction contract), A2 (closed
  rule fact catalogue), A5 (dashboard/metric surface), A7 (P0 re-staging,
  fixture volumes).

## 1. Pack anatomy

A pack is a directory under `scenario-packs/<pack-id>/` containing a
`manifest.yaml` plus every file it references, relative to itself.
`buildPackRegistry("scenario-packs")` enumerates every directory there,
so `<pack-id>` becomes part of the pack's public identity (`registry.get(id,
version)`) — pick it once and don't rename it later.

| Path | Contract | Cardinality | Notes |
|---|---|---|---|
| `manifest.yaml` | `ScenarioPackManifestSchema` | 1 | YAML, not JSON — the only file in the bundle that may carry `#`-comments. |
| `labels.json` | none (read as a JSON object; loader errors if it is not one) | 1 | Every pack-facing UI label. See §5. |
| `schemas/entities/*.json` | none (read as JSON; not Zod-validated by the loader) | ≥1 | Still worth keeping consistent with the real packs' `{id, displayName, description, attributes[]}` shape even though nothing enforces it today. |
| `schemas/observations/*.json` | `ObservationSchemaDefinitionSchema` (v1.2) | ≥1 | One file per extractable fact. §2. |
| `schemas/events/*.json` | `EventDefinitionSchema` (v1.4) | ≥1, one per `manifest.eventTypes[]` entry | §3 covers ambiguity — the OIW-110 defect class. |
| `schemas/cases/*.json` | `CaseDefinitionSchema` (v1.3) | ≥1, one per `manifest.caseDefinitions[]` entry | `workflowId`, `closureRequirements` and `triggeredByRules` are all cross-checked against other files — see §7. |
| `workflows/*.json` | `WorkflowDefinitionSchema` | ≥1, keyed by `manifest.workflows` | `initialState` and every transition's `from`/`to` must reference a declared state (enforced by the schema itself, not just the loader). |
| `rules/*.json` | `RuleDefinitionSchema[]` (non-empty array per file) | ≥1 file | The fact catalogue is closed (A2) — §6. |
| `dashboards/metrics.json` (or wherever `manifest.metrics[]` points) | `MetricDefinitionSchema[]` (v1.5) | ≥1 | §8. |
| `dashboards/{leadership,operations,technical}.json` | `DashboardDefinitionSchema` (scenario-sdk-owned, not in `@oiw/contracts` — see `packages/scenario-sdk/src/dashboards.ts`) | exactly 3 | Every widget's `parameters.metricId` must resolve. §8. |
| `seed/entities.json` (optional; `manifest.seedEntities`) | `SeedEntityCatalogueSchema` (v1.3) | 0 or 1 | Unique `id`s; every `entityType` must be declared in the manifest. |
| `fixtures/{smoke,demo,edge-cases}/index.json` + `artifacts/` + `extractions/` | `FixtureSetIndexSchema` / `ExtractionResultSchema` | 3 manifest paths declared; on-disk content optional per set | §4/§9 — the checksum workflow (A1). |
| `evaluations/*.json` (`manifest.evaluationSets[]`) | none (read as JSON only) | ≥1 | Not Zod-validated by the loader, but consumed by application-layer tests (see `packages/application/test/common-lifecycle.integration.test.ts`'s `GoldExpectation` shape) — match the real packs' `{fixtureId, expectedObservations[], expectedEntities[], expectedEventType, expectedSignals[], expectedCaseLinkage, expectedDecision, notes}` shape even though the SDK won't reject a different one. |
| `README.md` | none | 1 | Document your pack's bundle layout, storylines and any deviations, per the convention in the three real packs and `scenario-packs/_template/README.md`. |
| `tours/*.json` (optional; `manifest.tours`) | none (read as JSON only) | 0–1 | Optional since contracts v1.5 (`ScenarioPackManifestSchema.tours` is `.optional()`) — omit entirely rather than stub it. See `docs/agent-runs/OIW-702.md` for the tour framework once you need one. |

### Where this guide differs from PRD §11

PRD §11.1/§11.2 show an illustrative single-file
`schemas/{observations,events,cases,entities}.json` layout and a
`packVersion`/`demo:` manifest shape. The real, validator-enforced
contract (what this guide and `scenario-packs/_template/` follow) splits
observations and events into one file per schema/event type under
`schemas/observations/` and `schemas/events/`, requires a top-level
`metrics` manifest field (`dashboards/metrics.json` in all three real
packs, folded in rather than a separate `metrics/` directory — see
`docs/agent-runs/OIW-004b.md`'s "Metrics folded into dashboards/metrics.json"
decision), and makes `tours` optional rather than required. Trust
`packages/contracts/src/configuration.ts` and this guide over PRD §11's
inline mock when they disagree; the PRD's mock predates
`PLAN_AMENDMENTS.md` A6/A7 and the OIW-103 validator.

## 2. Authoring order (avoid the historical defect classes)

Author in this order. Each step is validated by the next, so working
top-to-bottom means a validator error always points at the step you just
finished, not three steps back.

1. **`schemas/observations/*.json`** — one file per distinct fact you can
   extract. Decide `valueType` (`string`/`number`/`boolean`/`object`) and,
   for `string`, whether it needs an `enum`. Set `entityType` on any
   Observation that should be able to anchor an Event's `primaryEntity`.
2. **`schemas/entities/*.json`** — one file per Entity type your
   Observations' `entityType` hints reference.
3. **`schemas/events/*.json`, with discriminators up front — the OIW-110
   defect class.** Give every Event type a `requiredObservations` set (or,
   where two Event types would otherwise share the exact same required
   keys, a `requiredObservationValues` constraint on one of them) that no
   other Event definition in the pack matches. `pnpm validate:packs`
   compares Event definitions by their **matching criteria only** — the
   unordered required Observation keys, any value constraints, and
   whether the primary-Entity mapping is itself a required key — not by
   `eventType` id, filename or artifact type. Two Event types this pack
   would otherwise be unable to tell apart both fail with `is
   indistinguishable from`. This is not a hypothetical: all three real
   packs shipped indistinguishable Event pairs (`repair-scheduled` vs
   `maintenance-completed`; Document Assurance's `review-status`-only
   quartet) that OIW-110 had to reconcile after the fact by adding real
   discriminating Observations or `requiredObservationValues` — do it now,
   before fixtures exist, not after.
4. **`schemas/cases/*.json`** — reference a `workflowId` you're about to
   author (§7) and leave `closureRequirements`/`triggeredByRules` as
   placeholders you'll fill in once the workflow and rules exist; the
   loader cross-checks both, so get the workflow and rules right first and
   come back.
5. **`workflows/*.json`** — states, transitions, and named
   `closureRequirements` (the ids your case schema will reference).
6. **`rules/*.json`** — see §6. Fill in the case schema's
   `triggeredByRules`/`closureRequirements` now that rule and closure ids
   exist.
7. **`seed/entities.json`** (if used) — the Entities your fixtures will
   reference by `externalReference`/`aliases`.
8. **`fixtures/smoke/artifacts/*`, then checksums, then
   `extractions/*.json`, then `index.json`** — §4/§9. Compute checksums
   and evidence offsets from the real file bytes; never hand-type them
   (see §4's OIW-004b note).
9. **`evaluations/*.gold.json`** — transcribe expected outcomes once
   fixtures and extractions exist, so gold reflects what the fixtures
   actually say rather than what you intended them to say (the OIW-701
   defect class — see §9).
10. **`dashboards/metrics.json`, then the three `dashboards/*.json` lens
    files** — §8. Metrics before dashboards; a dashboard widget's
    `metricId` must already resolve.
11. **`labels.json`** — once every id (entity/event/case/signal/action/
    decision/workflow-state/approval-policy type) exists, so nothing is
    missing a label.
12. **`manifest.yaml`** last — every path it declares should already
    exist by this point; `pnpm validate:packs` (§10) is your final check,
    not your first one.

## 3. Event definitions and disambiguation (contracts v1.4)

An `EventDefinition` (`schemas/events/<event-type>.schema.json`) has:

- `requiredObservations: string[]` (≥1) and `optionalObservations:
  string[]` — Observation schema keys that compose the Event's
  `attributes`.
- `requiredObservationValues?: Record<schemaKey, JsonValue[]>` — a finite
  value constraint on a *required* key only, for when key presence alone
  can't distinguish two Event types (e.g. Document Assurance's
  `review-status` used by four different Events; see
  `docs/agent-runs/OIW-110.md`).
- `occurredAt: { observationSchemaKey: string | null; fallback:
  "artifact-received-at" }` — the Observation supplying the Event's
  timestamp, or `null` to always use the Artifact's received time (as
  `scenario-packs/_template` does, since it has nothing else to key
  time off).
- `primaryEntity: { observationSchemaKey: string } | null` — must
  reference a required-or-optional key whose Observation schema declares
  an `entityType`; a null-typed or entity-type-less Observation cannot
  anchor an Event's primary Entity (`must declare an entityType`).

**Ambiguity is judged on matching inputs only**: unordered required keys,
their value constraints, and whether the primary-Entity key is itself
required — never on `eventType`, filename, artifact type or gold-set
content. Two Events with the same required keys and no distinguishing
value constraint are always ambiguous, even if you "know" they mean
different things narratively.

## 4. The checksum workflow (amendment A1)

Every fixture artifact ships with a byte-for-byte-checksum-keyed expected
extraction. The loader recomputes, it never trusts:

1. Write the artifact content file under
   `fixtures/<set>/artifacts/<pack>-<set>-<NNN>.<ext>`.
2. Compute its real SHA-256 **from the file you just wrote**, not by
   hand: `sha256sum fixtures/<set>/artifacts/<id>.txt`. Never invent or
   copy-paste a checksum — `pnpm validate:packs` recomputes it and any
   mismatch is a validator error (`Declared checksum "..." does not match
   artifact checksum "..."`), and a stale one you didn't recompute after
   an edit is the single most common validate:packs failure in this
   repository's history (`docs/agent-runs/OIW-004b.md` records the prior
   session's asset-reliability smoke set shipping with the literal string
   `"PLACEHOLDER"` in place of real checksums).
3. Write `fixtures/<set>/extractions/<id>.json` — an `ExtractionResult`
   whose top-level `artifactChecksum` is that same SHA-256. This is
   checked **twice**: once against the artifact's own bytes, and once
   between the extraction file and the `index.json` entry's `sha256`
   field — they must all three agree.
4. For every extracted Observation, locate its evidence excerpt's exact
   character offset **in the real file**, don't hand-count it. A
   hand-computed offset that's off by even one character still parses
   (the schema only requires `end > start`), so this is a silent-drift
   risk, not a validator error — OIW-004b's remediation run caught six
   excerpt/line-wrap mismatches this way and fixed them by locating each
   excerpt programmatically (`str.index(excerpt)` or equivalent) instead
   of hand-computing offsets. `scenario-packs/_template`'s two extractions
   were generated exactly this way.
5. Add the artifact to `fixtures/<set>/index.json`
   (`{id, artifactType, mimeType, contentPath, sourceMetadata, sha256,
   expectedExtraction}`).

**Byte-identical duplicates must have byte-identical extraction
semantics.** If your narrative calls for a resubmitted or duplicate
artifact (e.g. an edge-case "exact resend"), and its content file is
byte-for-byte identical to an earlier fixture, its extraction must be
byte-for-byte identical too — the OIW-701 defect class. Two extractions
for identical source bytes that disagree (even in something as small as a
normalised name) is a pack-data bug, not a legitimate reinterpretation:
"the frozen source is byte-identical, so different extraction semantics
[are] invalid" (`docs/agent-runs/OIW-701.md`). Verify with `diff -u`
between the two extraction files before treating an edge-case duplicate
as done.

A missing `fixtures/<set>/` directory, or a missing `artifacts/`
subdirectory within one, is a **warning**, not an error — useful while a
pack is still being built (`scenario-packs/_template` ships only
`fixtures/smoke/`), but PRD §21.2/`docs/agent-runs/OIW-004b.md` still
expect real packs to ship all three sets at volume before M3.

## 5. Neutrality rules (§10.2)

Everything domain-specific is pack-owned, never core: entity types,
human-readable labels, Observation schemas, Event definitions, workflow
states, rules, approval policies, dashboard cards, metrics, seed data and
guided-tour steps (PRD §10.2). Core code must never branch on a pack id
or an industry-specific entity/workflow/severity name (PRD §10.1;
AGENTS.md "Product Rule"). Concretely, for pack authors:

- Every user-visible string your pack needs — entity/event/case/signal/
  action/decision type names, workflow state names, severity/priority
  labels, lens names — belongs in `labels.json`, not hardcoded anywhere a
  core component could embed it directly.
- Rule facts come only from the closed catalogue in
  `FactReferenceSchema` (event fields, Observation lookups by schema key,
  and the four core-computed aggregates: `related-event-count`,
  `open-case-count`, `open-action-count`, `pending-decision-count`) — see
  §6. There is no way to add a pack-specific fact kind; if your rule logic
  needs one, that is a sign the logic belongs in a different, more
  general aggregate proposed as a contract change, not a workaround in
  pack data.
- Dashboard widgets come only from the fixed A5 catalogue (8 types — see
  §8 and `docs/UX_SPEC.md` §6); a pack chooses which widgets appear and
  supplies labels/metrics, it does not define new widget types or
  arbitrary queries.
- `pnpm architecture:check` scans core packages for prohibited
  industry terms and confirms pack removal doesn't break compilation —
  run it if you're touching anything outside `scenario-packs/`, though
  a pack-only change should never need to.

## 6. Rules and the closed fact catalogue (amendment A2)

A `RuleDefinition` (`rules/*.json`, each file a non-empty array) is
`{id, version, description, when: Condition, then: RuleAction[]}`.
`Condition` is `all`/`any`/`not`/a `ComparisonCondition` over a
`FactReference`, which is exactly one of:

- `{kind: "event-field", field: "eventType" | "occurredAt" | "recordedAt"
  | "entityIds" | "attributes", attributeKey?}` — `attributeKey` is
  required iff `field` is `"attributes"`, forbidden otherwise.
- `{kind: "observation", schemaKey, field: "value" | "normalisedValue" |
  "confidence" | "reviewStatus" | "evidenceStatus"}`.
- `{kind: "aggregate", aggregate: "related-event-count" |
  "open-case-count" | "open-action-count" | "pending-decision-count",
  eventType?, withinHours?}`.

Any other fact `kind`/`field` fails schema validation outright — this
vocabulary cannot be extended by a pack. Every `eventType` referenced by
an `event-field` or `aggregate` fact must also be one your manifest
declares (`Rule "..." references undeclared event type "..."`).

`RuleAction` is `{type, definitionId, parameters}` where `type` is one of
`create-signal`, `create-case`, `create-action`, `propose-decision`,
`flag-review`. `definitionId` is a free-form slug for
`create-signal`/`create-action`/`propose-decision`/`flag-review` (not
cross-checked against another catalogue), but a `create-case` action's
`definitionId` **must** match a `caseType` declared in
`manifest.caseDefinitions` (`create-case references unknown Case
definition "..."`). High-risk outcomes must go through `propose-decision`
with a `riskLevel` and `approvalPolicyId` — never straight to an
auto-executed state change — per AGENTS.md's AI-and-safety rule that
high-risk Decisions require a recorded human Approval.
`scenario-packs/_template/rules/approval.rules.json` pairs
`propose-decision` with `flag-review` for exactly this reason.

## 7. Cases and workflows

A `CaseDefinition` (`schemas/cases/*.json`) names a `workflowId` that
must exist in `manifest.workflows`, a `closureRequirements: string[]`
whose every id must appear in that workflow's own
`closureRequirements[].id` list (`Case definition references unknown
closure requirement "..."`), and a `triggeredByRules: string[]` (≥1)
whose every id must be a rule id that exists somewhere in
`manifest.rules[]` (`Case definition references unknown rule "..."`).
Author the workflow and rules first (§2 steps 5–6), then come back and
fill these in — there's no way to satisfy the cross-check the other way
around.

A `WorkflowDefinition` needs an `initialState` that is one of its own
`states[].id`, transitions whose `from`/`to` both reference declared
states, and an optional `requiresApprovalPolicyId` on any transition that
should be gated behind a recorded human Approval (contracts enforces the
state-reference rules directly, ahead of the loader).

## 8. Metrics and dashboards (amendment A5, contracts v1.5)

`manifest.metrics[]` files are parsed as non-empty arrays of
`MetricDefinition`. The v1.5 aggregation vocabulary is closed to `count`,
`count-where`, `count-by-field`, `trend-over-time` and `sla-derived`; each
takes a `recordType` (`cases`, `signals`, `decisions`, `action-items`,
`events`, `artifacts`) that constrains which `field`s can group/filter it
and which timestamp fields can window/bucket it — see
`packages/contracts/src/domain.ts`'s `METRIC_FIELDS_BY_RECORD_TYPE`/
`METRIC_TIMESTAMPS_BY_RECORD_TYPE` for the exact allowlists per
`recordType`. `count` alone takes no `filters` — it is a plain total.
`classification: "hypothetical"` requires an `illustrative` block
(`summary` + non-empty `assumptions`); every other classification
forbids one. `scenario-packs/_template/dashboards/metrics.json` has one
metric per aggregation kind for exactly this reason — copy whichever one
matches what you're building.

Each of the three dashboard files (`dashboards.leadership`,
`.operations`, `.technical`) is `{id, title, widgets: Widget[]}`
(≥1 widget), where each widget is `{id, type, title, parameters}` and
`type` is one of the fixed 8 (`stat-card`, `severity-breakdown`,
`list-card`, `trend-line`, `sla-table`, `pending-approvals`,
`activity-feed`, `text-impact` — see `docs/UX_SPEC.md` §6 for what each
one renders and when to pick it). Every widget's `parameters.metricId`
must be a string that resolves against the pack's own Metric catalogue
(`Dashboard widget references unknown Metric "..."`) — author
`dashboards/metrics.json` before the three lens files.

## 9. Gold sets

`manifest.evaluationSets[]` files aren't Zod-validated by the loader (any
valid JSON passes pack loading), but application-layer tests consume them
against the real packs' shape:
`{fixtureId, expectedObservations: {schemaKey, status, value}[],
expectedEntities: string[], expectedEventType: string | null,
expectedSignals: string[], expectedCaseLinkage: boolean, expectedDecision:
{ruleId, approvalRequired, riskLevel} | null, notes}`. Author gold
**after** fixtures and extractions exist (§2 step 9), transcribing what
the extraction actually says a rule/Event would produce, not what you
intended before you wrote the fixture — `docs/agent-runs/OIW-701.md`'s
"pack-data fixes and narrative justification" section is a worked example
of gold, extractions, seed data and rule predicates all having to move
together once a common lifecycle test actually exercised them end to end.
PRD §21.2 sizes: ~8 smoke, ~25–40 demo, ~20 gold total, with edge cases
covering (at minimum) a missing identifier, conflicting dates, an
ambiguous entity reference, a negated statement, a duplicate/repeated
artifact, prompt-injection-style content, an unsupported language, a
low-quality/garbled extraction, and a high-risk recommendation on thin
evidence.

## 10. Validation loop

```bash
pnpm validate:packs
```

Runs the registry over `scenario-packs/`, prints one `OK`/`FAIL`/`SKIP`
line per pack directory plus any warnings, and exits non-zero only if any
pack is invalid (a `SKIP` — no `manifest.yaml`, only `narrative/` content
— does not fail the command). Iterate against this loop while authoring;
it is fast and gives path-annotated errors (`<file>#<field.path>:
<message>`).

Once your pack loads clean, the deeper proof is the common lifecycle
test:

```bash
docker compose up -d && pnpm db:migrate   # once, if not already running
pnpm test
```

`packages/application/test/common-lifecycle.integration.test.ts` builds
the real registry, seeds an isolated workspace per pack, processes every
smoke fixture, and asserts Event/Entity/Signal/Case gold plus the
approval-gated Decision path — this is what actually proves your rules
fire the way your gold set claims, not just that your files parse. It is
registry-driven and currently asserts the registry contains **exactly**
the three real packs by id (see `docs/agent-runs/OIW-705.md`'s Known
Limitations for what that means for any pack directory added to
`scenario-packs/` before it ships, including the scaffold template
itself).

Also run, per AGENTS.md's quality gates, whichever apply to what you
changed: `pnpm lint`, `pnpm typecheck`, `pnpm build`,
`pnpm architecture:check`.

## 11. Troubleshooting table

Real, verbatim `pnpm validate:packs` error messages (from
`packages/scenario-sdk/src/*.ts`), what they mean, and where to look.

| Error (verbatim or with `"..."` for the variable part) | Cause | Fix |
|---|---|---|
| `No manifest.yaml found in pack directory` | The pack directory has no `manifest.yaml` and no `narrative/` subdirectory either (so it's not even a valid pre-OIW-004b skip). | Add `manifest.yaml`, or remove the stray directory from `scenario-packs/`. |
| `Invalid YAML: ...` | `manifest.yaml` doesn't parse as YAML. | Check indentation/quoting; YAML is whitespace-sensitive. |
| `<field.path>: ...` (manifest, e.g. `entityTypes: Array must contain at least 1 element(s)`) | The parsed manifest fails `ScenarioPackManifestSchema`. | Compare against §1's table and `packages/contracts/src/configuration.ts`; every manifest field is required unless the schema explicitly marks it `.optional()`. |
| `Expected labels file to contain a JSON object` | `labels.json` parses as JSON but isn't a top-level object (e.g. it's an array). | Wrap it in `{ ... }`. |
| `Duplicate observation schemaKey: "..."` | Two files under `schemas/observations/` share a `schemaKey`. | Rename one; `schemaKey` must be globally unique within the pack. |
| `Event definition "..." must match manifest event type "..."` | `schemas/events/<file>.json`'s `eventType` doesn't match the `id` your manifest's `eventTypes[]` entry declared for that file. | Make them match exactly — this is a straight string comparison. |
| `Event definition displayName must match manifest label "..."` | Same, for `displayName`. | Keep the manifest's `eventTypes[].displayName` and the schema file's `displayName` in sync. |
| `Event definition references unknown observation schemaKey "..."` | An Event's `requiredObservations`/`optionalObservations` names a `schemaKey` with no corresponding file under `schemas/observations/`. | Add the Observation schema, or fix the typo. |
| `Primary Entity observation "..." must declare an entityType` | An Event's `primaryEntity.observationSchemaKey` points at an Observation schema with no `entityType` field. | Add `entityType` to that Observation schema (§3). |
| `Event definition "..." is indistinguishable from "..."` | Two Event definitions have identical matching criteria (§3) — the OIW-110 defect class. | Add a real distinguishing required Observation, or a `requiredObservationValues` constraint on an existing required key. |
| `Duplicate Event definition: "..."` | Two `schemas/events/*.json` files declare the same `eventType`. | Merge them or rename one. |
| `Seed Entity references undeclared entity type "..."` | `seed/entities.json` has an `entityType` not in `manifest.entityTypes[]`. | Add the entity type to the manifest, or fix the seed entry. |
| `Duplicate seed Entity id "..."` | Two seed Entities share an `id`. | `id` must be unique within the catalogue. |
| `Case definition references unknown workflow "..."` | `schemas/cases/*.json`'s `workflowId` isn't a key in `manifest.workflows`. | Add the workflow, or fix the id. |
| `Case definition references unknown closure requirement "..."` | A case's `closureRequirements[]` entry doesn't match any `id` in its workflow's own `closureRequirements[]`. | Add the closure requirement to the workflow, or fix the id (§7). |
| `Case definition references unknown rule "..."` | A case's `triggeredByRules[]` entry doesn't match any authored rule's `id`. | Author the rule, or fix the id. |
| `create-case references unknown Case definition "..."` | A rule's `create-case` action's `definitionId` doesn't match any `caseType` in `manifest.caseDefinitions`. | Fix the `definitionId`, or add the case definition. |
| `Rule "..." references undeclared event type "..."` | A rule's `when` condition references an `eventType` (via an `event-field` or `aggregate` fact) not in `manifest.eventTypes`. | Add the event type, or fix the id (§6). |
| `Duplicate Metric definition "..."` | Two entries in `dashboards/metrics.json` (or wherever `manifest.metrics[]` points) share an `id`. | Rename one. |
| `Field "..." cannot filter/group/bucket "..."` / `Timestamp "..." cannot window/bucket "..."` | A Metric's `filters`/`field`/`timestampField`/`timeWindow.field` isn't in that `recordType`'s allowlist (§8). | Pick a field from `METRIC_FIELDS_BY_RECORD_TYPE`/`METRIC_TIMESTAMPS_BY_RECORD_TYPE` for that `recordType`. |
| `Hypothetical metrics require illustrative assumptions` / `Only hypothetical metrics may declare illustrative assumptions` | `classification` and the presence/absence of `parameters.illustrative` disagree. | `illustrative` iff `classification: "hypothetical"`. |
| `Dashboard widget requires a metricId` / `Dashboard widget references unknown Metric "..."` | A widget's `parameters.metricId` is missing, not a string, or doesn't match any authored Metric `id`. | Author the Metric first (§8), then reference its exact `id`. |
| `Fixture set "..." directory not found; tolerated until OIW-004b lands` (warning) | `manifest.fixtures.<set>` points at a path with nothing on disk. | Fine while authoring incrementally (`scenario-packs/_template` ships only `smoke/`); fill in before shipping (§4). |
| `Declared checksum "..." does not match artifact checksum "..."` | `index.json`'s `sha256` for an artifact doesn't match the artifact's real bytes. | Recompute with `sha256sum` (§4) — never hand-type or leave a placeholder. |
| `Expected extraction checksum "..." does not match artifact checksum "..."` | An `extractions/<id>.json`'s `artifactChecksum` doesn't match the artifact's real bytes (or the `index.json` entry's). | Recompute (§4); all three must agree. |
| `Content path "..." escapes the fixture set` / `Expected-extraction path "..." escapes the fixture set` | A fixture index entry's `contentPath`/`expectedExtraction` uses `..` or an absolute path. | Use a plain relative path inside the fixture set directory. |
| `Duplicate fixture artifact id "..."` | Two entries in one `index.json` share an `id`. | Rename one. |

## 12. Where pack content surfaces in the UI

Cross-reference `docs/UX_SPEC.md` and `docs/DEMO_SCRIPT.md` for what each
authored file drives once a workspace is seeded from your pack:

- `manifest.name`/`.description` and `labels.json` → the Scenario
  Selector (`/demo`, UX_SPEC §5.2) and Guided Scenario Start
  (`/demo/[pack]`, §5.3) — though see the note at the end of this section:
  those two screens are currently driven by a curated static list, not
  the live pack registry.
- `labels.json` entity/event/case/signal/action/decision/workflow-state
  labels → every screen in UX_SPEC §5.4–§5.14 (Leadership/Operations/
  Technical lenses, Case List/Detail, Entity List/Detail, Decision
  Centre, Technical Inspector, Audit Explorer) — see §3.4 "Pack
  configuration of lenses" and §10.3 ("Generic UI components").
- `dashboards/*.json` + `dashboards/metrics.json` → the widget catalogue,
  UX_SPEC §6, one subsection per widget type (§6.1–§6.8); each
  subsection names its "Used by" screen.
- Your pack's fixtures and rules → the step-by-step walkthrough in
  `docs/DEMO_SCRIPT.md`'s per-pack "Full Guided Demonstration" sections
  (Step 0 arrival through Step 10 switch-scenarios) — write your pack's
  own equivalent walkthrough in its `README.md`'s storyline section once
  the demo fixture set exists, the way the three real packs do.
- `manifest.tours` (optional) → the Guided Tour framework, UX_SPEC §4;
  see `docs/agent-runs/OIW-702.md`.

**Note on `/demo` today**: `apps/web/src/app/demo/page.tsx` and
`apps/web/src/app/demo/[pack]/page.tsx` currently render from a curated,
hand-maintained list (`apps/web/src/lib/stub/packs.ts`), not from
`buildPackRegistry`'s live output — a new pack does not appear on
`/demo` merely by existing under `scenario-packs/` and passing
`pnpm validate:packs`; it must also be added to that list (an
`apps/web`-owned change, outside a pack-authoring task's Owned Paths).
See `scenario-packs/_template/README.md`'s "Why this pack is excluded
from /demo" for the related, already-confirmed registry-enumeration
concern this creates for any non-demo pack directory.
