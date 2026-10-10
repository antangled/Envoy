import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle, requireUser } from "@/lib/session";
import { ownedDraft } from "@/lib/pipeline/ownership";
import { getOrg } from "@/lib/pipeline/org";
import { renderDraft } from "@/lib/pipeline/draft";

const Patch = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().max(10_000).optional(),
  status: z.enum(["draft", "selected", "rejected"]).optional(),
  allowGeneric: z.boolean().optional(),
  contactId: z.number().optional(),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const { draft, prospect, campaign } = await ownedDraft(u.id, Number(id));
  const body = Patch.parse(await req.json());
  const db = await getDb();
  const set: Partial<typeof schema.drafts.$inferInsert> = { updatedAt: new Date() };
  if (body.subject !== undefined) { set.subject = body.subject; set.userEdited = true; }
  if (body.body !== undefined) { set.body = body.body; set.userEdited = true; }
  if (body.status) set.status = body.status;
  if (body.allowGeneric !== undefined) set.allowGeneric = body.allowGeneric;
  if (body.contactId !== undefined) {
    const [c] = await db.select().from(schema.contacts).where(and(eq(schema.contacts.id, body.contactId), eq(schema.contacts.prospectId, prospect.id)));
    if (!c) throw new HttpError(400, "That contact doesn't belong to this company.");
    await db.update(schema.contacts).set({ isPrimary: false }).where(eq(schema.contacts.prospectId, prospect.id));
    await db.update(schema.contacts).set({ isPrimary: true }).where(eq(schema.contacts.id, c.id));
    set.contactId = c.id;
    if (!draft.userEdited) {
      const [b] = await db.select().from(schema.briefs).where(eq(schema.briefs.prospectId, prospect.id));
      const org = await getOrg(u.id);
      if (b && org) set.body = renderDraft(org, campaign, prospect.name, c, b.data).body;
    }
  }
  await db.update(schema.drafts).set(set).where(eq(schema.drafts.id, draft.id));
  return Response.json({ ok: true });
});
