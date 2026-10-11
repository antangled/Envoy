import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError } from "@/lib/session";

export async function ownedCampaign(userId: number, id: number) {
  const db = await getDb();
  const [c] = await db.select().from(schema.campaigns).where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.userId, userId)));
  if (!c) throw new HttpError(404, "Campaign not found.");
  return c;
}

export async function campaignBundle(userId: number, id: number) {
  const db = await getDb();
  const c = await ownedCampaign(userId, id);
  const prospects = await db.select().from(schema.prospects).where(eq(schema.prospects.campaignId, id)).orderBy(schema.prospects.id);
  const ids = prospects.map((p) => p.id);
  const [briefs, contacts, drafts, sends] = ids.length
    ? await Promise.all([
        db.select().from(schema.briefs).where(inArray(schema.briefs.prospectId, ids)),
        db.select().from(schema.contacts).where(inArray(schema.contacts.prospectId, ids)).orderBy(schema.contacts.id),
        db.select().from(schema.drafts).where(inArray(schema.drafts.prospectId, ids)),
        db.select().from(schema.sends).where(eq(schema.sends.campaignId, id)).orderBy(desc(schema.sends.scheduledAt)),
      ])
    : [[], [], [], []];
  const evIds = briefs.flatMap((b) => Object.values(b.evidenceIds));
  const ev = evIds.length ? await db.select({ id: schema.evidence.id, url: schema.evidence.url, title: schema.evidence.title, kind: schema.evidence.kind }).from(schema.evidence).where(inArray(schema.evidence.id, evIds)) : [];
  const evById = new Map(ev.map((e) => [e.id, e]));
  return {
    campaign: c,
    prospects,
    briefs: briefs.map((b) => ({
      ...b,
      sources: Object.fromEntries(Object.entries(b.evidenceIds).map(([eid, rowId]) => [eid, evById.get(rowId) ?? null])),
    })),
    contacts,
    drafts,
    sends,
  };
}
