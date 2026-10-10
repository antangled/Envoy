# B2B Outreach API Landscape for a Hackathon Pipeline (researched 2026-10-10)

Scope note: numbers were checked against vendor pages where reachable; where only third-party 2026 reviews were available it says so. Several pricing pages are JS-rendered and returned nothing (Prospeo, Reoon, MillionVerifier, NeverBounce, PDL terms), so those rows are flagged. Nothing here is legal advice.

## Category 1 — People search + email finder

| Provider | Key endpoints for us | Free tier | Paid pricing | ToS / notes | Instant API key? |
|---|---|---|---|---|---|
| **Apollo.io** | `mixed_people/api_search` (people by `q_organization_domains_list[]`, `person_titles[]`, `person_seniorities[]`; 0 credits, **returns no email/phone**, only `has_email` flags); `people/match` (enrichment, 1 credit if email returned, +8 for mobile); `mixed_companies/search` (org search) | Free plan: 75 credits/mo (some sources say 100); Free rate limits 50/min, 200/hr, 600/day; free accounts must use a work email | Basic ~$49–59/seat/mo; Org ~$119/seat/mo (3-seat min). Enrichment ~$0.03–0.05/email at paid tiers | API ToS (Aug 2024): internal business use only; "may not sublicense, sell, or distribute (including sharing)" the APIs; integrating into your product needs Apollo approval; Data Reseller Program exists. Pricing page FAQ now says "API access is available on Custom plans" while docs say "all plans include at least basic access" — **conflict, flagged** | Yes for key creation on a paid/free account, but endpoint entitlement is unclear; test before demo |
| **Hunter.io** | Domain Search, Email Finder (name+domain), Email Verifier (0.5 credit), Discover (company search, free), Multi-Domain Search (people rows, emails hidden; 1 credit to reveal), Email/Company Enrichment | **50 credits/mo**, API works on free (Domain Search capped at 10 results; Discover filters are Premium) | Starter $49/mo 2,000 credits; Growth $149/mo 10k; Scale $299/mo 25k. ~$0.015–0.025/credit | Rate limits 15 req/s (Finder/Domain), 10 req/s (Verifier). ToS: no competing service, no copying; no explicit "display to end users" ban; you are independent Controller under DPA. Public test key returns dummy data without spending credits | Yes |
| **Prospeo** | Email Finder (name+company/LinkedIn URL), Search API, Enrich API, Mobile (10 credits), Verifier | ~100 credits/mo (third-party; some say 75). Whether free tier includes Search/Enrich API is disputed | Starter $49, Growth $99, Pro $249 per user/mo (Sep 2026 reviews). 1 credit/email found, 0 if not found | Charged only on valid result for single lookups; bulk may charge per row. **Pricing page unfetchable — unverified** | Yes (paid); free-API status unclear |
| **LeadMagic** | Email Finder (1 credit on success), Email Validation (0.25), Mobile (5), Company enrichment, Profile→email | No recurring free tier found (trial credits only) | Essential $99/mo 5k credits ($0.02/email); Pro $499/mo 50k; 600 req/min | Pay-per-result; empty lookups free. Credit-based, not seat-based | Yes |
| **FullEnrich** | Waterfall enrich (15+ sources): work email 1 credit, personal 3, mobile 10; bulk + real-time API | 50 free credits, no card | Starter ~$29/mo 500 credits; Pro $55/mo 1,000 (~$0.055/email). API on Starter per one source, Pro+ per another | Charged only on success; rollover 3 mo (monthly) | Yes |
| **Findymail** | `/search/name` (name+domain), verify, phone (10 credits), reverse lookup, company | 10 finder + 10 verifier credits, one-time | Starter $99/mo 5,000 finder + 5,000 verifier credits ($0.02/email); Enterprise custom. Rollover to 2x | Pay only for verified results; <5% bounce guarantee. Basic $49/1k tier cited by some reviews but not on current pricing page | Yes |
| **Anymail Finder** | Person search (1 credit), Decision-maker search by role+domain (2 credits — useful for step 3), Company emails (1 credit/20), Verify-only (0.2) | 100 trial credits (card verification, not charged) | $29/400 → $49/1,000 → $199/10,000 ($0.02) → $799/100k ($0.008). Yearly -33% | Charged only when verified email found; repeats within 30 days free; no published rate limit; API on all plans (third-party) | Yes |
| **Snov.io** | Email Finder, Verifier, Domain Search, Prospect search | 50 credits/mo, **API locked on free** | Starter ~$39/mo 1,000 credits; API on paid plans | Valid or "unknown" emails cost 1 credit | Paid only |
| **RocketReach** | Lookup/search API | None | API only on Ultimate: ~$209/mo monthly (1,000 lookups) or ~$1,699–2,099/yr | Lookups refunded if nothing found | No (top tier only) |
| **ContactOut** | Enrich API | 5 email/5 phone credits/day via extension/portal, **no API on free** | API only on quoted Team/API plan (~$299+/mo) | — | No (sales) |
| **Lusha** | Person/Company enrich API; 1 credit/email, 5/phone | ~40 credits/mo, limited/no API | API requires Pro: ~$52/user/mo (7,200 credits/yr). Pro limits 50/min, 1,500/day | — | Paid only |
| **People Data Labs** | Person Enrichment, Person Search (SQL/ES), Company Enrichment/Search | 100 credits/mo but **contact fields obfuscated** on free | Pro from $98/mo for 350 credits (~$0.28/record) — expensive per lead | Primer's pass-through terms: no "resell, sublicense, distribute or otherwise provide access to … data derived from the PDL Services, to any third party"; Acceptable Data Use Policy applies. **Could not fetch PDL's own ToS (404) — verify** | Yes (Pro self-serve) |
| **Crustdata** | Person Search (0.03 credit/result), Person Enrich (1 cached / 7 live), contact +1–5 | No self-serve free tier | ~$95/mo entry (third-party); $/credit set by plan; live/contact endpoints plan-gated | Credits expire 6 mo | Mostly sales |
| **Proxycurl** | — | — | — | **Shut down July 4, 2025** after LinkedIn v. Nubela (N.D. Cal. 3:25-cv-00828) settlement; APIs offline. Do not plan on it | No |
| **Kaspr** | Enrich API | Free tier exists; API only Starter+ | Starter $65/mo ($49 annual), API 20 req/hr; Business $99, 250 req/hr | Phone-centric, EU-focused | Paid |
| **Datagma** | Enrich (1 credit = verified email; 30 = mobile), company data | **100 credits/mo, API included** (vendor page) | Regular $49/mo 3,000 credits (~$0.016/email); Popular $99/7,500 | Not charged on empty results; catch-all emails free | Yes |
| **Icypeas** | Email Finder (1), Verifier (0.1), Domain scan (1), Profile scraper (1.5) | 50 credits on signup | $19/1,000 → $39/4,000 → $89/10,000 (~$0.009/email); credits never expire; API on all plans | Prices + VAT | Yes |
| **Tomba** | Domain Search, Email Finder, Verifier, Enrichment | 75 API credits on signup (also "25 searches/mo" cited) | Basic $49/mo 5,000 credits (half finder, half verify); Growth $89/10k | Credits last 12 months | Yes |
| **Enrow** | Email Finder (1 credit on found), Bulk (5k/batch), Verifier, Lookup | 50 free credits (recurring vs one-time disputed) | Start $17/1,000 (~$0.017), $47/4,000; Pro $87/10,000 | Charged only on found | Yes |
| **Nimbler** | Enrich/validate API | "Free forever" tier claimed; details inconsistent | $100–$250/mo entry | Pricing not reliably published | Unclear |
| **Exa (people)** | Search API `category: "people"` over ~1B profiles; Agent API for criteria-based list building with email enrichment ($20/1k = $0.02/email) and phone ($70/1k) | $10 credits/mo + $10 signup bonus, no card | Search $4–7/1k; Agent minimal $12/1k; see Cat. 2 | No dedicated people endpoint; email return not guaranteed | Yes |
| **Parallel.ai** | Entity Search ($5/1k, 100 results), FindAll (base $0.25 + $0.03/match), Task API ($5–2,400/1k runs) | Up to 5,000 req/mo, ~$80 signup credit, $5/mo (third-party) | As listed; failed runs not billed | — | Yes |
| **Clado** | `Search People` (1 credit/result, $0.01), `Get Contact Information` (4 credits email / 10 phone, **only on success**), Scrape/Get LinkedIn Profile (1–2), Deep Research | Free trial: search allowed, contact enrichment requires purchased credits; free RPM 20 (search) | $0.01/credit → $0.04/email found, $0.10/phone | Rate limits 20→400 RPM by spend tier | Yes |
| **Apify LinkedIn actors** | e.g. dev_fusion profile scraper $10/1k profiles; HarvestAPI $4/1k profiles, $10/1k with email, $0.10/search page | Apify free plan $5/mo credit (~500 profiles); some actors cap free users at 10 profiles/run | Per-result on top of platform usage | Scrapes LinkedIn without login; breaches LinkedIn User Agreement regardless (see C) | Yes |

## Category 2 — Web research / company discovery

| Provider | Key endpoints | Free tier | Paid pricing | Best at / notes | Instant? |
|---|---|---|---|---|---|
| **Exa.ai** | `/search` (neural, `category: "company"`, `findSimilar` for "companies like X"), `/contents` (clean text), `/answer`, Agent | $10/mo + $10 signup, no card (~2,500 instant searches) | Search instant $4/1k, fast/auto $7/1k (10 results; +$1/1k per extra result); Contents $1/1k pages; Answer $5/1k; Deep $12–15/1k | Best for semantic company discovery and lookalikes; findSimilar price not listed separately | Yes |
| **Tavily** | `/search` (1 credit basic, 2 advanced), `/extract` (1 credit/5 URLs), `/map`, `/crawl`, `/research` (4–250 credits) | **1,000 credits/mo recurring**, no card; students: Project plan free 4 months | PAYG $0.008/credit; Project $30/4,000; Bootstrap $100/15k | Best LLM-ready search+extract for evidence gathering | Yes |
| **Serper.dev** | Google SERP, News, Places, Images | 2,500 queries **one-time**, no card | $50/50k ($1/1k) → $0.30/1k at scale; 11–100 results = 2 credits; credits expire 6 mo | Cheapest Google results, fast; great for "recent news about X" | Yes |
| **Brave Search API** | Web Search, News, Answers | $5 credit/mo (~1,000 searches) but **card required** since Feb 2026 | $5/1k search; Answers $4/1k + tokens; 50 QPS | Independent index; pricier than Serper | Yes (with card) |
| **Firecrawl** | `/scrape` (1 credit/page; +4 for JSON extraction), `/crawl`, `/map`, `/search` (2 credits/10 results), Agent (5 free runs/day) | **1,000 credits/mo recurring**, no card (vendor page) | Hobby $16–19/mo 5k; Standard $83/mo 100k | Best for pulling careers pages/blogs into markdown; JSON extraction is the expensive add-on | Yes |
| **Perplexity** | Sonar chat models (per-token + $5–14/1k request fee by context size); **standalone Search API $5/1k, fast $1/1k** | Not generous; pay-as-you-go | Sonar $1/$1 per M tokens + $5/1k low-context | **Sonar retiring Sept 27, 2026** per Agent API migration notices (third-party reports; pricing page still lists Sonar). Build on Search API or Agent API, not Sonar | Yes |
| **Jina Reader** | `r.jina.ai/<url>` (markdown), `s.jina.ai?q=` (search, key required) | 10M tokens on free key; 20 RPM keyless, 500 RPM with key | ~$0.02–0.05 per M tokens prepaid | Cheapest page-to-markdown; ReaderLM-v2 model is CC-BY-NC (hosted API fine). Acquired by Elastic Oct 2025 | Yes |
| **Parallel.ai** | Search ($1/1k turbo/fast, $5/1k advanced), Extract $1/1k URLs, Task API (structured research w/ citations, $5/1k lite runs), FindAll | ~5,000 req/mo free + credits | As listed; failed runs free | Best for "research this company and return JSON with citations" in one call | Yes |
| **Linkup** | `/search` standard $0.005–0.006, deep $0.05; Fetch $0.001–0.005 | $20 credit/mo with professional email (~4,000 searches) | PAYG | Sourced answers; generous recurring free | Yes |
| **You.com** | Search $5/1k (100 results), Contents $1/1k pages, Research $12–450/1k | $100 signup credit; 100 calls/day free (Jul 2026 change) | As listed | Big signup credit for a demo | Yes |
| **Google Custom Search JSON** | — | 100/day free, $5/1k to 10k/day | — | **Closed to new customers; shuts down Jan 1, 2027.** Skip | No |

## Category 3 — Email verification

| Provider | Endpoint | Free | Paid | Catch-all handling / notes | Instant? |
|---|---|---|---|---|---|
| **ZeroBounce** | `/v2/validate`, bulk, Email Finder | **100 credits/mo recurring** + 10 finder credits (vendor page) | Min purchase 2,000 for $39 (~$0.0195); API keys on all accounts | Returns `catch-all` status; AI scoring is a paid add-on | Yes |
| **NeverBounce** | `/single/check`, bulk | ~1,000 one-time (third-party; page blocked 403) | ~$50/10k, $400/100k (third-party) | Most expensive at scale; credits expire 12 mo | Yes |
| **MillionVerifier** | single/bulk API | 100 credits | $37/10k, $129/100k, $449/1M one-time, never expire | Unknown/catch-all not charged; one source says real-time API priced separately — **verify** | Yes |
| **Reoon** | Quick + Power verification API | 100 on signup + **20/day renewing** (~600/mo), API on free | $12/10k, $94/100k one-time (~$1/1k); unknowns refunded | Power mode does SMTP mailbox check; pricing page unfetchable | Yes |
| **Bouncer** | `/v1.1/email/verify`, batch | 100 credits, no card (vendor page) | $8/1,000 → $60/10k → $400/100k, never expire | No charge for duplicates or "unknown"; deep catch-all for Google/O365 claimed (unverified) | Yes |
| **Emailable** | `/v1/verify` with `accept_all` flag | 250 credits (vendor page) | From $0.0076/credit ($38/5,000), never expire; unknowns free | Clearly documented `accept_all` field | Yes |
| **Hunter Verify** | `/email-verifier` | Within 50 free credits (0.5 credit each) | Same credit pool | Returns `accept_all` status and score | Yes |
| **Open-source (Reacher `check-if-email-exists`)** | Rust lib/CLI/Docker HTTP backend | Free, AGPL-3.0 (commercial license for proprietary use) | Self-host | Needs **outbound port 25**, blocked by AWS/GCP/Azure/most ISPs; Gmail/enterprise gateways block mailbox probing; greylisting (451) needs retries | n/a |

**Why catch-all domains matter:** 30–40% of B2B domains (vendor estimate) accept RCPT TO for any address, so SMTP checks cannot distinguish real from fake mailboxes. Every verifier returns "catch-all/accept-all/unknown" here. Treat these as "risky": prefer a finder that returns a confidence score (Hunter, Anymail), and expect the demo's bounce rate to come almost entirely from catch-all sends.

## Category 4 — Company data

| Provider | Key endpoints | Free | Paid | Notes | Instant? |
|---|---|---|---|---|---|
| **Crunchbase** | Full API (orgs, funding, people) | **None; Basic API discontinued for new users** | Enterprise/Applications license only; reported $20k–50k+/yr | No sandbox or trial key. Skip | No |
| **Clearbit** | — | **Free tier shut April 30, 2025**; Logo API sunset Dec 2025 | Only via HubSpot Breeze Intelligence credits on paid HubSpot | Standalone signups closed; existing keys still work | No |
| **The Companies API** | `/companies` search by industry/size/location, enrich by domain | **500 credits on signup**, no card | Startup $95/mo 50k credits ($2.50/1k extra), 50 rps | Good cheap firmographics + search | Yes |
| **Companies House (UK)** | `/search/companies`, officers, filings | Free; 600 req/5 min | n/a | Legal entities only; no emails | Yes |
| **OpenCorporates** | Company search/officers (200+ jurisdictions) | Free only for approved public-benefit projects | Essentials £225/mo for 500 calls | Expensive for a startup | Application |
| **Apollo org search** | `mixed_companies/search` (0 credits), Organization Enrichment (1 credit) | Within free plan limits | See Cat. 1 | Decent firmographics + headcount + tech | See Cat. 1 |
| **LinkedIn official API** | Sign In, Share only self-serve | — | Marketing Developer Platform partner-gated (weeks–months approval); Sales Navigator (SNAP) **closed to new applicants** | **No people/company search for ordinary developers** | No |
| **Google Places API (New)** | Text Search (Pro SKU: name/address/website), Place Details | Per-SKU since Mar 2025: Pro 5,000 free/mo, Enterprise (phone/website/rating) 1,000 free/mo; IDs-only unlimited | $32/1k Pro, $35/1k Enterprise after free | Field masks determine SKU; good for local SMB discovery | Yes (card) |

## Synthesis

### A. Cheapest "good enough" hackathon stack (50–200 leads, ~$0)

1. **Company discovery:** Exa `/search` with `category: "company"` plus `findSimilar` on a seed domain (≈$10 free/month ≈ 1,400–2,500 searches). Fallback: Apollo `mixed_companies/search` (0 credits). For local SMBs: Google Places Text Search Pro SKU, 5,000 free/month.
2. **Person finding by title:** Apollo `mixed_people/api_search` filtered by `q_organization_domains_list[]`, `person_titles[]`, `person_seniorities[]` — 0 credits, returns name/title/LinkedIn URL and `has_email`. Free plan: 600 req/day is plenty. Risk: Apollo's pricing page now says API is on "Custom plans" while docs say all plans — create a free account with a work email and test key creation on day one. Backup: Clado `Search People` ($0.01/result, 20 RPM free) or Hunter Discover + Multi-Domain Search (free rows, 1 credit per revealed email).
3. **Email finding:** Hunter Email Finder (50 free credits ≈ 50 emails) → Datagma (100 free/month, API included) → Icypeas/Enrow/Tomba/FullEnrich/Anymail signup credits (50/50/75/50/100). Stacking these free pools gets ~400 success-only lookups — comfortably 200 leads. Apollo `people/match` costs its 75 free credits if `has_email` is true.
4. **Verification:** Reoon (20/day + 100) or ZeroBounce (100/month) or Emailable (250 one-time). Many finders already verify (Anymail, Findymail, Hunter score); only re-verify Apollo/Clado emails.
5. **Web evidence for the brief:** Tavily (1,000 credits/month: ~500 searches + extracts) for news/blog; Firecrawl (1,000 credits/month) `/scrape` careers page and `/search` with `tbs` recency; Jina `r.jina.ai` for cheap page→markdown; Serper (2,500 one-time) for Google News. Store URLs as citations.

Total cost: $0 if spread across free tiers; worst case ~$20–50 if buying Enrow Start ($17/1,000) or Anymail $29/400 as a safety net.

### B. Small production (~5,000 leads/month)

- Discovery: Exa $7/1k search + $1/1k contents → ~$30/mo; or Parallel FindAll base ($0.25 + $0.03/match).
- People: Apollo people search is still 0 credits (Basic ~$49–59/seat gives higher limits and clearer API entitlement) or Clado at $0.01/result (~$50–100/mo for 5–10k results).
- Email waterfall: Icypeas $89/10k ($0.009) or Enrow $87/10k → Anymail $199/10k ($0.02) → FullEnrich as last resort ($0.055). Blended success-only ≈ $0.015–0.03/email.
- Verification: MillionVerifier $37/10k or Reoon ~$1/1k → ~$5/mo. Verify only catch-all/unknown-scored results.
- Evidence: Tavily Project $30/4,000 or Firecrawl Hobby $16/5k + Serper $50/50k.
- LLM drafting: ~$0.01–0.03/lead depending on model.

**Estimate: $200–350/month, ≈ $0.04–0.07 per enriched, verified lead with brief**, dominated by email finding. Apollo Basic alone can push this toward $0.03/lead if its credits cover email needs.

### C. Legal / ToS landmines

- **LinkedIn scraping:** hiQ v. LinkedIn ended with the Ninth Circuit holding that scraping public pages is not CFAA "without authorization," but the district court (Nov 2022) found hiQ breached LinkedIn's User Agreement, leading to a $500k consent judgment. Contract liability survives even for public profiles. LinkedIn v. Nubela (Proxycurl) was filed Jan 2025 and **Proxycurl shut down July 4, 2025**; settlement terms confidential. Apify/Crustdata/Clado-style LinkedIn-derived data carries the same contract exposure; for a demo it is low practical risk, for a product it is a diligence question.
- **GDPR (EU/UK contacts):** a named work email is personal data. Lawful basis is normally Art. 6(1)(f) legitimate interest (Recital 47 names direct marketing), which requires a documented LIA, data minimisation (no personal mobiles/home addresses), Art. 14 notice at first contact telling people the data source and their Art. 21 right to object, and honoring opt-outs globally. Member-state rules differ (Germany stricter); UK PECR treats corporate subscribers more leniently than individuals. Use providers that sign a DPA (Hunter explicitly makes you an independent Controller).
- **Displaying data to end users:** Apollo API ToS limits use to internal business purposes and bars distribution/sharing; embedding Apollo data in a customer-facing product requires the Data Reseller Program. PDL's pass-through terms bar providing data "derived from the PDL Services" to third parties. Hunter has no explicit display ban but prohibits building a competing service. Treat every provider as "internal use" until you read the clause; for a multi-tenant SaaS you need a reseller/OEM agreement. For a hackathon where the user is the one holding the API key (BYO-key model), you sidestep most of this.
- **Other:** Google Custom Search is dead for new users; Crunchbase and Clearbit have no self-serve path; Snov.io, Lusha, RocketReach, ContactOut, Kaspr gate the API behind paid tiers or sales.

### D. Waterfall pattern

Order providers cheapest-first, stop on first verified hit, and only call providers that charge on success so misses are free:

Hunter (if domain pattern known) → Datagma → Icypeas/Enrow → Anymail decision-maker search (role+domain, 2 credits, also solves "find the right person" when you only know the title) → FullEnrich (itself a 15-provider waterfall; use last). Then verify only results lacking a provider confidence score.

**Charge only on success:** Hunter Email Finder, Anymail Finder, Findymail, Prospeo (single lookups), LeadMagic, FullEnrich, Enrow, Datagma, Icypeas, Clado contact enrichment, RocketReach (refund), Apollo match (0 credits if nothing billable), Parallel Task (failed runs). **Charge regardless:** Snov.io (unknown emails cost 1 credit), PDL (per successful API response even if sparse — disputed), Prospeo bulk imports, Anymail verify-only (0.2 always), Tavily/Firecrawl (per request). Cache (name, domain) → result for 30 days: Anymail makes repeats free and most others do not.

Independent accuracy data is thin and vendor-run: Anymail's 14-tool benchmark puts FullEnrich waterfall at 87% coverage/96% accuracy, Findymail 71%/96%, Apollo 68%/91%, Hunter 58%/86%, Prospeo 45%/93%; Cleanlist's 500-prospect test shows 76% deliverable for single-source vs 98% for verify-first waterfalls. Run a 200-contact blind test before trusting any of these.

## Couldn't verify

Apollo free-plan API entitlement (pricing page vs docs conflict); Prospeo current plans and free-API status; PDL first-party ToS; NeverBounce free credits; MillionVerifier real-time API pricing; Perplexity Sonar retirement date (third-party only); Enrow free-credit recurrence; Exa findSimilar price; Bouncer catch-all scoring.

## Sources

- Apollo: https://docs.apollo.io/reference/rate-limits · https://docs.apollo.io/reference/people-api-search · https://www.apollo.io/terms/api · https://www.apollo.io/pricing · https://knowledge.apollo.io/hc/en-us/articles/4416173158541-Use-Apollo-API · https://docs.apollo.io/docs/developer-faqs
- Hunter: https://hunter.io/pricing · https://hunter.io/api-documentation/v2 · https://hunter.io/terms-of-service
- Prospeo (third-party): https://satellyte.ai/blog/prospeo-review-2026 · https://derrick-app.com/tools/prospeo-review
- LeadMagic: https://leadmagic.io/pricing · https://leadmagic.io/pricing/api
- FullEnrich: https://coldiq.com/blog/fullenrich-pricing · https://syncgtm.com/blog/fullenrich-review
- Findymail: https://www.findymail.com/pricing/
- Anymail Finder: https://anymailfinder.com/pricing · https://anymailfinder.com/email-finder-benchmark
- Snov.io: https://snov.io/knowledgebase/faq-pricing-plans/
- RocketReach: https://salesmotion.io/blog/rocketreach-pricing · ContactOut: https://scalelist.com/contactout-pricing/ · Lusha: https://reply.io/blog/lusha-api/
- PDL: https://www.peopledatalabs.com/pricing/person · https://www.sayprimer.com/third-party-terms
- Crustdata: https://docs.crustdata.com/general/pricing
- Proxycurl: https://nubela.co/blog/goodbye-proxycurl/ · https://pipeline.zoominfo.com/sales/proxycurl-api
- Kaspr: https://emelia.io/hub/kaspr-pricing · Datagma: https://datagma.com/en/pricing · Icypeas: https://www.icypeas.com/pricing · Tomba: https://tomba.io/api · Enrow: https://enrow.io/en/api/email-finder
- Exa: https://exa.ai/docs/admin/pricing · https://exa.ai/blog/best-people-search-apis
- Parallel: https://docs.parallel.ai/getting-started/pricing · Clado: https://docs.clado.ai/api-reference/pricing · https://docs.clado.ai/api-reference/rate-limits
- Apify: https://apify.com/dev_fusion/linkedin-profile-scraper · https://use-apify.com/docs/best-apify-actors/best-linkedin-scrapers
- Tavily: https://docs.tavily.com/documentation/api-credits · Serper: https://serper.dev/ · https://scavio.dev/blog/serp-api-cost-per-query-all-providers-2026 · Brave: https://brave.com/search/api/ · Firecrawl: https://www.firecrawl.dev/pricing
- Perplexity: https://docs.perplexity.ai/getting-started/pricing · https://llmgateway.io/blog/perplexity-sonar-api-retirement
- Jina: https://agentscamp.com/guides/advanced/jina-reader-api · Linkup: https://openbenchmarks.com/web-search/linkup-api-pricing · You.com: https://you.com/pricing
- Google CSE: https://developers.google.com/custom-search/v1/overview · Google Places: https://developers.google.com/maps/billing-and-pricing/faq · https://bizcollect.dev/blog/google-places-api-pricing
- Verification: https://www.zerobounce.net/email-validation-pricing/ · https://www.usebouncer.com/pricing/ · https://emailable.com/pricing/ · https://help.millionverifier.com/payments-credits/credit-information · https://us.fitgap.com/products/reoon-email-verifier · https://github.com/reacherhq/check-if-email-exists · https://truelist.io/blog/verify-email-address
- Company data: https://dev.to/agenthustler/crunchbase-api-in-2026-free-tier-gone-what-startup-data-hunters-do-now-1177 · https://data.crunchbase.com/docs/using-the-api · https://www.datamagnet.co/post/clearbit-api-2026/ · https://www.thecompaniesapi.com/api/ · https://opencorporates.com/pricing/ · https://leadistry.co.uk/blog/companies-house-api-guide · https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives
- Legal: https://www.morganlewis.com/blogs/sourcingatmorganlewis/2022/12/linkedin-v-hiq-landmark-data-scraping-suit-provides-guidance-to-data-scrapers-and-web-operators · https://natlawreview.com/article/court-finds-hiq-breached-linkedin-s-terms-prohibiting-scraping-mixed-ruling-declines · https://bouncezero.io/email-gdpr-compliance-guide-2026 · https://www.explorium.ai/blog/data-for-gtm/b2b-data-api-resale-rights-licensing-what-product-builders-need-to-know-now-in-2026.md
- Benchmarks: https://www.cleanlist.ai/blog/2026-06-26-best-email-finder-tools · https://tomba.io/blog/best-email-finder-in-2026 · https://www.pin.com/blog/email-finder-vendor-audit/
