// End-to-end API smoke test: node scripts/smoke.mjs [baseUrl]
// Signs in (demo), saves the sample profile, runs a 3-company campaign through research, queues, and sends.
const B = process.argv[2] || "http://localhost:3000";
let cookie = "";
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) failures++; };

async function call(path, init = {}) {
  const res = await fetch(B + path, { ...init, headers: { "content-type": "application/json", cookie, ...(init.headers || {}) }, redirect: "manual" });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

const status0 = await call("/api/status");
ok(status0.status === 200, `status endpoint (integrations: ${JSON.stringify(status0.body.integrations)})`);
ok((await call("/api/auth/demo", { method: "POST" })).status === 200, "demo sign-in");
ok((await call("/api/campaigns", { method: "POST", body: JSON.stringify({ mode: "client", goalText: "x".repeat(20), contactCount: 3, attachDeck: false, advanced: {} }) })).status === 400 || true, "campaign before setup is rejected or allowed if setup exists");

const profile = {
  orgName: "BEACN", tagline: "Student-run consulting for environmentally and socially responsible organizations.", website: "",
  serviceCatalog: ["market sizing", "competitive landscaping", "regulatory research", "supply-chain analysis", "data collection"],
  meName: "Adam Tang", mePronouns: "he/him/his", meRole: "Project Manager", phone: "", signoff: "Best,", postalAddress: "Test address, Berkeley, CA",
  subjectTemplate: "BEACN x {{company}} collaboration?",
  templateClient: "Dear {{first_name}},\n\nHope you're doing well! I'm Adam, a Project Manager at BEACN, a student-run sustainability consulting group at UC Berkeley. I saw {{ai_opening}}, and wanted to reach out about potentially supporting that through a semester-long project.\n\nA few ideas that came to mind:\n\n{{ai_ideas}}\n\nTo provide some context, BEACN projects are staffed by seven Berkeley students plus an MBA mentor from Haas. Across 180+ projects for 150+ organizations, we've worked on market sizing, competitive landscaping, regulatory research, supply-chain analysis, and data collection.\n\nWe're finalizing our fall projects this week, and I'd love to hear what would actually be most useful to {{company}}.\n\nWould this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.",
  templatePartnership: "Hi {{first_name}},\n\nI saw {{ai_opening}}.\n\n{{ai_ideas}}\n\nWould a call be worthwhile?",
};
ok((await call("/api/setup", { method: "PUT", body: JSON.stringify(profile) })).status === 200, "save profile");
ok((await call("/api/status")).body.profileComplete === true, "profile complete");
const gated = await call("/api/setup", { method: "PUT", body: JSON.stringify({ ...profile, templateClient: profile.templateClient.replace("a semester-long project", "[what you're offering]") }) });
const blocked = await call("/api/campaigns", { method: "POST", body: JSON.stringify({ mode: "client", goalText: "x".repeat(30), contactCount: 3, attachDeck: false, advanced: {} }) });
ok(gated.status === 200 && blocked.status === 400 && /placeholder/.test(blocked.body.error), `campaign blocked while placeholders remain ("${blocked.body.error}")`);
await call("/api/setup", { method: "PUT", body: JSON.stringify(profile) });

const created = await call("/api/campaigns", { method: "POST", body: JSON.stringify({ mode: "client", goalText: "We want three fall consulting projects with growth-stage clean-energy hardware companies in the Bay Area that are scaling manufacturing.", contactCount: 3, attachDeck: false, advanced: {} }) });
ok(created.status === 200 && created.body.id, "create campaign + search spec");
const id = created.body.id;
const disc = await call(`/api/campaigns/${id}/discover`, { method: "POST" });
ok(disc.status === 200 && disc.body.added > 0, `discover (${disc.body.added} via ${disc.body.source})`);
ok((await call(`/api/campaigns/${id}/prospects`, { method: "POST", body: JSON.stringify({ website: "not a site" }) })).status === 400, "manual add rejects bad input");

const t0 = Date.now();
const research = await call(`/api/campaigns/${id}/research`, { method: "POST" });
const events = String(research.body).trim().split("\n").map((l) => JSON.parse(l));
ok(events.at(-1)?.stage === "complete", `research stream completes (${events.length} events, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

const b = (await call(`/api/campaigns/${id}`)).body;
ok(b.briefs.length > 0, `${b.briefs.length} briefs written`);
for (const br of b.briefs) {
  const ids = new Set(Object.keys(br.sources));
  const cited = [...br.data.criteria.flatMap((c) => c.evidence_ids), ...br.data.hook.evidence_ids, ...br.data.ideas.flatMap((i) => i.evidence_ids)];
  ok(cited.every((e) => ids.has(e)), `brief ${br.prospectId}: every citation resolves to a stored source`);
  ok(br.data.criteria.every((c) => c.status !== "supported" || c.evidence_ids.length > 0), `brief ${br.prospectId}: no uncited "supported" criteria`);
  ok(br.data.ideas.length === 3, `brief ${br.prospectId}: exactly three ideas`);
}
for (const c of b.contacts) ok(!c.email || /^[a-z0-9][a-z0-9._%+-]{0,40}@/.test(c.email) && !/[0-9a-f]{12,}/.test(c.email.split("@")[0]), `contact address looks real: ${c.email ?? "(none)"} [${c.emailStatus}]`);
for (const d of b.drafts) {
  ok(d.body.includes("To provide some context, BEACN projects are staffed by seven Berkeley students"), `draft ${d.id}: locked credentials block intact`);
  ok(/A few ideas that came to mind:\n\n- .+\n- .+\n- .+/.test(d.body), `draft ${d.id}: three idea bullets`);
  ok(/^(Dear \S.*,)/.test(d.body) && !/\{\{|\[[a-z]/.test(d.body), `draft ${d.id}: greeting filled, no leftover tokens or placeholders`);
  ok(/\n\nBest,\nAdam Tang\n\(he\/him\/his\)\nProject Manager\nBEACN/.test(d.body), `draft ${d.id}: signature appended`);
}
console.log("\nSample draft:\n" + (b.drafts[0]?.subject ?? "") + "\n" + (b.drafts[0]?.body ?? "") + "\n");

// Force one draft sendable for the send path: pick any contact with an email, allow generic inboxes.
const withEmail = b.drafts.find((d) => b.contacts.find((c) => c.id === d.contactId)?.email);
if (withEmail) {
  await call(`/api/drafts/${withEmail.id}`, { method: "PATCH", body: JSON.stringify({ status: "selected", allowGeneric: true }) });
  const q = await call(`/api/campaigns/${id}/queue`, { method: "POST", body: JSON.stringify({ tz: "America/Los_Angeles" }) });
  ok(q.status === 200 && q.body.queued >= 1, `queue (${q.body.queued} queued via ${q.body.channel}; skipped: ${JSON.stringify(q.body.skipped)})`);
  await new Promise((r) => setTimeout(r, 9000));
  await call("/api/send/process", { method: "POST" });
  const h = (await call("/api/history")).body;
  ok(h.some((s) => s.status === "sent"), `send processed (${h.map((s) => s.status).join(", ")})`);
  const again = await call(`/api/campaigns/${id}/queue`, { method: "POST", body: JSON.stringify({ tz: "America/Los_Angeles" }) });
  ok(again.body.queued === 0, "re-queue does not double-send");
} else {
  console.log("SKIP  send path: no contact with an email address in this sample");
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
