import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle, requireUser } from "@/lib/session";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const db = await getDb();
  const [s] = await db.select().from(schema.sends).where(and(eq(schema.sends.id, Number(id)), eq(schema.sends.userId, u.id)));
  if (!s) throw new HttpError(404, "Message not found.");
  const body = z.object({ replied: z.boolean().optional(), optedOut: z.boolean().optional(), cancel: z.boolean().optional() }).parse(await req.json());
  if (body.replied !== undefined) await db.update(schema.sends).set({ replied: body.replied }).where(eq(schema.sends.id, s.id));
  if (body.cancel && s.status === "scheduled") await db.update(schema.sends).set({ status: "skipped", error: "Cancelled by you" }).where(eq(schema.sends.id, s.id));
  if (body.optedOut) await db.insert(schema.suppressions).values({ userId: u.id, email: s.toEmail, reason: "optout" }).onConflictDoNothing();
  if (body.optedOut === false) await db.delete(schema.suppressions).where(and(eq(schema.suppressions.userId, u.id), eq(schema.suppressions.email, s.toEmail)));
  return Response.json({ ok: true });
});
