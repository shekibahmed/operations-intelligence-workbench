# ADR-002: Supply Domain Behaviour Through Scenario Packs

## Status

Accepted — 2026-08-31

## Context

The platform must demonstrate unrelated operational scenarios without forks or
industry conditionals in core packages. Pack input is untrusted and must not be
able to inject arbitrary executable logic or queries.

## Decision

Represent each scenario as a versioned, schema-validated configuration bundle.
The manifest references labels, schemas, workflows, rules, constrained metrics,
fixed-catalogue dashboards, fixtures, evaluations and tours. Core packages
consume only validated contract objects and never import a pack directory.

Rules use closed fact catalogue v1: allow-listed Event fields, Observation
lookups by schema key and four core-computed aggregates. Rule actions and
dashboard widgets also come from fixed catalogues. Unknown facts or references
fail validation; packs cannot contain executable predicates, SQL or rendering
code.

## Consequences

- A scenario can be added or removed without modifying core domain logic.
- The manifest's `schemaVersion` can evolve independently from pack versions.
- Pack validation is a security and compatibility boundary, not just authoring
  convenience.
- New fact, action, metric or widget capabilities require an explicit shared
  contract change after the freeze.
- P0 expressiveness is intentionally narrower than arbitrary code.
