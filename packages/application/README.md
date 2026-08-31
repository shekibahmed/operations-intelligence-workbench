# Application services

`@oiw/application` owns framework-neutral orchestration for guest Workspace
lifecycle, deterministic fixture seeding and reset. It consumes structural
ports implemented by `@oiw/persistence`; Scenario Pack parsing remains in
`@oiw/scenario-sdk` and is supplied through its `loadFixtureSet` function.

## Guest Workspaces

`WorkspaceService.createGuestWorkspace(packId)` creates an isolated
`public-demo` Workspace with a random slug, active pack and 24-hour TTL. The
slug, clock, ID generator and TTL can be supplied for deterministic tests.
`cleanupExpiredGuestWorkspaces()` enumerates expired records through the
Workspace repository and deletes only `public-demo` Workspaces. Scheduling is
deliberately outside this package.

## Session tokens

`issueSessionToken(workspaceId, secret)` creates a versioned HMAC-SHA256 token
containing an opaque session ID, Workspace binding and expiry. Secrets must be
at least 32 bytes. `verifySessionToken(token, secrets)` verifies signatures in
constant time, supports a current/previous secret list for rotation, validates
the payload and rejects future or expired tokens. `sessionCookie()` returns
the framework-neutral `httpOnly`, `Secure`, `SameSite=Lax` cookie attributes;
the web layer remains responsible for setting it.

## Seed and reset

`SeedService` loads the requested manifest fixture set through the injected
Scenario SDK loader. Source, Artifact and Entity UUIDs derive from Workspace ID
and stable fixture/seed keys, record ordering is stable, seed timestamps are
fixed and raw fixture content/checksums are retained. Validated pack seed
Entities become canonical workspace-scoped Entity rows; aliases remain on the
canonical field and are mirrored into attributes for the public exact/alias
resolution boundary. Seed and reset results report source, Artifact and Entity
counts.

`ResetService` validates and loads the seed plan before destructive work,
calls persistence's atomic Workspace-scoped clear, renews the guest TTL and
reapplies the same plan. Reset and seed each append a hash-linked Audit Entry.
Historical Audit Entries remain append-only, while every seed-managed
operational row after reset is identical to its original post-seed value.
Another Workspace is never read or mutated.

## Operational advancement

`ArtifactAdvancementService.advanceArtifact(workspaceId, artifactId)` runs the
reviewed half of the synchronous pipeline: exact/alias Entity resolution,
validated Event-definition assembly, fact-catalogue rule evaluation and action
execution. Ambiguous Entity candidates become `conflicting` Observations and
cannot silently form an Event. Event, Signal and action IDs are deterministic,
and every rule evaluation is persisted as a hash-linked Audit Entry.

The service supplies executors for the full closed action catalogue. Fired
rules create Signals, reconcile typed pack-defined Cases, assign Action Items,
propose Decisions and route source records to review. IDs are deterministic,
so synchronous retry does not duplicate operational state. The generic
executor registry still accepts same-type overrides for bounded tests or later
orchestration changes without coupling the pure rule engine to persistence.

## Cases and workflow transitions

`CaseLifecycleService` consumes the validated `CaseDefinition` catalogue and
its referenced Workflow. Triggering rules create or reconcile one Case per
case type and related Entity; priority, severity, owner and due time come from
pack defaults or declarative rule parameters. Signal severity can only raise,
not silently lower, the Case priority/severity.

`transitionCase` accepts only a declared transition from the current state.
Guards run through the injected fact-catalogue evaluator, approval-gated
transitions require both an approved Decision and its matching Approval row,
and terminal transitions evaluate all configured closure requirements. Every
successful transition appends a causal Audit Entry. Terminal Cases reject all
further transitions.

## Action Items, Decisions and Approvals

`ActionItemService` creates assigned work from rule outcomes and records
completion with optional, workspace-validated evidence segment references.
`DecisionService` persists a proposal and advances it only to
`awaiting-approval`; direct status changes, including service-level attempts to
set `approved`, are prohibited.

`ApprovalService.apply` is the sole application path for a Decision outcome.
It requires a human session identity, inserts the separate Approval record and
only then updates the Decision to `approved`, `rejected` or
`more-information-required`. The database boundary independently rejects an
approved Decision with no matching Approval. Both the Decision and its Case
receive append-only outcome audits.

## Local commands

With Docker PostgreSQL running and migrations applied:

```bash
pnpm demo:seed --pack asset-reliability
pnpm demo:reset --workspace <slug-printed-by-demo-seed>
```

An optional deterministic slug is useful for local scripting:

```bash
pnpm demo:seed --pack asset-reliability --workspace asset-demo-local
```
