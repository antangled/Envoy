import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { exaAvailable, findOrganizations, type Candidate } from "@/lib/providers/exa";
import { normalizeDomain } from "@/lib/providers/fetchPage";
import { DEMO_COMPANIES } from "./demoCompanies";

type Campaign = typeof schema.campaigns.$inferSelect;

const BLOCKED = /(linkedin|crunchbase|wikipedia|facebook|twitter|x\.com|youtube|medium|github|glassdoor|indeed|bloomberg|forbes|techcrunch|pitchbook|zoominfo|apollo\.io)\./;

export async function discover(c: Campaign): Promise<{ added: number; source: "exa" | "demo"; shortfall: string[] }> {
  const db = await getDb();
  const spec = c.searchSpec!;
  const excl = new Set((await db.select().from(schema.exclusions).where(eq(schema.exclusions.userId, c.userId))).map((e) => e.value));
  let candidates: Candidate[] = [];
  let source: "exa" | "demo" = "exa";
  if (exaAvailable()) {
    const [org] = await db.select().from(schema.orgProfiles).where(eq(schema.orgProfiles.userId, c.userId));
    candidates = await findOrganizations({
      goal: c.goalText,
      description: spec.target_description,
      geography: spec.geography,
      sizeHint: spec.size_hint,
      seeds: spec.seed_examples.slice(0, 3),
      count: Math.min(30, c.contactCount + 5),
      exclude: [...excl].filter((v) => !v.includes("@")),
      ownOrg: org?.orgName ?? "",
    });
  } else {
    source = "demo";
    candidates = DEMO_COMPANIES.map((d) => ({ ...d, website: `https://${d.domain}`, reason: "", reasonUrl: null }));
  }
  const seen = new Set<string>();
  const rows: (typeof schema.prospects.$inferInsert)[] = [];
  let excluded = 0;
  for (const cand of candidates) {
    const domain = normalizeDomain(cand.domain || cand.website);
    if (!domain || seen.has(domain) || BLOCKED.test(domain + ".")) continue;
    seen.add(domain);
    if (excl.has(domain)) {
      excluded++;
      continue;
    }
    rows.push({ campaignId: c.id, name: cand.name, domain, website: `https://${domain}`, reason: cand.reason, reasonUrl: cand.reasonUrl, source, selected: rows.length < c.contactCount });
    if (rows.length >= c.contactCount + 5) break;
  }
  if (rows.length) await db.insert(schema.prospects).values(rows).onConflictDoNothing();
  const shortfall: string[] = [];
  if (rows.length < c.contactCount) shortfall.push(`Found ${rows.length} ${rows.length === 1 ? "organization" : "organizations"} for ${c.contactCount} requested.`);
  if (excluded) shortfall.push(`${excluded} skipped because you've already contacted them.`);
  await db.update(schema.campaigns).set({ status: "targets", shortfall }).where(eq(schema.campaigns.id, c.id));
  return { added: rows.length, source, shortfall };
}

export async function addManualProspect(c: Campaign, input: string) {
  const db = await getDb();
  const domain = normalizeDomain(input);
  if (!domain.includes(".")) throw new Error("Enter a website like acme.com");
  const [ex] = await db.select().from(schema.exclusions).where(and(eq(schema.exclusions.userId, c.userId), eq(schema.exclusions.value, domain)));
  if (ex) throw new Error(`You've already contacted ${domain}. Remove it from exclusions in Setup to add it again.`);
  const name = domain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  await db.insert(schema.prospects).values({ campaignId: c.id, name, domain, website: `https://${domain}`, reason: "Added by you.", source: "manual", selected: true }).onConflictDoNothing();
}
