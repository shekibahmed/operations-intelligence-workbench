CREATE TABLE "rate_limit_buckets" (
	"bucket_key" text PRIMARY KEY NOT NULL,
	"tokens" double precision NOT NULL,
	"refilled_at_ms" double precision NOT NULL,
	"denial_reported_at_ms" double precision,
	"touched_at_ms" double precision NOT NULL
);
