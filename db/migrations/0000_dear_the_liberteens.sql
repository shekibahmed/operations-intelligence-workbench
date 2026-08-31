CREATE TYPE "public"."action_status" AS ENUM('open', 'in-progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_outcome" AS ENUM('approved', 'rejected', 'more-information-required');--> statement-breakpoint
CREATE TYPE "public"."artifact_processing_status" AS ENUM('received', 'processing', 'processed', 'needs-review', 'failed-retryable', 'failed-terminal');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('proposed', 'awaiting-approval', 'approved', 'rejected', 'more-information-required');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('supported', 'insufficient-evidence', 'negated');--> statement-breakpoint
CREATE TYPE "public"."observation_derivation" AS ENUM('machine', 'rule', 'human');--> statement-breakpoint
CREATE TYPE "public"."observation_review_status" AS ENUM('not-required', 'pending', 'accepted', 'corrected', 'rejected', 'conflicting');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."re_evaluation_status" AS ENUM('current', 'required', 'completed');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('info', 'low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."workspace_mode" AS ENUM('fixture', 'public-demo', 'private-pilot');--> statement-breakpoint
CREATE TABLE "action_item_evidence_segments" (
	"workspace_id" uuid NOT NULL,
	"action_item_id" uuid NOT NULL,
	"artifact_segment_id" uuid NOT NULL,
	CONSTRAINT "action_item_evidence_segments_workspace_id_action_item_id_artifact_segment_id_pk" PRIMARY KEY("workspace_id","action_item_id","artifact_segment_id")
);
--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"assignee" text,
	"status" "action_status" NOT NULL,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "action_items_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"approver" text NOT NULL,
	"outcome" "approval_outcome" NOT NULL,
	"comment" text,
	"approved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "approvals_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "artifact_segments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"artifact_id" uuid NOT NULL,
	"locator" jsonb NOT NULL,
	"excerpt" text,
	"checksum" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "artifact_segments_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"artifact_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"occurred_at" timestamp with time zone,
	"raw_reference" text NOT NULL,
	"raw_text" text,
	"checksum" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"processing_status" "artifact_processing_status" NOT NULL,
	CONSTRAINT "artifacts_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "artifacts_workspace_checksum_unique" UNIQUE("workspace_id","checksum")
);
--> statement-breakpoint
CREATE TABLE "audit_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"action" text NOT NULL,
	"actor" jsonb NOT NULL,
	"subject" jsonb NOT NULL,
	"cause" text NOT NULL,
	"data" jsonb NOT NULL,
	"previous_entry_hash" text,
	"entry_hash" text NOT NULL,
	CONSTRAINT "audit_entries_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "case_entities" (
	"workspace_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "case_entities_workspace_id_case_id_entity_id_pk" PRIMARY KEY("workspace_id","case_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"workspace_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "case_events_workspace_id_case_id_event_id_pk" PRIMARY KEY("workspace_id","case_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "case_signals" (
	"workspace_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	CONSTRAINT "case_signals_workspace_id_case_id_signal_id_pk" PRIMARY KEY("workspace_id","case_id","signal_id")
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"case_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"priority" "priority" NOT NULL,
	"severity" "severity" NOT NULL,
	"owner" text,
	"due_at" timestamp with time zone,
	"closure_requirement_ids" jsonb NOT NULL,
	"re_evaluation_status" "re_evaluation_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "cases_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "decision_evidence_segments" (
	"workspace_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"artifact_segment_id" uuid NOT NULL,
	CONSTRAINT "decision_evidence_segments_workspace_id_decision_id_artifact_segment_id_pk" PRIMARY KEY("workspace_id","decision_id","artifact_segment_id")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"decision_type" text NOT NULL,
	"proposal" text NOT NULL,
	"rationale" text NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"approval_policy_id" text NOT NULL,
	"status" "decision_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "decisions_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"display_name" text NOT NULL,
	"external_reference" text,
	"aliases" jsonb NOT NULL,
	"attributes" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entities_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "entities_workspace_external_reference_unique" UNIQUE("workspace_id","entity_type","external_reference")
);
--> statement-breakpoint
CREATE TABLE "event_entities" (
	"workspace_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "event_entities_workspace_id_event_id_entity_id_pk" PRIMARY KEY("workspace_id","event_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "event_observations" (
	"workspace_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	CONSTRAINT "event_observations_workspace_id_event_id_observation_id_pk" PRIMARY KEY("workspace_id","event_id","observation_id")
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"artifact_id" uuid NOT NULL,
	"entity_id" uuid,
	"schema_key" text NOT NULL,
	"value" jsonb,
	"normalised_value" jsonb,
	"alternative_candidates" jsonb,
	"derivation" "observation_derivation" NOT NULL,
	"evidence_status" "evidence_status" NOT NULL,
	"evidence_segment_id" uuid,
	"confidence" double precision,
	"extractor" jsonb,
	"insufficiency_reason" text,
	"review_status" "observation_review_status" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "observations_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "observations_confidence_range" CHECK ("observations"."confidence" between 0 and 1),
	CONSTRAINT "observations_insufficient_evidence_shape" CHECK ("observations"."evidence_status" <> 'insufficient-evidence' OR ("observations"."value" IS NULL AND "observations"."insufficiency_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "operational_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"attributes" jsonb NOT NULL,
	"assembler_id" text NOT NULL,
	"assembler_version" text NOT NULL,
	"re_evaluation_status" "re_evaluation_status" NOT NULL,
	CONSTRAINT "operational_events_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "signal_events" (
	"workspace_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	CONSTRAINT "signal_events_workspace_id_signal_id_event_id_pk" PRIMARY KEY("workspace_id","signal_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "signal_evidence_segments" (
	"workspace_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	"artifact_segment_id" uuid NOT NULL,
	CONSTRAINT "signal_evidence_segments_workspace_id_signal_id_artifact_segment_id_pk" PRIMARY KEY("workspace_id","signal_id","artifact_segment_id")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"severity" "severity" NOT NULL,
	"rule_id" text NOT NULL,
	"rule_version" text NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "signals_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"name" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sources_id_workspace_unique" UNIQUE("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active_pack_id" text,
	"mode" "workspace_mode" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"reset_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "action_item_evidence_segments" ADD CONSTRAINT "action_item_evidence_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item_evidence_segments" ADD CONSTRAINT "action_item_evidence_segments_action_item_id_workspace_id_action_items_id_workspace_id_fk" FOREIGN KEY ("action_item_id","workspace_id") REFERENCES "public"."action_items"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_item_evidence_segments" ADD CONSTRAINT "action_item_evidence_segments_artifact_segment_id_workspace_id_artifact_segments_id_workspace_id_fk" FOREIGN KEY ("artifact_segment_id","workspace_id") REFERENCES "public"."artifact_segments"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_case_id_workspace_id_cases_id_workspace_id_fk" FOREIGN KEY ("case_id","workspace_id") REFERENCES "public"."cases"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decision_id_workspace_id_decisions_id_workspace_id_fk" FOREIGN KEY ("decision_id","workspace_id") REFERENCES "public"."decisions"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_segments" ADD CONSTRAINT "artifact_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_segments" ADD CONSTRAINT "artifact_segments_artifact_workspace_fk" FOREIGN KEY ("artifact_id","workspace_id") REFERENCES "public"."artifacts"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_source_workspace_fk" FOREIGN KEY ("source_id","workspace_id") REFERENCES "public"."sources"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_entities" ADD CONSTRAINT "case_entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_entities" ADD CONSTRAINT "case_entities_case_id_workspace_id_cases_id_workspace_id_fk" FOREIGN KEY ("case_id","workspace_id") REFERENCES "public"."cases"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_entities" ADD CONSTRAINT "case_entities_entity_id_workspace_id_entities_id_workspace_id_fk" FOREIGN KEY ("entity_id","workspace_id") REFERENCES "public"."entities"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_workspace_id_cases_id_workspace_id_fk" FOREIGN KEY ("case_id","workspace_id") REFERENCES "public"."cases"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_event_id_workspace_id_operational_events_id_workspace_id_fk" FOREIGN KEY ("event_id","workspace_id") REFERENCES "public"."operational_events"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_signals" ADD CONSTRAINT "case_signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_signals" ADD CONSTRAINT "case_signals_case_id_workspace_id_cases_id_workspace_id_fk" FOREIGN KEY ("case_id","workspace_id") REFERENCES "public"."cases"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_signals" ADD CONSTRAINT "case_signals_signal_id_workspace_id_signals_id_workspace_id_fk" FOREIGN KEY ("signal_id","workspace_id") REFERENCES "public"."signals"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_evidence_segments" ADD CONSTRAINT "decision_evidence_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_evidence_segments" ADD CONSTRAINT "decision_evidence_segments_decision_id_workspace_id_decisions_id_workspace_id_fk" FOREIGN KEY ("decision_id","workspace_id") REFERENCES "public"."decisions"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_evidence_segments" ADD CONSTRAINT "decision_evidence_segments_artifact_segment_id_workspace_id_artifact_segments_id_workspace_id_fk" FOREIGN KEY ("artifact_segment_id","workspace_id") REFERENCES "public"."artifact_segments"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_case_id_workspace_id_cases_id_workspace_id_fk" FOREIGN KEY ("case_id","workspace_id") REFERENCES "public"."cases"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_entities" ADD CONSTRAINT "event_entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_entities" ADD CONSTRAINT "event_entities_event_id_workspace_id_operational_events_id_workspace_id_fk" FOREIGN KEY ("event_id","workspace_id") REFERENCES "public"."operational_events"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_entities" ADD CONSTRAINT "event_entities_entity_id_workspace_id_entities_id_workspace_id_fk" FOREIGN KEY ("entity_id","workspace_id") REFERENCES "public"."entities"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_observations" ADD CONSTRAINT "event_observations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_observations" ADD CONSTRAINT "event_observations_event_id_workspace_id_operational_events_id_workspace_id_fk" FOREIGN KEY ("event_id","workspace_id") REFERENCES "public"."operational_events"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_observations" ADD CONSTRAINT "event_observations_observation_id_workspace_id_observations_id_workspace_id_fk" FOREIGN KEY ("observation_id","workspace_id") REFERENCES "public"."observations"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_artifact_workspace_fk" FOREIGN KEY ("artifact_id","workspace_id") REFERENCES "public"."artifacts"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_entity_workspace_fk" FOREIGN KEY ("entity_id","workspace_id") REFERENCES "public"."entities"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_evidence_workspace_fk" FOREIGN KEY ("evidence_segment_id","workspace_id") REFERENCES "public"."artifact_segments"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_signal_id_workspace_id_signals_id_workspace_id_fk" FOREIGN KEY ("signal_id","workspace_id") REFERENCES "public"."signals"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_event_id_workspace_id_operational_events_id_workspace_id_fk" FOREIGN KEY ("event_id","workspace_id") REFERENCES "public"."operational_events"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence_segments" ADD CONSTRAINT "signal_evidence_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence_segments" ADD CONSTRAINT "signal_evidence_segments_signal_id_workspace_id_signals_id_workspace_id_fk" FOREIGN KEY ("signal_id","workspace_id") REFERENCES "public"."signals"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_evidence_segments" ADD CONSTRAINT "signal_evidence_segments_artifact_segment_id_workspace_id_artifact_segments_id_workspace_id_fk" FOREIGN KEY ("artifact_segment_id","workspace_id") REFERENCES "public"."artifact_segments"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_item_evidence_segments_workspace_idx" ON "action_item_evidence_segments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "action_items_workspace_idx" ON "action_items" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "approvals_workspace_idx" ON "approvals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "artifact_segments_workspace_idx" ON "artifact_segments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "artifact_segments_artifact_idx" ON "artifact_segments" USING btree ("workspace_id","artifact_id");--> statement-breakpoint
CREATE INDEX "artifacts_workspace_idx" ON "artifacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_entries_workspace_idx" ON "audit_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_entries_workspace_occurred_idx" ON "audit_entries" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "case_entities_workspace_idx" ON "case_entities" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "case_events_workspace_idx" ON "case_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "case_signals_workspace_idx" ON "case_signals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "cases_workspace_idx" ON "cases" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "decision_evidence_segments_workspace_idx" ON "decision_evidence_segments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "decisions_workspace_idx" ON "decisions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "entities_workspace_idx" ON "entities" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "event_entities_workspace_idx" ON "event_entities" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "event_observations_workspace_idx" ON "event_observations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "observations_workspace_idx" ON "observations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "observations_artifact_idx" ON "observations" USING btree ("workspace_id","artifact_id");--> statement-breakpoint
CREATE INDEX "operational_events_workspace_idx" ON "operational_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "signal_events_workspace_idx" ON "signal_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "signal_evidence_segments_workspace_idx" ON "signal_evidence_segments" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "signals_workspace_idx" ON "signals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sources_workspace_idx" ON "sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE FUNCTION enforce_artifact_immutable_fields() RETURNS trigger AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
    OR NEW.source_id IS DISTINCT FROM OLD.source_id
    OR NEW.artifact_type IS DISTINCT FROM OLD.artifact_type
    OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
    OR NEW.received_at IS DISTINCT FROM OLD.received_at
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.raw_reference IS DISTINCT FROM OLD.raw_reference
    OR NEW.raw_text IS DISTINCT FROM OLD.raw_text
    OR NEW.checksum IS DISTINCT FROM OLD.checksum
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
  THEN
    RAISE EXCEPTION 'Artifact source fields are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER artifacts_immutable_fields
BEFORE UPDATE ON artifacts
FOR EACH ROW EXECUTE FUNCTION enforce_artifact_immutable_fields();--> statement-breakpoint
CREATE FUNCTION reject_audit_entry_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit entries are append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER audit_entries_append_only
BEFORE UPDATE OR DELETE ON audit_entries
FOR EACH ROW EXECUTE FUNCTION reject_audit_entry_mutation();--> statement-breakpoint
CREATE FUNCTION require_human_approval_for_approved_decision() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND NOT EXISTS (
    SELECT 1
    FROM approvals
    WHERE approvals.workspace_id = NEW.workspace_id
      AND approvals.decision_id = NEW.id
      AND approvals.outcome = 'approved'
  ) THEN
    RAISE EXCEPTION 'An approved Decision requires a matching human Approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER decisions_require_human_approval
BEFORE INSERT OR UPDATE OF status ON decisions
FOR EACH ROW EXECUTE FUNCTION require_human_approval_for_approved_decision();
