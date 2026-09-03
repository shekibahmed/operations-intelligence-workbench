CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"context" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "analytics_events_name_allowed" CHECK ("analytics_events"."name" in ('landing-page-view', 'scenario-selected', 'demo-started', 'artifact-opened', 'artifact-processed', 'observation-reviewed', 'case-opened', 'decision-viewed', 'decision-approved', 'technical-trace-viewed', 'lens-switched', 'tour-completed', 'cta-opened', 'assessment-submitted'))
);
--> statement-breakpoint
CREATE TABLE "assessment_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid,
	"session_id" text NOT NULL,
	"organisation" text NOT NULL,
	"industry" text NOT NULL,
	"operational_workflow" text NOT NULL,
	"current_source_systems" text,
	"approximate_information_volume" text,
	"main_bottleneck" text NOT NULL,
	"current_reporting_method" text,
	"data_sensitivity" text,
	"desired_result" text NOT NULL,
	"contact_details" text NOT NULL,
	"scenario_id" text,
	"submitted_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_submissions" ADD CONSTRAINT "assessment_submissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_workspace_occurred_idx" ON "analytics_events" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_session_occurred_idx" ON "analytics_events" USING btree ("session_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_name_occurred_idx" ON "analytics_events" USING btree ("name","occurred_at");--> statement-breakpoint
CREATE INDEX "assessment_submissions_workspace_submitted_idx" ON "assessment_submissions" USING btree ("workspace_id","submitted_at");--> statement-breakpoint
CREATE INDEX "assessment_submissions_submitted_idx" ON "assessment_submissions" USING btree ("submitted_at");