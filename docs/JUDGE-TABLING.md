# Judge tabling playbook

Sunday, Oct 11, preliminary rounds 1:30 to 2:30. About 5 minutes per judge. This is what to set up, what to say, and, most importantly, what to hand the judge to do themselves.

**The one idea to land:** outreach that takes an evening per company now takes a minute, and every sentence Envoy writes has a source the judge can click.

**The engagement rule:** the judge drives. Every minute or so, hand them something to do: name a target, click a source, add a line, press Send. People believe what they clicked themselves.

## Roles

- **Adam (talker):** tells the founder story, asks the questions, and keeps time.
- **Jiwoo (driver):** sits at the laptop, starts the live run, and slides the trackpad to the judge at each "Judge does" step.
- Swap roles between judges if one of you gets tired. Both of you should know every step.

## Before 1:30

1. **Laptop:** charged, plugged in if there's an outlet, notifications off, browser zoomed to 110%, dark mode or light mode per the room lighting (the theme toggle is in the top bar).
2. **Internet:** phone hotspot ready as a backup to venue Wi-Fi.
3. **Three browser tabs, in this order:**
   - **Tab 1, landing page:** https://envoy-one-brown.vercel.app, scrolled to the top so the research panel animates when a judge walks up.
   - **Tab 2, a finished real campaign:** signed in with Google, a 5-company campaign already researched before judging starts. Pick the brief with the clearest sources and a useful "Still unknown" item, and know which number to click.
   - **Tab 3, a new campaign page:** open and ready for the judge's goal, set to **3 organizations** so it finishes in about a minute.
4. **Fallback tab:** the scripted demo ("Try the demo") in a private window. It uses no credits and can't fail on an API. Use it if Wi-Fi or a live run misbehaves.
5. **Phone:** Gmail open on the account Envoy sends from, with a test email from Envoy already in the inbox to show the signature and logo.
6. **Credit budget:** Hunter has 26 lookups left this month. A 3-company live run uses about 3 to 5. That's roughly 5 live runs; after that, run judges' goals on the demo instead.

## The 5-minute visit

Times are cumulative. Lines in quotes are suggestions; say them in your own words.

### 0:00 to 0:25, hook and problem

**Adam asks first, before any pitch:**
> "Quick question: have you ever had to cold-email someone to win a client or a partner?"

Whatever they say, connect it:
> "Then you know the drill. I run outreach for BEACN, a student consulting club at Berkeley. For every company we pitch, I'd spend [Adam: real time] on LinkedIn, the company's site, an email finder, a spreadsheet, and a mail merge. We send [Adam: real number] of these a semester."

Optionally show the real Lightship email you sent (on your phone) as the proof this is your problem.

### 0:25 to 0:35, the solution in one sentence

> "Envoy turns one sentence about who you want to work with into researched organizations, the right people, and a draft email where every claim links to its source. It sends from your own Gmail, and only after you approve."

### 0:35 to 0:55, the judge starts their own run

**Driver:** switch to Tab 3, slide the laptop over.

> "Let's do one for you. What kind of company would *you* want to reach? Industry, city, anything."

**Judge does:** types their goal, clicks **Find organizations**.

While it runs:
> "That's searching the web live for companies that fit. We'll come back to yours in a couple of minutes. Meanwhile, here's one we ran this morning."

Then click **Research** on their list as soon as it appears, and move on to Tab 2.

### 0:55 to 2:40, the finished campaign (the core)

**Driver:** Tab 2, open the best brief.

1. **Fit and sources.**
   > "For each company, Envoy reads their site and recent news and checks it against your criteria. Every claim has a number."

   **Judge does:** clicks a source number. The real page opens.
   > "That's the exact page the claim came from. We don't ask you to trust the AI; we hand you the receipt."

2. **Honesty.** Point at an "Inferred" badge and the "Still unknown" list.
   > "It also tells you what it couldn't verify, instead of making it up."

3. **People.** Scroll to "Who to write to".
   > "About ten people per company, several per role. We only pay to look up an email when you actually want that person."

   **Judge does:** clicks **Select all with email**, or **Find email** on one person.

4. **The draft.**
   > "This is my real email template. Envoy only writes the two highlighted parts: the opening detail and three ideas. Everything else is my own words."

   **Judge does:** clicks into the draft and adds one sentence of their own, then **Save changes**.

5. **Send.**
   > "Each person gets their own copy, greeted by name, from my Gmail, a few minutes apart, capped per day."

   **Judge does:** press **Send** only on a campaign whose recipients are safe to email, or in the demo tab. Then show the phone: an email from Envoy in a real Gmail inbox.

### 2:40 to 3:20, back to the judge's run

**Driver:** switch to Tab 3.

> "And here's yours."

Open one of their companies and read the opening sentence out loud.
**Judge does:** clicks one source on *their* brief.

If it's still running, show the progress and say:
> "Three companies, researched from scratch, in about a minute. The ones still loading are reading the company's site right now."

If anything fails, switch to the demo tab without comment and keep going.

### 3:20 to 3:45, how it works

Keep it to three sentences; offer more only if they lean in.

> "An agent searches the web for organizations and people. Claude writes a brief from the pages it read, and then our code checks every citation against those pages and has a second pass fact-check each claim; anything it can't back up is downgraded or listed as unknown. Email lookups only run for people you pick, so a company costs about five cents."

Point at the spend line at the top of the campaign:
> "That's what this campaign actually cost."

### 3:45 to 4:05, impact and what's next

> "We built this for people who live on outreach and do it by hand: student consulting clubs first, then small agencies and founders. Apollo and Clay give you lists; they don't give you a reason to write that you can verify. Next we're [Adam: confirm the plan, e.g. putting it in front of other Berkeley clubs this semester] and adding a second email finder for the people Hunter misses."

Close with a question, not a statement:
> "Who would you send this to first?"

### 4:05 to 5:00, questions

Let them ask. Answers below.

## Likely questions

**"How do you stop it from making things up?"**
Every claim must cite one of the pages Envoy read, and our code checks each citation exists and each quote appears word for word on its page. A second pass checks whether the cited passage actually supports the claim; if not, it's marked inferred or unknown. If a brief fails those checks, a stronger model rewrites it. Show "How this brief was checked" on any brief.

**"Isn't this just a spam machine?"**
The opposite by design: a human approves every email, it sends from your own Gmail one at a time with a daily cap (30 by default), no tracking pixels, an opt-out line in every footer, and anyone already contacted is skipped. It's built for 10 good emails, not 10,000.

**"What does it cost to run?"**
Measured on a real campaign: about $0.005 of Claude, $0.018 of Exa search, and one Hunter lookup per company, about five cents total. A club could pay $15 to $49 a month and we'd keep over 90% margin.

**"How is this different from Apollo, Clay, or Instantly?"**
They're databases and sequencers for sales teams. Envoy starts from a goal, explains why each organization fits with sources, and writes in your own voice. It's a research assistant that sends, not a list you blast.

**"Where does the data come from? Is it legal?"**
Company research is from public web pages via Exa; people and emails come from Hunter, which compiles publicly listed professional addresses. We only request permission to *send* Gmail, never to read it.

**"What did you learn from using it yourselves?"**
Three things changed the product: we email about ten people per company, not one; every draft needs a human edit, so drafts are editable; and the setup had to make your own details obvious, so they're highlighted as they fill in.

**"What's hardest technically?"**
Keeping the writing grounded. Structured output with evidence IDs the model can only pick from, deterministic citation checks, a verifier pass, and escalation only when checks fail, so quality stays high while cost stays at cents.

## If something breaks

- **Live run is slow:** keep talking through Tab 2; come back to the judge's run at the end, or skip it.
- **Live run errors or Wi-Fi drops:** switch to the demo window: "Here's the same flow on our sample data."
- **Judge wants a goal outside the sample companies in the demo:** be upfront: "The demo uses six sample companies; the live version searches the whole web, and here's one we ran this morning."
- **Out of Hunter lookups:** run judges' goals on the demo for the rest of the round.

## After each judge

- Close their campaign tab and open a fresh **New campaign** page in Tab 3.
- Note what they asked in one line on your phone. If a question comes up twice, add the answer to your opening.
