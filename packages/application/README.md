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
Scenario SDK loader. Source and Artifact UUIDs derive from Workspace ID and
stable fixture keys, record ordering is stable, seed timestamps are fixed and
raw fixture content/checksums are retained. Current packs declare Artifact
fixtures only; richer canonical records can be added at the loader/port
boundary without pack-specific application conditionals.

`ResetService` validates and loads the seed plan before destructive work,
calls persistence's atomic Workspace-scoped clear, renews the guest TTL and
reapplies the same plan. Reset and seed each append a hash-linked Audit Entry.
Historical Audit Entries remain append-only, while every seed-managed
operational row after reset is identical to its original post-seed value.
Another Workspace is never read or mutated.

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
