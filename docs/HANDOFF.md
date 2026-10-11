# Envoy — Handoff for Jiwoo

Everything you need to run Envoy on your laptop, test it, and change it. Read top to bottom once; after that, sections 3 and 6 are the ones you'll come back to.

Recording the demo video? See [DEMO-VIDEO.md](DEMO-VIDEO.md) for the shot list, script and proof checklist.

---

## 1. What Envoy does, in one paragraph

You describe who you want to reach ("three fall consulting projects with Bay Area clean-energy hardware companies"). Envoy finds matching companies, reads their websites and recent news, writes a short brief on each with clickable sources, finds the right person and their email, and drafts an email using **your own template**. Only two short parts of each email are written per company: the opening ("I saw …") and three tailored ideas. You review every draft, pick which to send, and Envoy sends them from your Gmail, a minute or two apart.

## 2. How it works (the pipeline)

```
1. Goal          You type a goal         → Claude turns it into fit criteria + job titles to target
2. Companies     Exa Agent run           → a list of matching companies, each with a reason and source link
3. Evidence      Envoy fetches each site → homepage, about, careers, news pages (+ Exa news search)
4. Brief         Claude Haiku            → fit, mutual benefit, unknowns, opening + 3 ideas, every claim tied to a source
                 Code checks             → citations must exist, quotes must appear word for word; failures re-run on Sonnet
5. People        Exa Agent run + Hunter  → named people in the target roles, plus their email and how sure we are
6. Draft         Template engine         → your fixed paragraphs + the generated opening and ideas
7. Send          Gmail API               → from the signed-in user's Gmail, send-only permission, spaced and capped
```

Each user signs in with Google; nobody but the operator needs API keys. The keys (Claude, Exa, Hunter) live only on the server.

**Demo mode:** if a key is missing, that step falls back to a labelled demo version (a built-in company list, rule-based drafts, a fake outbox). The app always runs, even with zero keys.

## 3. Run it on your laptop

**You need:** Node.js 20 or newer (`node -v` to check) and git.

```bash
git clone https://github.com/antangled/Envoy.git
```

```bash
cd Envoy/envoy && npm install
```

**Add the keys.** Copy the example file, then fill it in:

```bash
cp .env.example .env.local
```

Open `envoy/.env.local` and paste values for:

| Line | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | Adam shares it with you privately, or make your own at console.anthropic.com → API Keys (new keys take about a minute to start working) |
| `EXA_API_KEY` | Adam shares it, or your own free key at dashboard.exa.ai |
| `HUNTER_API_KEY` | Adam shares it, or your own free key at hunter.io → API (50 free lookups a month) |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Adam shares these. Both your emails are already on the app's tester list, so you can use the same pair |
| `APP_URL` | Leave as `http://localhost:3000` |

Keys are shared through a password manager or a private message, **never** in git, Slack channels, or the repo. `.env.local` is already ignored by git. Any line still showing `PASTE_..._HERE` is ignored and that feature stays in demo mode.

**Start it:**

```bash
npm run dev
```

Open http://localhost:3000. After you change `.env.local`, stop the server (Ctrl+C) and run `npm run dev` again; code changes reload on their own.

The database is created automatically in `envoy/.data/` on first run (an embedded Postgres, nothing to install). To start completely fresh, stop the server and delete that folder.

## 4. Test it

**Quick click-through (5 minutes):**

1. Click **Continue with Google** and sign in with one of your tester emails. Google will warn the app is unverified: click **Continue** and leave the Gmail box checked.
2. **Setup** → check all four connections say **Live** → click **Send me a test email**; it should land in your own inbox.
3. Still in Setup: click **Use the BEACN sample** (or upload a deck and click **Read deck and website**), add a postal address, **Save setup**.
4. **Campaigns → New campaign** → **Use this example** → set organizations to 3 → **Find organizations** (takes up to a minute).
5. Check the list → **Research 3 organizations** → open each brief, click a few source numbers, read the draft.
6. **Don't send campaign emails to real companies while testing.** To check real sending, use the **Send me a test email** button in Setup. To try the send step itself, use **Try the demo**, which records sends without delivering them.

**Automated check (run while the app is running):**

```bash
node scripts/smoke.mjs
```

It signs into a separate demo account, runs a 3-company campaign, and checks citations, the template, queueing, and sending. "All checks passed" is the goal. Note: with real keys set, it spends a few cents of Claude and Exa credit and a few Hunter lookups.

**Without spending credits:** run `node scripts/mock-apis.mjs` in one terminal, then start the app pointed at it (the command is in `envoy/README.md` under "Verify").

**The no-login demo:** **Try the demo** on the sign-in page skips Google entirely and uses a demo outbox. Good for UI work.

## 5. Where things live

```
envoy/
  .env.local                     your keys (never committed)
  src/app/                       pages and API routes (Next.js App Router)
    page.tsx                     sign-in page
    setup/page.tsx               Setup: connections, profile, footer, exclusions, test email
    campaigns/new/page.tsx       New campaign form
    campaigns/[id]/page.tsx      Campaign workspace (3 steps)
    history/page.tsx             Sent list
    api/…                        server endpoints the pages call
  src/components/
    campaign/TargetsStep.tsx     step 1: choose companies, roles, criteria
    campaign/ReviewStep.tsx      step 2: brief + contact + draft per company
    campaign/Letter.tsx          the email shown as a letter with source numbers
    campaign/SendStep.tsx        step 3: queue and outbox
    ui.tsx, shell.tsx            buttons, badges, header
  src/lib/
    pipeline/                    the steps in section 2 (discover, evidence, research, contacts, draft, send)
    llm/prompts.ts               every prompt sent to Claude
    llm/schemas.ts               the JSON shapes Claude must return
    llm/validate.ts              the citation and quote checks
    providers/                   Exa, Hunter, Gmail, web page fetching
    template/render.ts           the email template (fixed paragraphs + generated slots)
  src/app/globals.css            colors, fonts, letter styling (design tokens at the top)
  src/db/schema.ts               database tables
  scripts/smoke.mjs              end-to-end test
  scripts/mock-apis.mjs          fake Claude/Exa/Hunter for free testing
docs/
  MVP-PLAN.md                    full product spec and decisions
  NEXT-STEPS.md                  what's left to do
  research/                      market, cost, and compliance research
```

**Common edits and where to make them:**

| I want to change… | Edit |
|---|---|
| The wording of the email template | `src/lib/template/render.ts` |
| What Claude is told to write | `src/lib/llm/prompts.ts` |
| Colors or fonts | the `:root` block at the top of `src/app/globals.css` |
| A page's layout or copy | the matching file in `src/app/` or `src/components/campaign/` |
| How many emails a day, spacing | `src/lib/pipeline/send.ts` (defaults: 30/day, 10/hour, 1–3 minutes apart) |
| A database table | `src/db/schema.ts`, then run `npx drizzle-kit generate --name what_changed` and restart |

## 6. Making changes safely

1. **Get the latest and branch:**

```bash
git pull
```

```bash
git checkout -b jiwoo/short-description
```

2. Make your edit and check it in the browser at http://localhost:3000.
3. **Before committing, run the checks** (from `envoy/`):

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

Both should print nothing. Then run `node scripts/smoke.mjs` if you touched anything under `src/lib/`.

4. **Commit and push your branch, then open a pull request** on GitHub for Adam to merge:

```bash
git add -A && git commit -m "What you changed" && git push -u origin HEAD
```

You need collaborator access to push; Adam adds you under the repo's **Settings → Collaborators**.

## 7. Gotchas (each of these cost us time)

- **Restart after editing `.env.local`.** The server reads keys only at startup.
- **New Anthropic keys take about a minute to activate.** "invalid x-api-key" right after creating one usually just means wait.
- **Don't remove the `turbopack` rule in `next.config.ts`.** Without it, Tailwind silently stops and every page loses its styling.
- **This is Next.js 16.** Some APIs differ from tutorials (`params` and `cookies()` are async). The matching docs ship in `node_modules/next/dist/docs/`.
- **If you code with Claude Code:** its terminal sets `ANTHROPIC_BASE_URL`. Envoy deliberately ignores that and always talks to Anthropic directly, so leave that line in `src/lib/llm/client.ts` alone.
- **Only one server per database folder.** Two `npm run dev` processes on the same `.data/` folder will fight; stop one first.
- **Google sign-ins expire every 7 days** while the app is in Google's testing mode. If sending fails with a token error, sign out and back in.
- **berkeley.edu accounts may be blocked** from signing in by the university's Google settings. Use a personal Gmail if so.
- **Hunter's free plan is 50 lookups a month,** shared by everyone using the same key. Lookups are cached for 30 days, so re-running a campaign doesn't spend more.

## 8. Who to ask

Adam (repo owner) for keys, collaborator access, and merging. The full reasoning behind every product decision is in `docs/MVP-PLAN.md`.
