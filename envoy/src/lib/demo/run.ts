import "server-only";
import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Progress } from "@/lib/pipeline/research";
import { renderDraft, upsertDraft } from "@/lib/pipeline/draft";
import type { OrgRow } from "@/lib/pipeline/org";
import { BEACN_PROFILE } from "@/lib/template/beacn";
import { DEMO_COMPANIES, demoCompany, sourceUrl, type DemoCompany } from "./fixtures";

type User = typeof schema.users.$inferSelect;
type Campaign = typeof schema.campaigns.$inferSelect;
type Prospect = typeof schema.prospects.$inferSelect;
type Contact = typeof schema.contacts.$inferSelect;

/**
 * The demo account runs on scripted data and never calls Claude, Exa, Hunter, or Gmail.
 * ENVOY_DEMO_LIVE=1 turns that off so the end-to-end smoke test can drive the real pipeline against mock APIs.
 */
export const isScriptedDemo = (u: Pick<User, "isDemo"> | null | undefined) => !!u?.isDemo && process.env.ENVOY_DEMO_LIVE !== "1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Deletes everything a demo account created: campaigns, prospects, briefs, contacts, drafts, sends, exclusions. */
async function purgeDemoData(userId: number) {
  const db = await getDb();
  const cs = await db.select({ id: schema.campaigns.id }).from(schema.campaigns).where(eq(schema.campaigns.userId, userId));
  const cIds = cs.map((c) => c.id);
  if (cIds.length) {
    const ps = await db.select({ id: schema.prospects.id }).from(schema.prospects).where(inArray(schema.prospects.campaignId, cIds));
    const pIds = ps.map((p) => p.id);
    await db.delete(schema.sends).where(inArray(schema.sends.campaignId, cIds));
    if (pIds.length) {
      await db.delete(schema.drafts).where(inArray(schema.drafts.prospectId, pIds));
      await db.delete(schema.contacts).where(inArray(schema.contacts.prospectId, pIds));
      await db.delete(schema.briefs).where(inArray(schema.briefs.prospectId, pIds));
      await db.delete(schema.prospects).where(inArray(schema.prospects.id, pIds));
    }
    await db.delete(schema.campaigns).where(inArray(schema.campaigns.id, cIds));
  }
  await db.delete(schema.exclusions).where(eq(schema.exclusions.userId, userId));
  await db.delete(schema.suppressions).where(eq(schema.suppressions.userId, userId));
}

/** Each "Try the demo" starts fresh: the visitor's own demo data is cleared and the sample profile is restored. */
export async function resetDemo(userId: number) {
  const db = await getDb();
  await purgeDemoData(userId);
  const values = {
    ...BEACN_PROFILE,
    // The demo has no deck uploaded, so the email shouldn't promise one.
    templateClient: BEACN_PROFILE.templateClient.replace(" (More info in deck attached)", ""),
    meFirstName: BEACN_PROFILE.meName.split(/\s+/)[0],
    oneLiner: "a student-run sustainability consulting group at UC Berkeley",
    website: "",
    phone: "",
    postalAddress: "",
    signoff: "Best,",
    updatedAt: new Date(),
  };
  await db.insert(schema.orgProfiles).values({ userId, ...values }).onConflictDoUpdate({ target: schema.orgProfiles.userId, set: values });
}

/**
 * Every visitor gets a private demo account, so many people can try the demo at once without resetting each other.
 * Demo accounts older than two days are removed along with everything they created.
 */
export async function newDemoUser() {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: `demo-${crypto.randomUUID()}@envoy.local`, isDemo: true }).returning();
  return u;
}

export async function cleanupOldDemos() {
  const db = await getDb();
  const old = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.isDemo, true), lt(schema.users.createdAt, new Date(Date.now() - 2 * 864e5))))
    .limit(25);
  for (const { id } of old) {
    await purgeDemoData(id);
    await db.delete(schema.orgProfiles).where(eq(schema.orgProfiles.userId, id));
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }
}

/** Finding organizations: a short wait so the progress screen plays, then the sample list. */
export async function demoDiscover(c: Campaign) {
  await sleep(4500);
  const db = await getDb();
  const rows = DEMO_COMPANIES.map((d) => ({
    campaignId: c.id,
    name: d.name,
    domain: d.domain,
    website: `https://${d.domain}`,
    reason: d.reason,
    reasonUrl: sourceUrl(d.domain, d.reasonSlug),
    source: "demo",
    selected: true,
  }));
  await db.insert(schema.prospects).values(rows).onConflictDoNothing();
  // The demo always has its six sample companies, so the campaign asks for exactly that many.
  const shortfall: string[] = [];
  await db.update(schema.campaigns).set({ status: "targets", shortfall, contactCount: rows.length }).where(eq(schema.campaigns.id, c.id));
  return { added: rows.length, source: "demo" as const, shortfall };
}

const STATUS = { v: "verified", r: "accept_all", u: "unknown", n: "not_found", g: "published_generic" } as const;
const emailFor = (name: string, domain: string) => `${name.toLowerCase().replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".")}@${domain}`;

/** Research for one company, paced like the real pipeline so each stage is visible. */
export async function demoResearch(org: OrgRow, c: Campaign, p: Prospect, emit: (e: Progress) => void, stagger: number) {
  const d = demoCompany(p.domain);
  const db = await getDb();
  const setStatus = (status: string, skipReason?: string) => db.update(schema.prospects).set({ status, skipReason: skipReason ?? null }).where(eq(schema.prospects.id, p.id));
  await sleep(stagger);
  if (!d) {
    await setStatus("skipped", "The demo only has sample data for its six companies.");
    emit({ prospectId: p.id, stage: "skipped", detail: "No sample data for this company" });
    return;
  }

  emit({ prospectId: p.id, stage: "reading", detail: `Reading ${p.domain}` });
  await sleep(1400);
  const evidenceIds: Record<string, number> = {};
  for (const [i, pg] of d.pages.entries()) {
    const url = sourceUrl(d.domain, pg.slug);
    const row = { domain: d.domain, url, title: pg.title, text: pg.text, kind: pg.kind, emails: [] as string[], source: "demo", fetchedAt: new Date() };
    const [ev] = await db
      .insert(schema.evidence)
      .values(row)
      .onConflictDoUpdate({ target: [schema.evidence.domain, schema.evidence.url], set: { title: row.title, text: row.text, kind: row.kind, fetchedAt: row.fetchedAt } })
      .returning();
    evidenceIds[`e${i + 1}`] = ev.id;
  }
  await setStatus("researched");

  emit({ prospectId: p.id, stage: "briefing", detail: `Writing brief from ${d.pages.length} pages` });
  await sleep(2200);
  const log = [
    "Sample brief for the demo: written in advance from the sample pages listed below, so the demo uses no AI credits.",
    `Every citation points to one of the ${d.pages.length} sample pages, and the quoted opening appears word for word on its source page.`,
  ];
  await db
    .insert(schema.briefs)
    .values({ prospectId: p.id, data: d.brief, evidenceIds, evidenceCount: d.pages.length, modelUsed: "demo-sample", validationLog: log })
    .onConflictDoUpdate({ target: schema.briefs.prospectId, set: { data: d.brief, evidenceIds, evidenceCount: d.pages.length, modelUsed: "demo-sample", validationLog: log, createdAt: new Date() } });
  await setStatus("briefed");

  emit({ prospectId: p.id, stage: "contacts", detail: "Finding the right people" });
  await sleep(1200);
  await db.delete(schema.contacts).where(eq(schema.contacts.prospectId, p.id));
  const people = d.people.slice(0, Math.max(1, c.peoplePerCompany + 1));
  const inserted = await db
    .insert(schema.contacts)
    .values(
      people.map(([name, title, s], i) => {
        const generic = s === "g";
        const [first, ...rest] = name.split(" ");
        return {
          prospectId: p.id,
          name: generic ? null : name,
          firstName: generic ? null : first,
          lastName: generic ? null : rest.at(-1) ?? null,
          title: generic ? null : title,
          email: generic ? `hello@${d.domain}` : s === "n" ? null : emailFor(name, d.domain),
          emailStatus: STATUS[s],
          confidence: s === "n" ? null : s === "g" ? null : s === "v" ? 96 : 78,
          source: generic ? "published" : s === "n" ? "exa" : "hunter",
          sourceUrl: sourceUrl(d.domain, generic ? "home" : d.pages.find((x) => x.kind === "about")?.slug ?? "home"),
          linkedinUrl: null,
          isPrimary: i === 0,
          selected: i === 0,
        };
      }),
    )
    .returning();
  await setStatus("contacted");

  const primary = inserted.find((x) => x.isPrimary) ?? null;
  const { subject, body } = renderDraft(org, c, p.name, primary, d.brief);
  const notMet = d.brief.criteria.filter((x) => x.status === "not_met").length;
  await upsertDraft(p.id, primary?.id ?? null, subject, body, notMet < 1);
  await setStatus("drafted");
  emit({ prospectId: p.id, stage: "done", detail: `Draft ready for ${primary?.name ?? "the company"}` });
}

/** "Find email" in the demo: a short pause, then a found address for most people and an honest miss for the rest. */
export async function demoFindEmail(contact: Contact, prospect: Prospect) {
  await sleep(900);
  const db = await getDb();
  const miss = (contact.name ?? "").length % 3 === 0;
  if (miss || !contact.name) {
    await db.update(schema.contacts).set({ confidence: 0 }).where(eq(schema.contacts.id, contact.id));
    return { found: false as const };
  }
  const email = emailFor(contact.name, prospect.domain);
  await db.update(schema.contacts).set({ email, emailStatus: "verified", confidence: 94, source: "exa+hunter" }).where(and(eq(schema.contacts.id, contact.id)));
  return { found: true as const, email };
}

export type { DemoCompany };
