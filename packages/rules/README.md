# Rules engine

`@oiw/rules` evaluates validated `RuleDefinition` objects without executable
pack code. The engine resolves only fact catalogue v1: allow-listed Event
fields, Observation fields, `related-event-count`, and the three supplied core
operational counts. Related Events exclude the Event currently being
evaluated, must share at least one Entity and fall at or before it;
`withinHours` applies a deterministic inclusive look-back window.

Every condition produces a recursive trace containing the fact value,
comparison result and contributing Event IDs. The application layer persists
that trace before executing fired actions.

## Action executor seam

The application package's `RuleActionExecutor` port and
`RuleActionExecutorRegistry` dispatch fired actions by their closed-catalogue
type without making this pure package depend on persistence. Executors receive
the Event, its Observations, the validated Rule and its full trace. OIW-501
supplies executors for `create-signal` and `flag-review`. It also supplies a
pending-outcome executor for
`create-case`, `create-action` and `propose-decision`; those outcomes are
persisted as idempotent Audit Entries until the batch-C engines replace those
registrations. Adding a batch-C executor therefore does not change rule
evaluation.

Pack content is data only. Unknown facts and action types are rejected by the
shared contracts before this package receives them.
