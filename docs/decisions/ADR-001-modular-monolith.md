# ADR-001: Use a Modular Monolith

## Status

Accepted — 2026-08-31

## Context

P0 must demonstrate strong boundaries while remaining deterministic, easy to
run and inexpensive to operate. Multiple deployables, queues and distributed
coordination would add failure modes before the product requires independent
scaling.

## Decision

Build one deployable TypeScript application in a pnpm monorepo. Separate
contracts, domain policy, application orchestration, adapters, rules, audit,
evaluation and presentation into packages with inward-pointing dependencies.
Use synchronous processing in P0. Use plain pnpm recursive scripts rather than
adding a task runner until build measurements justify one.

## Consequences

- Local and public fixture modes have a small operational surface.
- Package boundaries can be tested without network boundaries.
- Transactions can cover complete application use cases.
- A future component may be extracted only with evidence that its deployment or
  scaling lifecycle differs; package boundaries make that possible.
- Boundary discipline must be enforced in CI because process isolation does not
  enforce it automatically.
