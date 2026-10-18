import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { encrypt } from "@/lib/crypto";
import { createSession, handle } from "@/lib/session";

/**
 * Test-only sign-in for the end-to-end checks: a Berkeley account with a fake Gmail token.
 * Disabled unless ENVOY_TEST_LOGIN=1, and always disabled on Vercel.
 */
export const POST = handle(async (req: Request) => {
  if (process.env.ENVOY_TEST_LOGIN !== "1" || process.env.VERCEL) return Response.json({ error: "Not found" }, { status: 404 });
  const { email = "test.member@berkeley.edu" } = (await req.json().catch(() => ({}))) as { email?: string };
  const db = await getDb();
  let [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!u) [u] = await db.insert(schema.users).values({ email, name: "Test Member", googleRefreshTokenEnc: encrypt("mock-refresh") }).returning();
  await createSession(u.id);
  return Response.json({ ok: true, id: u.id });
});
