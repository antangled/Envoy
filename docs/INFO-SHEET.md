# Envoy — Team Info Sheet

*One page for everyone on the team. The build spec is [MVP-PLAN.md](MVP-PLAN.md).*

## What it is

Envoy turns a plain-English goal ("we want 3 projects this quarter with Bay Area clean-energy companies that are scaling manufacturing") into a short list of organizations worth approaching, a one-page evidence-backed brief on each, the right person to contact, and a ready-to-send email in your own voice, sent from your own Gmail after you review it.

Two modes, one flow: **client outreach** (a consultancy or agency pitching a prospective client) and **business partnerships** (a company proposing a collaboration). The mode changes the default criteria, the roles to target, and the "ask" paragraph. Nothing else.

## The problem

Winning a client or partner by email today means stitching four or five tools together by hand: Google and LinkedIn to find companies and people, Hunter or Apollo to guess emails, a spreadsheet to track it, a mail-merge extension to send, and ChatGPT to draft. Adam did exactly this for his consulting group's client search. It takes hours per batch, the research is shallow, and the emails read like templates.

Existing tools assume a sales operator: a defined ICP in sales vocabulary, warmed-up sending domains, a CRM, $49+ per seat per month, and volume in the thousands. A small consultancy or an early-stage founder sending 20 carefully argued emails has none of that. AI "SDR" products run the whole loop but cost $250–5,000 a month on contracts.

## What makes it different

- **Starts from a goal, not a filter.** No ICP, titles, or industry codes. The system proposes who to target; you confirm.
- **The brief is the product.** For every organization: fit against your criteria, each marked Supported / Not met / Unknown with a source link; what both sides gain, labelled evidenced or inferred; what we still don't know; who to contact. Nothing is stated without a source.
- **Your email, with two blanks filled.** Your real template stays locked (intro, credentials, timing, ask, signature). The model writes only the hook (observed facts about them) and three tailored ideas. About 60 words per recipient, each tied to evidence.
- **Sends from your own Gmail, with you approving every email.** Send-only permission, 30 a day by default, spaced out, with a compliant footer and opt-out list. No mass mail, no fake domains, no tracking pixels.
- **Fewer, not weaker.** If it can't find enough organizations that fit *and* have a reachable contact, it returns fewer and says why.

## How a user experiences it

**Setup, once (5 minutes):** connect Gmail → upload your deck or website (we extract proof points, services, team structure) → confirm name, role, signature, postal address → paste any emails you've already contacted.

**Each campaign (one text box, four clicks):**
1. Pick the mode, type the goal, choose a template preset, set how many contacts. Click **Find & draft**.
2. Confirm the proposed roles and the 15–25 candidate organizations.
3. Review one card per organization: profile, criteria, evidence links, contact, draft. Edit if you like. Toggle **Send**.
4. **Send selected.** Watch the outbox. Reuse the setup next time.

## How it works (for the builders)

```
goal ──▶ Claude Haiku: search spec + criteria + role checklist
     ──▶ Exa: find organizations (semantic search + lookalikes)
     ──▶ direct fetch + Readability: evidence pages (site, careers, news) with URLs; Exa contents on failure
     ──▶ Claude Haiku: brief + hook + ideas in one call, every claim tied to an evidence ID
     ──▶ code checks IDs and quotes; failed briefs re-run once on Sonnet
     ──▶ Hunter: named person by title + email status; published contact as fallback
     ──▶ assemble locked template + generated slots
     ──▶ user approves ──▶ queue ──▶ Gmail API (send-only scope), 60–180 s apart
```

Stack: Next.js on Vercel, Postgres, Claude Haiku 5.5 with structured outputs, Exa, Hunter, Gmail API. Three vendor keys. Every one has a free tier that covers the demo. Running cost is about 1 cent per researched contact at 1,000 users and under that at 10,000.

## Who buys, and how it makes money

Owners and BD leads at small consultancies and agencies; founders and partnership leads at early-stage companies. Subscription with capped researched-contact credits (about $49/month for 150), small campaign packs for occasional users, free tier with your own API keys.

## What it is not

Not a mass-mail tool, not an AI that sends on its own, not an inbox reader (that would need a Google security audit), not a CRM, not a LinkedIn scraper.

## Open questions

- Hunter's 50 free credits per month are the demo's tightest limit. Cache every lookup by domain.
- The sending account's Google Workspace admin may block unverified apps. Test the sign-in first; fallback is a personal or company Gmail.
- Who are our first two test users outside the team? Name them before the demo.
