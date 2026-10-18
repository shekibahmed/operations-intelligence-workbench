-- OIW-919 / ADR-013: database-level approval hardening.
-- 1. An Approval must name a real approver (non-blank, Unicode-whitespace aware).
-- 2. An Approval is append-only: UPDATE is always rejected; DELETE is rejected
--    unless the parent Decision or Workspace is already gone (a cascade).
-- 3. A qualifying Approval for the human-approval gate must have a real approver.
-- Statements are re-runnable (OR REPLACE / DROP IF EXISTS) so a partial manual
-- application can be repeated; drizzle also records the migration once applied.
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_not_blank" CHECK ("approvals"."approver" ~ '[^[:space:] ​‌‍⁠﻿]');--> statement-breakpoint
CREATE OR REPLACE FUNCTION require_human_approval_for_approved_decision() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT EXISTS (
    SELECT 1
    FROM approvals
    WHERE approvals.workspace_id = NEW.workspace_id
      AND approvals.decision_id = NEW.id
      AND approvals.outcome = 'approved'
      AND approvals.approver ~ '[^[:space:] ​‌‍⁠﻿]'
  ) THEN
    RAISE EXCEPTION 'An approved Decision requires a matching human Approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_approval_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Approvals are append-only';
  END IF;
  -- DELETE: allowed only as the referential cascade of removing the parent
  -- Decision or Workspace. During a cascade the parent row is already deleted
  -- in the same transaction, so an ad-hoc DELETE (parent still present) fails.
  IF EXISTS (
       SELECT 1 FROM decisions
       WHERE decisions.id = OLD.decision_id AND decisions.workspace_id = OLD.workspace_id
     )
     AND EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = OLD.workspace_id)
  THEN
    RAISE EXCEPTION 'Approvals are append-only';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS approvals_append_only ON approvals;--> statement-breakpoint
CREATE TRIGGER approvals_append_only
BEFORE UPDATE OR DELETE ON approvals
FOR EACH ROW EXECUTE FUNCTION reject_approval_mutation();
