CREATE TABLE "beacn_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"apollo_org_id" text,
	"logo_url" text,
	"linkedin_url" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beacn_companies_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "beacn_company_searches" (
	"query" text PRIMARY KEY NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beacn_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beacn_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"apollo_id" text NOT NULL,
	"domain" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name_obfuscated" text DEFAULT '' NOT NULL,
	"last_name" text,
	"title" text,
	"linkedin_url" text,
	"email" text,
	"email_status" text,
	"lookup_started_at" timestamp with time zone,
	"looked_up_at" timestamp with time zone,
	"looked_up_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beacn_people_apollo_id_unique" UNIQUE("apollo_id")
);
--> statement-breakpoint
CREATE TABLE "beacn_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"pronouns" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"signoff" text DEFAULT 'Best,' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beacn_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"batch_id" text NOT NULL,
	"person_id" integer,
	"to_email" text NOT NULL,
	"to_name" text,
	"company" text NOT NULL,
	"domain" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"gmail_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "beacn_member" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "beacn_joined_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "beacn_ledger_user_time" ON "beacn_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "beacn_people_domain" ON "beacn_people" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "beacn_sends_domain" ON "beacn_sends" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "beacn_sends_due" ON "beacn_sends" USING btree ("status","scheduled_at");