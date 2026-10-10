import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";

export const GET = handle(async () => {
  const u = await requireUser();
  const db = await getDb();
  const rows = await db.select().from(schema.sends).where(eq(schema.sends.userId, u.id)).orderBy(desc(schema.sends.scheduledAt));
  const supp = new Set((await db.select().from(schema.suppressions).where(eq(schema.suppressions.userId, u.id))).map((s) => s.email));
  return Response.json(rows.map((r) => ({ ...r, optedOut: supp.has(r.toEmail) })));
});
