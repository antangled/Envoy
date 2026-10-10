// Local stand-in for the Anthropic, Exa, and Hunter APIs so the live-key code paths can be tested without keys.
// Fictional test contacts use reserved example.* domains so no real company address appears in this file.
// Usage: node scripts/mock-apis.mjs  (port 4010). GET /__log lists calls.
import http from "node:http";

const log = [];
const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d ? JSON.parse(d) : {})); });

function message(model, obj) {
  return { id: "msg_mock", type: "message", role: "assistant", model, content: [{ type: "text", text: JSON.stringify(obj) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } };
}

function quoteFrom(text) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const start = Math.min(5, Math.max(0, words.length - 12));
  return words.slice(start, start + 9).join(" ");
}

function anthropic(body) {
  const sys = body.system?.[0]?.text ?? "";
  const schema = body.output_config?.format?.schema ?? {};
  const docs = (body.messages?.[0]?.content ?? []).filter((b) => b.type === "document" && b.source?.type === "text");
  const userText = (body.messages?.[0]?.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const kind = sys.includes("organization profile") ? "profile" : sys.includes("search specification") ? "spec" : sys.includes("research analyst") ? "brief" : sys.includes("whether each claim") ? "verify" : sys.includes("team or leadership") ? "team" : sys.includes("personalization slots") ? "slots" : "unknown";
  log.push({ api: "anthropic", kind, model: body.model, hasCache: !!body.system?.[0]?.cache_control, docs: docs.length });
  if (kind === "profile") return message(body.model, { org_name: "BEACN", tagline: "Student-run consulting.", one_liner: "a student-run sustainability consulting group at UC Berkeley", what_we_do: "Consulting projects.", proof_points: ["180+ projects for 150+ organizations"], service_catalog: ["market sizing", "competitive landscaping", "regulatory research"], team_structure: "BEACN projects are staffed by seven Berkeley students plus an MBA mentor from Haas" });
  if (kind === "spec") return message(body.model, { target_description: "growth-stage clean-energy hardware companies scaling manufacturing", seed_examples: [], geography: "San Francisco Bay Area", size_hint: "", criteria: [{ id: "c1", text: "Scaling manufacturing or launching a product" }, { id: "c2", text: "Hardware company in clean energy" }, { id: "c3", text: "Has an open strategic question" }], roles: [{ title: "VP Operations", checked: true }, { title: "Head of Strategy", checked: true }, { title: "Founder / CEO", checked: false }, { title: "Chief of Staff", checked: false }, { title: "Head of Product", checked: false }, { title: "VP Business Development", checked: false }], offer_phrase: "a semester-long project", season_label: "fall" });
  if (kind === "brief" || kind === "slots") {
    const evEnum = schema.properties?.hook?.properties?.evidence_ids?.items?.enum ?? docs.map((_, i) => `e${i + 1}`);
    const critEnum = schema.properties?.criteria?.items?.properties?.id?.enum ?? ["c1"];
    const company = (userText.match(/Target company: ([^(\n]+)/) || userText.match(/Company: ([^\n]+)/) || [, "the company"])[1].trim();
    const first = docs[0]?.source?.data ?? "";
    // Deliberate failure: Haiku invents a quote for Lightship, which must trigger escalation to Sonnet.
    const badQuote = kind === "brief" && body.model.includes("haiku") && /lightship/i.test(userText);
    const slots = {
      hook: { text: `${company}'s recent manufacturing expansion`, evidence_ids: [evEnum[0]], quotes: [badQuote ? "a sentence that appears nowhere in the evidence" : quoteFrom(first)] },
      ideas: ["market sizing", "competitive landscaping", "regulatory research"].map((s, i) => ({ title: ["Market targeting", "Competitor map", "Policy scan"][i], sentence: `Identify where ${company} is strongest using ${s}.`, service: s, evidence_ids: [evEnum[i % evEnum.length]] })),
      subject: `BEACN x ${company} collaboration?`,
    };
    if (kind === "slots") return message(body.model, slots);
    return message(body.model, {
      fit_score: 78,
      profile: `${company} builds clean-energy hardware.`,
      criteria: critEnum.map((id, i) => ({ id, status: i === 2 ? "unknown" : "supported", evidence_ids: i === 2 ? [] : [evEnum[i % evEnum.length]], note: "Mock note." })),
      mutual_benefit: [
        { claim: `${company} needs market data; BEACN does market sizing.`, basis: "evidenced", evidence_ids: [evEnum[0]] },
        { claim: "Both teams gain a case study.", basis: "evidenced", evidence_ids: [] },
      ],
      missing_information: [{ question: "Budget owner?", why_it_matters: "Routing.", how_to_verify: "Ask." }],
      recommended_roles: ["VP Operations"],
      ...slots,
    });
  }
  if (kind === "verify") {
    const ids = [...userText.matchAll(/Claim ([a-z]+:[a-z0-9]+):/g)].map((m) => m[1]);
    return message(body.model, { verdicts: ids.map((id, i) => ({ id, verdict: i === 1 ? "not_supported" : "supported" })) });
  }
  if (kind === "team") return message(body.model, { people: [{ name: "Jordan Lee", title: "VP Operations" }] });
  return message(body.model, {});
}

const EXA = [
  { url: "https://lightshiprv.com", title: "Lightship | All-electric RVs", highlights: ["All-electric travel trailers."] },
  { url: "https://www.antora.com", title: "Antora Energy", highlights: ["Thermal batteries for industry."] },
  { url: "https://www.linkedin.com/company/x", title: "Should be filtered", highlights: [] },
  { url: "https://www.silanano.com", title: "Sila - Battery materials", highlights: ["Silicon anode materials."] },
];

function hunter(path, q) {
  const domain = q.get("domain");
  log.push({ api: "hunter", path, domain });
  if (path === "/v2/domain-search") {
    if (domain === "lightshiprv.com") return { data: { pattern: "{first}.{last}", accept_all: false, organization: "Lightship", emails: [{ value: "avery.park@example.com", confidence: 96, first_name: "Avery", last_name: "Park", position: "VP Operations", seniority: "executive", department: "operations", linkedin: null, sources: [{ uri: "https://lightshiprv.com/company" }], verification: { status: "valid" } }] } };
    if (domain === "antora.com") return { data: { pattern: "{first}", accept_all: true, organization: "Antora", emails: [{ value: "sam.rivera@example.org", confidence: 80, first_name: "Sam", last_name: "Rivera", position: "Head of Strategy", seniority: "senior", department: "management", linkedin: "sam-rivera", sources: [], verification: { status: "accept_all" } }] } };
    return { data: { pattern: "{first}.{last}", accept_all: false, organization: null, emails: [] } };
  }
  if (path === "/v2/email-finder") return { data: { email: `${q.get("first_name")}.${q.get("last_name")}@example.net`.toLowerCase(), score: 92, verification: { status: null } } };
  return { data: null };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/__log") return send(res, 200, log);
  if (req.method === "POST" && url.pathname === "/v1/messages") return send(res, 200, anthropic(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/search") {
    const b = await readBody(req);
    log.push({ api: "exa", path: "/search", news: !!b.startPublishedDate });
    return send(res, 200, { results: b.startPublishedDate ? [] : EXA });
  }
  if (req.method === "POST" && url.pathname === "/findSimilar") return send(res, 200, { results: [] });
  if (req.method === "POST" && url.pathname === "/contents") { const b = await readBody(req); log.push({ api: "exa", path: "/contents", n: b.urls?.length }); return send(res, 200, { results: [] }); }
  if (req.method === "GET" && url.pathname.startsWith("/v2/")) return send(res, 200, hunter(url.pathname, url.searchParams));
  send(res, 404, { error: "not mocked", path: url.pathname });
}).listen(4010, () => console.log("mock APIs on :4010"));
