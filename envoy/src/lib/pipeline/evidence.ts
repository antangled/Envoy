import "server-only";
import { and, eq, gt } from "drizzle-orm";
import pLimit from "p-limit";
import { getDb, schema } from "@/db";
import { fetchPage, kindOf, pickSubpages, type FetchedPage } from "@/lib/providers/fetchPage";
import { contents as exaContents, exaAvailable, recentNews } from "@/lib/providers/exa";

export type EvidenceRow = typeof schema.evidence.$inferSelect;
const FRESH_MS = 14 * 864e5;
const KIND_ORDER = ["home", "about", "news", "product", "careers", "team", "page", "contact"];

/** Evidence is cached per domain for 14 days, so research is shared across campaigns and both modes. */
export async function gatherEvidence(domain: string, companyName: string): Promise<EvidenceRow[]> {
  const db = await getDb();
  const since = new Date(Date.now() - FRESH_MS);
  const cached = await db.select().from(schema.evidence).where(and(eq(schema.evidence.domain, domain), gt(schema.evidence.fetchedAt, since)));
  if (cached.length >= 2) return sortRows(cached);

  const pages: { page: FetchedPage; kind: string; source: string }[] = [];
  let home = await fetchPage(`https://${domain}`);
  if (!home) home = await fetchPage(`https://www.${domain}`);
  if (home) {
    pages.push({ page: home, kind: "home", source: "fetch" });
    const limit = pLimit(4);
    const subs = await Promise.all(pickSubpages(home).map((u) => limit(() => fetchPage(u, 7000))));
    const seen = new Set([home.url]);
    for (const p of subs) {
      if (!p || seen.has(p.url) || p.text.length < 120) continue;
      seen.add(p.url);
      pages.push({ page: p, kind: kindOf(p.url), source: "fetch" });
    }
  }
  const usable = pages.filter((p) => p.page.text.length >= 300).length;
  if (exaAvailable()) {
    if (usable < 3) {
      const urls = home ? [home.url, ...pickSubpages(home, 3)] : [`https://${domain}`, `https://${domain}/about`];
      const extra = await exaContents(urls).catch(() => []);
      for (const e of extra) if (!pages.some((p) => p.page.url === e.url)) pages.push({ page: { url: e.url, title: e.title, text: e.text, links: [], emails: [] }, kind: kindOf(e.url), source: "exa" });
    }
    const news = await recentNews(companyName, domain).catch(() => []);
    for (const n of news) pages.push({ page: { url: n.url, title: n.title, text: n.text, links: [], emails: [] }, kind: "news", source: "exa" });
  }
  if (!pages.length) return [];
  const rows = pages.map((p) => ({
    domain,
    url: p.page.url,
    title: p.page.title.slice(0, 300),
    text: p.page.text.slice(0, 6000),
    kind: p.kind,
    emails: p.page.emails,
    source: p.source,
    fetchedAt: new Date(),
  }));
  for (const r of rows) {
    await db.insert(schema.evidence).values(r).onConflictDoUpdate({
      target: [schema.evidence.domain, schema.evidence.url],
      set: { title: r.title, text: r.text, kind: r.kind, emails: r.emails, source: r.source, fetchedAt: r.fetchedAt },
    });
  }
  const fresh = await db.select().from(schema.evidence).where(and(eq(schema.evidence.domain, domain), gt(schema.evidence.fetchedAt, since)));
  return sortRows(fresh);
}

function sortRows(rows: EvidenceRow[]) {
  return [...rows].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.text.length - a.text.length);
}

/** Pages sent to the model: up to 8, contact pages and near-empty pages excluded, ≤ 4,000 chars each. */
export function forModel(rows: EvidenceRow[]) {
  return rows
    .filter((r) => r.kind !== "contact" && r.text.length >= 300)
    .slice(0, 8)
    .map((r, i) => ({ eid: `e${i + 1}`, rowId: r.id, url: r.url, title: r.title || r.url, text: r.text.slice(0, 4000), kind: r.kind }));
}
