# Envoy

Goal → organizations → sourced brief → right contact → your email, reviewed → sent from your Gmail.
Build spec: [`../docs/MVP-PLAN.md`](../docs/MVP-PLAN.md).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click **Try the demo**. In Setup, click **Use the BEACN sample**, add a postal address, and save.

With no keys, Envoy runs in **demo mode**: company pages and published addresses are fetched for real, briefs are assembled by rules from those pages, companies come from a built-in list (plus any you add by website), and sends go to a demo outbox. Each live integration switches on as soon as its key is present. Copy `.env.example` to `.env.local` and fill in:

| Key | Turns on | Free tier |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI briefs, criteria, deck reading (Haiku 5.5; Sonnet 5.5 re-checks failures) | — (~$0.002 per company) |
| `EXA_API_KEY` | Finds companies matching the goal and the people in your target roles (two Exa Agent runs per campaign at `low` effort), plus recent news per company | $10/month credit |
| `HUNTER_API_KEY` | Named people by title, email confidence, catch-all checks | 50 credits/month |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Sign in with Google and send from Gmail (`gmail.send` only) | free |

Google Cloud: enable the Gmail API, OAuth consent screen **External / Testing**, add test users, scopes `openid`, `email`, `https://www.googleapis.com/auth/gmail.send`, redirect URI `http://localhost:3000/api/auth/google/callback`. Testing-mode tokens expire after 7 days; sign in again before a demo.

## Verify

```bash
node scripts/smoke.mjs            # end-to-end API check against the running app
node scripts/mock-apis.mjs        # local stand-ins for Anthropic, Exa, Hunter (port 4010)
```

To exercise the live-key code paths without keys, run the mock and start the app with
`ANTHROPIC_API_KEY=x ENVOY_ANTHROPIC_BASE_URL=http://localhost:4010 EXA_API_KEY=x EXA_BASE_URL=http://localhost:4010 HUNTER_API_KEY=x HUNTER_BASE_URL=http://localhost:4010 ENVOY_DATA_DIR=.data/mocktest`, then run the smoke test against it.

## Deploy (Vercel)

Set `DATABASE_URL` (Neon or Supabase), `AUTH_SECRET`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`, and the keys above. `vercel.json` schedules `/api/send/tick` every minute; on the Hobby plan crons run daily at most, so sending also proceeds while the Send page is open.

## Layout

- `src/lib/pipeline/` discovery, evidence, research (brief → validation → verifier → escalation), contacts, draft, send queue
- `src/lib/llm/` schemas (evidence ids enum-constrained per request), prompts, client, validation, keyless fallback
- `src/lib/template/render.ts` locked blocks + generated slots, shared by server and UI
- `src/components/campaign/` targets, review (dossier + letter with footnoted sources), send
