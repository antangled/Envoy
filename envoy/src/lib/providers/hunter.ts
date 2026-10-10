import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const hunterAvailable = () => !!process.env.HUNTER_API_KEY;

export interface HunterPerson {
  value: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  sources?: { uri: string }[];
  verification?: { status: string | null } | null;
}

export interface DomainSearch {
  pattern: string | null;
  accept_all: boolean;
  organization: string | null;
  emails: HunterPerson[];
}

const TTL_MS = 30 * 864e5;

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  const [row] = await db.select().from(schema.hunterCache).where(eq(schema.hunterCache.key, key));
  if (row && Date.now() - row.createdAt.getTime() < TTL_MS) return row.data as T;
  const data = await fn();
  await db
    .insert(schema.hunterCache)
    .values({ key, data: data as object })
    .onConflictDoUpdate({ target: schema.hunterCache.key, set: { data: data as object, createdAt: new Date() } });
  return data;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, api_key: process.env.HUNTER_API_KEY! });
  const res = await fetch(`${process.env.HUNTER_BASE_URL || "https://api.hunter.io"}/v2${path}?${qs}`);
  if (res.status === 404) return { data: null } as T;
  if (!res.ok) throw new Error(`Hunter ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

/** One domain search per domain per 30 days; the free plan returns up to 10 people. */
export function domainSearch(domain: string): Promise<DomainSearch> {
  return cached(`ds:${domain}`, async () => {
    const r = await get<{ data: DomainSearch | null }>("/domain-search", { domain, type: "personal", limit: "10" });
    return r.data ?? { pattern: null, accept_all: false, organization: null, emails: [] };
  });
}

export function emailFinder(domain: string, first: string, last: string) {
  return cached(`ef:${domain}:${first}:${last}`.toLowerCase(), async () => {
    const r = await get<{ data: { email: string | null; score: number | null; accept_all?: boolean; verification?: { status: string | null } } | null }>(
      "/email-finder",
      { domain, first_name: first, last_name: last },
    );
    return r.data;
  });
}

export function verify(email: string) {
  return cached(`ev:${email}`.toLowerCase(), async () => {
    const r = await get<{ data: { status: string; score: number; accept_all: boolean } | null }>("/email-verifier", { email });
    return r.data;
  });
}
