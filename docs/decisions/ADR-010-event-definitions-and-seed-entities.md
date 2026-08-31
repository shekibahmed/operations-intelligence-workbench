# ADR-010: Validate Event Definitions and Seed Entity Catalogues

## Status

Accepted — 2026-08-31

## Context

The Scenario Pack manifests already referenced one JSON file per Event type,
but the v1.2 SDK checked those files only for valid JSON and then discarded
their contents. Core application code therefore could not determine which
Observations compose an Operational Event, which Observation supplies its
time, or which resolved Observation supplies its primary Entity without
reading private pack files or embedding pack-specific schema keys.

The fixture loader also returned only Artifacts. Synthetic Entity rosters were
available solely as narrative Markdown, so exact and alias resolution had no
workspace Entity catalogue to query. Both gaps blocked neutral Event assembly
and Entity resolution.

## Decision

Contracts v1.3 add the additive `EventDefinitionSchema`. Each definition has:

- `eventType`, `displayName` and `description`;
- unique, disjoint `requiredObservations` and `optionalObservations`;
- `occurredAt.observationSchemaKey`, which is either one of those composed
  keys or `null`, plus the required `artifact-received-at` fallback;
- a nullable `primaryEntity` mapping to one composed Observation schema key.

Required and optional accepted Observations compose Event attributes under
their existing schema keys. Event assembly uses the mapped Observation's
normalised value when present, then its original value. An offset-aware ISO
timestamp is retained; an ISO calendar date is normalised to midnight UTC. If
the mapped Observation is absent, rejected, null or not a valid supported
date/time, or if the definition maps no time Observation, assembly uses the
Artifact `receivedAt`. This is configuration-driven and deterministic.

The primary Entity is the resolved `entityId` of the mapped Observation. A
missing or unresolved optional mapping leaves the Event without a primary
Entity; it never causes a fabricated match. The SDK verifies that mapped and
composed schema keys exist and that a primary-Entity Observation declares an
`entityType` hint.

Contracts v1.4 add the optional `requiredObservationValues` map. A key in this
map must also be a required Observation schema key, and its non-empty array is
the finite set of accepted normalised (or, when absent, original) values for
that Observation. This narrow discriminator is used only when honest
Observation-key presence cannot distinguish two semantic Event types. The SDK
includes these constraints in its matching-criteria comparison and rejects
definitions whose required keys, value constraints and required primary-Entity
mapping are indistinguishable. Existing v1.3 definitions remain valid.

`LoadedScenarioPack.eventDefinitions` is a read-only event-type-keyed
catalogue. The SDK validates ID and display-label agreement with the manifest
and rejects duplicate definitions. The three shipped packs are mechanically
normalised to the new shape; their prior required-Observation lists and
descriptions are preserved. Optional keys are limited to the explicit time or
primary-Entity inputs needed by this decision.

Contracts v1.3 also add `SeedEntitySchema` and
`SeedEntityCatalogueSchema`. A seed definition contains a stable kebab-case
ID, declared Entity type, display name, nullable external reference, aliases,
JSON attributes and generic status. The optional manifest `seedEntities` path
keeps existing manifests valid. When present, the SDK validates the catalogue,
rejects duplicate stable IDs and undeclared Entity types, exposes it on the
loaded pack, and carries it through fixture loading.

The application seed service derives each canonical Entity UUID from the
Workspace ID and stable seed ID. It persists Entity rows in stable seed-ID
order with fixed timestamps, preserving Workspace isolation and producing
identical normalised rows across seeds. Canonical aliases are also mirrored in
`attributes.aliases` so the existing public exact/alias consumer contract can
read either canonical representation without pack-specific logic. Reset uses
the same prepared seed plan after the atomic workspace clear.

## Consequences

- OIW-501 can consume validated Event and Entity inputs exclusively through
  public contracts and SDK APIs.
- A-142 and A-140 are present in every seeded Asset Reliability workspace and
  deliberately share the synthetic `A-14?` alias for ambiguity testing.
- Existing manifests remain valid because `seedEntities` is additive and
  optional; loaded-pack fields are additive.
- No migration is required because the canonical Entity table and repository
  already support every seeded field.
- Pack Event files are no longer arbitrary JSON: unknown Observation keys,
  mapping errors, duplicate definitions and manifest mismatches fail pack
  validation.
- Indistinguishable Event definitions fail pack validation before manifest
  activation; value constraints provide a declarative escape hatch when the
  same Observation key intentionally carries different event semantics.
- Case-definition contracts and Event/rule execution remain out of scope for
  this decision and are assigned to later tasks.

## Implementation note

As of OIW-703, the Event assembler enforces `requiredObservationValues` using
the accepted Observation's normalised value when present and its original
value otherwise. Values use deterministic JSON equality, so object key order
does not affect matching; candidates that fail a constraint are skipped in the
existing deterministic definition order, and no match retains the audited
abstention path.
