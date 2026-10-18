import { pgTable, text, integer, boolean, jsonb, timestamp, serial, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  isDemo: boolean("is_demo").notNull().default(false),
  googleRefreshTokenEnc: text("google_refresh_token_enc"),
  dailyCap: integer("daily_cap").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Entered the BEACN club key with an @berkeley.edu account; unlocks the BEACN outreach tool. */
  beacnMember: boolean("beacn_member").notNull().default(false),
  beacnJoinedAt: timestamp("beacn_joined_at", { withTimezone: true }),
});

export const orgProfiles = pgTable("org_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  orgName: text("org_name").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  oneLiner: text("one_liner").notNull().default(""),
  whatWeDo: text("what_we_do").notNull().default(""),
  proofPoints: jsonb("proof_points").$type<string[]>().notNull().default([]),
  serviceCatalog: jsonb("service_catalog").$type<string[]>().notNull().default([]),
  teamStructure: text("team_structure").notNull().default(""),
  website: text("website").notNull().default(""),
  deckName: text("deck_name"),
  deckB64: text("deck_b64"),
  deckUrl: text("deck_url").notNull().default(""),
  postalAddress: text("postal_address").notNull().default(""),
  meName: text("me_name").notNull().default(""),
  meFirstName: text("me_first_name").notNull().default(""),
  meRole: text("me_role").notNull().default(""),
  mePronouns: text("me_pronouns").notNull().default(""),
  extractedFrom: text("extracted_from").notNull().default("manual"),
  // The whole email, edited as one piece. {{first_name}}, {{company}} are filled per contact;
  // {{ai_opening}} and {{ai_ideas}} are written per company; [bracketed text] still needs the user's words.
  subjectTemplate: text("subject_template").notNull().default(""),
  templateClient: text("template_client").notNull().default(""),
  templatePartnership: text("template_partnership").notNull().default(""),
  signoff: text("signoff").notNull().default("Best,"),
  phone: text("phone").notNull().default(""),
  logoDataUri: text("logo_data_uri"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mode: text("mode").$type<"client" | "partnership">().notNull(),
  goalText: text("goal_text").notNull(),
  contactCount: integer("contact_count").notNull().default(20),
  attachDeck: boolean("attach_deck").notNull().default(true),
  advanced: jsonb("advanced").$type<Record<string, unknown>>().notNull().default({}),
  searchSpec: jsonb("search_spec").$type<import("@/lib/llm/schemas").SearchSpec>(),
  rolesSelected: jsonb("roles_selected").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"),
  shortfall: jsonb("shortfall").$type<string[]>().notNull().default([]),
  specSource: text("spec_source").notNull().default("ai"),
  peoplePerCompany: integer("people_per_company").notNull().default(10),
  usage: jsonb("usage").$type<import("@/lib/usage").Usage>().notNull().default({ claudeUsd: 0, exaUsd: 0, hunterLookups: 0, sonnetBriefs: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prospects = pgTable(
  "prospects",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id").notNull(),
    name: text("name").notNull(),
    domain: text("domain").notNull(),
    website: text("website").notNull(),
    reason: text("reason").notNull().default(""),
    reasonUrl: text("reason_url"),
    selected: boolean("selected").notNull().default(true),
    status: text("status").notNull().default("discovered"),
    skipReason: text("skip_reason"),
    source: text("source").notNull().default("exa"),
  },
  (t) => [uniqueIndex("prospects_campaign_domain").on(t.campaignId, t.domain)],
);

export const evidence = pgTable(
  "evidence",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull().default(""),
    text: text("text").notNull(),
    kind: text("kind").notNull().default("page"),
    emails: jsonb("emails").$type<string[]>().notNull().default([]),
    source: text("source").notNull().default("fetch"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_domain").on(t.domain), uniqueIndex("evidence_domain_url").on(t.domain, t.url)],
);

export const briefs = pgTable("briefs", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().unique(),
  data: jsonb("data").$type<import("@/lib/llm/schemas").BriefAndSlots>().notNull(),
  evidenceIds: jsonb("evidence_ids").$type<Record<string, number>>().notNull().default({}),
  evidenceCount: integer("evidence_count").notNull().default(0),
  modelUsed: text("model_used").notNull(),
  validationLog: jsonb("validation_log").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull(),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title"),
  email: text("email"),
  emailStatus: text("email_status").$type<ContactStatus>().notNull(),
  confidence: integer("confidence"),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  linkedinUrl: text("linkedin_url"),
  isPrimary: boolean("is_primary").notNull().default(false),
  /** Chosen as a recipient of this company's email. Several people at one company can be selected. */
  selected: boolean("selected").notNull().default(false),
});
export type ContactStatus = "verified" | "accept_all" | "unknown" | "published_generic" | "not_found";

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  prospectId: integer("prospect_id").notNull().unique(),
  contactId: integer("contact_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").$type<"draft" | "selected" | "rejected">().notNull().default("draft"),
  userEdited: boolean("user_edited").notNull().default(false),
  allowGeneric: boolean("allow_generic").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sends = pgTable("sends", {
  id: serial("id").primaryKey(),
  draftId: integer("draft_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  userId: integer("user_id").notNull(),
  toEmail: text("to_email").notNull(),
  toName: text("to_name"),
  orgName: text("org_name").notNull(),
  subject: text("subject").notNull(),
  /** The body as personalized for this recipient; falls back to the draft's body. */
  body: text("body"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  gmailMessageId: text("gmail_message_id"),
  channel: text("channel").$type<"gmail" | "demo">().notNull(),
  status: text("status").$type<"scheduled" | "sent" | "failed" | "skipped">().notNull().default("scheduled"),
  error: text("error"),
  replied: boolean("replied").notNull().default(false),
});

export const exclusions = pgTable(
  "exclusions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    value: text("value").notNull(),
    source: text("source").notNull().default("import"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("exclusions_user_value").on(t.userId, t.value)],
);

export const suppressions = pgTable(
  "suppressions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    email: text("email").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("suppressions_user_email").on(t.userId, t.email)],
);

export const hunterCache = pgTable("hunter_cache", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------- BEACN outreach (Apollo contacts + template sending)

/** A member's sender details and email template. The organization line comes from the club settings. */
export const beacnProfiles = pgTable("beacn_profiles", {
  userId: integer("user_id").primaryKey(),
  name: text("name").notNull().default(""),
  pronouns: text("pronouns").notNull().default(""),
  title: text("title").notNull().default(""),
  phone: text("phone").notNull().default(""),
  signoff: text("signoff").notNull().default("Best,"),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every company anyone on the committee has found, so later searches are free. */
export const beacnCompanies = pgTable("beacn_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  apolloOrgId: text("apollo_org_id"),
  logoUrl: text("logo_url"),
  linkedinUrl: text("linkedin_url"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Apollo company-search results by normalized query; each new query costs 1 credit, repeats are free. */
export const beacnCompanySearches = pgTable("beacn_company_searches", {
  query: text("query").primaryKey(),
  results: jsonb("results").$type<{ name: string; domain: string; apolloOrgId: string | null; logoUrl: string | null; linkedinUrl: string | null }[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** People from Apollo search (free). Emails are filled only after a paid lookup and then shared with every member. */
export const beacnPeople = pgTable(
  "beacn_people",
  {
    id: serial("id").primaryKey(),
    apolloId: text("apollo_id").notNull().unique(),
    domain: text("domain").notNull(),
    companyName: text("company_name").notNull().default(""),
    firstName: text("first_name").notNull().default(""),
    lastNameObfuscated: text("last_name_obfuscated").notNull().default(""),
    lastName: text("last_name"),
    title: text("title"),
    linkedinUrl: text("linkedin_url"),
    email: text("email"),
    emailStatus: text("email_status"),
    /** Set while a lookup is running so two members never pay for the same person. */
    lookupStartedAt: timestamp("lookup_started_at", { withTimezone: true }),
    lookedUpAt: timestamp("looked_up_at", { withTimezone: true }),
    lookedUpBy: integer("looked_up_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("beacn_people_domain").on(t.domain)],
);

/** Every credit spent (and every key attempt), for limits and the admin log. */
export const beacnLedger = pgTable(
  "beacn_ledger",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    kind: text("kind").$type<"company_search" | "email_lookup" | "key_attempt">().notNull(),
    credits: integer("credits").notNull().default(0),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("beacn_ledger_user_time").on(t.userId, t.createdAt)],
);

export const beacnSends = pgTable(
  "beacn_sends",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    batchId: text("batch_id").notNull(),
    personId: integer("person_id"),
    toEmail: text("to_email").notNull(),
    toName: text("to_name"),
    company: text("company").notNull(),
    domain: text("domain").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").$type<"scheduled" | "sending" | "sent" | "failed" | "cancelled">().notNull().default("scheduled"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    gmailMessageId: text("gmail_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("beacn_sends_domain").on(t.domain), index("beacn_sends_due").on(t.status, t.scheduledAt)],
);
