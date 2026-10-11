import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError } from "@/lib/session";

export async function ownedContact(userId: number, contactId: number) {
  const db = await getDb();
  const [contact] = await db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
  if (!contact) throw new HttpError(404, "Contact not found.");
  const [prospect] = await db.select().from(schema.prospects).where(eq(schema.prospects.id, contact.prospectId));
  const [campaign] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, prospect.campaignId));
  if (campaign.userId !== userId) throw new HttpError(404, "Contact not found.");
  return { contact, prospect, campaign };
}
