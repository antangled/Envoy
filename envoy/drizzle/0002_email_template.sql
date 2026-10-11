ALTER TABLE "org_profiles" ADD COLUMN "subject_template" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_profiles" ADD COLUMN "template_client" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_profiles" ADD COLUMN "template_partnership" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_profiles" ADD COLUMN "signoff" text DEFAULT 'Best,' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_profiles" ADD COLUMN "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_profiles" ADD COLUMN "logo_data_uri" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text;