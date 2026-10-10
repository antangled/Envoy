# LLM cost research for the 4-call prospect pipeline (as of 2026-10-10)

Scope note: first-party prices were fetched from official pricing pages on 2026-10-10. Vendor/BYO-key findings came from a sub-researcher (71 fetches). Benchmark findings are in the appendix at the bottom. The open-weight/free-tier sub-researcher had not returned when this was assembled; gaps are flagged.

## 1. Current per-million-token prices

**Anthropic** ([claude.com/pricing](https://claude.com/pricing), [platform docs](https://platform.claude.com/docs/en/about-claude/pricing))

| Model | Input | Output | Cache write 5m / 1h | Cache read | Batch (in/out) |
|---|---|---|---|---|---|
| Opus 5.5 | $4 | $20 | $5 / $8 | $0.20 | $2 / $10 |
| Sonnet 5.5 | $2 | $10 | $2.50 / $4 | $0.10 | $1 / $5 |
| Haiku 5.5 (prompt ≤100K) | $0.10 | $0.50 | $0.125 / $0.20 | $0.01 | $0.05 / $0.25 |
| Haiku 5.5 (prompt >100K) | $0.50 | $2.50 | $0.625 / $1 | $0.05 | $0.25 / $1.25 |

All three support structured outputs (`output_config.format`, JSON schema) and native PDF input (1,500–3,000 tokens/page, 600 pages/request). Batch and cache discounts stack. ([structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [PDF](https://platform.claude.com/docs/en/build-with-claude/pdf-support))

**OpenAI** ([developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing))

| Model | Input | Cached | Output | Batch/Flex |
|---|---|---|---|---|
| gpt-6-luna (cheapest) | $0.10 | $0.01 | $0.50 | 50% off |
| gpt-5.6-luna | $0.20 | $0.02 | $1.20 | 50% off |
| gpt-5.4-nano / gpt-5-nano | $0.20 / $0.05 | $0.02 / $0.005 | $1.25 / $0.40 | 50% off |
| gpt-6.1-sol (mid) | $2 | $0.10 | $10 | 50% off |
| gpt-5.5 (flagship) | $5 | $0.50 | $30 | 50% off |

gpt-6-luna and gpt-6.1-sol: structured outputs yes; the model pages list text+image input only, PDF not listed ([luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)). On luna, function calling via Chat Completions works only at reasoning effort `none`.

**Google Gemini** ([ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing))

| Model | Input | Output | Cache read | Batch (in/out) | Free tier |
|---|---|---|---|---|---|
| gemini-3.8-flash / 3.6-flash | $0.75 (→$1.50 on 2027-01-01) | $3.75 (→$7.50) | $0.075 | $0.375 / $1.875 | Yes |
| gemini-3.5-flash-lite | $0.30 | $2.50 | $0.03 | $0.15 / $1.25 | Yes |
| gemini-3.1-flash-lite | $0.25 | $1.50 | $0.025 | $0.125 / $0.75 | Yes |
| gemini-3.1-pro-preview | $2 (≤200k) | $12 | $0.20 | $1 / $6 | No |
| gemini-2.5-flash-lite (legacy, "past users only") | $0.10 | $0.40 | $0.01 | $0.05 / $0.20 | Yes |

Flash price has risen sharply versus 2.5 Flash ($0.30) and is scheduled to double again in 2027. Structured output via `response_format` + schema on all; native PDF input (~258 tokens/page, 1,000 pages) ([doc processing](https://ai.google.dev/gemini-api/docs/document-processing)). **Free-tier limits:** Google no longer publishes per-model RPM/RPD on the docs page. Third-party guides (Oct 2026) report roughly 15 RPM / 250K TPM / 500–1,000 RPD for Flash-Lite and lower for Flash; Pro removed from free tier April 2026. Unverified. **Free-tier data IS used for training** ([terms](https://ai.google.dev/gemini-api/terms)).

**DeepSeek** ([api-docs.deepseek.com](https://api-docs.deepseek.com/quick_start/pricing))

| Model | Input (cache miss) peak / off-peak | Cache hit | Output peak / off-peak |
|---|---|---|---|
| deepseek-flash (V4.1-Flash) | $0.30 / $0.15 | $0.006 / $0.003 | $1.20 / $0.60 |
| deepseek-v4-pro | $1.32 / $0.66 | $0.044 / $0.022 | $3.96 / $1.98 |

Off-peak = everything except 01:00–04:00 and 06:00–10:00 UTC Mon–Fri. JSON output mode only (no JSON-schema enforcement listed); no native PDF; no batch API.

**Open-weight via providers** — Groq lists gpt-oss-120b at $0.15/$0.60 and gpt-oss-20b at $0.075/$0.30 ([console.groq.com/docs/models](https://console.groq.com/docs/models)). Together/Fireworks/DeepInfra/Cerebras prices for Qwen3 / Kimi K2 / GLM / Llama 4: not verified. OpenRouter's structured-outputs filter sorted by price shows Haiku 5.5 as the cheapest general model with schema support ([openrouter.ai/models](https://openrouter.ai/models?order=pricing-low-to-high&supported_parameters=structured_outputs)).

## 2. Free tiers that exist in Oct 2026

| Tier | Limits | Training on data? | Production-usable? |
|---|---|---|---|
| Gemini API free | Flash/Flash-Lite only; per-model RPM/RPD not published (third-party: ~15 RPM, 500–1,000 RPD) | Yes | No; dev only |
| OpenRouter `:free` models | 50 req/day; 1,000 req/day after buying ≥$10 credits ([FAQ](https://openrouter.ai/docs/faq)) | Depends on upstream | No |
| Vercel AI Gateway | Monthly free credits on a subset of models (commonly cited $5/mo, unverified). 0% markup, BYOK free on paid tier ([pricing](https://vercel.com/docs/ai-gateway/pricing)) | No (routes to providers; ZDR option) | Paid tier yes |
| Groq free tier | Developer-tier base limits 30 RPM / 1K RPD / 8K TPM / 200K TPD for gpt-oss-120b ([rate limits](https://console.groq.com/docs/rate-limits)); TPM too low for 15k-token prompts | Not checked | No |
| Mistral free, Cloudflare Workers AI, Cerebras, SambaNova, GitHub Models, NVIDIA NIM | Not verified | — | — |
| Anthropic, OpenAI | No free API tier | n/a | n/a |

No free tier covers even 100k briefs/month (≈3,300/day of 15k-token calls). Free tiers are for dev and demos only.

## 3. What sales-AI products use and charge

| Product | Models disclosed | BYO key | $ per AI email / run |
|---|---|---|---|
| Instantly | User picks: GPT-6 Astra/Sol/Luna, GPT-5 mini/nano, Claude Opus 5.5/Sonnet, Gemini 3.x Flash, DeepSeek V4, Grok, Sonar | Yes (6 providers) | ~0.5 credit ≈ $0.01–0.016 ([help](https://help.instantly.ai/en/articles/8317073-ai-prompts), [pricing](https://instantly.ai/pricing)) |
| Clay | GPT-5 Nano 0.2–0.5 cr, Haiku 4.5 1 cr, Sonnet 4.5 1.5 cr, Claygent Helium 1 / Argon 3 cr; "0% markup" on reasoning models | Yes, all plans; BYOK run = 1 Action (~$0.004) | Credits "from $0.05" → Haiku email ≈ $0.05, Argon research ≈ $0.15 ([ai-pricing](https://university.clay.com/docs/ai-pricing)) |
| Smartlead | GPT-4 via your key (dated) | Yes, OpenAI only | Included; you pay OpenAI |
| lemlist | OpenAI/Claude/Perplexity/Google/xAI | Yes | 1 credit ≈ $0.006–0.014 ([credits](https://help.lemlist.com/en/articles/8944295-credits-how-they-work)) |
| Apollo | Sonar (research), GPT-4o mini, Claude Haiku 3.5 (messaging) | No | ~$0.02–0.025/record (unverified) |
| Unify | GPT-5 / GPT-5.4 | No | 0.1 credit/question ≈ $0.0025 |
| Octave | Not disclosed | No | Metered; Ultra from $1,500/mo |
| Persana | Not disclosed | Yes | ~$0.04 on credits |
| 11x / Artisan / AiSDR / Reply Jason / Regie | None disclose | No | $0.50–1.90 per contact, bundled |
| Autobound / Twain / Lyne / SmartWriter | Not disclosed | No | $0.06 / $0.10–1.00 / $0.25–0.30 / ~$0.15 |
| Indie (Apify AI Cold Email Writer) | gpt-4o-mini, Haiku 3.5, Sonnet 4 | Required | $0.01 platform fee + ~$0.002 LLM |

BYO-key is offered by ~5 of 22. Vendor credit pricing for a personalized email runs $0.01–0.06 versus raw small-model cost of $0.0005–0.003: a 5–50x markup.

## 4. Cost per prospect and monthly cost

Assumptions: (a) 2k in/500 out amortized over 20; (b) 13.5k in/1.5k out; (c) 4k in/300 out; 2k system prefix cached on (b) and (c); batch = 50% on everything. Call (d) once per user excluded.

| Model | $/prospect list | +cache | +cache+batch | 100k briefs/mo (cache) | 1M/mo (cache) | 1M/mo (cache+batch) |
|---|---|---|---|---|---|---|
| Opus 5.5 | $0.1069 | $0.0917 | $0.0458 | $9,170 | $91,700 | $45,850 |
| Sonnet 5.5 | $0.0534 | $0.0458 | $0.0229 | $4,585 | $45,850 | $22,925 |
| **Haiku 5.5** | $0.0027 | $0.0023 | $0.0012 | $231 | $2,312 | $1,156 |
| Gemini 3.8 Flash | $0.0200 | $0.0173 | $0.0087 | $1,734 | $17,344 | $8,672 |
| Gemini 3.5 Flash-Lite | $0.0098 | $0.0088 | $0.0044 | $876 | $8,762 | $4,381 |
| Gemini 3.1 Flash-Lite | $0.0071 | $0.0062 | $0.0031 | $624 | $6,238 | $3,119 |
| **GPT-6 Luna** | $0.0027 | $0.0023 | $0.0012 | $231 | $2,312 | $1,156 |
| GPT-6.1 Sol | $0.0534 | $0.0458 | $0.0229 | $4,585 | $45,850 | $22,925 |
| DeepSeek V4.1-Flash peak / off-peak | $0.0075 / $0.0037 | $0.0063 / $0.0031 | no batch | $629 / $315 | $6,294 / $3,147 | n/a |
| gpt-oss-120b on Groq | $0.0037 | $0.0034* | no verified batch | $344 | $3,435 | n/a |
| Hybrid: Haiku (a,c) + Sonnet 5.5 (b) | $0.0426 | $0.0386 | $0.0193 | $3,859 | $38,592 | $19,296 |
| Hybrid: Haiku (a,c) + Gemini 3.8 Flash (b) | $0.0163 | $0.0148 | $0.0074 | $1,479 | $14,792 | $7,396 |
| Hybrid: Haiku (a,c) + Opus 5.5 (b) | $0.0846 | $0.0768 | $0.0384 | $7,679 | $76,792 | $38,396 |

*Groq cache discount unverified. Call (d), 20-page deck once per user: Haiku 5.5 ≈ $0.005, Sonnet ≈ $0.095, Gemini Flash-Lite ≈ $0.007; negligible.

The brief (call b) is ~80% of cost in every row. Haiku 5.5 and GPT-6 Luna are the price floor. Spread floor→Sonnet is 20x, →Opus 40x.

## 5. Recommendations

**(a) Cheapest acceptable stack.** Haiku 5.5 for all three per-prospect calls, batch where latency allows: ~$0.0012–0.0023/prospect, $230/mo at 100k, $1.2–2.3k/mo at 1M. Native JSON schema and PDF, 1M context, same provider as fallback. GPT-6 Luna is price-identical as a second source but lacks native PDF. Gate with an eval; if Haiku's citation fidelity fails, step the brief up to Sonnet 5.5 batch before Opus.

**(b) Routing.**
- (a) goal → search spec: Haiku 5.5.
- (b) brief with strict citations: Haiku 5.5 with a strict JSON schema whose `evidence_id` field is an enum of the actual IDs supplied (schema-enforced citations eliminate fabricated IDs at the parser level); run a cheap Haiku verifier pass that checks each claim against its cited passage (~$0.0005). Escalate to Sonnet 5.5 only on verifier failure (expect 5–15% → blended ~$0.005–0.008/prospect).
- (c) 60-word email: Haiku 5.5 with a cached few-shot system prompt.
- (d) deck profile: Haiku 5.5 PDF input, once per user.

**(c) Gateway.** Vercel AI Gateway: 0% markup, free BYOK on paid tier, budgets per key, ZDR option. OpenRouter costs 5.5% on credit purchases. Caveat: routing Anthropic through any gateway may complicate Batch API and prompt caching; hit Anthropic directly for the brief call and use a gateway for the long tail / A/B tests.

**(d) BYO-key tier.** Yes, as a premium feature. Precedent: Instantly, Clay, lemlist, Smartlead, Persana. Charge a flat per-prospect platform fee on BYOK runs.

**Unverified / gaps:** Gemini free-tier RPM/RPD; Vercel free-credit amount; Groq batch/cache discounts; Together/Fireworks/DeepInfra prices for Qwen3/Kimi/GLM/Llama 4; Instantly credit waiver with own key; Persana prices. Gemini Flash price doubles 2027-01-01.

---

## Appendix: cheap vs frontier on grounded extraction, citation faithfulness, structured JSON (sources checked 2026-10-10)

**Vectara Hallucination Leaderboard (HHEM-2.3)** — https://github.com/vectara/hallucination-leaderboard (updated Sep 22, 2026; vendor-judged). Cheap: gpt-5.4-nano 3.1%, gemini-2.5-flash-lite 3.3%, qwen3-8b 4.8%, qwen3-14b 5.4%, DeepSeek-V3.1 5.5%, gpt-5.4-mini 5.5%, DeepSeek-V3 6.1%, gemini-2.5-flash 7.8%, Llama-4-Scout 7.7%, Llama-4-Maverick 8.2%, gemini-3.1-flash-lite 8.2%, GLM-4.5-Air 9.3%, GLM-4.6 9.5%, claude-haiku-4.5 9.8%, gpt-5-nano 10.5%, gpt-5-mini 12.9%, gemini-3-flash 13.5%, Kimi-K2-0905 17.9%. Frontier: gpt-4.1 5.6%, gpt-4o 9.6%. Caveat: rewards under-extraction.

**Google FACTS Grounding** — paper (Dec 2025, https://arxiv.org/html/2512.10791v1): Gemini 2.5 Pro 74.2, Gemini 2.5 Flash 69.9, GPT-5 69.6, Claude 4.5 Opus 62.1, GPT-5 mini 58.3, Grok 4 Fast 43.1, o4-mini 29.3. Gemini Flash ≈ frontier; GPT mini loses 10–15 points. Kaggle Oct-2026 snapshot unverified.

**Artificial Analysis** — https://artificialanalysis.ai: closed-book recall, not grounding. Price positioning only: Claude Haiku 5.5 index 43 at $0.21/task, GLM-5.3-Flash 42 at $0.25, DeepSeek V4.1 Flash 39 at $0.27, Gemini 3.5 Flash-Lite 22 at $0.19, Opus 5.5 58/$5.98.

**Structured JSON** — Structured Output Benchmark (Apr 2026, https://arxiv.org/html/2604.25359): JSON validity ≥0.95 for nearly all; value accuracy GLM-4.7 0.830, Qwen3.5-35B 0.828, GPT-5.4 0.825, Gemini-2.5-Flash 0.822, Claude Sonnet 4.6 0.809, GPT-5 0.795, GPT-5-Mini 0.779. Failures: hallucinated values, numeric drift, truncation, dropped fields. JSONSchemaBench / VAREX / SO-Bench: deep `$defs`/nesting collapses small models; flatten schemas, use native structured-output mode, validate.

**Citation faithfulness / RAG** — Vectara FaithJudge (https://github.com/vectara/FaithJudge): gemini-2.5-flash 6.26% beats gemini-2.5-pro 6.65%, gpt-4.1 11.94%, gpt-4.1-mini 15.66%, gpt-4o-mini 18.59%, claude-sonnet-4 18.59%, llama-4-maverick 20.55%. Citation-verifier benchmark (Jul 2026, https://arxiv.org/html/2607.08700): GPT-5-mini best on source-relevance F1 0.908; cheap models competitive as verifiers. No 2025–26 study measures ID-mapping errors (right claim, wrong evidence ID) across ~8 documents; build your own eval.

**Conclusion (cheap ≤ ~$0.50/M input):** Good enough with guardrails: Gemini 2.5 Flash, Gemini 2.5 Flash-Lite, GPT-5.4 nano, DeepSeek V3.x, Qwen3 8B–32B. Marginal: GPT-5 mini, Haiku 4.5. Not good enough: Kimi K2, Gemini 3 Flash. Where cheap models break: completeness (under-extraction), value-level errors inside valid JSON (~18–22% of fields even for the best), deep schemas, parametric leakage with noisy context, unmeasured ID mapping. Mitigate with: enum-constrained evidence IDs, substring check of quoted spans, flat schemas, a verifier pass, and escalation on failure. Haiku 5.5 and GPT-6 Luna are too new to appear on these leaderboards; evaluate them yourself.
