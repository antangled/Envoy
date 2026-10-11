import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle, requireUser } from "@/lib/session";
import { ownedContact } from "@/lib/pipeline/contactOwnership";
import { isSendable } from "@/lib/pipeline/contacts";

/** Choose or un-choose a person as a recipient of their company's email. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const { contact } = await ownedContact(u.id, Number(id));
  const { selected } = z.object({ selected: z.boolean() }).parse(await req.json());
  if (selected && !(contact.email && (isSendable(contact.emailStatus) || contact.emailStatus === "published_generic"))) {
    throw new HttpError(400, "Find this person's email first.");
  }
  const db = await getDb();
  await db.update(schema.contacts).set({ selected }).where(eq(schema.contacts.id, contact.id));
  return Response.json({ ok: true });
});
