# Approved Plan Amendments to the PRD

Approved by the product owner on 2026-08-31. These amendments are
authoritative where they refine or re-stage the PRD. They do not change
product direction. Each item below must be reflected in the relevant ADR or
architecture document as the corresponding work lands.

## A1 — Fixture intelligence provider contract (resolves PRD gap, goal G5)

Each pack fixture artifact ships with a companion expected-extraction file
(`scenario-packs/<pack>/fixtures/**/extractions/<artifact-id>.json`)
conforming to the shared `ExtractionResult` contract. The
`FixtureIntelligenceProvider` looks results up by artifact checksum and fails
loudly (never guesses) on a miss. Fixtures, evidence spans and gold
evaluations are authored and versioned as one unit. This contract is part of
the Wave 0 freeze (OIW-001).

## A2 — Closed fact catalogue v1 for the rule engine

Rules may reference only facts from a core-defined closed vocabulary: event
fields, observation lookups by schema key, and a small set of core-computed
aggregates (e.g. related-event counts within a time window). The pack
validator rejects rules referencing unknown facts. Defined in OIW-001,
recorded as an ADR.

## A3 — Correction/reprocessing semantics (narrow)

Corrections made in the review queue before event assembly feed normally into
assembly. Corrections made after downstream records exist append audit
entries and flag affected Events/Cases for re-evaluation; they never
retroactively rewrite or delete downstream state. Recorded as an ADR.

## A4 — Plain-Postgres P0 data layer

Supabase hosts the database, but no Supabase-only features (auth, storage,
RLS) sit on the P0 critical path. Guest isolation: signed httpOnly session
cookie carrying the workspace ID; every server handler scopes queries by it;
TTL-based workspace expiry; rate limiting keyed on session + IP. CI uses
dockerized Postgres + Drizzle migrations. Supabase-specific hardening may
layer on at Wave 4.

## A5 — Constrained dashboard/metric surface

P0 ships a fixed widget catalogue (~8 types: stat card, severity breakdown,
list card, trend line, SLA table, pending-approvals card, activity feed,
text/impact card). Metrics are parameterizations of a small set of core
aggregation queries. Packs choose and label widgets; they do not define
arbitrary queries.

## A6 — Wave 0 restructure (contract-freeze paradox)

OIW-002 is absorbed into OIW-001. OIW-004 is split: **OIW-004a** (Wave 0)
authors only schema-independent narrative fixture content; **OIW-004b**
(post-freeze) authors manifests, schemas, rules, gold sets and expected
extractions against the merged contracts.

## A7 — P0 scope re-staging

- Exports (FR-110) and analytics/CTA tracking (FR-120/121) defer to Waves 4–5.
- M1 requires only the Asset Reliability pack complete (with tour). Packs two
  and three ship at M2 with reduced fixture sets; full volumes by M3.
- Guided tours: Leadership tour only for packs two and three initially.
- Entity resolution P0 scope: exact match + pack-supplied alias table +
  ambiguity routed to review. No fuzzy scoring engine.
- PDF ingestion P0: fixture PDFs generated with a known text layer; one
  parsing library; page-level evidence references (not sub-paragraph).
- Processing is synchronous in P0 (no queue).

## A8 — Path-ownership corrections

Shared presentational components (PRD OIW-205) live in `packages/ui`, not
`apps/web`. `apps/web` is owned exclusively by the product-experience track.
OIW-802 (evaluation runner) is reassigned to the core/Codex track; evaluation
design and review stay with the quality track. OIW-104 (pack registry) is
built by the packs track but requires core-track review before merge.

## A9 — Confirmed decisions

- Repository: `operations-intelligence-workbench` under `shekibahmed`,
  private until M3, public at launch.
- Licence: Apache-2.0.
- CTA submission destination: deferred to Wave 5.
