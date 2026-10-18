# ADR-013: Enforce Approval Integrity in the Database

## Status

Accepted — 2026-10-18

## Context

ADR-005 makes an Approval a separate, immutable governance record, and the
database already refuses an `approved` Decision unless a matching `approved`
Approval exists. Raw-SQL tests (OIW-918) showed that guarantee had three gaps
for a writer with direct database access:

1. `approvals.approver` was only `NOT NULL`, so an empty or whitespace-only
   approver was accepted.
2. Such a row satisfied the `decisions_require_human_approval` trigger, so a
   high-risk Decision could be marked approved with no human identity.
3. Approvals were not append-only: `UPDATE` and `DELETE` were accepted.

The application exposes none of these paths (Approvals are only inserted, by
`ApprovalService`), but the claim "the database enforces the human-approval
gate" should hold without qualification. Legitimate removal still exists:
whole-Workspace expiry, demo reset (`clearForReset` deletes Cases, which cascade
to Decisions and Approvals), seed rollback, `pnpm db:reset`, and test cleanup via
`TRUNCATE ... CASCADE`.

## Decision

Migration `0004_approval_db_hardening` adds three controls.

1. **Non-blank approver.** CHECK `approvals_approver_not_blank` requires at
   least one character that is not whitespace. The expression is
   `approver ~ '[^[:space:]\u00a0\u0085\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u2060\u3000\ufeff]'`
   (regex escapes, so the migration, the drizzle schema and this record are
   textually identical and contain no invisible characters). `btrim` was
   rejected because it strips only the space character, so tabs and newlines
   would pass. `[:space:]` alone was rejected because its coverage of non-ASCII
   code points depends on the database locale (a C-locale server would not
   treat U+3000 as blank), and even on `en_US.utf8` it omits U+2007 figure
   space, U+202F narrow no-break space, U+1680 and U+180E. The explicit set adds
   NEL, the no-break space, U+1680, U+180E, the U+2000-U+200F spaces and
   zero-width characters, U+2028-U+202F, U+205F-U+2060, U+3000 and the BOM.
   Blankness of any code point outside this set still relies on the server
   locale's `[:space:]`. The list is a deliberate floor, not a Unicode-complete
   definition of "visible"; `postgres-repositories.test.ts` pins each listed
   class.
2. **Defence in depth in the gate.** `require_human_approval_for_approved_decision`
   now also requires the qualifying Approval to have a non-blank approver, so the
   gate stays closed even if the CHECK were dropped or bypassed.
3. **Append-only Approvals.** Trigger `approvals_append_only` (BEFORE UPDATE OR
   DELETE, per row):
   - every `UPDATE` is rejected;
   - a `DELETE` is rejected while both the parent Decision and the parent
     Workspace still exist, and allowed once either is gone.

### Purge escape hatch (deliberately structural, not a switch)

Approvals can only be deleted as a referential cascade of deleting their
Decision, their Case, or their Workspace. During such a cascade PostgreSQL has
already removed the parent row in the same transaction, so the trigger sees the
parent missing and permits the child delete. An ad-hoc `DELETE FROM approvals`
leaves the parent in place and fails.

There is no `SET LOCAL oiw.allow_governance_purge`-style flag. A settable flag
is a bypass available to anyone who can run SQL (including a compromised
application role) and must be defended by convention; the structural rule
requires removing the governed object itself. The existing expiry, reset, seed
rollback and repository code paths already delete at exactly those boundaries,
so no application code changed.

### Audit entries

`audit_entries` was already append-only at the database level
(`audit_entries_append_only`, migration 0000), which is what the README claims.
Whole-Workspace deletion disables and re-enables that trigger inside one locked
transaction (`PostgresWorkspaceRepository.delete`). That pattern is unchanged;
Approvals needed no equivalent because the cascade rule above covers them.

### Existing data and idempotency

The migration touches no rows. `ADD CONSTRAINT ... CHECK` validates existing
Approvals; the application has only ever written session-derived, non-empty
approvers, so a conforming database passes. A database holding a blank-approver
row would fail the migration loudly, which is the desired outcome for a
governance record. Functions use `CREATE OR REPLACE` and the trigger is
dropped-if-exists then created, and drizzle records the migration so
`pnpm db:migrate` re-runs are no-ops. The test
`postgres-repositories.test.ts` builds a database at the pre-0004 schema, loads a
public-demo workspace with an approved Decision, Approval and audit entry,
applies 0004 twice, and checks the data survives, the new rules hold and
workspace expiry still works.

## Alternatives Considered

- **Session-scoped purge flag** (`SET LOCAL oiw.allow_governance_purge = 'on'`):
  rejected as above; it is also a new thing every purge path must remember to set.
- **Disable the trigger around deletes** (the audit-entry pattern): needs table
  ownership and a table-level exclusive lock on every purge. Acceptable for the
  single Workspace-delete path, unnecessary here.
- **Revoke UPDATE/DELETE from the application role:** the right additional
  control for production but not enforceable portably in this repository's
  single-role Docker, CI and Neon setups, and it would block the legitimate
  cascades. Recorded as a deployment hardening option.
- **`btrim(approver) <> ''`:** weaker (space only), rejected.
- **Statement-level BEFORE TRUNCATE trigger:** would break test cleanup and
  `db:reset` for no benefit against the threat model.

## Threat Model and Limits

Defends against: a SQL writer (migration mistake, mis-scoped script, injected
statement that reaches `UPDATE`/`DELETE`/`INSERT`) forging, editing or deleting an
individual Approval row, or approving a Decision with a blank approver.

Does not defend against:

- `TRUNCATE`: PostgreSQL does not fire row triggers for it. It needs the TRUNCATE
  privilege and removes every row of the table, not one record.
- A superuser or table owner who drops the trigger or constraint
  (`ALTER TABLE ... DISABLE TRIGGER`, `session_replication_role = replica`).
  Those are administrative acts and outside application-level threats.
- Deleting a whole Decision (or its Case/Workspace) together with its
  Approvals. That removes the governed object, so no approved Decision is left
  without an Approval, but the cascade is not audited at the database level: an
  ad-hoc `DELETE FROM decisions WHERE id = ...` removes the Approval with no
  audit entry. This is a residual risk, accepted because the cascade is also the
  legitimate path for expiry and reset.
- An approver string that is non-blank but not a real person. Identity is the
  application's session boundary; the database only guarantees one is recorded.

The Approval contract (`approver: z.string().min(1)`) still accepts
whitespace-only strings; the database now rejects them. Tightening the contract
is a separate contract-change task.

## Consequences

- "The database enforces the human-approval gate" is true for blank approvers,
  edits and ad-hoc deletes.
- Any future feature that needs to amend an Approval must append a new record
  (as corrections do elsewhere in the model), not update the old one.
- Tests that need to wipe Approvals should use `TRUNCATE ... CASCADE` or delete
  the parent object.
