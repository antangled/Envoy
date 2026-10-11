import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError, handle, requireUser } from "@/lib/session";
import { ownedContact } from "@/lib/pipeline/contactOwnership";
import { finderStatus } from "@/lib/pipeline/contacts";
import { emailFinder, hunterAvailable } from "@/lib/providers/hunter";
import { withUsage } from "@/lib/usage";
import { demoFindEmail, isScriptedDemo } from "@/lib/demo/run";

/** Looks up one person's email on demand (one Hunter lookup, charged only when an address is found). */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const { contact, prospect, campaign } = await ownedContact(u.id, Number(id));
  if (isScriptedDemo(u)) return Response.json(await demoFindEmail(contact, prospect));
  if (!hunterAvailable()) throw new HttpError(400, "Email lookup needs the Hunter key.");
  if (!contact.firstName || !contact.lastName) throw new HttpError(400, "A first and last name are needed to look up an email.");
  const f = await withUsage(campaign.id, () => emailFinder(prospect.domain, contact.firstName!, contact.lastName!));
  const db = await getDb();
  if (!f?.email) {
    // confidence 0 marks "looked up, nothing found" so the button doesn't invite a second paid lookup
    await db.update(schema.contacts).set({ confidence: 0 }).where(eq(schema.contacts.id, contact.id));
    return Response.json({ found: false });
  }
  await db
    .update(schema.contacts)
    .set({ email: f.email, emailStatus: finderStatus(f), confidence: f.score, source: contact.source === "exa" ? "exa+hunter" : contact.source })
    .where(eq(schema.contacts.id, contact.id));
  return Response.json({ found: true, email: f.email });
});
