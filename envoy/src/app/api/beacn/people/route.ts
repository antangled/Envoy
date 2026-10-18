import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";
import { PRESETS } from "@/lib/beacn/template";
import { apolloAvailable, searchPeople } from "@/lib/providers/apollo";
import { normalizeDomain } from "@/lib/providers/fetchPage";

const In = z.object({
  domain: z.string().min(3).max(200),
  company: z.string().max(200).default(""),
  preset: z.enum(["decision", "strategy", "sustainability", "custom"]),
  titles: z.array(z.string().max(80)).max(20).default([]),
  page: z.number().int().min(1).max(20).default(1),
});

/** Free Apollo people search for one company. Anyone already looked up shows their saved email, at no cost. */
export const POST = handle(async (req: Request) => {
  const u = await requireMember();
  const b = In.parse(await req.json());
  if (!apolloAvailable()) throw new HttpError(503, "Apollo isn't connected yet. Ask an admin to add the club's Apollo key.");
  const domain = normalizeDomain(b.domain);
  const preset = PRESETS[b.preset];
  const titles = b.preset === "custom" ? b.titles.map((t) => t.trim()).filter(Boolean) : [...preset.titles];
  if (b.preset === "custom" && !titles.length) throw new HttpError(400, "Add at least one job title to search for.");
  const r = await searchPeople({ domain, titles, seniorities: [...preset.seniorities], page: b.page });

  const db = await getDb();
  for (const p of r.people) {
    await db
      .insert(schema.beacnPeople)
      // Prefer the company name the member chose (from the directory) over Apollo's per-person organization name.
      .values({ apolloId: p.apolloId, domain, companyName: b.company || p.companyName, firstName: p.firstName, lastNameObfuscated: p.lastNameObfuscated, title: p.title })
      .onConflictDoUpdate({ target: schema.beacnPeople.apolloId, set: { title: p.title, domain, ...(b.company ? { companyName: b.company } : {}), updatedAt: new Date() } });
  }
  const ids = r.people.map((p) => p.apolloId);
  const rows = ids.length ? await db.select().from(schema.beacnPeople).where(inArray(schema.beacnPeople.apolloId, ids)) : [];
  const people = r.people.map((p) => {
    const row = rows.find((x) => x.apolloId === p.apolloId)!;
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      lastNameObfuscated: row.lastNameObfuscated,
      title: row.title,
      linkedinUrl: row.linkedinUrl,
      email: row.email,
      emailStatus: row.emailStatus,
      lookedUp: !!row.lookedUpAt,
      apolloHasEmail: p.hasEmail,
      company: b.company || row.companyName,
      domain,
    };
  });

  // Has anyone on the committee already emailed this company in the last six months?
  const since = new Date(Date.now() - 180 * 864e5);
  const prior = await db
    .select({ userId: schema.beacnSends.userId, status: schema.beacnSends.status, at: schema.beacnSends.scheduledAt, toEmail: schema.beacnSends.toEmail })
    .from(schema.beacnSends)
    .where(and(eq(schema.beacnSends.domain, domain), inArray(schema.beacnSends.status, ["scheduled", "sending", "sent"]), gte(schema.beacnSends.scheduledAt, since)))
    .orderBy(desc(schema.beacnSends.scheduledAt))
    .limit(20);
  const others = prior.filter((x) => x.userId !== u.id);
  const names = others.length ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, [...new Set(others.map((o) => o.userId))])) : [];
  const contacted = others.map((o) => {
    const who = names.find((n) => n.id === o.userId);
    return { by: who?.name || who?.email || "Another member", toEmail: o.toEmail, at: o.at, status: o.status };
  });
  return Response.json({ total: r.total, page: b.page, people, contacted });
});
