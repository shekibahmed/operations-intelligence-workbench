# ADR-004: Make Checksum-Keyed Fixtures the Default Intelligence Provider

## Status

Accepted — 2026-08-31

## Context

The public demonstration must be reproducible without paid APIs, credentials,
model drift or network availability. A fixture provider that guesses on a
missing record would conceal fixture defects and undermine evaluations.

## Decision

Define expected extraction files that conform to `ExtractionResultSchema` and
key each result by the immutable Artifact SHA-256 checksum. The fixture
provider performs an exact lookup and fails loudly on a miss. Artifacts,
expected extraction, evidence spans and gold evaluations are authored and
versioned as one unit. Provider metadata marks fixture output deterministic.

The common `IntelligenceProvider` interface also defines classification and
summarisation, but no live provider is required in P0.

## Consequences

- Known input always produces known structured output.
- Fixture mistakes are immediate, diagnosable failures.
- Editing an Artifact requires updating its checksum-keyed extraction and gold
  expectations together.
- Live providers remain replaceable and cannot bypass contract validation.
- The fixture implementation and file loader remain later tasks; this ADR
  freezes their boundary.
