import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle } from "@/lib/session";
import { assertCanSpend, record, requireMember } from "@/lib/beacn/access";
import { apolloAvailable, searchCompanies } from "@/lib/providers/apollo";

const TTL = 30 * 864e5;

/** Apollo company search by name: 1 credit per new query. Results are saved, so anyone repeating the query pays nothing. */
export const POST = handle(async (req: Request) => {
  const u = await requireMember();
  const { q } = z.object({ q: z.string().min(2).max(120) }).parse(await req.json());
  const key = q.trim().toLowerCase().replace(/\s+/g, " ");
  const db = await getDb();
  const [hit] = await db.select().from(schema.beacnCompanySearches).where(eq(schema.beacnCompanySearches.query, key));
  if (hit && Date.now() - hit.createdAt.getTime() < TTL) return Response.json({ results: hit.results, cached: true, credits: 0 });
  if (!apolloAvailable()) throw new HttpError(503, "Apollo isn't connected yet. Paste the company's website instead.");
  await assertCanSpend(u, 1);
  const results = await searchCompanies(q.trim());
  await record(u, "company_search", 1, { q: key, results: results.length });
  await db.insert(schema.beacnCompanySearches).values({ query: key, results }).onConflictDoUpdate({ target: schema.beacnCompanySearches.query, set: { results, createdAt: new Date() } });
  return Response.json({ results, cached: false, credits: 1 });
});
