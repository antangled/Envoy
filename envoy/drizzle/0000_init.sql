CREATE TABLE "briefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"data" jsonb NOT NULL,
	"evidence_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"model_used" text NOT NULL,
	"validation_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "briefs_prospect_id_unique" UNIQUE("prospect_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mode" text NOT NULL,
	"goal_text" text NOT NULL,
	"contact_count" integer DEFAULT 20 NOT NULL,
	"attach_deck" boolean DEFAULT true NOT NULL,
	"advanced" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_spec" jsonb,
	"roles_selected" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"shortfall" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"spec_source" text DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"name" text,
	"first_name" text,
	"last_name" text,
	"title" text,
	"email" text,
	"email_status" text NOT NULL,
	"confidence" integer,
	"source" text NOT NULL,
	"source_url" text,
	"linkedin_url" text,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"contact_id" integer,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"user_edited" boolean DEFAULT false NOT NULL,
	"allow_generic" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drafts_prospect_id_unique" UNIQUE("prospect_id")
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"kind" text DEFAULT 'page' NOT NULL,
	"emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'fetch' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"value" text NOT NULL,
	"source" text DEFAULT 'import' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hunter_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"org_name" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"one_liner" text DEFAULT '' NOT NULL,
	"what_we_do" text DEFAULT '' NOT NULL,
	"proof_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"service_catalog" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"team_structure" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"deck_name" text,
	"deck_b64" text,
	"deck_url" text DEFAULT '' NOT NULL,
	"postal_address" text DEFAULT '' NOT NULL,
	"me_name" text DEFAULT '' NOT NULL,
	"me_first_name" text DEFAULT '' NOT NULL,
	"me_role" text DEFAULT '' NOT NULL,
	"me_pronouns" text DEFAULT '' NOT NULL,
	"extracted_from" text DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"website" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'discovered' NOT NULL,
	"skip_reason" text,
	"source" text DEFAULT 'exa' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"to_email" text NOT NULL,
	"to_name" text,
	"org_name" text NOT NULL,
	"subject" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"gmail_message_id" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"error" text,
	"replied" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"google_refresh_token_enc" text,
	"daily_cap" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "evidence_domain" ON "evidence" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_domain_url" ON "evidence" USING btree ("domain","url");--> statement-breakpoint
CREATE UNIQUE INDEX "exclusions_user_value" ON "exclusions" USING btree ("user_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_campaign_domain" ON "prospects" USING btree ("campaign_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_user_email" ON "suppressions" USING btree ("user_id","email");