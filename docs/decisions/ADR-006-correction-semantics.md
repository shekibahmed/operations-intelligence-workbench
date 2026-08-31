# ADR-006: Append and Re-evaluate After Downstream Corrections

## Status

Accepted — 2026-08-31

## Context

A reviewer may correct an Observation before or after Events and Cases have
been derived. Retrospectively rewriting derived records would erase the state
that operators and approvers previously saw, while ignoring corrections would
leave current operational state stale.

## Decision

Before Event assembly, use the corrected reviewed value as ordinary assembly
input while retaining original extraction history. After downstream records
exist, append the correction and Audit Entry, then mark affected Events and
Cases `required` for re-evaluation. Re-evaluation appends superseding derived
state and causal audit records. It never deletes or mutates historical
downstream state in place.

## Consequences

- Historical decisions remain explainable against information available at the
  time.
- Current-state readers must understand superseding/re-evaluated state.
- Re-evaluation is explicit and retryable rather than hidden in a correction
  transaction.
- The exact orchestration and persistence transaction design belongs to later
  application and database tasks.
