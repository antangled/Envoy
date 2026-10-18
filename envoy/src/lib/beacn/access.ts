import "server-only";
import crypto from "node:crypto";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isAdminEmail } from "@/lib/env";
import { HttpError, requireAnyUser } from "@/lib/session";

type User = typeof schema.users.$inferSelect;

/** Credits a member may spend in any rolling 7 days (company searches plus email lookups). */
export const WEEKLY_LIMIT = Number(process.env.BEACN_WEEKLY_CREDITS || 100);
/** Credits the whole club may spend per calendar month, as a backstop for the shared Apollo account. */
export const CLUB_MONTHLY_CAP = Number(process.env.BEACN_MONTHLY_CLUB_CREDITS || 2000);

export const isBerkeleyEmail = (email: string) => /@berkeley\.edu$/i.test(email.trim());
export const isMember = (u: User) => !u.isDemo && (u.beacnMember || isAdminEmail(u.email));

export async function requireMember() {
  const u = await requireAnyUser();
  if (u.isDemo) throw new HttpError(403, "BEACN Outreach isn't part of the demo. Exit the demo and sign in with your Berkeley Google account.");
  if (!isMember(u)) throw new HttpError(403, "Enter the BEACN club key to use this.");
  return u;
}

export async function requireAdmin() {
  const u = await requireAnyUser();
  if (!isAdminEmail(u.email)) throw new HttpError(403, "Only BEACN Outreach admins can see this.");
  return u;
}

/** Compares against BEACN_KEY_SHA256 so the key itself is never stored in the app or the repo. */
export function keyMatches(input: string) {
  const want = process.env.BEACN_KEY_SHA256?.trim().toLowerCase();
  if (!want || !/^[0-9a-f]{64}$/.test(want)) return false;
  const got = crypto.createHash("sha256").update(input.trim()).digest();
  return crypto.timingSafeEqual(got, Buffer.from(want, "hex"));
}

const SPEND = ["company_search", "email_lookup"] as const;

async function spentSince(since: Date, userId?: number) {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${schema.beacnLedger.credits}), 0)::int` })
    .from(schema.beacnLedger)
    .where(and(inArray(schema.beacnLedger.kind, [...SPEND]), gte(schema.beacnLedger.createdAt, since), ...(userId ? [eq(schema.beacnLedger.userId, userId)] : [])));
  return Number(r?.n ?? 0);
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

export async function budget(u: User) {
  const usedWeek = await spentSince(new Date(Date.now() - 7 * 864e5), u.id);
  const usedClub = await spentSince(monthStart());
  const admin = isAdminEmail(u.email);
  return {
    usedWeek,
    weekLimit: admin ? null : WEEKLY_LIMIT,
    leftWeek: admin ? Infinity : Math.max(0, WEEKLY_LIMIT - usedWeek),
    usedClub,
    clubCap: CLUB_MONTHLY_CAP,
    leftClub: Math.max(0, CLUB_MONTHLY_CAP - usedClub),
  };
}

/** Throws before any paid call that could exceed the member's weekly limit or the club's monthly cap. */
export async function assertCanSpend(u: User, credits: number) {
  const b = await budget(u);
  if (credits > b.leftWeek) throw new HttpError(429, `That needs up to ${credits} credit${credits === 1 ? "" : "s"}, and you have ${b.leftWeek} left this week. Your weekly limit is ${WEEKLY_LIMIT}.`);
  if (credits > b.leftClub) throw new HttpError(429, `The club has ${b.leftClub} Apollo credits left this month. Ask an admin before looking up more.`);
  return b;
}

export async function record(u: User, kind: "company_search" | "email_lookup" | "key_attempt", credits: number, detail: Record<string, unknown> = {}) {
  const db = await getDb();
  await db.insert(schema.beacnLedger).values({ userId: u.id, kind, credits, detail });
}

/** Five key attempts per hour per account, so the club key can't be guessed by brute force. */
export async function assertKeyAttemptsLeft(u: User) {
  const db = await getDb();
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.beacnLedger)
    .where(and(eq(schema.beacnLedger.userId, u.id), eq(schema.beacnLedger.kind, "key_attempt"), gte(schema.beacnLedger.createdAt, new Date(Date.now() - 3600_000))));
  if (Number(r?.n ?? 0) >= 5) throw new HttpError(429, "Too many attempts. Try again in an hour.");
}
