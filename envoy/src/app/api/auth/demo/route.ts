import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, handle } from "@/lib/session";
import { isScriptedDemo, resetDemo } from "@/lib/demo/run";
import { DEMO_EMAIL } from "@/lib/demo/fixtures";

export const POST = handle(async () => {
  const db = await getDb();
  const email = DEMO_EMAIL;
  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) [u] = await db.insert(schema.users).values({ email, isDemo: true }).returning();
  // The scripted demo starts fresh every time, with the sample profile already filled in.
  if (isScriptedDemo(u)) await resetDemo(u.id);
  await createSession(u.id);
  return Response.json({ ok: true });
});
