# ADR-007: Keep P0 Guest Isolation Portable Across PostgreSQL Hosts

## Status

Accepted — 2026-08-31

## Context

The public demo needs isolated, expiring guest workspaces. Supabase is the
initial hosted PostgreSQL provider, but provider-specific authentication,
storage or row-level-security features on the critical path would reduce
portability and complicate local CI.

## Decision

Use plain PostgreSQL and Drizzle for P0 persistence. Issue a signed,
`httpOnly`, `Secure`, `SameSite=Lax` cookie containing an opaque session
reference bound server-side to a workspace ID. Server handlers derive scope
from the verified session and pass it to every repository operation; they never
trust a client-supplied workspace selector. Apply TTL expiry and cleanup to
guest workspaces. Rate-limit by session reference plus a privacy-conscious
IP-derived key. CI runs migrations against containerised PostgreSQL.

## Consequences

- Local, CI and hosted data behaviour share the same critical path.
- Every repository interface and query must require workspace scope.
- Cookie signing, rotation, expiry, cross-workspace tests and rate-limit tests
  are required before public deployment.
- Supabase-specific hardening may be layered on in Wave 4 without changing the
  core persistence contract.
- Database schema and migrations remain owned by OIW-101, not this ADR task.
