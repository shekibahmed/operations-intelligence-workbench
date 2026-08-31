# Domain Model

## Contract conventions

The canonical runtime schemas live in `packages/contracts/`. This document is
a semantic guide, not a duplicate source of truth. Contract properties use
camelCase because TypeScript is the primary application language; PRD field
names written in snake_case map directly (for example, `workspace_id` becomes
`workspaceId`). API or persistence adapters may translate naming at their
boundaries.

Identifiers are UUIDs for persisted records. Pack-defined identifiers and
schema keys are kebab-case strings. Times are offset-aware ISO 8601 strings.
Pack-specific attributes use JSON values only and are validated against the
active pack schema before becoming domain input.

## Object model

### Workspace

An isolated operational state container. It selects an active pack, records
fixture/public/private mode and carries reset and expiry timestamps. `expiresAt`
is added to the PRD fields to support TTL-based guest isolation.

### ScenarioPack

The validated manifest for a versioned configuration bundle. It identifies
labels, Entity and Event type schemas, Observation schemas, Case definitions,
workflows, rules, metrics, the three dashboard lenses, fixture sets,
evaluation sets and tours. `schemaVersion` versions the manifest contract
independently from the pack's own semantic `version`.

### Source

Describes an input origin within a Workspace. `sourceType` and validated JSON
`configuration` allow adapters to remain generic.

### Artifact

An immutable raw input and its content checksum. The model records origin,
media and artifact types, source timing, raw references/text, metadata and a
generic processing status. Derived changes never update its raw payload.

### ArtifactSegment

An exact evidence coordinate within an Artifact. Version 1 supports text
ranges, one-based document pages, table cells, JSON paths and attachments.
The optional excerpt supports review; the optional checksum can detect segment
drift without altering the source.

### Entity

A durable operational object defined by the active pack. It has a type,
display name, optional external reference, pack-supplied aliases, validated
attributes and generic status. Exact external-reference and alias matching are
P0; ambiguous matches require review.

### Observation

An atomic fact associated with one Artifact and optionally one Entity. It
records original and normalised values, evidence status, evidence segment,
derivation, confidence, extractor ID/version and review history fields.

Machine-derived Observations must include extractor metadata and confidence.
A supported machine-derived value must cite an Artifact Segment. When evidence
is insufficient, the value is `null`, a reason is mandatory and review can be
requested. A negated finding is also explicit: it records that cited source
evidence rules out the fact rather than merely failing to support it.

Extracted and persisted Observations may retain alternative value candidates,
each with its own confidence, so ambiguous matches can enter review without
discarding plausible interpretations. The `conflicting` review status holds
contradictory live Observations for human resolution instead of applying an
implicit first-wins or last-wins policy.

### OperationalEvent

Something that occurred, assembled from at least one Observation. It records
related Entities, generic pack-defined attributes, assembler identity/version
and re-evaluation status. The contract uses `OperationalEvent` rather than the
ambiguous global name `Event`.

### Signal

A derived indication requiring attention. It links to triggering Events,
evidence segments and the exact rule ID/version, and preserves rationale and a
generic severity.

### Case

A workflow-governed container for resolution. It links Entities, Events and
Signals, records owner, due time, priority/severity, pack-defined status and
closure requirement IDs. Re-evaluation status exposes downstream impact from
post-assembly corrections.

### ActionItem

Assigned work within a Case, including generic action type, assignee, state,
due time, completion evidence and completion time.

### Decision and Approval

A Decision is a proposal with rationale, evidence, risk level, approval policy
and status. An Approval is a separate human record containing approver,
outcome, comment and time. High- and critical-risk Decisions may not enter
`approved` through application services without a matching Approval. Keeping
the records separate makes governance inspectable and auditable.

### MetricDefinition

A named parameterisation of a closed core aggregation. Its classification is
required: observed, calculated, estimated or hypothetical. Packs cannot embed
arbitrary queries. Presentation selects separately from the fixed widget
catalogue.

### AuditEntry

An append-only record of actor, action, subject, cause and structured data.
`previousEntryHash` and `entryHash` provide a tamper-evident chain; persistence
and authorisation enforce append-only behaviour in later tasks.

## Lifecycle

```text
Workspace selects validated ScenarioPack
  -> Source receives immutable Artifact
  -> ArtifactSegment identifies evidence
  -> extraction proposes supported, negated or insufficient Observations
  -> human review accepts, corrects or rejects when required
  -> reviewed Observations resolve to Entities
  -> OperationalEvent is assembled
  -> deterministic Rules create Signals
  -> Case groups the operational response
  -> ActionItems assign accountable work
  -> Decision is proposed
  -> Approval records material human control
  -> metrics and lenses read the same state
  -> every material transition appends an AuditEntry
```

## Correction lifecycle

Before Event assembly, a correction changes which reviewed Observation value
feeds assembly while preserving the original extraction and review history.
After assembly, a correction never mutates historical Events, Signals, Cases
or Decisions. It appends audit history, marks affected Events and Cases for
re-evaluation, and allows application services to append superseding derived
state.

## Contract additions and translations from PRD section 9

- All snake_case examples are translated to camelCase; no semantic field was
  dropped.
- Workspace adds `expiresAt` for approved guest TTL semantics.
- Source adds workspace scope, display name, generic configuration and creation
  time because it is a persisted, isolated record.
- Artifact Segment adds its own ID, creation time, excerpt and optional checksum.
- Entity adds aliases and timestamps for the approved exact/alias resolution path.
- Observation groups extractor ID/version as `extractor`, adds `derivation`,
  `evidenceStatus`, `insufficiencyReason` and `createdAt` to make provenance and
  abstention enforceable at runtime. Contract version 1.1 adds explicit negated
  findings, alternative candidates with per-candidate confidence and a
  `conflicting` review state.
- Operational Event adds workspace scope, record time, Observation/Entity links,
  assembler provenance and re-evaluation status.
- Signal adds workspace scope, Event/evidence links, rule identity, rationale and
  creation time.
- Case and Decision add workspace scope and timestamps; Case gains
  re-evaluation status; Decision gains evidence links.
- Action Item and Approval add workspace scope and creation/decision linkage
  necessary for isolation and audit.
- Audit Entry adds subject, cause, structured data and hash-chain fields.

These additions refine unspecified PRD details; they do not remove any
canonical concept or introduce pack-specific vocabulary.
