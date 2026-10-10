import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { renderSegments, segmentsToText, type Mode } from "@/lib/template/render";
import type { BriefAndSlots } from "@/lib/llm/schemas";
import { orgForRender, type OrgRow } from "./org";

type Campaign = typeof schema.campaigns.$inferSelect;
type Contact = typeof schema.contacts.$inferSelect;

export function renderDraft(org: OrgRow, c: Campaign, companyName: string, contact: Contact | null, brief: BriefAndSlots) {
  const segs = renderSegments({
    mode: c.mode as Mode,
    org: orgForRender(org),
    campaign: { offerPhrase: c.searchSpec?.offer_phrase || "a focused project", seasonLabel: c.searchSpec?.season_label || "upcoming", attachDeck: c.attachDeck },
    company: { name: companyName },
    contact: { firstName: contact?.firstName ?? null },
    slots: { hook: brief.hook, ideas: brief.ideas },
  });
  return { subject: brief.subject, body: segmentsToText(segs) };
}

export async function upsertDraft(prospectId: number, contactId: number | null, subject: string, body: string, selected: boolean) {
  const db = await getDb();
  const [existing] = await db.select().from(schema.drafts).where(eq(schema.drafts.prospectId, prospectId));
  if (existing) {
    await db.update(schema.drafts).set({ contactId, subject, body, userEdited: false, updatedAt: new Date() }).where(eq(schema.drafts.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(schema.drafts).values({ prospectId, contactId, subject, body, status: selected ? "selected" : "draft" }).returning();
  return row.id;
}
