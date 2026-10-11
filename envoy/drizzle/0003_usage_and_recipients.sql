ALTER TABLE "campaigns" ADD COLUMN "people_per_company" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "usage" jsonb DEFAULT '{"claudeUsd":0,"exaUsd":0,"hunterLookups":0,"sonnetBriefs":0}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "selected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sends" ADD COLUMN "body" text;