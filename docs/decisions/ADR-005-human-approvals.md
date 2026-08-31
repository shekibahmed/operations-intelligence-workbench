# ADR-005: Record Human Approval Separately from Decisions

## Status

Accepted — 2026-08-31

## Context

AI and deterministic rules may recommend material action, but high-risk
outcomes require accountable human control. Encoding approval only as a
Decision status would lose approver identity, rationale and timing.

## Decision

Model a Decision as a proposal and Approval as a separate immutable governance
record. Pack-defined policies determine required approver classes, while core
application services enforce that high- and critical-risk Decisions cannot
become approved without a valid human Approval. Providers and rule actions may
only propose Decisions; they cannot create Approvals or execute external
write-backs.

## Consequences

- Approval history remains independently auditable.
- Approval bypass tests are mandatory for high-risk paths.
- Rejection and requests for more information are explicit outcomes.
- Authentication and authorisation implementation is deferred, but must satisfy
  the frozen policy boundary.
- Demo convenience must not introduce an auto-approval path.
