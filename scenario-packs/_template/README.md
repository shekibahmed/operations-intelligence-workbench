# Template Pack (scaffold)

A minimal, industry-neutral Scenario Pack (PRD §11) that loads validly
against `@oiw/contracts` v1.5 and demonstrates one working example of
every file the manifest can reference. It is the scaffold companion to
`docs/PACK_AUTHORING.md` — copy this directory, rename every `template-`
id, and follow the guide's authoring order.

**This pack is not a demo scenario.** It exists to teach pack authoring,
not to be selected on `/demo`. See "Why this pack is excluded from
/demo" below — read it before copying this pack into a real one.

## Scenario: generic record intake

A "record" (any inbound artifact) names a "Subject" (any tracked thing).
When the same Subject appears in two or more records within 30 days, the
pack raises a signal and opens a case with a follow-up action. On a third
occurrence, it proposes a human-approval-gated resolution Decision. This
is deliberately the smallest storyline that exercises every rule action
type (`create-signal`, `create-case`, `create-action`, `propose-decision`,
`flag-review`) and the full Case → Decision → Approval lifecycle — swap
"record"/"Subject" for your pack's real nouns; the mechanics don't change.

## Bundle layout

| Path | Contents | Cardinality here | Real packs |
|---|---|---|---|
| `manifest.yaml` | Pack manifest. | 1 | Same. |
| `labels.json` | UI label set. | 1 | Same, larger. |
| `schemas/entities/` | `template-subject`. | 1 entity type | 3–4 entity types. |
| `schemas/observations/` | `template-record-identifier`. | 1 observation | 12–22 observations. |
| `schemas/events/` | `template-record-received`. | 1 event type | 6–9 event types. |
| `schemas/cases/` | `template-intake-case`. | 1 case type | 1 case type (same). |
| `workflows/default.workflow.json` | `open → in-review → awaiting-approval → resolved → closed`. | 1 workflow | Same shape. |
| `rules/severity.rules.json` | One `create-signal` rule. | 1 rule | 1–2 rules. |
| `rules/escalation.rules.json` | One rule pairing `create-case` + `create-action`. | 1 rule | 3–4 rules. |
| `rules/approval.rules.json` | One rule pairing `propose-decision` + `flag-review`. | 1 rule | 1–2 rules. |
| `dashboards/metrics.json` | One Metric per v1.5 aggregation kind (`count`, `count-where`, `count-by-field`, `trend-over-time`, `sla-derived`). | 5 metrics | 9–11 metrics. |
| `dashboards/{leadership,operations,technical}.json` | One dashboard per lens, covering all 8 A5 widget types across the three files. | 3 dashboards / 8 widgets | Same shape, more widgets. |
| `seed/entities.json` | Two seed Subjects, `SUB-001`/`SUB-002`. | 2 entities | Dozens. |
| `fixtures/smoke/` | Two artifacts, `index.json`, checksum-keyed `extractions/`. | 2 fixtures | 8–9 smoke fixtures. |
| `fixtures/{demo,edge-cases}/` | Declared in the manifest; **no directory on disk**. | 0 fixtures | 11–25 fixtures each. |
| `evaluations/smoke.gold.json` | Gold entries for both smoke fixtures. | 2 gold examples | 12–45 gold examples across sets. |

## Why `fixtures/demo` and `fixtures/edge-cases` have no content

The manifest's `fixtures` field requires all three paths (`smoke`,
`demo`, `edgeCases`) per `ScenarioPackManifestSchema`, but only `smoke/`
exists on disk. `@oiw/scenario-sdk`'s `validateFixtureSet` treats a
missing fixture-set directory as a **warning**
(`Fixture set "demo" directory not found; tolerated until OIW-004b
lands`), not an error — `pnpm validate:packs` still reports this pack
`OK`. A real pack should author all three sets at the volumes PRD §21.2
and `docs/agent-runs/OIW-004b.md` describe; this template stops at the
minimum that proves the checksum workflow (amendment A1) end to end.

## Why this pack is excluded from `/demo`

`buildPackRegistry` (`packages/scenario-sdk/src/registry.ts`) enumerates
every directory under `scenario-packs/` with no name-based filter, so
this pack loads into `registry.loaded` exactly like a real pack — running
`pnpm validate:packs` today reports **4 loaded, 0 invalid, 0 skipped**.
It does not currently reach `/demo`, because the Scenario Selector
(`apps/web/src/app/demo/page.tsx`) and Guided Scenario Start
(`apps/web/src/app/demo/[pack]/page.tsx`) both render from the curated,
hand-maintained `stubPacks` list in `apps/web/src/lib/stub/packs.ts`
rather than from the live registry — this pack was never added there, so
it cannot appear. This is a pre-existing property of the current UI, not
a mechanism this task added.

That said, **any registry-driven consumer is exposed today**, and this is
a real, confirmed defect, not a hypothetical one:
`packages/application/test/common-lifecycle.integration.test.ts` builds
the registry directly from `scenario-packs/` and asserts
`registry.loaded.map(({id}) => id)` equals exactly the three real pack
ids with `registry.skipped`/`registry.invalid` both empty. With this
pack present, that assertion fails (verbatim evidence in
`docs/agent-runs/OIW-705.md`). There is no existing convention in
`buildPackRegistry`/`loadPackFromDirectory` to exclude a directory by
name (no underscore/dot-prefix skip, no denylist, no manifest
"internal"/"template" flag) — adding one requires editing
`packages/scenario-sdk` or the application test, both outside this
task's Owned Paths (`packages/*` is a Prohibited Path). See
`docs/agent-runs/OIW-705.md` for the requested resolution; this pack's
own content does not change once that lands.

## Authoring order this pack followed

Per `docs/PACK_AUTHORING.md` §3: `schemas/observations` →
`schemas/entities` → `schemas/events` (with its one discriminator-free
definition, since there is only one Event type) → `schemas/cases` →
`workflows` → `rules` → `seed/entities.json` → `fixtures/smoke` (content,
then `sha256`, then checksum-keyed `extractions/`, then `index.json`) →
`evaluations/smoke.gold.json` → `dashboards/metrics.json` → the three
`dashboards/*.json` lens files → `labels.json` → `manifest.yaml` last,
once every path it references exists.

## Verification

```
pnpm validate:packs
```

reports this pack `OK` with two warnings (`fixtures/demo`,
`fixtures/edge-cases` — expected, see above). This pack is intentionally
not exercised by `packages/application/test/common-lifecycle.integration.test.ts`
(the common lifecycle proof), which is scoped to the three real,
demo-shipping packs — see the `/demo` exclusion note above for why this
pack's mere presence under `scenario-packs/` already changes that test's
registry-exactness assertion.
