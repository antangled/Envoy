import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle } from "@/lib/session";
import { CLUB_MONTHLY_CAP, WEEKLY_LIMIT, requireAdmin } from "@/lib/beacn/access";

/** Members, what each spent this week and in total, the club's month, and the latest credit log. */
export const GET = handle(async () => {
  await requireAdmin();
  const db = await getDb();
  const members = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, joinedAt: schema.users.beacnJoinedAt }).from(schema.users).where(eq(schema.users.beacnMember, true));
  const week = new Date(Date.now() - 7 * 864e5);
  const d = new Date();
  const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const spend = ["company_search", "email_lookup"] as const;
  const per = await db
    .select({
      userId: schema.beacnLedger.userId,
      week: sql<number>`coalesce(sum(case when ${schema.beacnLedger.createdAt} >= ${week} then ${schema.beacnLedger.credits} else 0 end), 0)::int`,
      total: sql<number>`coalesce(sum(${schema.beacnLedger.credits}), 0)::int`,
    })
    .from(schema.beacnLedger)
    .where(inArray(schema.beacnLedger.kind, [...spend]))
    .groupBy(schema.beacnLedger.userId);
  const sent = await db.select({ userId: schema.beacnSends.userId, n: sql<number>`count(*)::int` }).from(schema.beacnSends).where(eq(schema.beacnSends.status, "sent")).groupBy(schema.beacnSends.userId);
  const [club] = await db.select({ n: sql<number>`coalesce(sum(${schema.beacnLedger.credits}), 0)::int` }).from(schema.beacnLedger).where(and(inArray(schema.beacnLedger.kind, [...spend]), gte(schema.beacnLedger.createdAt, month)));
  const log = await db.select().from(schema.beacnLedger).where(inArray(schema.beacnLedger.kind, [...spend])).orderBy(desc(schema.beacnLedger.createdAt)).limit(50);
  const emails = new Map((await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users)).map((x) => [x.id, x.email]));
  return Response.json({
    weeklyLimit: WEEKLY_LIMIT,
    clubCap: CLUB_MONTHLY_CAP,
    clubUsed: Number(club?.n ?? 0),
    members: members.map((m) => ({ ...m, week: Number(per.find((p) => p.userId === m.id)?.week ?? 0), total: Number(per.find((p) => p.userId === m.id)?.total ?? 0), sent: Number(sent.find((s) => s.userId === m.id)?.n ?? 0) })),
    log: log.map((l) => ({ at: l.createdAt, who: emails.get(l.userId) ?? `user ${l.userId}`, kind: l.kind, credits: l.credits, detail: l.detail })),
  });
});

/** Removes a member's access. Their past sends and lookups stay in the log. */
export const PATCH = handle(async (req: Request) => {
  await requireAdmin();
  const { userId } = z.object({ userId: z.number().int() }).parse(await req.json());
  const db = await getDb();
  await db.update(schema.users).set({ beacnMember: false }).where(eq(schema.users.id, userId));
  return Response.json({ ok: true });
});
