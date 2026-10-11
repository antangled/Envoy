import "server-only";
import Exa from "exa-js";
import { normalizeDomain } from "./fetchPage";
import { secret } from "@/lib/env";
import { recordExa } from "@/lib/usage";

/**
 * Exa usage follows the build-with-exa skill:
 * - building a list of organizations and finding the people at them are Agent API runs (/agent/runs), not /search with a category;
 * - recent news is a plain /search with bare `highlights: true`, recency phrased in the query;
 * - known URLs go to /contents.
 */
export const exaAvailable = () => !!secret("EXA_API_KEY");

let client: Exa | null = null;
const exa = () => (client ??= new Exa(secret("EXA_API_KEY"), process.env.EXA_BASE_URL || "https://api.exa.ai"));

const WAIT = { pollInterval: 4000, timeoutMs: 270_000 };

export interface Candidate {
  name: string;
  domain: string;
  website: string;
  reason: string;
  reasonUrl: string | null;
}

/** Grounding entries name the field they support, e.g. "organizations[3].reason". */
function citationFor(grounding: { field: string; citations: { url: string }[] }[] | null | undefined, field: string) {
  return grounding?.find((g) => g.field === field)?.citations?.[0]?.url ?? null;
}

async function runAgent<T>(params: Parameters<ReturnType<typeof exa>["agent"]["runs"]["create"]>[0] & { effort: "low" }) {
  try {
    const run = await exa().agent.runs.createAndWait(params, WAIT);
    recordExa(run.costDollars?.total as number | undefined);
    return { structured: run.output?.structured as T | undefined, grounding: run.output?.grounding ?? null, cost: run.costDollars };
  } catch (e) {
    const run = (e as { run?: { status?: string; error?: { message?: string } } }).run;
    if (run) throw new Error(`Exa search ${run.status}: ${run.error?.message ?? "no details"}`);
    throw e;
  }
}

/** One Agent run builds the whole organization list; already-contacted domains are passed as exclusions. */
export async function findOrganizations(args: {
  goal: string;
  description: string;
  geography: string;
  sizeHint: string;
  seeds: string[];
  count: number;
  exclude: string[];
  ownOrg: string;
}): Promise<Candidate[]> {
  const parts = [
    `Find up to ${args.count} organizations for this outreach goal: ${args.goal}`,
    `Kind of organization: ${args.description}.`,
    args.geography && `Location: ${args.geography}.`,
    args.sizeHint && `Size: ${args.sizeHint}.`,
    args.seeds.length && `Similar to: ${args.seeds.join(", ")}.`,
  ].filter(Boolean);
  const r = await runAgent<{ organizations: { name: string; website: string; reason: string }[] }>({
    query: parts.join(" "),
    systemPrompt: `Return real, currently operating organizations with their own website. Skip directories, marketplaces, news sites, investors, and ${args.ownOrg || "the sender's own organization"}. reason is one sentence on what about the organization matches the goal, taken from a source.`,
    effort: "low",
    input: args.exclude.length ? { exclusion: args.exclude.slice(0, 500).map((domain) => ({ domain })) } : undefined,
    outputSchema: {
      type: "object",
      properties: {
        organizations: {
          type: "array",
          maxItems: args.count,
          items: {
            type: "object",
            properties: { name: { type: "string" }, website: { type: "string", format: "uri" }, reason: { type: "string" } },
            required: ["name", "website", "reason"],
          },
        },
      },
      required: ["organizations"],
    },
  });
  return (r.structured?.organizations ?? []).map((o, i) => {
    const domain = normalizeDomain(o.website);
    return { name: o.name, domain, website: `https://${domain}`, reason: o.reason, reasonUrl: citationFor(r.grounding, `organizations[${i}].reason`) };
  });
}

export interface ExaPerson {
  domain: string;
  name: string;
  jobTitle: string;
  linkedinUrl: string | null;
  sourceUrl: string | null;
}

/** One Agent run enriches every selected organization with the people in the target roles. */
export async function findPeople(orgs: { name: string; domain: string }[], roles: string[], perCompany = 10): Promise<ExaPerson[]> {
  if (!orgs.length) return [];
  const r = await runAgent<{ people: { domain: string; name: string; job_title: string; linkedin_url?: string; source_url?: string }[] }>({
    query: `For each organization in the input, find up to ${perCompany} people who currently hold one of these roles, or the closest senior equivalent: ${roles.join(", ")}. Several people in the same role are welcome.`,
    systemPrompt:
      "Include a person only when a source confirms they currently hold that role at that organization. Never guess or infer a name. Leave an organization out if no one can be confirmed. domain must be the organization's domain from the input. source_url is the page that confirms the role.",
    effort: "low",
    input: { data: orgs.map((o) => ({ name: o.name, domain: o.domain })) },
    outputSchema: {
      type: "object",
      properties: {
        people: {
          type: "array",
          maxItems: orgs.length * perCompany,
          items: {
            type: "object",
            properties: {
              domain: { type: "string" },
              name: { type: "string" },
              job_title: { type: "string" },
              linkedin_url: { type: "string", format: "uri" },
              source_url: { type: "string", format: "uri" },
            },
            required: ["domain", "name", "job_title"],
          },
        },
      },
      required: ["people"],
    },
  });
  return (r.structured?.people ?? []).map((p, i) => ({
    domain: normalizeDomain(p.domain),
    name: p.name.trim(),
    jobTitle: p.job_title.trim(),
    linkedinUrl: p.linkedin_url || null,
    sourceUrl: p.source_url || citationFor(r.grounding, `people[${i}].job_title`) || citationFor(r.grounding, `people[${i}].name`),
  }));
}

/** Known URLs → page text. The 4,000-character cap is the per-page evidence budget for the brief. */
export async function contents(urls: string[]) {
  const res = await exa().getContents(urls, { text: { maxCharacters: 4000 } });
  recordExa((res as { costDollars?: { total?: number } }).costDollars?.total);
  return res.results.filter((r) => r.text && r.text.length > 200).map((r) => ({ url: r.url, title: r.title || r.url, text: r.text }));
}

/** Recent coverage of a company. Five results is the evidence budget; recency is phrased in the query, not a date filter. */
export async function recentNews(companyName: string, domain: string) {
  const res = await exa().search(`latest news and announcements from ${companyName} (${domain})`, {
    type: "auto",
    numResults: 5,
    contents: { highlights: true },
  });
  recordExa((res as { costDollars?: { total?: number } }).costDollars?.total);
  const key = companyName.toLowerCase().split(/\s+/)[0];
  return res.results
    .map((r) => ({ url: r.url, title: r.title || r.url, text: (r.highlights ?? []).join("\n"), publishedDate: r.publishedDate }))
    .filter((r) => r.text && (r.text.toLowerCase().includes(key) || r.title.toLowerCase().includes(key) || normalizeDomain(r.url) === domain))
    .slice(0, 3);
}
