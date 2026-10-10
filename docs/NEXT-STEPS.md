# Envoy — Next Steps

Status as of 2026-10-10: the MVP is built, pushed to `antangled/Envoy`, and verified end to end in demo mode and against mocked Anthropic, Exa, and Hunter APIs. What's left is real credentials, a real-key test run, deployment, and the pitch material. Items are in the order to do them.

---

## 1. Get the API keys (about 30 minutes)

Put every value in `envoy/.env.local` (copy `envoy/.env.example`). Restart `npm run dev` after editing. The Setup page's Connections panel turns each line from **Demo** to **Live**.

| Key | Where | Cost for the demo | What it unlocks |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys. Add a small prepaid credit under Billing. | About $0.002–0.003 per company researched; a few dollars covers thousands | AI briefs, criteria from your goal, deck reading, "Rewrite opening and ideas" |
| `EXA_API_KEY` | dashboard.exa.ai → API Keys. No card needed. | $10/month free credit plus a signup bonus. Each campaign makes two Agent runs at `low` effort (one for the company list, one for people at all selected companies) plus one news search per company; check the per-run price in the Exa dashboard after the first campaign | Companies matching the goal, named people in your target roles with their source pages, recent-news evidence |
| `HUNTER_API_KEY` | hunter.io → sign up with a work or .edu email → API | 50 free credits/month. Expect about 1 credit per company; check the dashboard after the first run | Named people by title, email confidence, catch-all detection |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Google Cloud Console (steps below) | Free | "Continue with Google" and real sending from Gmail |

### Google OAuth client, step by step

1. console.cloud.google.com → create a project named "Envoy".
2. APIs & Services → Library → enable **Gmail API**.
3. Google Auth Platform (OAuth consent screen):
   - Audience: **External**, publishing status **Testing**.
   - Add every teammate's and judge's Gmail as a **test user** (up to 100).
   - Data access: add exactly three scopes: `openid`, `email`, `https://www.googleapis.com/auth/gmail.send`. Adding any other Gmail scope triggers Google's annual security audit.
4. Clients → Create client → **Web application**. Authorized redirect URI: `http://localhost:3000/api/auth/google/callback`. Add the deployed URL's equivalent later (step 3 below).
5. Copy the client ID and secret into `.env.local`. Also set `APP_URL=http://localhost:3000`.

Testing-mode sign-ins expire after 7 days. Sign in again the morning of the demo.

---

## 2. First live run (about 30 minutes)

- [ ] **Sign in with the account you'll send from.** If it's a berkeley.edu address, the university's Google Workspace may block unverified apps from Gmail access. If the sign-in is refused, use a personal Gmail or a club Gmail for the demo.
- [ ] **Setup:** upload the real outreach deck, click **Read deck and website**, correct anything wrong, add the postal address, save.
- [ ] **Run one real campaign of 10 companies** in client mode, for example the Lightship-style goal.
- [ ] **Check quality on every card:**
  - Every source link opens the page the claim came from.
  - The opening and three ideas are as specific as the real Lightship email.
  - Open "How this brief was checked" and count how many briefs say "escalated". If more than 2 of 10 escalate, switch the brief to Sonnet by default in `envoy/src/lib/pipeline/research.ts` (about $0.02 per company instead of $0.002).
- [ ] **Check Hunter credits used** in the Hunter dashboard against the 50 a month. Every lookup is cached for 30 days, so re-runs are free.
- [ ] **Send one real email** to a teammate's inbox. Confirm the footer, the attached deck, and that it arrives in the inbox rather than spam.
- [ ] **Re-run the automated check** with the app running:

```bash
node envoy/scripts/smoke.mjs
```

---

## 3. Deploy to Vercel (about 45 minutes)

- [ ] Import `antangled/Envoy` into Vercel with **root directory `envoy`**.
- [ ] Add a Postgres database from the Vercel Marketplace (Neon or Supabase). It sets `DATABASE_URL`. Tables are created automatically on first request.
- [ ] Set environment variables. **The app returns errors in production until the first three are set.**

| Variable | Value |
|---|---|
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `TOKEN_ENCRYPTION_KEY` | output of `openssl rand -base64 32` |
| `CRON_SECRET` | output of `openssl rand -hex 16` |
| `APP_URL` | the deployed URL, e.g. `https://envoy-xyz.vercel.app` |
| the four keys from step 1 | same values |

- [ ] Add `https://<deployed-url>/api/auth/google/callback` as a second redirect URI in the Google OAuth client.
- [ ] **Sending cadence:** `vercel.json` runs the send queue every minute, but the Hobby plan only runs crons once a day. Sending still works while the Send page is open, which is enough for a demo. For unattended sending, use the Pro plan or an external pinger hitting `/api/send/tick` with header `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Fix before sharing the deployed link publicly

- [ ] **Lock down demo mode in production.** Today, "Try the demo" signs anyone into one shared account, and that account uses your real API keys once they're set. Anyone with the link could spend your Anthropic, Exa, and Hunter credit or see each other's campaigns. Either hide the demo button when keys are configured, or limit each demo session to one small campaign.
- [ ] **Set a spending cap** in the Anthropic console, and keep Exa and Hunter on their free tiers until there are paying users.
- [ ] **Decide the repo's visibility.** `antangled/Envoy` is public and includes the real Lightship email text and the recipient's first name. Make it private in GitHub settings if you'd rather not publish that.

---

## 5. Known gaps (post-demo, in priority order)

| Gap | Why it matters | Effort |
|---|---|---|
| Validation metrics aren't instrumented yet (time per step, thumbs up/down per criterion, how much each draft was edited) | The plan's commercial story relies on these numbers | Half a day |
| Deck PDF is stored in the database | Fine for a demo; move it to Vercel Blob before real users upload decks | 1–2 hours |
| Business hours use your time zone, not the recipient's | Emails to other coasts may land early or late | 1–2 hours |
| "Paste your own template" isn't built; templates are the two presets plus per-draft edits | Users with a different email style must edit each draft | Half a day |
| Groq model comparison (plan item 11) isn't built | Only matters if Haiku's escalation rate turns out high | 2 hours |
| Team-page name extraction is the one live path the mock didn't exercise | Could fail silently on some company sites; failures fall back to published addresses | Test on 5 real sites |
| Reply tracking is manual ("Mark replied") | Reading the inbox needs Google's restricted scope and a yearly security audit | Defer |
| Google app verification | Required beyond 100 users; `gmail.send` only needs the standard review (2–3 business days plus a demo video), no audit | When there are users |
| Cheaper contact waterfall (search-engine name lookup, email permutation, bulk verification) | Cuts contact cost at scale; see `docs/MVP-PLAN.md` section 7.2 | 2–3 days, after traction |

---

## 6. Hackathon deliverables (not code)

These cover 55% of the rubric: problem and insight, commercial potential, and team and pitch.

- [ ] **Founder story:** the BEACN → Lightship outreach. How many hours the last client search took, how many tools, how many emails, how many replies.
- [ ] **3–5 user interviews** with consultants, agency owners, or club BD leads. Capture hours per client found, bounce rate, and one quote each. Questions are in the research docs.
- [ ] **Two named testers** willing to try Envoy next week.
- [ ] **Pitch deck** following the 6-minute demo flow in `docs/MVP-PLAN.md` section 6.
- [ ] **Pre-run one full campaign** before presenting, so judges see finished briefs instead of a loading screen. Run only the target-finding step live.
- [ ] **Share the team brief** (claude.ai artifact) with teammates from its Share menu; they can't open it until you do.

---

## Cost summary

| Scale | Model | Discovery | Contacts | Total |
|---|---|---|---|---|
| Demo (under 500 companies) | a few dollars | free credit | free credits | about $5 |
| 1,000 users × 100 contacts/month | about $300 | about $70 | about $840 (Hunter paid plan) | about $1,200/month, roughly $0.012 per contact |
| 10,000 users × 100 contacts/month | about $3,000 | about $700 | about $6,000–8,000 | about $10,000/month, roughly $0.010 per contact |

At $49 a month for 150 contacts, revenue is about $0.33 per contact.
