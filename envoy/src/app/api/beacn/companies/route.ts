import { ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";
import { normalizeDomain } from "@/lib/providers/fetchPage";

/** Searches companies the committee has already found. Free: never calls Apollo. */
export const GET = handle(async (req: Request) => {
  await requireMember();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json([]);
  const db = await getDb();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db.select().from(schema.beacnCompanies).where(or(ilike(schema.beacnCompanies.name, like), ilike(schema.beacnCompanies.domain, like))).limit(8);
  return Response.json(rows);
});

const In = z.union([
  z.object({ website: z.string().min(3).max(300) }),
  z.object({ company: z.object({ name: z.string().max(200), domain: z.string().max(200), apolloOrgId: z.string().nullable(), logoUrl: z.string().nullable(), linkedinUrl: z.string().nullable() }) }),
]);

/** Saves a company to the shared directory, from a pasted website (free) or an Apollo search result. */
export const POST = handle(async (req: Request) => {
  const u = await requireMember();
  const b = In.parse(await req.json());
  const c =
    "website" in b
      ? (() => {
          const domain = normalizeDomain(b.website);
          if (!domain.includes(".")) throw new HttpError(400, "Enter a website like acme.com");
          const name = domain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
          return { name, domain, apolloOrgId: null, logoUrl: null, linkedinUrl: null };
        })()
      : { ...b.company, domain: normalizeDomain(b.company.domain) };
  const db = await getDb();
  const [row] = await db
    .insert(schema.beacnCompanies)
    .values({ ...c, createdBy: u.id })
    .onConflictDoUpdate({ target: schema.beacnCompanies.domain, set: "website" in b ? { domain: c.domain } : { name: c.name, apolloOrgId: c.apolloOrgId, logoUrl: c.logoUrl, linkedinUrl: c.linkedinUrl } })
    .returning();
  return Response.json(row);
});
