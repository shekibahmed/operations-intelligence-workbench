# ADR-008: Represent Negative Findings, Alternatives and Conflicts

## Status

Accepted — 2026-08-31

## Context

Narrative fixture authoring exposed three states that the frozen version 1.0
contracts could not represent without losing meaning. A source may explicitly
rule out a fact rather than merely omit it; an extraction may have multiple
plausible values; and contradictory Observations may need to remain live until
a human resolves them. Treating these cases as insufficient evidence, keeping
only one candidate or silently choosing one Observation would weaken evidence
and review semantics.

## Decision

Add a `negated` Proposed Observation variant with null value fields, at least
one evidence item, confidence and a reason. Add `negated` to persisted
Observation evidence status. Add optional `alternativeCandidates` arrays to
extracted and persisted Observations, with a JSON value and confidence from
zero to one for each candidate. Add `conflicting` to persisted Observation
review status so contradictory records can wait for explicit human review.

All changes are additive. Existing supported and insufficient-evidence
payloads remain valid, and omitted alternative candidates remain valid.

## Deferred concerns

Near-duplicate Artifact handling is not a contract amendment. Unlike exact
checksum duplicates, near-duplicates require similarity, entity-resolution
and Event-assembly policy. That design is deferred to the Wave 1 engines.

Source-quality flags are also not added here. Source quality is distinct from
Observation confidence and requires coordinated Artifact, segment, ingestion
and review semantics. It is deferred to later engine design rather than being
introduced as an isolated field during this minimal contract change.

## Consequences

- Providers and fixture sets can distinguish confirmed absence from unknown
  or unsupported information while retaining evidence.
- Review flows can display plausible alternatives without replacing the
  primary extraction.
- Conflicting Observations remain inspectable until a human resolves them.
- Consumers must handle one additional Proposed Observation variant, evidence
  status and review status.
- The deferred near-duplicate and source-quality designs require later ADRs or
  task-level decisions before implementation.
