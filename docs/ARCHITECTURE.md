# Architecture

## Status

Wave 0 contract freeze, version 1. The decisions in `docs/decisions/` and the
runtime schemas in `packages/contracts/` are normative. This document explains
how those decisions fit together.

## Architectural style

OIW is a TypeScript modular monolith. The public demonstration is one
deployable web application with explicit package boundaries around contracts,
domain policy, application orchestration, persistence, intelligence,
ingestion, rules, audit, evaluation and presentation. P0 does not require a
queue, a second server framework or an external model provider.

The repository uses a pnpm workspace and pnpm's topological recursive commands.
Turborepo is intentionally deferred: the Wave 0 graph is small and does not
need another orchestration dependency. A task runner may be introduced later
only when measured build needs justify it.

## Package boundaries

| Package | Responsibility | May depend on |
|---|---|---|
| `@oiw/contracts` | Zod runtime schemas and inferred transport/domain types | Zod only |
| `@oiw/domain` | Pure domain policy and invariants | contracts |
| `@oiw/application` | Use-case orchestration and ports | contracts, domain |
| `@oiw/persistence` | Repository adapters and transaction implementation | contracts, domain, application ports |
| `@oiw/intelligence` | Structured provider interface and implementations | contracts, application ports |
| `@oiw/ingestion` | Source adapter implementations | contracts, application ports |
| `@oiw/rules` | Closed-catalogue rule evaluation | contracts, domain |
| `@oiw/scenario-sdk` | Pack loading, authoring and validation support | contracts |
| `@oiw/audit` | Append-only audit policy and implementation | contracts, application ports |
| `@oiw/ui` | Shared pack-configured presentation primitives | contracts |
| `@oiw/evals` | Evaluation runner and measures | contracts, application ports |
| `@oiw/test-support` | Synthetic factories and test-only adapters | any package under test |

Dependencies point inward toward contracts and domain policy. Core packages do
not import files from `scenario-packs/`; pack configuration enters through the
Scenario Pack registry and validated contracts. Persistence and providers do
not call back into user-interface code.

## System flow

```text
Source adapter
  -> immutable Artifact + Artifact Segments
  -> IntelligenceProvider structured result
  -> Zod validation and confidence/evidence policy
  -> accepted or reviewed Observations
  -> entity resolution
  -> Operational Event assembly
  -> closed-catalogue deterministic rules
  -> Signals
  -> Cases and Action Items
  -> proposed Decisions
  -> recorded human Approval where policy requires it
  -> metrics, lenses and append-only audit records
```

Scenario Packs provide labels, schemas, workflow definitions, rule
definitions, metric parameters, dashboard definitions, fixtures, evaluations
and tours. They do not provide executable core code or arbitrary dashboard
queries.

## Contract validation boundaries

All data crossing a package, provider, storage or pack boundary is validated
with schemas from `@oiw/contracts`. TypeScript types are inferred from the same
schemas so runtime and compile-time contracts cannot drift independently.

Artifact content and provider output are untrusted data. Intelligence providers
return structured objects only; application services decide whether validated
objects may be persisted or used. Providers cannot write storage, execute
rules, transition workflows, approve Decisions or call external operational
systems.

## Deterministic fixture intelligence

Each fixture Artifact has a companion expected-extraction JSON file conforming
to `ExtractionResultSchema`. The fixture provider resolves that result by the
Artifact's lowercase SHA-256 checksum. A missing checksum mapping is a hard,
diagnosable failure; the provider never synthesises or guesses a result.
Fixture Artifacts, evidence coordinates, expected extractions and gold
evaluation results must be versioned together.

## Rules and facts

Rules use `RuleDefinitionSchema`. A condition may reference only:

- an allow-listed Operational Event field (`eventType`, `occurredAt`,
  `recordedAt`, `entityIds`, or a named `attributes` key);
- an Observation selected by `schemaKey`, reading `value`, `normalisedValue`,
  `confidence`, `reviewStatus` or `evidenceStatus`;
- a core-computed aggregate: related-event count, open-case count, open-action
  count or pending-decision count, optionally constrained by the schema's
  declared parameters.

This is fact catalogue v1. Unknown kinds, event fields, Observation fields and
aggregate names fail schema validation. Packs cannot inject executable
predicates. Rule actions come from a small core catalogue and refer to
pack-owned definitions by ID.

## Workflow and corrections

Workflow definitions declare states, transitions, optional rule conditions,
approval policy references and closure requirements. Validation ensures every
transition endpoint exists. Application services later enforce transition and
closure policy atomically.

A reviewed correction made before Event assembly is simply the accepted input
to assembly. A correction after downstream records exist appends an Audit Entry
and marks affected Events and Cases `required` for re-evaluation. It never
rewrites or deletes the historical downstream records. Re-evaluation appends
new state and records its causal links.

## Persistence and guest isolation

P0 uses portable PostgreSQL through Drizzle. Hosted Supabase supplies Postgres,
but Supabase-specific authentication, storage and row-level security are not
on the P0 critical path.

In public-demo mode, the server issues a signed, `httpOnly`, `Secure`,
`SameSite=Lax` session cookie containing an opaque session reference bound to a
workspace ID. Every server handler obtains workspace scope from the verified
session, never from a client-supplied workspace selector, and every repository
query includes that scope. Guest workspaces expire by TTL and are deleted by a
scheduled cleanup path. Rate limits combine the session reference and a
privacy-conscious IP-derived key. Workspace isolation tests are mandatory
before public deployment.

## Dashboards and metrics

P0 dashboard configuration selects from eight fixed widget kinds: stat card,
severity breakdown, list card, trend line, SLA table, pending approvals,
activity feed and text/impact. Metric definitions parameterise a closed set of
core aggregations. Packs supply labels and parameters; they cannot supply SQL,
arbitrary expressions or executable rendering code. Metric classification
(`observed`, `calculated`, `estimated`, `hypothetical`) is mandatory so the UI
can distinguish evidence from impact hypotheses.

## Architectural enforcement

`pnpm architecture:check` scans core TypeScript sources for prohibited
industry terms and rejects direct Scenario Pack imports from `packages/domain`.
The check is intentionally lightweight and will be expanded with dependency
graph and common-lifecycle checks as implementations land. CI runs lint,
type-check, tests, build and the architecture check for each pull request.

## Deferred implementation

Wave 0 freezes contracts and boundaries only. Database migrations, pack file
loading, the fixture provider implementation, ingestion, workflow/rule
execution, UI, live providers and production integrations remain assigned to
later tasks.
