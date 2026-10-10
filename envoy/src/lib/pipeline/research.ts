import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { callStructured, llmAvailable, MODELS, textDoc } from "@/lib/llm/client";
import { BRIEF_SYSTEM, VERIFIER_SYSTEM } from "@/lib/llm/prompts";
import { BriefAndSlotsZ, VerdictsZ, briefSchema, verdictsSchema, type BriefAndSlots } from "@/lib/llm/schemas";
import { applyVerdicts, claimsForVerifier, validateBrief, type EvidenceDoc } from "@/lib/llm/validate";
import { heuristicBrief } from "@/lib/llm/heuristic";
import { forModel, gatherEvidence } from "./evidence";
import { findContacts, isSendable } from "./contacts";
import { renderDraft, upsertDraft } from "./draft";
import type { OrgRow } from "./org";

type Campaign = typeof schema.campaigns.$inferSelect;
type Prospect = typeof schema.prospects.$inferSelect;
export type Progress = { prospectId: number; stage: string; detail?: string };

async function aiBrief(org: OrgRow, c: Campaign, p: Prospect, docs: EvidenceDoc[], model: string) {
  const spec = c.searchSpec!;
  const criteriaText = spec.criteria.map((x) => `${x.id}: ${x.text}`).join("\n");
  return callStructured<BriefAndSlots>({
    system: BRIEF_SYSTEM({ org_name: org.orgName, one_liner: org.oneLiner, service_catalog: org.serviceCatalog }, c.mode),
    content: [
      ...docs.map((d) => textDoc(d.text, d.url, `evidence id ${d.eid} (${d.title})`)),
      {
        type: "text",
        text: `Target company: ${p.name} (${p.domain})\nSender's goal: ${c.goalText}\nCriteria:\n${criteriaText}\nRoles the sender wants to reach: ${c.rolesSelected.join(", ")}\nProduce the brief and slots.`,
      },
    ],
    schema: briefSchema(docs.map((d) => d.eid), spec.criteria.map((x) => x.id)),
    parse: BriefAndSlotsZ,
    model,
    effort: "high",
    maxTokens: 12000,
  });
}

async function verify(b: BriefAndSlots, docs: EvidenceDoc[], c: Campaign, log: string[]) {
  const claims = claimsForVerifier(b, docs, new Map(c.searchSpec!.criteria.map((x) => [x.id, x.text])));
  if (!claims.length) return 0;
  const r = await callStructured({
    system: VERIFIER_SYSTEM,
    content: [{ type: "text", text: claims.map((x) => `Claim ${x.id}: ${x.claim}\nPassages:\n${x.passages}`).join("\n\n---\n\n") }],
    schema: verdictsSchema,
    parse: VerdictsZ,
    effort: "low",
    maxTokens: 3000,
  });
  return applyVerdicts(b, r.data.verdicts, log);
}

/** Evidence → brief + slots (one call) → validation → verifier → optional escalation → contacts → draft. */
export async function researchProspect(org: OrgRow, c: Campaign, prospect: Prospect, emit: (e: Progress) => void) {
  let p = prospect;
  const db = await getDb();
  const setStatus = (status: string, skipReason?: string) =>
    db.update(schema.prospects).set({ status, skipReason: skipReason ?? null }).where(eq(schema.prospects.id, p.id));

  emit({ prospectId: p.id, stage: "reading", detail: `Reading ${p.domain}` });
  const rows = await gatherEvidence(p.domain, p.name);
  const docs = forModel(rows);
  if (!docs.length) {
    await setStatus("skipped", "Couldn't read the company's website.");
    emit({ prospectId: p.id, stage: "skipped", detail: "Website unreachable" });
    return;
  }
  await setStatus("researched");
  // Companies added by website get a name guessed from the domain; prefer the name the site uses for itself.
  const home = rows.find((r) => r.kind === "home");
  if (p.source === "manual" && home?.title) {
    const parts = home.title.split(/\s+[|\-–—:·]\s+/).map((x) => x.trim()).filter(Boolean);
    const key = p.domain.split(".")[0].replace(/[^a-z]/g, "");
    const name = parts.find((x) => x.toLowerCase().replace(/[^a-z]/g, "").includes(key.slice(0, 4))) ?? parts.at(-1);
    if (name && name.length <= 40) {
      p = { ...p, name };
      await db.update(schema.prospects).set({ name }).where(eq(schema.prospects.id, p.id));
    }
  }

  emit({ prospectId: p.id, stage: "briefing", detail: `Writing brief from ${docs.length} pages` });
  let brief: BriefAndSlots;
  let modelUsed: string;
  const log: string[] = [];
  if (llmAvailable()) {
    let r = await aiBrief(org, c, p, docs, MODELS.fast);
    let v = validateBrief(r.data, docs, org.serviceCatalog);
    modelUsed = r.model;
    v.problems += await verify(v.brief, docs, c, v.log).catch((e) => (v.log.push(`verifier skipped: ${e.message}`), 0));
    if (v.hookFailed || v.problems > 1) {
      v.log.push(`escalated to ${MODELS.strong} after ${v.problems} problem(s)`);
      emit({ prospectId: p.id, stage: "briefing", detail: "Double-checking with a stronger model" });
      const prevLog = v.log;
      r = await aiBrief(org, c, p, docs, MODELS.strong);
      v = validateBrief(r.data, docs, org.serviceCatalog);
      await verify(v.brief, docs, c, v.log).catch(() => 0);
      v.log = [...prevLog.map((l) => `first pass: ${l}`), ...v.log.map((l) => `re-check: ${l}`)];
      modelUsed = r.model;
    }
    brief = v.brief;
    log.push(...v.log);
  } else {
    const h = heuristicBrief({ company: p.name, docs, spec: c.searchSpec!, roles: c.rolesSelected, orgName: org.orgName, catalog: org.serviceCatalog });
    const v = validateBrief(h, docs, org.serviceCatalog);
    brief = v.brief;
    log.push("demo draft: written by rules from fetched pages (no AI key)", ...v.log);
    modelUsed = "demo-rules";
  }
  const evidenceIds = Object.fromEntries(docs.map((d) => [d.eid, d.rowId]));
  await db
    .insert(schema.briefs)
    .values({ prospectId: p.id, data: brief, evidenceIds, evidenceCount: docs.length, modelUsed, validationLog: log })
    .onConflictDoUpdate({ target: schema.briefs.prospectId, set: { data: brief, evidenceIds, evidenceCount: docs.length, modelUsed, validationLog: log, createdAt: new Date() } });
  await setStatus("briefed");

  emit({ prospectId: p.id, stage: "contacts", detail: "Finding the right person" });
  const roles = [...new Set([...c.rolesSelected, ...brief.recommended_roles])];
  const found = await findContacts({ domain: p.domain, roles, evidence: rows, website: p.website });
  await db.delete(schema.contacts).where(eq(schema.contacts.prospectId, p.id));
  const inserted = await db
    .insert(schema.contacts)
    .values(found.map((f, i) => ({ prospectId: p.id, name: f.name, firstName: f.firstName, lastName: f.lastName, title: f.title, email: f.email, emailStatus: f.emailStatus, confidence: f.confidence, source: f.source, sourceUrl: f.sourceUrl, linkedinUrl: f.linkedinUrl, isPrimary: i === 0 })))
    .returning();
  const primary = inserted.find((x) => x.isPrimary) ?? null;
  await setStatus("contacted");

  const { subject, body } = renderDraft(org, c, p.name, primary, brief);
  const sendable = !!primary && isSendable(primary.emailStatus);
  const notMet = brief.criteria.filter((x) => x.status === "not_met").length;
  await upsertDraft(p.id, primary?.id ?? null, subject, body, sendable && notMet < 2);
  await setStatus("drafted");
  emit({ prospectId: p.id, stage: "done", detail: sendable ? `Draft ready for ${primary?.name || primary?.email}` : "Draft ready; no sendable contact found" });
}

export async function updateShortfall(campaignId: number) {
  const db = await getDb();
  const [c] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, campaignId));
  const ps = (await db.select().from(schema.prospects).where(eq(schema.prospects.campaignId, campaignId))).filter((p) => p.selected);
  const briefsRows = await db.select().from(schema.briefs);
  const contactRows = await db.select().from(schema.contacts);
  let unreachable = 0, weak = 0, noContact = 0, ready = 0;
  for (const p of ps) {
    if (p.status === "skipped") { unreachable++; continue; }
    const b = briefsRows.find((x) => x.prospectId === p.id);
    if (!b) continue;
    const notMet = b.data.criteria.filter((x) => x.status === "not_met").length;
    const prim = contactRows.find((x) => x.prospectId === p.id && x.isPrimary);
    if (notMet >= 2) weak++;
    else if (!prim || !isSendable(prim.emailStatus)) noContact++;
    else ready++;
  }
  const reasons: string[] = [];
  if (ready < c.contactCount) reasons.push(`${ready} of ${c.contactCount} requested are ready to send.`);
  if (weak) reasons.push(`${weak} failed two or more criteria.`);
  if (noContact) reasons.push(`${noContact} had no reachable named contact.`);
  if (unreachable) reasons.push(`${unreachable} had websites we couldn't read.`);
  await db.update(schema.campaigns).set({ shortfall: reasons, status: "review" }).where(eq(schema.campaigns.id, campaignId));
  return reasons;
}
