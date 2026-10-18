import "server-only";
import crypto from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import { Client } from "@upstash/qstash";
import { getDb, schema } from "@/db";
import { appUrl, secret } from "@/lib/env";
import { decrypt } from "@/lib/crypto";
import { HttpError } from "@/lib/session";
import { accessTokenFromRefresh, buildMime, sendGmail } from "@/lib/providers/gmail";
import { emailHtml } from "@/lib/template/render";
import { optOutFooter, signatureFor, type BeacnMe } from "./template";

type User = typeof schema.users.$inferSelect;

export const qstashAvailable = () => !!secret("QSTASH_TOKEN");
const SPREAD_MS = 30 * 60_000;

export interface SendItem {
  personId: number;
  subject: string;
  body: string;
}

/**
 * Creates one email per recipient. "Send now" without spreading goes out immediately in this request.
 * Anything scheduled is handed to QStash, which calls /api/beacn/deliver at the chosen time.
 */
export async function createBatch(u: User, items: SendItem[], when: Date | null, spread: boolean) {
  if (!u.googleRefreshTokenEnc) throw new HttpError(400, "Sign in with Google again and allow sending, so Envoy can send from your Gmail.");
  if (!items.length) throw new HttpError(400, "Add at least one person to your send list.");
  if (items.length > 100) throw new HttpError(400, "Send at most 100 emails at a time.");
  const start = when ?? new Date();
  if (when && when.getTime() < Date.now() - 60_000) throw new HttpError(400, "That time has already passed. Pick a time in the future.");
  if (start.getTime() > Date.now() + 60 * 864e5) throw new HttpError(400, "Schedule sends within the next 60 days.");

  const db = await getDb();
  const people = await db.select().from(schema.beacnPeople).where(inArray(schema.beacnPeople.id, items.map((i) => i.personId)));
  const mine = await db.select({ toEmail: schema.beacnSends.toEmail }).from(schema.beacnSends).where(and(eq(schema.beacnSends.userId, u.id), inArray(schema.beacnSends.status, ["scheduled", "sending", "sent"])));
  const already = new Set(mine.map((m) => m.toEmail.toLowerCase()));
  const batchId = crypto.randomUUID();
  const skipped: string[] = [];
  const rows: (typeof schema.beacnSends.$inferInsert)[] = [];
  items.forEach((it, i) => {
    const p = people.find((x) => x.id === it.personId);
    if (!p?.email) return void skipped.push(`${p?.firstName ?? "Someone"}: no email yet`);
    const email = p.email.toLowerCase();
    if (already.has(email)) return void skipped.push(`${email}: you've already emailed or scheduled them`);
    if (!it.subject.trim() || !it.body.trim()) return void skipped.push(`${email}: empty subject or body`);
    already.add(email);
    const offset = spread && items.length > 1 ? Math.round((SPREAD_MS * i) / (items.length - 1)) : 0;
    rows.push({
      userId: u.id,
      batchId,
      personId: p.id,
      toEmail: email,
      toName: [p.firstName, p.lastName].filter(Boolean).join(" ") || null,
      company: p.companyName || p.domain,
      domain: p.domain,
      subject: it.subject.trim(),
      body: it.body,
      scheduledAt: new Date(start.getTime() + offset),
    });
  });
  if (!rows.length) return { batchId, queued: 0, sent: 0, skipped };
  await db.insert(schema.beacnSends).values(rows);

  if (!when && !spread) {
    const r = await deliverDue({ batchId });
    return { batchId, queued: rows.length, sent: r.sent, failed: r.failed, skipped };
  }
  await schedule(batchId, [...new Set(rows.map((r) => (r.scheduledAt as Date).getTime()))]);
  return { batchId, queued: rows.length, sent: 0, skipped };
}

/** One QStash message per distinct send time. Without QStash (local dev), the outbox page and the daily cron deliver instead. */
async function schedule(batchId: string, times: number[]) {
  if (!qstashAvailable()) return;
  const client = new Client({ token: secret("QSTASH_TOKEN")! });
  for (const t of times) {
    await client.publishJSON({ url: `${appUrl()}/api/beacn/deliver`, body: { batchId }, notBefore: Math.ceil(t / 1000), retries: 3 });
  }
}

/**
 * Sends every due email, optionally for one batch or one member. Each row is claimed (scheduled → sending)
 * before sending, so a QStash retry, the cron, and the outbox page can never send the same email twice.
 */
export async function deliverDue(filter: { batchId?: string; userId?: number } = {}) {
  const db = await getDb();
  const due = await db
    .select()
    .from(schema.beacnSends)
    .where(
      and(
        eq(schema.beacnSends.status, "scheduled"),
        lte(schema.beacnSends.scheduledAt, new Date(Date.now() + 5_000)),
        ...(filter.batchId ? [eq(schema.beacnSends.batchId, filter.batchId)] : []),
        ...(filter.userId ? [eq(schema.beacnSends.userId, filter.userId)] : []),
      ),
    )
    .limit(100);
  const tokens = new Map<number, string>();
  const profiles = new Map<number, BeacnMe>();
  let sent = 0;
  let failed = 0;
  for (const s of due) {
    const [claimed] = await db
      .update(schema.beacnSends)
      .set({ status: "sending" })
      .where(and(eq(schema.beacnSends.id, s.id), eq(schema.beacnSends.status, "scheduled")))
      .returning();
    if (!claimed) continue;
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, s.userId));
      if (!user?.googleRefreshTokenEnc) throw new Error("Gmail isn't connected. Sign in with Google again.");
      if (!tokens.has(s.userId)) tokens.set(s.userId, await accessTokenFromRefresh(decrypt(user.googleRefreshTokenEnc)));
      if (!profiles.has(s.userId)) {
        const [p] = await db.select().from(schema.beacnProfiles).where(eq(schema.beacnProfiles.userId, s.userId));
        profiles.set(s.userId, { name: p?.name || user.name || "", pronouns: p?.pronouns ?? "", title: p?.title ?? "", phone: p?.phone ?? "", signoff: p?.signoff || "Best," });
      }
      const me = profiles.get(s.userId)!;
      const footer = optOutFooter();
      const raw = buildMime({
        from: me.name ? `${me.name} <${user.email}>` : user.email,
        to: s.toEmail,
        toName: s.toName,
        subject: s.subject,
        text: `${s.body}\n\n${footer}`,
        html: emailHtml(s.body, footer, null, signatureFor(me)),
      });
      const id = await sendGmail(tokens.get(s.userId)!, raw);
      await db.update(schema.beacnSends).set({ status: "sent", sentAt: new Date(), gmailMessageId: id, error: null }).where(eq(schema.beacnSends.id, s.id));
      sent++;
    } catch (e) {
      failed++;
      await db.update(schema.beacnSends).set({ status: "failed", error: e instanceof Error ? e.message.slice(0, 300) : String(e) }).where(eq(schema.beacnSends.id, s.id));
    }
  }
  return { sent, failed };
}
