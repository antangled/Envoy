import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { createSession, currentUser, handle } from "@/lib/session";
import { cleanupOldDemos, newDemoUser, resetDemo } from "@/lib/demo/run";
import { DEMO_EMAIL } from "@/lib/demo/fixtures";

export const POST = handle(async () => {
  // ENVOY_DEMO_LIVE=1 (smoke tests) keeps one shared demo account that runs the real pipeline against mock APIs.
  if (process.env.ENVOY_DEMO_LIVE === "1") {
    const db = await getDb();
    let [u] = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));
    if (!u) [u] = await db.insert(schema.users).values({ email: DEMO_EMAIL, isDemo: true }).returning();
    await createSession(u.id);
    return Response.json({ ok: true });
  }
  // Scripted demo: a visitor keeps their own private demo account; clicking Try the demo again starts it over.
  const current = await currentUser();
  const u = current?.isDemo && current.email !== DEMO_EMAIL ? current : await newDemoUser();
  await resetDemo(u.id);
  await createSession(u.id);
  await cleanupOldDemos().catch((e) => console.warn("demo cleanup failed", e));
  return Response.json({ ok: true });
});
