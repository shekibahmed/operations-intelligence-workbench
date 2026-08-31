# ADR-003: Make Provenance and Abstention First-Class

## Status

Accepted — 2026-08-31

## Context

Machine-derived facts must be reviewable and attributable. A nullable value
alone cannot distinguish missing evidence, extraction failure and a legitimate
null. Persisting unsupported AI output as operational truth would violate the
product's evidence and safety goals.

## Decision

Keep Artifacts immutable and identify exact evidence with Artifact Segments.
Every machine-derived Observation records extractor ID/version, confidence and
either a supporting segment or explicit `insufficient-evidence` status with a
reason and null value. Preserve original extraction and review fields when a
human accepts, corrects or rejects it. Signals and Decisions link supporting
evidence; rules and assemblers retain IDs and versions.

## Consequences

- Users can trace derived state to source coordinates and producing logic.
- Low-confidence and missing-evidence paths can abstain and enter review.
- Storage and UI must preserve both original and reviewed representations.
- Fixture and evaluation data must include exact evidence coordinates.
- Additional metadata increases record size but is required for governance.
