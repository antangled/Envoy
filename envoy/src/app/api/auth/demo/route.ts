import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, handle } from "@/lib/session";

export const POST = handle(async () => {
  const db = await getDb();
  const email = "demo@envoy.local";
  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) [u] = await db.insert(schema.users).values({ email, isDemo: true }).returning();
  await createSession(u.id);
  return Response.json({ ok: true });
});
