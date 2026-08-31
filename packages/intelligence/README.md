# @oiw/intelligence

Structured, provider-neutral extraction policy for OIW.

`FixtureIntelligenceProvider.fromPack` loads checksum-verified expected
extractions only through `@oiw/scenario-sdk`. It indexes all fixture sets by
lowercase SHA-256 checksum, accepts identical mappings for true duplicates,
and rejects conflicting mappings, non-deterministic metadata or empty traces.
`extract` validates its request, verifies the pack context and returns the
contract-validated result. A missing checksum throws `FixtureLookupError`; the
provider never guesses and never interprets Artifact text as instructions.
Classification and summarisation remain unsupported in the P0 fixture
provider.

`StructuredOutputValidator` first checks the complete provider payload against
`ExtractionResultSchema` and its expected Artifact checksum. It then resolves
every proposed `schemaKey` through the loaded pack's typed observation
catalogue and validates extracted values and alternative candidates with
`validateObservationValue`. Normalised values are preserved as provider
provenance and are not reinterpreted as source values (for example, a pack may
normalise a date to a timestamp). Invalid proposals are marked invalid for
pending review; a malformed result is rejected as a whole.

`ConfidenceAbstentionPolicy` applies each schema's optional
`confidenceThreshold`, defaulting to `0.75`. Insufficient evidence always
enters review. Extracted or negated findings below threshold enter review;
valid findings at or above threshold are `not-required`. Structural or
catalogue validation failure always enters review, and alternative candidates
remain attached to the persisted Observation.
