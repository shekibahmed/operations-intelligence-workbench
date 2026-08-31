# ADR-009: Validate and Catalogue Observation Schemas

## Status

Accepted — 2026-08-31

## Context

Scenario Pack manifests reference one file per observation definition, but the
v1.1 SDK only checked those files for existence and valid JSON. It discarded
their contents. The artifact-processing boundary therefore had no public,
validated way to discover a schema by key or to verify a proposed value before
persistence.

The three shipped packs use one consistent shape: `schemaKey`, `displayName`,
`entityType`, `valueType`, `description` and a constrained `jsonSchema` object.
Their values include strings with enum/date/pattern constraints, finite numbers
and integers with bounds, and objects with typed required properties. The
contract must preserve that authored meaning and remain small enough to execute
without adding a general JSON Schema engine.

## Decision

Contracts v1.2 add the additive `ObservationSchemaDefinitionSchema`. It keeps
the shipped field names: `displayName` is the pack-supplied label and optional
`entityType` is the entity-link hint. `valueType` and `jsonSchema.type` must
agree. The supported JSON Schema subset is:

- string: optional `enum`, `format: "date"` and `pattern`;
- number: JSON Schema `number` or `integer`, with optional `minimum` and
  `maximum`;
- boolean;
- object: string/number/integer/boolean properties, optional `required`, and
  optional `additionalProperties`.

Definitions may declare `confidenceThreshold` from zero through one.
`evidenceRequired` is part of the typed result and defaults to `true` when the
file omits it, matching the platform's provenance requirement and the meaning
of every shipped extraction without rewriting pack files.

The Scenario SDK validates every manifest-referenced observation definition at
pack load and rejects invalid or duplicate schema keys with the existing
file-and-field `PackIssue` format. A loaded pack exposes a read-only
schema-keyed catalogue. The SDK also exposes a pure
`validateObservationValue(definition, value)` helper and a catalogue lookup
helper. Null values fail value validation because insufficient-evidence and
negated findings are represented by the extraction contract rather than by an
observation value schema.

## Consequences

- Artifact processing can validate structured provider output using only
  public contract and SDK APIs.
- All three real packs load without semantic or mechanical changes.
- Existing manifest paths and loader result fields remain intact; the catalogue
  and helpers are additive.
- Unsupported JSON Schema keywords fail pack validation instead of being
  silently ignored.
- Expanding the executable schema vocabulary requires a later additive contract
  change and tests rather than importing an unrestricted schema runtime.
