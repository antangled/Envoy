import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle } from "@/lib/session";
import { assertCanSpend, budget, record, requireMember } from "@/lib/beacn/access";
import { apolloAvailable, lookupEmails } from "@/lib/providers/apollo";

/**
 * Looks up work emails for the chosen people (1 Apollo credit each, only when an email is found).
 * People anyone has already looked up are skipped, and each person is claimed first so two members never pay twice.
 */
export const POST = handle(async (req: Request) => {
  const u = await requireMember();
  const { ids } = z.object({ ids: z.array(z.number().int()).min(1).max(50) }).parse(await req.json());
  if (!apolloAvailable()) throw new HttpError(503, "Apollo isn't connected yet. Ask an admin to add the club's Apollo key.");
  const db = await getDb();
  const rows = await db.select().from(schema.beacnPeople).where(inArray(schema.beacnPeople.id, ids));
  const recentMiss = (r: (typeof rows)[number]) => !r.email && r.lookedUpAt && Date.now() - r.lookedUpAt.getTime() < 30 * 864e5;
  const todo = rows.filter((r) => !r.email && !recentMiss(r));
  if (!todo.length) return Response.json({ found: 0, missing: 0, credits: 0, alreadyKnown: rows.filter((r) => r.email).length, budget: await budget(u) });
  await assertCanSpend(u, todo.length);

  // Claim: only rows nobody else is looking up right now (or whose claim is stale after 2 minutes).
  const stale = new Date(Date.now() - 120_000);
  const claimed = await db
    .update(schema.beacnPeople)
    .set({ lookupStartedAt: new Date() })
    .where(and(inArray(schema.beacnPeople.id, todo.map((t) => t.id)), isNull(schema.beacnPeople.email), or(isNull(schema.beacnPeople.lookupStartedAt), lt(schema.beacnPeople.lookupStartedAt, stale))))
    .returning();

  let found = 0;
  let credits = 0;
  try {
    for (let i = 0; i < claimed.length; i += 10) {
      const chunk = claimed.slice(i, i + 10);
      const r = await lookupEmails(chunk.map((c) => c.apolloId));
      const gotEmail = r.matches.filter((m) => m.email).length;
      credits += r.creditsConsumed ?? gotEmail;
      found += gotEmail;
      for (const c of chunk) {
        const m = r.matches.find((x) => x.apolloId === c.apolloId);
        await db
          .update(schema.beacnPeople)
          .set({
            email: m?.email?.toLowerCase() ?? null,
            emailStatus: m?.emailStatus ?? null,
            lastName: m?.lastName || c.lastName,
            firstName: m?.firstName || c.firstName,
            title: m?.title || c.title,
            linkedinUrl: m?.linkedinUrl ?? c.linkedinUrl,
            lookedUpAt: new Date(),
            lookedUpBy: u.id,
            lookupStartedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.beacnPeople.id, c.id));
      }
    }
  } finally {
    await db.update(schema.beacnPeople).set({ lookupStartedAt: null }).where(and(inArray(schema.beacnPeople.id, claimed.map((c) => c.id)), isNull(schema.beacnPeople.lookedUpAt)));
    if (credits) await record(u, "email_lookup", credits, { requested: claimed.length, found });
  }
  return Response.json({ found, missing: claimed.length - found, credits, busy: todo.length - claimed.length, budget: await budget(u) });
});
