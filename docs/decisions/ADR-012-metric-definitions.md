# ADR-012: Constrain and Evaluate Metric Definitions

## Status

Accepted — 2026-09-01

## Context

Scenario Pack manifests referenced Metric JSON files, but the SDK checked only
that those paths contained JSON and then discarded the content. Dashboard
widgets named Metric IDs without validation, and the early contract allowed
aggregation labels such as ratios, arbitrary duration relationships and
activity feeds without an executable, Workspace-scoped query boundary.

Amendment A5 requires packs to parameterise a small set of core aggregations.
They may select and label fixed widgets, but they may not ship SQL, executable
expressions or arbitrary queries. The PRD also requires observed, calculated,
estimated and hypothetical results to remain distinguishable, with
hypothetical impact never presented as operational fact.

## Decision

Contracts v1.5 add `MetricDefinitionV15Schema` with five aggregation kinds:

- `count` over one canonical record type;
- `count-where` with one or more allow-listed filters;
- `count-by-field` over an allow-listed canonical field;
- `trend-over-time` using day, Monday-based UTC week or month buckets; and
- `sla-derived` using Case or Action Item due dates.

The supported record types are Cases, Signals, Decisions, Action Items,
Operational Events and Artifacts. Each has an explicit set of filter/grouping
fields and timestamps. Filters support equality, finite inclusion and finite
exclusion. Time windows use explicit offset-aware `from`/`to` bounds. The
contract has no SQL, expression string, pack-provided field path or executable
predicate.

Hypothetical definitions must carry a summary and non-empty assumption map.
Non-hypothetical definitions cannot carry those parameters. The application
returns a distinct hypothetical result with a null value and does not read any
operational repository for it.

The frozen `MetricDefinitionSchema` remains an additive union with the legacy
in-process shape so existing compiled consumers are not broken. Scenario Pack
loading and operational evaluation accept only `MetricDefinitionV15Schema`;
legacy definitions therefore cannot enter the runtime pack boundary.

The Scenario SDK validates every Metric file, rejects duplicate IDs, exposes a
read-only ID-keyed catalogue and rejects every dashboard widget whose
`parameters.metricId` is missing or unresolved. Existing pack files are
mechanically normalised to the closed shapes while retaining their IDs, names,
descriptions, classifications and format hints.

`MetricEvaluationService` consumes only structural Workspace-scoped list
ports already exposed by persistence. It returns discriminated numeric,
breakdown, time-series and SLA-table values together with the definition's
classification and format. It also fails closed if an adapter returns a record
from another Workspace. No migration or persistence implementation change is
required.

## Consequences

- Dashboard metrics are validated before a pack can activate, including every
  widget-to-Metric reference.
- The same evaluator handles all packs without pack IDs or industry fields in
  core code.
- Operational values are deterministic for a fixed database state and injected
  clock; grouping and time-series output ordering is stable.
- Hypothetical impact remains explicit and cannot silently become a calculated
  result.
- More complex calculations, joins, feed projection, caching and scheduled
  refresh require a future reviewed contract addition rather than pack-authored
  query text.
