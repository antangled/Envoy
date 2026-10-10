import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError } from "@/lib/session";

export async function ownedDraft(userId: number, draftId: number) {
  const db = await getDb();
  const [d] = await db.select().from(schema.drafts).where(eq(schema.drafts.id, draftId));
  if (!d) throw new HttpError(404, "Draft not found.");
  const [p] = await db.select().from(schema.prospects).where(eq(schema.prospects.id, d.prospectId));
  const [c] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, p.campaignId));
  if (c.userId !== userId) throw new HttpError(404, "Draft not found.");
  return { draft: d, prospect: p, campaign: c };
}
