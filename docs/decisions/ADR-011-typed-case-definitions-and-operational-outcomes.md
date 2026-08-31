# ADR-011: Validate Case Definitions and Execute Operational Outcomes

## Status

Accepted — 2026-09-01

## Context

Scenario Pack manifests referenced Case-definition JSON files, but the SDK
only checked that those files contained JSON and then discarded their
contents. The application could not select a Case type, Workflow, defaults or
closure policy through a public typed boundary. OIW-501 therefore persisted
`create-case`, `create-action` and `propose-decision` results as pending Audit
Entries behind the RuleActionExecutor seam.

The repository had already used the documented v1.4 additive revision for
Event-definition value constraints. Reusing that version label for a distinct
addition would make the frozen-contract history ambiguous.

## Decision

The next additive contract revision adds `CaseDefinitionSchema`. A definition
declares:

- a pack-owned `caseType`, display names and description;
- a referenced `workflowId`;
- default priority, severity, nullable owner and nullable relative due time;
- the Workflow closure-requirement IDs applying to the Case; and
- the Rule IDs whose fired outcomes create or reconcile that Case.

`LoadedScenarioPack.caseDefinitions` is a read-only, case-type-keyed
catalogue. The SDK rejects duplicate Case types, unknown Workflows, unknown
closure requirements, unknown triggering Rules and `create-case` actions that
reference an unknown Case definition. Existing pack Case files are
mechanically normalised with explicit pack-owned owner and due-time defaults.
No persistence migration is required because the canonical Case table already
contains all runtime fields.

The application replaces OIW-501's pending executors at the registry seam.
Rules now synchronously create or reconcile Cases, create Action Items and
propose Decisions. Operational IDs are deterministic for idempotent retry.
Case transitions are limited to the selected Workflow, evaluate guards through
fact catalogue v1, enforce closure requirements on terminal transitions and
append a causal Audit Entry.

Decisions persist first as proposals and then enter `awaiting-approval`.
`ApprovalService` requires a human session identity, records the separate
Approval row and only then applies its outcome to the Decision. Direct
application-service approval is prohibited; the existing database guard
remains an independent boundary.

## Consequences

- Core application code consumes pack Case behaviour without reading raw pack
  files or branching on pack IDs.
- Pack validation fails before activation when Case, Workflow or Rule
  references drift.
- A fired operational Rule can now complete the synchronous
  Signal→Case→Action/Decision half of the P0 pipeline.
- High- and critical-risk Decisions cannot auto-approve and retain a separate
  human identity, comment and timestamp.
- Workflow closure is deterministic across action, evidence, decision and
  observation-review requirements.
- Approval and Decision persistence are ordered to satisfy the database guard;
  a future transaction-port change may combine their writes atomically without
  changing the application policy.
