/**
 * Keyless fallback used only when ANTHROPIC_API_KEY is absent (demo mode).
 * It never invents facts: every hook quote and supported criterion is an exact sentence from fetched evidence.
 * Output is plainer than the model's and the UI labels it as a demo draft.
 */
import type { BriefAndSlots, SearchSpec } from "./schemas";
import type { EvidenceDoc } from "./validate";

const STOP = new Set("the and for with that this from have has are was were will into their they them your our about over more than also which what when where who how its it's been being such only other some most very just across within".split(" "));

const words = (s: string) => s.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g)?.filter((w) => !STOP.has(w)) ?? [];

function sentences(doc: EvidenceDoc) {
  return doc.text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 260 && /[a-z]/.test(s) && !/cookie|privacy|javascript|subscribe|©/i.test(s));
}

function season(goal: string) {
  const m = goal.match(/\b(fall|autumn|spring|summer|winter|q[1-4])\b/i);
  if (m) return m[1].toLowerCase().replace("autumn", "fall").replace(/^q/, "Q");
  const mo = new Date().getMonth();
  return mo >= 8 && mo <= 10 ? "fall" : mo <= 1 || mo === 11 ? "winter" : mo <= 4 ? "spring" : "summer";
}

export function heuristicSpec(goal: string, mode: "client" | "partnership"): SearchSpec {
  const client = mode === "client";
  const criteria = client
    ? [
        "Is actively growing, launching, or scaling something new",
        "Has a clear strategic question an outside team could help answer",
        "Works in the sector or market described in the goal",
        "Is a size where a small outside team can make a visible difference",
      ]
    : [
        "Serves customers or users that overlap with ours",
        "Offers a product or channel that complements ours",
        "Has partnered with other companies before",
        "Works in the sector or market described in the goal",
      ];
  const roles = client
    ? ["Founder / CEO", "Head of Strategy", "VP Operations", "Chief of Staff", "VP Business Development", "Head of Product", "Director of Marketing"]
    : ["Head of Partnerships", "VP Business Development", "Chief of Staff", "Founder / CEO", "Head of Product", "Director of Alliances", "Head of Growth"];
  return {
    target_description: goal,
    seed_examples: [],
    geography: "",
    size_hint: "",
    criteria: criteria.map((text, i) => ({ id: `c${i + 1}`, text })),
    roles: roles.map((title, i) => ({ title, checked: i < 3 })),
    offer_phrase: client ? "a focused project" : "a partnership",
    season_label: season(goal),
  };
}

const NEWSY = /\b(launch|launched|announc|expand|raise[ds]?|funding|partner|introduc|unveil|opens?|opened|new|grow|scal|million|capacity|deploy|first|only)\w*/i;
/** Founder bios and job-ad boilerplate describe people, not the company's priorities. */
const BIO = /\b(she|he|her|his|began (her|his) career|spent \w+ years|previously|graduated|holds an? |phd|mba|we're hiring|apply now|benefits|equal opportunity|backed by|investors?|board of|advisors?|copyright|all rights)\b/i;
const KIND_RANK: Record<string, number> = { news: 0, home: 1, about: 2, product: 3, page: 4, careers: 5, team: 6 };
const GENERIC_CRIT = new Set("company companies organization organizations clear something visible difference outside small team help answer question described market sector goal works size where make other ours ours with have".split(" "));

const IDEA_FRAMES: [RegExp, string][] = [
  [/market siz|tam|addressable/i, "Estimate the addressable market for"],
  [/competit|landscap|benchmark/i, "Map the competitors and alternatives to"],
  [/regulat|policy|compliance|incentive/i, "Summarize the regulations and incentives that shape"],
  [/supply|procure|sourcing|manufactur/i, "Map supply-chain risks and options behind"],
  [/data|survey|research/i, "Gather and structure customer and market data on"],
  [/go-to-market|gtm|pricing|channel|partner/i, "Test pricing and channel options for"],
];

/** Shortest clause of a sentence that still says something (8+ words), kept verbatim so it remains an exact quote. */
function clause(s: string, maxWords = 16) {
  const parts = s.replace(/[.!?]$/, "").split(/,\s+|\s+[—–-]\s+|;\s+/).map((x) => x.trim());
  const good = parts.find((x) => x.split(/\s+/).length >= 6) ?? parts[0];
  const w = good.split(/\s+/);
  return w.length > maxWords ? w.slice(0, maxWords).join(" ") : good;
}

export function heuristicBrief(args: {
  company: string;
  docs: (EvidenceDoc & { kind?: string })[];
  spec: SearchSpec;
  roles: string[];
  orgName: string;
  catalog: string[];
}): BriefAndSlots {
  const { company, docs, spec, roles, orgName } = args;
  const catalog = args.catalog.length ? args.catalog : ["market research", "competitive analysis", "go-to-market strategy"];
  const all = docs
    .flatMap((d) => sentences(d).map((s) => ({ eid: d.eid, s, rank: KIND_RANK[d.kind ?? "page"] ?? 4 })))
    .filter((x) => !BIO.test(x.s));
  const used = new Set<string>();

  // Conservative: a criterion is "supported" only if an unused sentence shares the criterion's own distinctive word stems
  // (two stems, or one stem when the criterion has few distinctive words). Each sentence backs at most one criterion.
  const stem = (w: string) => w.slice(0, 5);
  const criteria = spec.criteria.map((c) => {
    const kw = new Set(words(c.text).filter((w) => !GENERIC_CRIT.has(w)).map(stem));
    const need = kw.size >= 5 ? 2 : 1;
    let best: { eid: string; s: string; score: number } | null = null;
    for (const x of all) {
      if (used.has(x.s) || x.s.length < 60) continue;
      const score = new Set(words(x.s).map(stem).filter((w) => kw.has(w))).size;
      if (score >= need && (!best || score > best.score)) best = { ...x, score };
    }
    if (best) used.add(best.s);
    return best
      ? { id: c.id, status: "supported" as const, evidence_ids: [best.eid], note: `Their site says: "${clause(best.s, 22)}".` }
      : { id: c.id, status: "unknown" as const, evidence_ids: [], note: "Not determinable from the pages read. An AI brief reads them more closely." };
  });

  const nameKey = company.toLowerCase().split(/\s+/)[0];
  const score = (x: { s: string; rank: number }) =>
    (NEWSY.test(x.s) ? 3 : 0) + (x.s.toLowerCase().includes(nameKey) ? 3 : 0) + (x.s.length >= 80 ? 2 : x.s.length >= 60 ? 1 : -3) - x.rank * 0.5;
  const ranked = [...all].sort((a, b) => score(b) - score(a));
  const hookS = ranked[0];
  const usedFacts = new Set<string>(hookS ? [hookS.s] : []);
  const ideas = [0, 1, 2].map((i) => {
    const service = catalog[i % catalog.length];
    const f = ranked.find((r) => !usedFacts.has(r.s)) ?? hookS;
    if (f) usedFacts.add(f.s);
    const frame = IDEA_FRAMES.find(([re]) => re.test(service))?.[1] ?? `Scope a ${service} workstream on`;
    return {
      title: service.charAt(0).toUpperCase() + service.slice(1),
      sentence: f ? `${frame} what ${company} describes as "${clause(f.s, 12)}".` : `${frame} ${company}'s current priorities.`,
      service,
      evidence_ids: f ? [f.eid] : [],
    };
  });

  const supported = criteria.filter((c) => c.status === "supported").length;
  const quote = hookS ? clause(hookS.s, 18) : "";
  return {
    fit_score: Math.min(70, 30 + supported * 10 + (hookS ? 5 : 0)),
    profile: hookS
      ? `In its own words: "${clause(hookS.s, 30)}." This is a demo draft assembled from ${company}'s site; add an Anthropic API key for an AI-written profile.`
      : `Little public information was found for ${company}.`,
    criteria,
    mutual_benefit: [
      ...(hookS ? [{ claim: `${company} describes its focus as "${clause(hookS.s, 14)}", where ${orgName}'s ${catalog[0]} could help.`, basis: "evidenced" as const, evidence_ids: [hookS.eid] }] : []),
      { claim: `${orgName} gains a concrete engagement with a company in the target market.`, basis: "inferred" as const, evidence_ids: [] },
    ],
    missing_information: [
      { question: "Who owns this initiative internally?", why_it_matters: "Determines who should receive the email.", how_to_verify: "Check the team or leadership page, or ask on the first call." },
      { question: "Do they already work with outside advisors on this?", why_it_matters: "Affects how to position the proposal.", how_to_verify: "Ask directly; check press releases for named partners." },
    ],
    recommended_roles: roles.slice(0, 3),
    hook: hookS ? { text: `how ${company} describes itself: "${quote}"`, evidence_ids: [hookS.eid], quotes: [quote] } : { text: `${company}'s work`, evidence_ids: [], quotes: [] },
    ideas,
    subject: `${orgName} x ${company} collaboration?`.slice(0, 60),
  };
}
