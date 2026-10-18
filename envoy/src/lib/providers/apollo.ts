import "server-only";
import { secret } from "@/lib/env";

/**
 * Apollo, used only by the BEACN outreach tool and only from the server, so members never see the key or the account.
 *
 * Credit rules (docs.apollo.io):
 * - People search (/mixed_people/api_search): 0 credits. Returns names (last name partly hidden) and titles, no emails.
 * - Company search (/mixed_companies/search): 1 credit per page, whatever the number of results.
 * - Bulk people enrichment (/people/bulk_match): 1 credit per person, charged only when an email or other data is found.
 *   Phone numbers cost 8 more and personal emails also cost credits, so both are always off here.
 */
export const apolloAvailable = () => !!secret("APOLLO_API_KEY");

const base = () => process.env.APOLLO_BASE_URL || "https://api.apollo.io";

async function call<T>(path: string, params: URLSearchParams, body?: unknown): Promise<T> {
  const res = await fetch(`${base()}/api/v1${path}?${params}`, {
    method: "POST",
    headers: { "x-api-key": secret("APOLLO_API_KEY")!, "content-type": "application/json", "cache-control": "no-cache" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string } | null)?.error || (data as { message?: string } | null)?.message || text.slice(0, 200);
    if (res.status === 429) throw new Error("Apollo's hourly limit was reached. Try again in a few minutes.");
    if (res.status === 401 || res.status === 403) throw new Error("Apollo rejected the club's API key. Ask an admin to check it.");
    throw new Error(`Apollo ${path} failed (${res.status}): ${msg}`);
  }
  return data as T;
}

const arr = (p: URLSearchParams, key: string, values: string[]) => values.forEach((v) => p.append(`${key}[]`, v));

export interface ApolloCompany {
  name: string;
  domain: string;
  apolloOrgId: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
}

/** Company search by name. Costs 1 credit per call, so callers cache by query. */
export async function searchCompanies(name: string): Promise<ApolloCompany[]> {
  const p = new URLSearchParams({ q_organization_name: name, page: "1", per_page: "10" });
  const r = await call<{ organizations?: Record<string, unknown>[]; accounts?: Record<string, unknown>[] }>("/mixed_companies/search", p);
  const rows = [...(r.organizations ?? []), ...(r.accounts ?? [])];
  const out: ApolloCompany[] = [];
  for (const o of rows) {
    const domain = String(o.primary_domain || "").toLowerCase() || String(o.website_url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
    if (!domain || out.some((x) => x.domain === domain)) continue;
    out.push({ name: String(o.name || domain), domain, apolloOrgId: (o.id as string) ?? null, logoUrl: (o.logo_url as string) ?? null, linkedinUrl: (o.linkedin_url as string) ?? null });
  }
  return out;
}

export interface ApolloPersonHit {
  apolloId: string;
  firstName: string;
  lastNameObfuscated: string;
  title: string | null;
  hasEmail: boolean;
  companyName: string;
}

/** People at one company, filtered by role. Free: no credits. */
export async function searchPeople(args: { domain: string; titles: string[]; seniorities: string[]; page?: number }): Promise<{ total: number; people: ApolloPersonHit[] }> {
  const p = new URLSearchParams({ page: String(args.page ?? 1), per_page: "25" });
  arr(p, "q_organization_domains_list", [args.domain]);
  if (args.titles.length) {
    arr(p, "person_titles", args.titles.slice(0, 50));
    p.set("include_similar_titles", "true");
  }
  if (args.seniorities.length) arr(p, "person_seniorities", args.seniorities);
  const r = await call<{ total_entries?: number; people?: Record<string, unknown>[] }>("/mixed_people/api_search", p);
  return {
    total: r.total_entries ?? 0,
    people: (r.people ?? []).map((x) => ({
      apolloId: String(x.id),
      firstName: String(x.first_name || ""),
      lastNameObfuscated: String(x.last_name_obfuscated || ""),
      title: (x.title as string) || null,
      hasEmail: !!x.has_email,
      companyName: String((x.organization as { name?: string } | undefined)?.name || ""),
    })),
  };
}

export interface ApolloMatch {
  apolloId: string;
  firstName: string;
  lastName: string;
  title: string | null;
  linkedinUrl: string | null;
  email: string | null;
  emailStatus: string | null;
}

/** Work-email lookup for up to 10 people. Charged 1 credit per person only when data is found. */
export async function lookupEmails(apolloIds: string[]): Promise<{ matches: ApolloMatch[]; creditsConsumed: number | null }> {
  if (apolloIds.length > 10) throw new Error("Apollo looks up at most 10 people per call");
  const p = new URLSearchParams({ reveal_personal_emails: "false", reveal_phone_number: "false" });
  const r = await call<{ matches?: (Record<string, unknown> | null)[]; credits_consumed?: number }>("/people/bulk_match", p, { details: apolloIds.map((id) => ({ id })) });
  const matches = (r.matches ?? []).flatMap((m) =>
    m
      ? [
          {
            apolloId: String(m.id),
            firstName: String(m.first_name || ""),
            lastName: String(m.last_name || ""),
            title: (m.title as string) || null,
            linkedinUrl: (m.linkedin_url as string) || null,
            email: (m.email as string) || null,
            emailStatus: (m.email_status as string) || null,
          },
        ]
      : [],
  );
  return { matches, creditsConsumed: typeof r.credits_consumed === "number" ? r.credits_consumed : null };
}
