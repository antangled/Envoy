import "server-only";
import { and, asc, eq, inArray, lte, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decrypt } from "@/lib/crypto";
import { accessTokenFromRefresh, buildMime, logoPart, sendGmail } from "@/lib/providers/gmail";
import { emailHtml, footerText } from "@/lib/template/render";
import { isSendable } from "./contacts";
import { getOrg, signatureFor } from "./org";
import { renderDraft } from "./draft";

type User = typeof schema.users.$inferSelect;

/** Personal-mail domains are never excluded as a whole; only the individual address is. */
const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "zoho.com"]);

function localParts(d: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return { hour: Number(parts.hour), weekday: parts.weekday as string, day: `${parts.year}-${parts.month}-${parts.day}` };
}

function nextBusinessSlot(d: Date, tz: string): Date {
  let t = new Date(d);
  for (let i = 0; i < 4 * 24 * 7; i++) {
    const { hour, weekday } = localParts(t, tz);
    if (hour >= 8 && hour < 18 && weekday !== "Sat" && weekday !== "Sun") return t;
    t = new Date(t.getTime() + 15 * 60_000);
  }
  return t;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Schedules selected drafts: 60–180 s jitter, 10/hour, daily cap, business hours. Demo outbox compresses spacing to seconds. */
export async function queueCampaign(user: User, campaignId: number, tz: string) {
  const db = await getDb();
  const org = await getOrg(user.id);
  if (!org) throw new Error("Finish Setup before sending.");
  const live = !!user.googleRefreshTokenEnc;
  const channel = live ? ("gmail" as const) : ("demo" as const);
  const ps = await db.select().from(schema.prospects).where(eq(schema.prospects.campaignId, campaignId));
  const pIds = ps.map((p) => p.id);
  if (!pIds.length) return { queued: 0, skipped: [] as string[] };
  const drafts = await db.select().from(schema.drafts).where(and(inArray(schema.drafts.prospectId, pIds), eq(schema.drafts.status, "selected")));
  const contacts = await db.select().from(schema.contacts).where(inArray(schema.contacts.prospectId, pIds));
  const already = await db.select().from(schema.sends).where(eq(schema.sends.campaignId, campaignId));
  const excl = new Set((await db.select().from(schema.exclusions).where(eq(schema.exclusions.userId, user.id))).map((e) => e.value));
  const supp = new Set((await db.select().from(schema.suppressions).where(eq(schema.suppressions.userId, user.id))).map((e) => e.email));
  const existing = await db.select().from(schema.sends).where(and(eq(schema.sends.userId, user.id), inArray(schema.sends.status, ["scheduled", "sent"])));

  let cursor = new Date(Math.max(Date.now(), ...existing.filter((s) => s.status === "scheduled").map((s) => s.scheduledAt.getTime())));
  const times = existing.map((s) => s.scheduledAt.getTime());
  const skipped: string[] = [];
  const rows: (typeof schema.sends.$inferInsert)[] = [];
  const [campaign] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, campaignId));
  const briefs = await db.select().from(schema.briefs).where(inArray(schema.briefs.prospectId, pIds));
  // Every selected person at a company gets their own copy, greeted by name.
  const recipients = drafts.flatMap((d) => {
    const p = ps.find((x) => x.id === d.prospectId)!;
    const primary = contacts.find((x) => x.id === d.contactId) ?? null;
    let chosen = contacts.filter((x) => x.prospectId === p.id && x.selected);
    if (!chosen.length && primary) chosen = [primary];
    if (!chosen.length) skipped.push(`${p.name}: no recipient chosen`);
    return chosen.map((c) => ({ d, p, c, primary }));
  });
  for (const { d, p, c, primary } of recipients) {
    if (already.some((s) => s.draftId === d.id && s.toEmail === c.email?.toLowerCase())) continue;
    if (!c?.email || !(isSendable(c.emailStatus) || (c.emailStatus === "published_generic" && d.allowGeneric))) {
      skipped.push(`${p.name}: ${c?.name ?? "contact"} has no sendable email`);
      continue;
    }
    const email = c.email.toLowerCase();
    const domain = email.split("@")[1];
    if (supp.has(email)) { skipped.push(`${p.name}: ${email} opted out`); continue; }
    // A company domain is excluded after its first send. Colleagues ticked on this same draft are still allowed.
    const sameDraft = already.some((s) => s.draftId === d.id) || rows.some((r) => r.draftId === d.id);
    if (excl.has(email) || (excl.has(domain) && !sameDraft)) { skipped.push(`${p.name}: already contacted`); continue; }
    if (live) {
      cursor = new Date(cursor.getTime() + rand(60, 180) * 1000);
      for (;;) {
        cursor = nextBusinessSlot(cursor, tz);
        const hourCount = times.filter((t) => t > cursor.getTime() - 3600_000 && t <= cursor.getTime()).length;
        const day = localParts(cursor, tz).day;
        const dayCount = times.filter((t) => localParts(new Date(t), tz).day === day).length;
        if (dayCount >= user.dailyCap) { cursor = nextBusinessSlot(new Date(cursor.getTime() + 16 * 3600_000), tz); continue; }
        if (hourCount >= 10) { cursor = new Date(cursor.getTime() + 10 * 60_000); continue; }
        break;
      }
    } else {
      cursor = new Date(cursor.getTime() + rand(3, 8) * 1000);
    }
    times.push(cursor.getTime());
    // Personalize the body for this recipient: re-render from the template, or swap the greeting name in a hand-edited draft.
    const brief = briefs.find((b) => b.prospectId === p.id);
    let body = d.body;
    if (c.id !== primary?.id) {
      if (!d.userEdited && brief) body = renderDraft(org, campaign, p.name, c, brief.data).body;
      else {
        const from = primary?.firstName || `${p.name} team`;
        const to = c.firstName || `${p.name} team`;
        body = body.replace(from, to);
      }
    }
    rows.push({ draftId: d.id, campaignId, userId: user.id, toEmail: email, toName: c.name, orgName: p.name, subject: d.subject, body, scheduledAt: cursor, channel });
  }
  if (rows.length) await db.insert(schema.sends).values(rows);
  await db.update(schema.campaigns).set({ status: "sending" }).where(eq(schema.campaigns.id, campaignId));
  return { queued: rows.length, skipped, channel };
}

/** Sends due messages. Gmail: one per call so spacing holds. Demo outbox: all due. */
export async function processDue(userId?: number) {
  const db = await getDb();
  const now = new Date();
  const due = await db
    .select()
    .from(schema.sends)
    .where(and(eq(schema.sends.status, "scheduled"), lte(schema.sends.scheduledAt, now), ...(userId ? [eq(schema.sends.userId, userId)] : [])))
    .orderBy(asc(schema.sends.scheduledAt));
  const doneUsers = new Set<number>();
  let sent = 0;
  for (const s of due) {
    if (s.channel === "gmail" && doneUsers.has(s.userId)) continue;
    const [camp] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, s.campaignId));
    if (camp?.status === "paused") continue;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, s.userId));
    const supp = await db.select().from(schema.suppressions).where(and(eq(schema.suppressions.userId, s.userId), eq(schema.suppressions.email, s.toEmail)));
    if (supp.length) {
      await db.update(schema.sends).set({ status: "skipped", error: "Recipient opted out" }).where(eq(schema.sends.id, s.id));
      continue;
    }
    const [draft0] = await db.select().from(schema.drafts).where(eq(schema.drafts.id, s.draftId));
    const draft = { ...draft0, body: s.body ?? draft0.body };
    const org = await getOrg(s.userId);
    const footer = footerText({ meName: org?.meName || "", orgName: org?.orgName || "", postalAddress: org?.postalAddress || "" }, s.orgName);
    const text = `${draft.body}\n\n${footer}`;
    const logo = logoPart(org?.logoDataUri);
    try {
      let messageId: string;
      if (s.channel === "gmail") {
        doneUsers.add(s.userId);
        const token = await accessTokenFromRefresh(decrypt(user.googleRefreshTokenEnc!));
        const raw = buildMime({
          from: org?.meName ? `${org.meName} <${user.email}>` : user.email,
          to: s.toEmail,
          toName: s.toName,
          subject: draft.subject,
          text,
          html: emailHtml(draft.body, footer, logo?.cid ?? null, signatureFor(org)),
          logo,
          attachment: camp?.attachDeck && org?.deckB64 ? { filename: org.deckName || "deck.pdf", base64: org.deckB64 } : null,
        });
        messageId = await sendGmail(token, raw);
      } else {
        messageId = `demo-${s.id}-${Date.now().toString(36)}`;
      }
      await db.update(schema.sends).set({ status: "sent", sentAt: new Date(), gmailMessageId: messageId, subject: draft.subject }).where(eq(schema.sends.id, s.id));
      // Exclude the person, their email domain, and the company's website domain (they can differ).
      const [prospect] = await db.select({ domain: schema.prospects.domain }).from(schema.prospects).where(eq(schema.prospects.id, draft.prospectId));
      const emailDomain = s.toEmail.split("@")[1];
      const domains = [FREE_MAIL.has(emailDomain) ? null : emailDomain, prospect?.domain];
      for (const value of new Set([s.toEmail, ...domains].filter(Boolean) as string[])) {
        await db.insert(schema.exclusions).values({ userId: s.userId, value, source: "sent" }).onConflictDoNothing();
      }
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.update(schema.sends).set({ status: "failed", error: msg }).where(eq(schema.sends.id, s.id));
      if (/5\.7\.|limit|quota|rate/i.test(msg)) await db.update(schema.campaigns).set({ status: "paused" }).where(eq(schema.campaigns.id, s.campaignId));
    }
  }
  return { sent };
}

export async function sentToday(userId: number) {
  const db = await getDb();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await db.select().from(schema.sends).where(and(eq(schema.sends.userId, userId), eq(schema.sends.status, "sent"), gte(schema.sends.sentAt, start)));
  return rows.length;
}
