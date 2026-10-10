# Cheap sourcing of companies, people, and emails for a cold-outreach product (Oct 2026)

Access limitations: reddit.com blocked for the crawler (vendor digests of r/coldemail used, flagged); indiehackers.com returned 403 (one IH data point via search summary, flagged). Everything else from fetched official pages or primary posts.

## 1. Email pattern guessing + SMTP verification

**How it works.** Hunter's Domain Search returns a `pattern` field (e.g. `{first}.{last}`), plus indexed emails with `confidence`, `sources`, and an `accept_all` flag, up to 100 per request; Email Finder returns `score`, `accept_all`, `sources`, `verification` ([Hunter API v2](https://hunter.io/api-documentation/v2)). Open-source equivalents generate 3-6 permutations (first.last, flast, first, etc.), resolve MX, then issue `MAIL FROM`/`RCPT TO` and read the reply. Best-maintained OSS: Reacher (`check-if-email-exists`, Rust, [GitHub](https://github.com/reacherhq/check-if-email-exists)) and email-sleuth (Rust, MIT, [GitHub](https://github.com/VisualBean/email-sleuth)): "Catch-all Domains: Servers accepting all emails defeat verification"; "Greylisting: Temporary rejections can lead to inconclusive results"; "cannot reliably verify them when port 25 is blocked."

**What breaks it.**

| Problem | Evidence | Source |
|---|---|---|
| Catch-all / accept-all domains | Vendors claim 20-40% of B2B addresses sit on catch-all domains; one permutator vendor estimates 60-75% "valid" and 10-20% catch-all on well-formed input. [flag: vendor figures] | [dev.to](https://dev.to/zackrag/why-30-of-b2b-email-verification-fails-the-catch-all-domain-problem-explained-1n7i), [Zeliq](https://www.zeliq.com/blog/email-permutator), [Prospeo](https://prospeo.io/s/guess-email-address-format) |
| Microsoft 365 | With Directory-Based Edge Blocking, M365 rejects unknown recipients with `550 5.4.1 Recipient address rejected: Access denied`; naive verifiers misread as policy block → "unknown". Secure gateways greylist probes. | [Microsoft Learn](https://learn.microsoft.com/pl-pl/exchange/mail-flow-best-practices/use-directory-based-edge-blocking), [Prospeo](https://prospeo.io/s/email-verification-process) |
| Google Workspace | Returns 550 5.1.1 for unknown users unless admin sets a catch-all route; probing at volume gets IPs rate-limited. [flag: community sources] | [Google support thread](https://support.google.com/mail/thread/8013209?hl=en) |
| Port 25 blocked | Vercel blocks 25 (465/587 open). GCP blocks 25/465/587 outbound, no exceptions. AWS EC2 throttles 25; removal via form. | [Vercel](https://vercel.com/guides/serverless-functions-and-smtp), [Postmark on AWS](https://support.postmarkapp.com/article/1026-resolving-aws-port-25-throttling) |

**Cheapest places to run SMTP probes.**

| Provider | Port 25 policy | Source |
|---|---|---|
| Hetzner (~€4-5/mo) | Blocked by default; unblock request allowed "once you have been with us for a month and paid your first invoice" | [Hetzner FAQ](https://docs.hetzner.com/cloud/servers/faq/) |
| DigitalOcean | 25/465/587 blocked on all new Droplets; no documented unblock | [DO review](https://learnwithhasan.com/vps-providers/digitalocean/) |
| Vultr | Blocked by default, lifted by support ticket | [vpsforlife](https://vpsforlife.com/which-vps-providers-allow-port-25.php) |
| OVH | Sources conflict [flag] | [OVH antispam doc](https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/antispam-best-practices) |

Reacher is AGPL-3.0 for open-source use, paid commercial license for proprietary SaaS ([reacherhq/backend](https://github.com/reacherhq/backend)); Docker backend requires outbound port 25; accepts a SOCKS5 proxy. Commercial license price not retrievable [flag].

**Bulk verifier pricing (official pages unless noted).**

| Vendor | 100k | 1M | $/1k @100k → @1M | Catch-all charged? | Source |
|---|---|---|---|---|---|
| MillionVerifier | $149 | $449 | $1.49 → $0.45 | Doesn't charge "risky" (third-party claim) | [official](https://www.millionverifier.com/services/bulk-email-verifier/) |
| Reoon | $116.40 | $972 | $1.16 → $0.97 | Yes ("anything except unknown") | [official](https://www.reoon.com/email-verifier/) |
| TrueList PAYG | $90 | $700 | $0.90 → $0.70; Unlimited $799-999/mo flat; enhanced catch-all = 3 credits | Standard verdict only | [official](https://truelist.io/pricing) |
| Bouncer | $400 | $2,000 | $4 → $2 | n/a | [official](https://www.usebouncer.com/pricing/) |
| ZeroBounce | ~$420 (3rd-party) | contact sales | ~$4 → ~$2 [flag] | Unknown not charged | [official](https://www.zerobounce.net/email-validation-pricing/) |
| Emailable | not rendered | not rendered | 5k = $38 ($7.60/1k) [flag] | n/a | [official](https://emailable.com/pricing/) |
| Verifalia | hidden | — | ~$5/1k (3rd-party) [flag] | — | [official](https://verifalia.com/pricing) |
| Hunter Verifier | 0.5 credit (~$0.004-0.008) | — | — | `accept_all` status returned | [Hunter pricing](https://hunter.io/pricing) |

Realistic verifier accuracy is unaudited; one 2026 blog-cited benchmark put best overall accuracy at ~70% on ~3,000 real addresses [flag] ([smtpedia](https://smtpedia.com/catch-all-detection/)). Apollo: "SMTP tickling alone can't differentiate between valid and invalid emails from a catch-all domain" ([Apollo KB](https://knowledge.apollo.io/hc/en-us/articles/10826699994381-How-Apollo-Verifies-Emails)).

## 2. Finding people by title cheaply

| Method | Cost per lookup | What you get | Hit rate | Legal exposure | Source |
|---|---|---|---|---|---|
| `site:linkedin.com/in "VP Sales" "Acme"` via SERP API | Serper $1.00/1k (50k) → $0.75 (500k) → $0.50 (2.5M) → $0.30 (12.5M); 2 credits if >10 results; credits expire 6 mo. DataForSEO ~$0.60/1k. Scrapingdog ~$0.45-1/1k. SerpAPI $9-15/1k. | Name + title + company parsed from result titles ("Name - Title - Company \| LinkedIn") and snippets | No published hit-rate data [flag]; needs validation | Scraping Google, not LinkedIn. Google ToS bars automated access; Google v. SerpApi (Dec 2025) unresolved. Data is "LinkedIn-derived" for GDPR purposes. | [ColdIQ](https://coldiq.com/blog/serper-pricing), [DataForSEO](https://dataforseo.com/pricing), [SEJ](https://www.searchenginejournal.com/court-dismisses-googles-dmca-claims-against-serpapi/583033/) |
| Apollo `mixed_people/api_search` | 0 credits. Free: 600 req/day, 50/min; paid: 50,000/day | first_name, **last_name_obfuscated** ("Hu***n"), title, org name, `has_email` flag. No email, no LinkedIn URL. Free accounts need work email. | Good for "does a VP Sales exist here"; useless alone for permutation (no last name) | API Terms: "solely for your internal business purposes"; may not "integrate the APIs with your product or services, unless Apollo has authorized"; may not "access the APIs via a third party's API credentials". Exposing data to non-Apollo users requires reseller contract. | [Apollo docs](https://docs.apollo.io/reference/people-api-search), [API Terms](https://www.apollo.io/terms/api), [Reseller](https://www.apollo.io/partners/api-reseller) |
| Apollo `people/match` | 1 credit ≈ $0.02 on annual paid plans | Full name, email, LinkedIn | Apollo claims 91% | Same terms | [Warmly](https://www.warmly.ai/p/blog/apollo-pricing) |
| Hunter Domain Search / Discover | Domain Search: 1 credit per email found (bulk: 1 per 10); Discover: "This call is free", 100 companies/response | Named people w/ position, seniority, department, sources | 57.6% coverage in Anymail's benchmark | No "similar or competitive service without Hunter's prior written consent" | [Hunter API](https://hunter.io/api-documentation/v2), [Hunter ToS](https://hunter.io/terms-of-service) |
| Apify HarvestAPI LinkedIn Profile Search | $0.10/search page (≤25 profiles) ≈ $4/1k; +$0.01 w/ email | Name, title, company, URL | — | Direct LinkedIn scraping → UA 8.2 | [Apify](https://apify.com/harvestapi/linkedin-profile-search) |
| Clado | $0.01/credit; search ~$10/1k results; email $0.04 | Name, title, LinkedIn, email | — | LinkedIn-derived | [Clado](https://docs.clado.ai/api-reference/pricing) |
| Exa | Search $4-7/1k; Agent email enrichment $0.02/email | Pages/people | — | — | [Exa](https://exa.ai/pricing) |
| Company /team, /about pages | ~free (fetch) | Names + titles for SMBs | No data [flag] | Low | — |

Indie usage: dropzone.careers on HN: "The free people search uses their api_search endpoint (no credits consumed), and email reveals use their people/match endpoint" ([HN 47373242](https://news.ycombinator.com/item?id=47373242)).

## 3. Company discovery

| Source | Cost / 1k companies | Notes | Source |
|---|---|---|---|
| Apollo `organizations/search` | 1 credit per page of 100 ≈ $0.20/1k (paid plans only) | name, primary_domain, website_url, linkedin_url | [Apollo docs](https://docs.apollo.io/reference/organization-search) |
| Exa search | $4 (instant) / $7 (auto) per 1k queries × 10 results → ~$0.40-0.70/1k companies; $10 free/mo | Best plain-English fit | [Exa](https://exa.ai/pricing) |
| Serper / Scrapingdog / DataForSEO | $0.30-1.00/1k queries → ~$0.05-0.20/1k companies | Needs LLM filtering | above |
| Brave Search API | $5/1k; $5 free/mo | | [Brave](https://brave.com/search/api/) |
| Tavily | $8/1k basic; 1,000 free/mo | | [Tavily](https://www.tavily.com/pricing) |
| Hunter Discover | free | Filters + AI search quota 10-300/mo by plan | [Hunter API](https://hunter.io/api-documentation/v2) |
| PDL Free Company Dataset | $0; 22M+ companies, name/domain/size/industry/LinkedIn URL | Check license [flag] | [PDL docs](https://docs.peopledatalabs.com/docs/free-company-dataset) |
| GLEIF Golden Copy | $0; ~3M legal entities | No websites | [GLEIF](https://www.gleif.org/en/lei-data/gleif-golden-copy) |
| Companies House bulk | $0; UK only | No domains | [chguide](https://chguide.co.uk/bulk-data/companies) |
| SEC EDGAR | $0; public cos only | | [edgartools](https://edgartools.readthedocs.io/en/latest/guides/reference-data/) |
| Common Crawl Host Index | $0; domains only | | [Common Crawl](https://blog.commoncrawl.org/blog/introducing-the-host-index) |
| OpenCorporates | £2,250/yr API | | [OpenCorporates](https://opencorporates.com/pricing/) |

## 4. Evidence gathering (5-8 pages/company)

| Option | $/1k pages | Blocking | Source |
|---|---|---|---|
| Self-hosted fetch + trafilatura/Readability on Vercel Fluid | ~$0.01-0.02 (estimate); a $5 Hetzner box does ~1M pages/mo [flag] | Cloudflare fronts 26.8% of sites, but only ~3% of top-1M Cloudflare properties block/challenge bots; SMB homepages rarely challenge plain fetch. Expect ~5-15% failures incl. JS-only [flag] | [W3Techs](https://w3techs.com/technologies/details/cn-cloudflare), [Cloudflare](https://blog.cloudflare.com/declaring-your-aindependence-block-ai-bots-scrapers-and-crawlers-with-a-single-click/) |
| Jina Reader | 10M free tokens/key; 20 RPM keyless, 500 RPM w/ key; ~$0.10-0.25/1k pages paid [flag] | Headless render | [Jina](https://jina.ai/reader/) |
| Firecrawl | Free 1,000/mo; $83/100k ($0.83); $599/1M ($0.60) | 95.3% success, 88.4% on anti-bot pages (competitor bench) | [Firecrawl](https://www.firecrawl.dev/pricing) |
| Exa contents | $1/1k pages | | [Exa](https://exa.ai/pricing) |
| Tavily extract | ~$8/1k-equivalent | | [Tavily](https://www.tavily.com/pricing) |

Trafilatura and Readability are statistically tied on extraction quality ([ACM](https://dl.acm.org/doi/pdf/10.1145/3539618.3591920), [Sandia](https://www.osti.gov/servlets/purl/2429881)).

## 5. What bootstrapped tools actually use

- HN, dropzone.careers (~Mar 2026): Apollo `api_search` (0 credits) + `people/match`; "a focused interface on top of their data." [link](https://news.ycombinator.com/item?id=47373242)
- Hackernoon, email-sleuth authors: "Many servers block these probes," "We now specifically test for and handle catch-all domains." [link](https://hackernoon.com/tired-of-paying-for-emails-we-built-a-rust-powered-sleuth-instead-and-yeah-we-got-pushback)
- Indie Hackers (via search summary) [flag]: an agency pulled 4,847 Apollo contacts spending $49 Apollo + $73 data + $41 verification (~$0.034/contact all-in); another founder reported 40% stale data on a 5,000-contact Apollo list. Leaddrop ($49/mo) self-reports $5k MRR. [IH](https://www.indiehackers.com/post/apollo-io-alternatives-i-switched-after-getting-40-stale-data-on-a-5-000-contact-list-ba05466cf3)
- Reddit digests [flag]: MillionVerifier and Reoon are "the picks Reddit operators trust"; one practitioner reported 20%+ bounces on "verified" emails. [Yalc](https://www.yalc.ai/blog/best-email-verification-tools-reddit/)
- COGS benchmarks: Cleanlist Aug 2026 index puts Apollo Basic at $19.60/1k verified emails; vendor range $19.60-$582/1k. Wrkflows charges $0.02/lead on the user's own Apollo key. [Cleanlist](https://www.cleanlist.ai/blog/2026-08-07-b2b-contact-data-pricing-index), [Wrkflows](https://wrkflows.wrk.com/google-sheets-lead-generation-via-users-apollo/)
- BYO Apollo key tools (confirmed): Adapt, Breakcold, RevenueHero, Taskade, Zero, AgentX, Clay.

## 6. Vendor volume pricing (per found email)

| Vendor | Entry | ~100k/mo | ~1M | Resale/in-product use | Source |
|---|---|---|---|---|---|
| Anymail Finder | $29/400 ($0.073) | $799/100k ($0.008) | 1M pack $4,990 ($0.005) | Pay only on verified | [pricing](https://anymailfinder.com/pricing) |
| LeadMagic | $99/5k ($0.0198) | $849/100k ($0.0085) | Enterprise from $2,490/qtr | **Search "not for serving results to clients or end users," no resale** | [pricing](https://leadmagic.io/pricing) |
| Enrow | $17/1k | $397/50k ($0.0079) | Custom "+$1000/month" | Pay only for valid | [pricing](https://enrow.io/en/pricing) |
| Icypeas | $19/1k | $89/10k ($0.0089) | up to 10M/mo custom [flag] | | [pricing](https://www.icypeas.com/pricing) |
| Hunter | $34/2k annual ($0.017) | Scale $209/25k ($0.0084) | Data Platform e.g. $6,500 | Third-party product use "must comply"; no competitive service | [pricing](https://hunter.io/pricing) |
| FullEnrich (waterfall) | $55/1k | 15k = $720 ($0.048) | >100k custom | Pay on find | [pricing](https://www.fullenrich.com/pricing) |
| Apollo | Org $119/seat/mo annual, 3-seat min (~$0.02) | ~$0.02 | — | Requires reseller contract | [Warmly](https://www.warmly.ai/p/blog/apollo-pricing) |
| Clado | $0.04/email | $0.04 | custom | — | [pricing](https://docs.clado.ai/api-reference/pricing) |
| Exa Agent enrichment | $0.02/email | | | | [Exa](https://exa.ai/pricing) |

Benchmarks (vendor-run) [flag]: Anymail's 5,000-contact test — FullEnrich 87.1% coverage/4.0% false-positive, Anymail 86.4%/0.9%, Hunter 57.6%, Icypeas 49.0%, Prospeo 45.2% ([Anymail](https://anymailfinder.com/email-finder-benchmark)); Dropcontact's 20k test — FullEnrich 48.3%, Enrow 40.9%, LeadMagic 22.6%; PhantomBuster Aug 2025 — Hunter 68%.

## 7. The BYO-key model

- Clay: own Apollo/Hunter/OpenAI key → "each run will count as one Action, but no Data Credit will be used"; Apollo actions "Bring Your Own Account Required". ([Clay FAQ](https://www.clay.com/faq))
- Instantly: own LLM key on Growth Credits ($47/mo) and up; no BYO data-provider keys.
- Does the vendor permit it? Apollo API Terms §3: "You may not access the APIs via a third party's API credentials" and may not integrate "unless Apollo has authorized" ([Apollo API Terms](https://www.apollo.io/terms/api)). Clay is an approved partner; an unapproved SaaS proxying end-user Apollo keys is gray at best. Hunter's ToS silent on BYO key; bans account sharing. OpenAI policy (forum-quoted) [flag] says apps may not store end-users' API keys server-side.
- COGS effect: BYO key moves data cost to the user; you keep compute + orchestration only (~$0.001-0.003/contact).

## A. Cheapest viable stack by scale

Assumptions per user/month: 100 contacts, ~60 companies, ~6 pages/company (360 pages), ~4 permutations verified per contact on misses. Totals are estimates [flag].

| Stage | MVP (free, <500 contacts) | 1,000 users (100k contacts) | 10,000 users (1M contacts) | Quality tradeoff |
|---|---|---|---|---|
| Company discovery | Exa $10 free (~2,500 searches) or Serper 2,500 free | Serper $50 (50k queries) or Exa ~$70 | Serper ~$50 amortized from Scale pack or Exa ~$500-700 | SERP needs LLM filtering; Exa understands plain-English descriptions best |
| Evidence | Jina 10M free tokens + self fetch | Self-hosted fetch + trafilatura (~$10-20); Jina fallback (~$30) | Self-hosted (~$50-100); Jina/Firecrawl fallback ~$300-600 | Plain fetch fails on ~5-15% |
| People by title | Serper free + Hunter Discover free | Serper `site:linkedin.com/in` ~$100-150 | ~$500-750 | SERP hit rate unmeasured |
| Pattern + permute + verify | Reoon 20/day free + Hunter free 50 credits | ~400k verifications: MillionVerifier $449/1M pack or TrueList ~$300-360; or self-hosted Reacher ~$20 + proxies | TrueList Unlimited $799-999/mo flat, or MV ~$1,800, or self-hosted ~$300-600 | 20-40% of domains catch-all; M365 needs correct 5.4.1 parsing |
| Paid finder on miss (~40%) | Hunter free 50 / Anymail trial | 40k × $0.008 ≈ $320 | 400k × $0.005-0.007 ≈ $2,000-2,800 | Single source adds 40-60% of misses |
| **Total** | **~$0** | **~$1,000-1,500/mo → $0.010-0.015/contact** | **~$4,500-7,000/mo → $0.0045-0.007/contact** | vs vendor-only $0.02-0.05/contact ($2-5k and $20-50k) |

## B. Recommended people + email waterfall

| Stage | Cost | Expected cumulative resolution |
|---|---|---|
| 1. Hunter Discover (free) / Apollo `api_search` (0 credits) → confirm a person with the target title exists; first name + title | $0 | Existence signal; 0% emails |
| 2. SERP `site:linkedin.com/in "{title}" "{company}"` → full name + title; cross-check with Stage 1 | ~$0.001-0.002/contact | Unmeasured [flag]; standard free fallback |
| 3. Hunter Domain Search `pattern` + `accept_all` flag, or infer pattern from team-page/`mailto:` | ~$0.001-0.002/company | Pattern known for ~55-60% of domains |
| 4. Permute 3-6 candidates → SMTP verify (bulk vendor or self-hosted) | $0.002-0.006/contact | ~60-75% of non-catch-all domains yield one `valid`; 20-40% catch-all → "risky" |
| 5. Paid finder on remaining misses + catch-alls (Anymail → Enrow/LeadMagic) | $0.005-0.008 per found | Single source +40-60% of misses; waterfall ~85-87% overall |
| 6. Catch-all resolution (TrueList enhanced, ZeroBounce M365/GW update) | $0.002-0.004 | Partial; stage sends and watch bounces <1% |

Net expectation [flag: synthesized]: ~45-60% resolved from free/near-free stages 1-4; ~80-85% after stage 5; remainder catch-all/unknown.

## C. Legal/ToS items that bite at scale

| Item | Risk | Source |
|---|---|---|
| Apollo API Terms | Internal use only; no integration into your product without approval; no third-party credentials. A free-tier key feeding a SaaS is the most exposed configuration. | [Apollo API Terms](https://www.apollo.io/terms/api) |
| LeadMagic | Search API not for serving results to end users | [LeadMagic](https://leadmagic.io/pricing) |
| Hunter | No competitive service without consent; no account sharing | [Hunter ToS](https://hunter.io/terms-of-service) |
| LinkedIn-derived data | UA 8.2 bans scraping; hiQ ended with LinkedIn winning on contract. SERP parsing avoids LinkedIn servers; Apify/Clado do not. | [LinkedIn](https://www.linkedin.com/help/linkedin/answer/a1341387), [Proskauer](https://www.proskauer.com/blog/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case) |
| SERP scraping | Google ToS bars automated access; Google v. SerpApi unresolved | [SEJ](https://www.searchenginejournal.com/court-dismisses-googles-dmca-claims-against-serpapi/583033/) |
| GDPR | CNIL fined Kaspr €240,000 (Dec 2024) for scraping LinkedIn contacts without legal basis | [CNIL](https://www.cnil.fr/en/data-scraping-kaspr-fined-eu240000) |
| Reacher AGPL-3.0 | Self-hosting inside proprietary SaaS requires commercial license | [reacherhq/backend](https://github.com/reacherhq/backend) |
| SMTP probing at volume | IP reputation; M365/GW throttle; port-25 providers revoke on abuse | [OVH](https://docs.ovhcloud.com/en/guides/bare-metal-cloud/dedicated-servers/antispam-best-practices) |

**Bottom line:** the free/near-free waterfall (SERP for names → pattern + permutation → $0.5-1.5/1k bulk SMTP verification → paid finder only on misses) brings COGS to roughly $0.01/contact at 1k users and ~$0.005 at 10k users versus $0.02-0.05 vendor-only, at the cost of ~15-20% unresolved contacts and a catch-all bucket to stage-send. Apollo's 0-credit people search is a weaker backbone than it looks (obfuscated last names, no emails, internal-use-only terms); Hunter Discover (free) plus SERP is the cleaner free layer.
