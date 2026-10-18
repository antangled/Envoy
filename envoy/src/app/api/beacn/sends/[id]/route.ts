import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError, handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";

/** Cancels a scheduled email. The QStash message may still arrive, but delivery skips anything not "scheduled". */
export const PATCH = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireMember();
  const { id } = await ctx.params;
  const db = await getDb();
  const [row] = await db
    .update(schema.beacnSends)
    .set({ status: "cancelled" })
    .where(and(eq(schema.beacnSends.id, Number(id)), eq(schema.beacnSends.userId, u.id), eq(schema.beacnSends.status, "scheduled")))
    .returning();
  if (!row) throw new HttpError(400, "Only emails that haven't gone out yet can be cancelled.");
  return Response.json({ ok: true });
});
