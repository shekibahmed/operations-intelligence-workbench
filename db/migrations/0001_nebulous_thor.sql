CREATE TABLE "observation_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observation_revisions" ADD CONSTRAINT "observation_revisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_revisions" ADD CONSTRAINT "observation_revisions_observation_id_workspace_id_observations_id_workspace_id_fk" FOREIGN KEY ("observation_id","workspace_id") REFERENCES "public"."observations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observation_revisions_workspace_idx" ON "observation_revisions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "observation_revisions_observation_idx" ON "observation_revisions" USING btree ("workspace_id","observation_id");