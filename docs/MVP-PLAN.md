# Envoy — MVP Build Spec

**How to use this file:** paste it whole into a fresh Claude Code session in this repo and say "build this." It is self-contained. Every decision below has already been researched and made (sources in `docs/research/`); do not re-litigate the stack, re-research vendors, or substitute providers. Where something must be verified at build time it is marked **VERIFY**.

---

## 0. Context for a fresh session

**What Envoy is.** A web app where a consultant, agency, or founder types a plain-English outreach goal and gets back: a short list of organizations worth approaching, a one-page evidence-backed brief on each, the right person to contact, and a draft email in the user's own voice where only two short sections were written by the model. The user reviews, edits, selects, and the app sends from the user's own Gmail with spacing and caps. Two campaign modes share one pipeline: **client outreach** (a service firm pitching a prospective client) and **business partnerships** (a company proposing a collaboration). The mode changes default criteria, default roles to target, and the "ask" paragraph. Nothing else.

**Decisions already made (do not reopen):**

| Area | Decision | Why (short) |
|---|---|---|
| Framework | Next.js (latest, App Router), TypeScript, Tailwind, Vercel | One repo, one deploy, cron included |
| DB | Postgres (Neon or Supabase via Vercel Marketplace) + Drizzle | |
| Auth + sending | Auth.js (next-auth v5) Google provider; scopes `openid email https://www.googleapis.com/auth/gmail.send`; Gmail API `users.messages.send` | `gmail.send` is Google's "Sensitive" tier: no security audit needed. Any other Gmail scope is "Restricted" and requires an annual CASA audit. Transactional email providers (Resend, SendGrid, Postmark, Mailgun, SES) all prohibit cold outreach in their terms. |
| LLM | **Claude Haiku 5.5** (`claude-haiku-5-5`) for every call. **Claude Sonnet 5.5** (`claude-sonnet-5-5`) only for briefs that fail verification. One API key. | $0.10 / $0.50 per million tokens, native JSON schema and PDF input, 50% batch discount. ~$0.002 per prospect. Opus was 40x more for the same job. |
| Company discovery | **Exa** `/search` with `category: "company"` plus `/findSimilar` | Understands plain-English descriptions; $10/month free credit, no card |
| Evidence pages | **Direct fetch + Readability**; Exa `/contents` as fallback | Free; Exa contents $1 per 1k pages only on failures |
| Named contacts | **Hunter** Domain Search (primary) + published-contact scan of the company's own pages (parallel); Hunter Email Finder only when a name is known without an email; Hunter Verifier only for results lacking a status | 50 free credits/month cover the demo. Returns named people with titles, confidence, and a catch-all flag. |
| Dropped from MVP | Apollo (obfuscated last names, no emails, API terms forbid use inside a product), Tavily (Exa covers it), Anymail/Reoon/Serper (scaling phase only), Groq GPT-OSS (JSON validity 0.858 in the one benchmark that tested it; free tier is 8k tokens/minute, below one brief call) | |
| Required keys | `ANTHROPIC_API_KEY`, `EXA_API_KEY`, `HUNTER_API_KEY`, Google OAuth client | Three vendor keys |
| Model comparison | Optional: implement the LLM client behind one interface so `claude-haiku-5-5` vs Groq `openai/gpt-oss-120b` can be compared on the same 10 companies. Default stays Haiku. | |

**The reference email (this is the target output, verbatim, sent Sept 2026 by the founder's consulting group to a prospective client).** The template engine must be able to reproduce this with the user's own org profile.

```
Subject: Berkeley x Lightship Collaboration (BEACN)?

Dear Alejandro,

Hope you're doing well! I'm Adam, a Project Manager at BEACN, a student-run
sustainability consulting group at UC Berkeley. I saw Lightship's launch of
PowerSled as a new commercial business and your plans to quadruple
manufacturing capacity by the end of 2026, and wanted to reach out about
potentially supporting that growth through a semester-long project.

A few ideas that came to mind:

   - *Market targeting*: Identify the industries and applications where
   PowerSled offers the strongest commercial advantage over diesel generators
   and other mobile-power alternatives.
   - *Customer economics*: Model the cost and emissions case for PowerSled
   across priority use cases to determine where the customer ROI is strongest.
   - *Partnership strategy*: Map priority customers, upfitters, and channel
   partners as Lightship expands PowerSled into different commercial
   configurations.

To provide some context, BEACN projects are staffed by seven Berkeley
students plus an MBA mentor from Haas. Across 180+ projects for 150+
organizations, we've worked on market sizing, competitive landscaping,
regulatory research, supply-chain analysis, and data collection. (More info
in deck attached)

We're finalizing our fall projects this week, and I'd love to hear what
would actually be most useful to Lightship.

Would this be of interest to you? If so, I'm happy to arrange a time as
early as tomorrow; happy to work around your calendar.

Best,
Adam
(he/him/his)
Project Manager
Bay-area Environmentally Aware Consulting Network (BEACN)
Student-run consulting for environmentally and socially responsible organizations.
```

Five of the seven blocks are **locked** (filled from setup and campaign settings). Two are **generated** per recipient: the "I saw …" hook (1–2 observed facts with evidence IDs) and the three ideas (each = one item from the org's service catalog applied to one evidenced fact). About 60 generated words per recipient.

---

## 1. Product Overview

Envoy helps consultants, freelancers, small agencies, and founders find the right organizations and people to approach, understand why each one fits, and send a personalized, evidence-backed email from their own Gmail after reviewing it.

Every suggested organization comes with: a short profile; criteria marked **Supported / Not met / Unknown**, each with a source link; mutual benefit labelled **evidenced** or **inferred**; what is still unknown; a reachable contact or an honest "no named contact found"; and a draft where only the hook and ideas were generated.

Non-goals for the MVP: inbox reading, follow-up sequences, multiple mailboxes, open/click tracking, CRM sync, LinkedIn automation, Outlook.

---

## 2. User Workflow

### One-time setup (target under 5 minutes)

1. **Connect Gmail.** Google sign-in with the three scopes; `access_type=offline`, `prompt=consent`. Encrypt the refresh token (AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`) before storing.
2. **Describe your organization by uploading, not typing.** User uploads their outreach deck (PDF, ≤ 20 MB) and/or pastes their website URL. One Haiku call with the PDF as a document block (and the homepage text if a URL was given) extracts the **org profile** (schema in §3). Show it as an editable form; user corrects and saves.
3. **You.** Name, role, optional pronouns, signature lines. Optional logo upload.
4. **Compliance footer.** Organization postal address (required before any send) and opt-out wording (prefilled).
5. **Attachments.** The deck is stored once (Vercel Blob or Supabase Storage); per campaign the user picks attach or link.
6. **Exclusions.** Textarea/CSV of emails and domains already contacted. (The app cannot read Sent without a restricted scope.)

### Each campaign

| Step | Screen | User action | System |
|---|---|---|---|
| 1 | **New campaign.** Mode toggle (Client outreach / Partnership), one goal textarea, template preset select, contact count (default 20). "Advanced" collapsed: geography, company size, exclude-competitors toggle, attach deck vs link, extra criteria. | Types 2–4 sentences, clicks **Find & draft** | Haiku → `SearchSpec` (criteria + role checklist) |
| 2 | **Confirm targets.** Role checklist (6–10 roles, 2–3 pre-checked) and 15–25 candidate organizations with name, website, one-line reason, and a checkbox. Shows "N candidates found of M requested" with the shortfall reason. | Unchecks, clicks **Research** | Exa search + findSimilar; exclusions and dedupe applied |
| 3 | **Review.** Streaming progress list, then one card per organization (§4). | Reads, edits draft inline, toggles **Send** per card | Evidence → brief + slots (one call) → verify → contacts → assembled draft |
| 4 | **Send selected.** Table of selected drafts: recipient, email status badge, scheduled time, footer preview, today's remaining cap. | Clicks **Send selected** | Queue with jitter and caps |
| 5 | **History.** Sent / scheduled / failed with Gmail message IDs; **Mark replied**; **Mark opted out**; **Re-run campaign** | | |

**Fewer, not weaker.** When fewer than `contact_count` organizations pass the criteria *and* have a sendable contact, show fewer and the reasons: "12 of 20: 5 failed two or more criteria; 3 had no reachable contact."

---

## 3. Profiling and Personalized Emails

### 3.1 Schemas (zod; also emitted as JSON Schema for the API)

```ts
// Org profile (setup, once)
OrgProfile = {
  org_name: string, one_liner: string,            // "a student-run sustainability consulting group at UC Berkeley"
  what_we_do: string,                              // 1–2 sentences
  proof_points: string[],                          // "180+ projects for 150+ organizations"
  service_catalog: string[],                       // "market sizing", "competitive landscaping", ...
  team_structure: string,                          // "seven Berkeley students plus an MBA mentor from Haas"
  website?: string
}

// Search spec (per campaign)
SearchSpec = {
  target_description: string,                      // what Exa will search for, 1–2 sentences
  seed_examples: string[],                         // 0–3 example company names/domains the user mentioned
  geography?: string, size_hint?: string,
  criteria: { id: string, text: string }[],        // 3–6, ids "c1".."c6"
  roles: { title: string, checked: boolean }[],    // 6–10, 2–3 checked, mode-aware
  offer_phrase: string,                            // "a semester-long project" / "a focused engagement"
  season_label: string                             // "fall", "Q1"
}

// Brief + slots (per prospect, ONE call)
BriefAndSlots = {
  fit_score: number,                               // 0–100
  profile: string,                                 // 2–3 sentences
  criteria: { id: string, status: "supported"|"not_met"|"unknown", evidence_ids: string[], note: string }[],
  mutual_benefit: { claim: string, basis: "evidenced"|"inferred", evidence_ids: string[] }[],
  missing_information: { question: string, why_it_matters: string, how_to_verify: string }[],
  recommended_roles: string[],
  hook: { text: string, evidence_ids: string[], quotes: string[] },   // quotes = exact substrings from evidence
  ideas: { title: string, sentence: string, service: string, evidence_ids: string[] }[],  // exactly 3
  subject: string                                  // ≤ 60 chars, names both orgs
}
```

**JSON Schema detail that matters:** `evidence_ids` items use `"enum": [actual ids sent]` built per request, so the model cannot invent an ID. Keep schemas flat (no `$defs`), `additionalProperties: false`, all fields `required`.

### 3.2 Deterministic validation (runs after every brief call)

1. Every `evidence_ids` entry exists in the evidence set (enum should guarantee this; check anyway).
2. Every `hook.quotes[i]` is a case-insensitive substring of some cited evidence document's text. If not → drop that quote; if no quotes survive → hook fails.
3. A criterion marked `supported` with zero evidence IDs → relabel `unknown`. A benefit marked `evidenced` with zero IDs → relabel `inferred`.
4. `ideas.length === 3`, each `service` is a member of `org_profile.service_catalog` (fuzzy match ≥ 0.8), each has ≥ 1 evidence ID.
5. If `evidence_count < 3` → `fit_score = min(fit_score, 50)` and append a missing_information item "Limited public information found (N pages)."
6. Verifier call (Haiku, ~500 tokens out): given each `supported` criterion and each `evidenced` benefit with its cited passages, return `{id, verdict: "supported"|"not_supported"}`. Any `not_supported` → relabel.
7. **Escalation:** if the hook failed (step 2) or more than one item was relabelled in steps 3–6, re-run the brief call once on `claude-sonnet-5-5` with the same inputs, then re-validate. Store `model_used`.

### 3.3 Template engine

Blocks are stored per template as `{ kind: "locked" | "slot", name, text }`. Locked text may contain `{{tokens}}` resolved from org profile, user, campaign, company, and contact. Slots are `{{HOOK}}` and `{{IDEAS}}` only.

**Preset: Client outreach** (derived from the reference email)

```
locked  greeting      Dear {{contact.first_name_or_fallback}},
locked  intro         Hope you're doing well! I'm {{me.first_name}}, a {{me.role}} at {{org.name}}, {{org.one_liner}}. I saw {{HOOK}}, and wanted to reach out about potentially supporting that through {{campaign.offer_phrase}}.
locked  ideas_header  A few ideas that came to mind:
slot    IDEAS         (rendered as "- *{{title}}*: {{sentence}}" × 3)
locked  credentials   To provide some context, {{org.team_structure}}. Across {{org.proof_points_joined}}, we've worked on {{org.service_catalog_joined}}. {{deck_line}}
locked  timing        We're finalizing our {{campaign.season_label}} projects this week, and I'd love to hear what would actually be most useful to {{company.name}}.
locked  ask           Would this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.
locked  signature     Best,\n{{me.first_name}}\n{{me.pronouns_line}}{{me.role}}\n{{org.name}}\n{{org.tagline}}
```

`{{deck_line}}` = "(More info in deck attached)" when attach is on, "(More info: {{deck_url}})" when link, empty otherwise. `{{contact.first_name_or_fallback}}` = first name, else "{{company.name}} team". `{{HOOK}}` is embedded mid-sentence, so the model must return it as a noun phrase starting with a possessive or the company name ("Lightship's launch of PowerSled … by the end of 2026").

**Preset: Business partnerships** — same blocks with: intro ends "…and wanted to explore whether there's a way for {{org.name}} and {{company.name}} to work together."; ideas_header "A few ways this could look:"; timing "We're mapping our {{campaign.season_label}} partnerships now, and I'd love to hear what would be most useful to {{company.name}}."; ask "Would a 20-minute call be worthwhile? Happy to work around your calendar."

**Footer** (appended server-side at send time, never editable in the draft):

```
—
{{me.full_name}} · {{org.name}} · {{org.postal_address}}
You're receiving this because I found your role at {{company.name}} on your company's website. If you'd rather not hear from me, reply "unsubscribe" and I'll remove you.
```

**Paste your own template** (post-MVP unless time remains): user pastes a past email; one Haiku call returns blocks with `kind` guesses; user confirms.

### 3.4 Prompts (use verbatim; keep system prompts stable so they cache)

**System — org profile extraction**
> You extract a concise organization profile from a company's outreach deck and/or website text. Return only facts present in the material. Proof points are quantified claims as written (e.g. "180+ projects for 150+ organizations"). service_catalog lists the kinds of work offered, as short noun phrases. team_structure describes who staffs an engagement. Do not embellish.

**System — search spec**
> You turn a user's outreach goal into a search specification for finding organizations and the people to contact. Mode is {{mode}}. Write target_description as a plain-English description an embedding search engine can match ("growth-stage clean-energy hardware companies in the Bay Area scaling manufacturing"). Derive 3–6 criteria the user implicitly cares about; each must be checkable from a company's public web presence. Propose 6–10 role titles appropriate to {{mode}} and company size; mark 2–3 as checked. offer_phrase is how the user would describe what they're proposing in a few words. Never include criteria about the contact person's personal attributes.

**System — brief and slots**
> You are a research analyst preparing a one-page brief and a two-part email personalization for {{org.name}} ({{org.one_liner}}), whose services are: {{service_catalog}}. You are given evidence documents, each with an id. Rules: (1) Every claim about the company must cite evidence ids; anything you believe but cannot cite goes in missing_information or is labelled inferred. (2) criteria statuses: supported only with citations; not_met only with citations showing the opposite; otherwise unknown. (3) hook: a noun phrase (not a sentence) naming 1–2 specific, recent, evidenced facts about the company, suitable to follow "I saw"; include exact quotes copied from the evidence in `quotes`. (4) ideas: exactly three; each pairs one service from the catalog with one evidenced fact; title 2–4 words; one sentence each, concrete, no filler; do not promise outcomes. (5) subject ≤ 60 characters naming both organizations, no "Re:", no "Fwd:", no clickbait. (6) Plain, specific language. No superlatives. No claims about the recipient as a person beyond their title.

**User message for the brief call:** the evidence documents as `document` content blocks (text source, `title` = URL, `context` = "evidence id eN"), then one text block: "Mode: … Criteria: … Target roles: … Produce the brief and slots."

**System — verifier**
> You check whether each claim is supported by the quoted passages. A claim is supported only if the passages state it or directly imply it. Return one verdict per claim id.

### 3.5 Contact stage (per prospect, runs after the brief)

Run A and B in parallel, then rank.

**A. Hunter Domain Search** — `GET https://api.hunter.io/v2/domain-search?domain={domain}&type=personal&seniority=senior,executive&limit=10&api_key=…`. Use `data.pattern`, `data.accept_all`, and `data.emails[]` (`value, confidence, first_name, last_name, position, seniority, department, linkedin, verification.status`). Score each person against `roles_selected ∪ recommended_roles` by title similarity. **VERIFY** credit cost per request on the free plan in the Hunter dashboard before the demo (expected: 1 credit per domain search; Email Finder 1 credit on success; Verifier 0.5).

**B. Published-contact scan** — over already-fetched evidence pages plus `/contact`, `/team`, `/about`, `/people` if present: collect `mailto:` links and `[\w.+-]+@{domain}` matches; collect names + titles from team pages via one Haiku call only if a team page exists (schema `{people: {name, title}[]}`). Any name without an email → Hunter Email Finder (`/v2/email-finder?domain&first_name&last_name`) only if credits remain.

**Ranking and statuses**

| Status | Meaning | Sendable by default |
|---|---|---|
| `verified` | Hunter `verification.status = valid` or confidence ≥ 90 on a non-catch-all domain | Yes |
| `accept_all` | Domain is catch-all; address plausible | Yes, with a yellow "Risky" badge |
| `unknown` | Named person, email found, no verification | Yes, with badge |
| `published_generic` | info@/hello@/partnerships@ or a contact-page URL | **No** (shown; user can override per card) |
| `not_found` | No person, no address | Card shows recommended role + contact page URL |

Pick the top named contact whose title best matches a checked role; store up to 2 as alternates.

---

## 4. Interface and Supporting Features

- **Progressive disclosure.** New-campaign screen shows mode, goal, preset, count; everything else under "Advanced."
- **Review cards.** Collapsed: org name, fit score, criteria chips (green = supported, grey = unknown, amber = not met), contact badge, send toggle. Expanded: profile; criteria with source links (open in new tab); mutual benefit with basis labels; missing information; contact with source URL and LinkedIn link if any; editable subject and body with the generated hook and ideas highlighted; **Regenerate hook & ideas** button (re-runs only the slot portion with the cached brief).
- **Edits persist**; `user_edited = true` suppresses regeneration unless asked.
- **Saved setups**: campaign goal, mode, roles, criteria, template, advanced settings; **Re-run** creates a new campaign with the same spec and skips excluded domains.
- **Duplicate prevention**: dedupe by domain within a campaign; skip emails/domains in `exclusions`; every sent address and domain is appended to `exclusions` with `source = sent`.
- **Opt-out**: footer line; **Mark opted out** in history adds to `suppressions`; suppression checked before every send.
- **Sending limits**: defaults in §5.7; user may raise the daily cap to 50 (consumer Gmail) or 100 (Workspace) behind a warning dialog.
- **History**: status, timestamps, Gmail message ID, **Mark replied**.
- **Honest counts** on the targets and review screens.
- **Instrumentation** (for validation metrics): timestamps per step; thumbs up/down per criterion; store the diff size between generated and sent body.

---

## 5. Technical Approach

### 5.1 Stack and packages

`next` (latest), `react`, `typescript`, `tailwindcss`, `drizzle-orm` + `drizzle-kit` + `postgres` (or `@neondatabase/serverless`), `next-auth@5` (Auth.js), `@anthropic-ai/sdk`, `zod`, `zod-to-json-schema`, `@mozilla/readability` + `linkedom` (evidence extraction), `googleapis` (or raw fetch for Gmail), `mimetext` or hand-built MIME, `p-limit`.

### 5.2 Environment variables

```
ANTHROPIC_API_KEY=
EXA_API_KEY=              # dashboard.exa.ai — $10/mo free credit, no card
HUNTER_API_KEY=           # hunter.io — free plan, 50 credits/mo
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=              # openssl rand -base64 32
TOKEN_ENCRYPTION_KEY=     # openssl rand -base64 32 (32 bytes)
DATABASE_URL=
CRON_SECRET=              # openssl rand -hex 16
BLOB_READ_WRITE_TOKEN=    # if using Vercel Blob for the deck
GROQ_API_KEY=             # optional, only for the model comparison
```

### 5.3 Google Cloud setup (do first; longest feedback loop)

1. New project → APIs & Services → enable **Gmail API**.
2. OAuth consent screen → External → publishing status **Testing**. Add every tester's Gmail as a test user (max 100). In Testing, refresh tokens expire 7 days after consent; re-consent before the demo.
3. Scopes: exactly `openid`, `email`, `https://www.googleapis.com/auth/gmail.send`. Adding any other Gmail scope moves the app into the Restricted tier (annual CASA audit).
4. Credentials → OAuth client (Web) → redirect URIs `http://localhost:3000/api/auth/callback/google` and the Vercel URL equivalent.
5. In Auth.js, request `access_type: "offline"`, `prompt: "consent"`, and persist `account.refresh_token` encrypted on first sign-in.

### 5.4 Database (Drizzle)

```
users          id, email, google_refresh_token_enc, daily_cap int default 30, created_at
org_profiles   id, user_id, org_name, tagline, one_liner, what_we_do, proof_points text[], service_catalog text[],
               team_structure, website, deck_url, logo_url, postal_address,
               me_name, me_first_name, me_role, me_pronouns, signature_text, extracted_from
templates      id, user_id, name, mode, blocks jsonb, attach_deck bool, is_default bool
campaigns      id, user_id, mode, template_id, goal_text, search_spec jsonb, roles_selected text[],
               contact_count int, advanced jsonb, status, shortfall_reasons jsonb, created_at
prospects      id, campaign_id, name, domain, website, discovery_reason,
               status (discovered|researched|briefed|contacted|drafted|selected|sent|skipped), skip_reason
evidence       id, domain (indexed), ext_id, url, title, text, source (fetch|exa), fetched_at
               -- keyed by domain, not prospect, so research is shared across campaigns and modes; TTL 14 days
briefs         id, prospect_id, fit_score, profile, criteria jsonb, mutual_benefit jsonb, missing_information jsonb,
               recommended_roles text[], hook jsonb, ideas jsonb, subject, evidence_count, model_used,
               validation_log jsonb, created_at
contacts       id, prospect_id, name, first_name, last_name, title, email, email_status, confidence,
               source (hunter|published|finder), source_url, linkedin_url, is_primary
drafts         id, prospect_id, contact_id, subject, body, status (draft|selected|rejected), user_edited bool, updated_at
sends          id, draft_id, user_id, to_email, scheduled_at, sent_at, gmail_message_id, error, status
exclusions     id, user_id, value, source (import|sent|optout), created_at   -- unique (user_id, value)
suppressions   id, user_id, email, reason, created_at
```

### 5.5 Routes and exact third-party calls

```
POST /api/setup/profile
  body: { deckBase64?, website? }
  website → fetch + Readability → text (≤ 20k chars)
  Claude: messages.create({
    model: "claude-haiku-5-5", max_tokens: 4096,
    system: [{ type: "text", text: PROFILE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: [
      ...(deck ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: deckBase64 } }] : []),
      ...(site ? [{ type: "document", source: { type: "text", media_type: "text/plain", data: siteText }, title: website }] : []),
      { type: "text", text: "Extract the organization profile." } ] }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: OrgProfileJsonSchema } }
  }) → parse → zod → return for editing

POST /api/campaigns
  body: { mode, goal_text, template_id, contact_count, advanced }
  Claude (Haiku, SEARCH_SPEC_SYSTEM with mode substituted) → SearchSpec → store

POST /api/campaigns/:id/discover
  Exa: POST https://api.exa.ai/search  headers { "x-api-key": EXA_API_KEY }
       { query: spec.target_description, category: "company", type: "auto", numResults: 25 }
  if spec.seed_examples: for each resolvable domain → POST https://api.exa.ai/findSimilar { url, numResults: 10, excludeSourceDomain: true }
  normalize to { name, domain, website, reason: result.title/highlights } ; dedupe by registrable domain ;
  drop domains in exclusions ; cap at contact_count + 5 ; store prospects (discovered)
  response includes { found, requested, reasons[] }

POST /api/campaigns/:id/research       (ReadableStream of NDJSON progress events; maxDuration = 300; p-limit 5)
  per prospect:
    EVIDENCE (skip if evidence for domain fetched < 14 days ago):
      candidates = [homepage, homepage+/about, +/about-us, +/company, +/careers, +/jobs, +/news, +/blog, +/press]
      fetch each with 8s timeout, UA "Mozilla/5.0 (compatible; EnvoyBot/0.1)", follow ≤ 3 redirects
      extract with Readability; keep pages with ≥ 400 chars of text; ≤ 4,000 chars each; max 8 pages
      if homepage fetch failed or < 3 pages: Exa POST /contents { urls: [homepage, ...], text: { maxCharacters: 4000 } }
      also: Exa POST /search { query: `"${name}" news`, numResults: 5, startPublishedDate: <12 months ago>, contents: { text: { maxCharacters: 3000 } } }
      assign ext_ids e1..eN ; store
    BRIEF + SLOTS: Haiku call per §3.4 with evidence as document blocks, enum-constrained ids, effort "high"
    VALIDATE per §3.2 (deterministic checks → verifier call → optional Sonnet escalation)
    CONTACTS per §3.5
    DRAFT: assemble template blocks + slots → subject/body ; store draft ; emit progress event

POST /api/drafts/:id            { subject?, body?, status? }   sets user_edited
POST /api/drafts/:id/regenerate  re-run only hook+ideas (Haiku, brief as input, smaller schema)

POST /api/campaigns/:id/queue
  for each draft with status = selected and contact.email_status != published_generic (unless overridden):
    reject if to_email ∈ suppressions or ∈ exclusions
    scheduled_at = max(now, last_scheduled) + random(60..180 s), moved into 08:00–18:00 recipient-local (fallback: sender-local)
    enforce users.daily_cap across sends where date(scheduled_at) = that day; spill to next day
  insert sends (status = scheduled)

GET /api/send/tick    (vercel.json cron "* * * * *"; require header Authorization: Bearer CRON_SECRET)
  for each user with a due send (scheduled_at <= now, status = scheduled), oldest first, ONE per user per tick:
    decrypt refresh token → exchange for access token (POST https://oauth2.googleapis.com/token)
    build RFC 2822: From, To, Subject, Date, Message-ID, MIME-Version; multipart/mixed with text/plain (UTF-8, quoted-printable)
      body = draft.body + "\n\n" + footer ; optional application/pdf part (base64) when template.attach_deck
    POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send { raw: base64url(mime) }
    on 200: sent_at, gmail_message_id ; append to_email and its domain to exclusions (source = sent)
    on 4xx/5xx: store error ; if message matches /5\.7\.|limit|quota/i → set campaign.status = paused
```

### 5.6 Claude API notes (current as of Oct 2026; follow these, do not guess)

- Model IDs: `claude-haiku-5-5`, `claude-sonnet-5-5`. Never append date suffixes.
- Haiku 5.5 pricing: $0.10 in / $0.50 out per million tokens for prompts ≤ 100K tokens; cache read $0.01; batch 50% off. Thinking is on by default; omit the `thinking` parameter (or `{ type: "adaptive" }`). Do not send `temperature`/`top_p`/`top_k` (non-default values return 400). `output_config.effort` defaults to `medium`; use `high` for the brief.
- Structured output: `output_config: { format: { type: "json_schema", schema } }` on `messages.create`. Parse with `JSON.parse` then zod. **VERIFY** the exact TypeScript type name for `output_config` in the installed `@anthropic-ai/sdk` version (look in `node_modules/@anthropic-ai/sdk/resources/messages.d.ts`); do not use the deprecated `output_format`.
- No assistant prefill. No forced `tool_choice`. Structured outputs replace both.
- PDF input: `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }`; no beta header. ~1,500–3,000 tokens per page; a 20-page deck is ~40k tokens, ≈ $0.005 on Haiku.
- Prompt caching: system prompt + schema first with `cache_control: { type: "ephemeral" }`; per-prospect content after. Confirm `usage.cache_read_input_tokens > 0` on the second call of a campaign. Minimum cacheable prefix is model-dependent (512–4,096 tokens); keep the brief system prompt ≥ 1,500 tokens by including the schema description in it.
- Check `stop_reason` before reading `content`. Haiku has no server-side refusal fallback; on `refusal`, retry once on Sonnet 5.5.
- Batch API (`client.messages.batches.create`) halves cost; use it for the "Re-run campaign" path where latency doesn't matter, not for the interactive first run.
- Errors: catch `RateLimitError` → retry with backoff; `APIStatusError` 400 → log the schema and inputs; don't string-match messages.

### 5.7 Sending rules (hard-coded)

Human selects every email; nothing sends without a click. Defaults: 30/day, 10/hour, 60–180 s random spacing, business hours, 1 recipient per message, plain text, 0–1 links, footer appended server-side. No tracking pixels, no link rewriting. Generic aliases not sendable by default. Auto-pause campaign on any Gmail 5.7.x/limit/quota error or if bounce-like errors exceed 3% of a campaign. Warn before sending to `.de` recipients (consent required under German law). Append every sent address to exclusions.

### 5.8 Terms-of-service constraints that shaped the build

- Hunter: fine to use inside a product; you may not build a competing email-finding service or share accounts.
- Exa: standard API terms; no restriction on displaying results.
- Do not scrape LinkedIn (contract liability; Proxycurl was shut down in 2025). Link to LinkedIn URLs that Hunter returns.
- Do not use any transactional email provider for outreach.
- Apollo and LeadMagic forbid serving their data to end users without a reseller agreement; that is why they are not in the stack.

### 5.9 Suggested file layout

```
src/app/(auth)/…                      sign-in
src/app/setup/page.tsx                profile form, deck upload, exclusions
src/app/campaigns/new/page.tsx
src/app/campaigns/[id]/targets/page.tsx
src/app/campaigns/[id]/review/page.tsx
src/app/campaigns/[id]/send/page.tsx
src/app/history/page.tsx
src/app/api/{setup,campaigns,drafts,send}/…/route.ts
src/lib/llm/{client.ts, schemas.ts, prompts.ts, validate.ts}
src/lib/providers/{exa.ts, hunter.ts, fetchPage.ts, gmail.ts}
src/lib/pipeline/{discover.ts, research.ts, contacts.ts, draft.ts, queue.ts}
src/lib/template/{presets.ts, render.ts}
src/db/{schema.ts, index.ts}
vercel.json                            { "crons": [{ "path": "/api/send/tick", "schedule": "* * * * *" }] }
```

---

## 6. Build Order (one session) and Acceptance Checks

Build in this order. Stop adding features once 1–9 pass.

1. **Scaffold + auth.** `npx create-next-app@latest envoy --ts --app --tailwind --src-dir`; add packages; Drizzle schema + push; Auth.js Google with the three scopes. ✔ Sign in, refresh token stored encrypted, `/api/auth/session` returns the email.
2. **Smoke-test the three vendors and Gmail with curl before writing pipeline code.** Exa search returns companies; Hunter domain-search on a known domain returns people and `accept_all`; Gmail `messages.send` from the signed-in test user delivers to a teammate. ✔ All 200. Note Hunter's credit cost per call.
3. **Profile extraction.** `/api/setup/profile` with the reference deck. ✔ `proof_points` includes "180+ projects for 150+ organizations"; `service_catalog` includes market sizing, competitive landscaping, regulatory research, supply-chain analysis, data collection; `team_structure` mentions seven students and an MBA mentor.
4. **Search spec.** ✔ Goal "find 3 fall consulting projects with Bay Area clean-energy hardware companies that are scaling manufacturing" yields 3–6 checkable criteria, a role list with 2–3 pre-checked, and a sensible `target_description`.
5. **Discovery.** ✔ 15–25 real companies with websites; no duplicate domains; excluded domains absent; shortfall reasons shown when short.
6. **Evidence + brief + validation.** ✔ On `lightshiprv.com`: ≥ 3 evidence pages stored with URLs; every criterion/benefit cites existing IDs; `hook.quotes` are real substrings; clicking an evidence link opens the page the claim came from; an artificially broken ID gets relabelled, visible in `validation_log`.
7. **Contacts.** ✔ Cards show Verified / Risky / Unknown / Published / Not found with a source URL; a company with no named contact shows the role + contact-page URL and is not sendable by default.
8. **Draft.** ✔ Rendering the Client preset with the extracted BEACN profile and the Lightship brief produces an email structurally identical to the reference, with a hook and three ideas comparable in specificity; no hook fact lacks an evidence ID.
9. **Queue → cron → Gmail.** ✔ One real email arrives in a team-controlled inbox with the footer and the PDF attached; `gmail_message_id` stored; recipient added to exclusions; a second queued email is spaced 60–180 s later.
10. **History + re-run.** ✔ Re-running skips previously contacted domains.
11. **If time remains, in order:** streaming progress UI polish; regenerate button; model comparison (Groq `openai/gpt-oss-120b` behind the same interface) on the same 10 companies with a side-by-side table of validation failures; paste-your-own-template parsing; logo in signature.

**Cut lines**, drop first → last: paste-your-own-template; model comparison; attachment (link instead); Partnership preset (demo Client mode only); Advanced panel.

**Demo flow (6 min).** Setup already done; show the extracted profile for 5 seconds. Type a goal in Client mode → roles + targets appear live. Open a pre-researched card: criteria chips, two evidence links opened live, one missing-information item, one verified contact and one "not found → contact page" example. Open the draft: point out only the hook and ideas are generated, each tied to a link. Edit a line, select, **Send selected**, show queue spacing and footer, send one for real to a test inbox. Flip the mode toggle to Partnership and show the preset and roles change. One slide: send-only scope, human selection, 30/day cap, suppression, no tracking, no ESP.

---

## 7. Costs Now and at Scale

### 7.1 Per-prospect cost with this stack

Assumptions: brief call ~13.5k tokens in (8 evidence docs) / 1.5k out; verifier ~2k/0.3k; search spec amortized over 20; profile once per user.

| Scale | LLM (Haiku, cached; ~10% Sonnet escalation) | Discovery (Exa) | Evidence (fetch; Exa contents on ~10% failures) | Contacts (Hunter) | Total / contact | Total / month |
|---|---|---|---|---|---|---|
| MVP demo (≤ 500 contacts) | ≈ $1 | free credit | free + free credit | 50 free credits (one named contact ≈ 1–2 credits) | ≈ $0 | ≈ $0 |
| 1,000 users × 100 contacts | $0.003 | $0.0007 | $0.0002 | $0.0084 (Hunter Scale, $209 / 25k credits) | **≈ $0.012** | **≈ $1,200** |
| 10,000 users × 100 contacts | $0.003 | $0.0007 | $0.0002 | $0.006–0.008 (Hunter enterprise / volume) | **≈ $0.010** | **≈ $10,000** |

Hunter is ~70% of cost at scale and covers ~55–60% of domains with a named contact. Revenue at $49/month for 150 contacts is $0.33 per contact, so gross margin stays above 95% at either scale even before the waterfall below.

### 7.2 Scaling phase (not for tonight; add when there are paying users)

Replace the single Hunter stage with a cheapest-first waterfall; each stage is a pluggable function in `src/lib/pipeline/contacts.ts`.

| Stage | Method | Cost / contact | Notes |
|---|---|---|---|
| 1 | Hunter Domain Search `pattern` + `accept_all` (as today) | ~$0.001–0.002 / company | Pattern known for ~55–60% of domains |
| 2 | Name lookup via SERP API: `site:linkedin.com/in "{title}" "{company}"` (Serper $1 / 1k queries, $0.30 at volume); parse "Name - Title - Company" from result titles | $0.001–0.002 | Touches Google, not LinkedIn; Google v. SerpApi litigation unresolved, so keep Hunter as fallback |
| 3 | Permute 3–6 candidates from the pattern → bulk SMTP verify (MillionVerifier $0.45–1.49 / 1k, or TrueList Unlimited $799–999 / month flat) | $0.002–0.006 | 20–40% of B2B domains are catch-all → "Risky"; M365 returns `550 5.4.1` for unknown users; port 25 is blocked on Vercel/GCP, so verification runs through a vendor or a Hetzner box (port 25 unblock after first paid month). Reacher is AGPL (commercial license for SaaS). |
| 4 | Paid finder only on misses: Anymail Finder ($0.008 at 100k, $0.005 at 1M, charged only on success) or Enrow | $0.005–0.008 × ~40% | Lifts coverage to ~80–85% |

Expected COGS: **$0.010–0.015 / contact at 1,000 users, $0.005–0.007 at 10,000 users** including LLM, versus $0.02–0.05 vendor-only. Tradeoff: ~15–20% of contacts unresolved, surfaced honestly as role + published contact.

**Other scaling levers:** Batch API for re-runs (LLM −50%); evidence cache by domain (already in schema) so popular companies are researched once; BYO-key tier (Clay, Instantly, lemlist, Smartlead precedent) charging a flat platform fee per prospect for users who bring Anthropic/Hunter keys; Vercel AI Gateway if a second model provider is ever added (0% markup, per-key budgets). LeadMagic forbids serving results to end users; Apollo requires a reseller agreement; neither goes in the waterfall.

### 7.3 Business model (unchanged)

Subscription with capped researched-contact credits ($49/month ≈ 150 contacts, 1 mailbox); campaign packs for occasional users ($15 / 50); free tier with bring-your-own keys. Validation metrics instrumented from day one: campaign completion time, criteria judged correct, draft edit size, cost per usable contact, willingness to pay.

---

## 8. Risks to test before anything else

| Risk | Test | Fallback |
|---|---|---|
| The sending account's Google Workspace admin blocks unverified third-party apps | Sign in with the real sending account in step 1 | Personal Gmail or a company Gmail not under a restrictive admin |
| Testing-mode token expired (7 days) | Re-consent the demo account on demo day | 5 seconds; show it |
| Hunter free credits run out mid-build | Check the dashboard counter; cache every response by domain | Second free account on a different work email for dev; published-contact fallback already in the pipeline |
| Haiku brief fails validation often (> 20%) | Count escalations in `validation_log` on the first 10 companies | Default the brief call to Sonnet 5.5 (≈ $0.02 / prospect); everything else stays on Haiku |
| Company site blocks plain fetch or is JS-only | Evidence count < 3 after fetch | Exa `/contents` fallback already specified |
| Catch-all domains make emails unverifiable | Hunter `accept_all = true` | "Risky" badge; sendable with warning |
| Deck extraction gets a proof point wrong | Profile review screen | Locked blocks are user-edited text, never regenerated |
