import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { isAdminEmail } from "@/lib/env";
import { HttpError, handle, requireAnyUser } from "@/lib/session";
import { assertKeyAttemptsLeft, isBerkeleyEmail, keyMatches, record } from "@/lib/beacn/access";

/** Unlocks BEACN Outreach for a signed-in @berkeley.edu account that enters the club key. */
export const POST = handle(async (req: Request) => {
  const u = await requireAnyUser();
  if (u.isDemo) throw new HttpError(403, "Exit the demo and sign in with your Berkeley Google account first.");
  if (!isBerkeleyEmail(u.email) && !isAdminEmail(u.email)) throw new HttpError(403, `BEACN Outreach is for @berkeley.edu accounts. You're signed in as ${u.email}. Sign out and sign in with your Berkeley account.`);
  const { key } = z.object({ key: z.string().min(1).max(200) }).parse(await req.json());
  await assertKeyAttemptsLeft(u);
  if (!keyMatches(key)) {
    await record(u, "key_attempt", 0, { ok: false });
    throw new HttpError(400, "That key doesn't match. Check with your BEACN lead.");
  }
  const db = await getDb();
  await db.update(schema.users).set({ beacnMember: true, beacnJoinedAt: new Date() }).where(eq(schema.users.id, u.id));
  return Response.json({ ok: true });
});
