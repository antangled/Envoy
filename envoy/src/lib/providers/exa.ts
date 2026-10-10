import "server-only";
import { normalizeDomain } from "./fetchPage";

const BASE = process.env.EXA_BASE_URL || "https://api.exa.ai";
export const exaAvailable = () => !!process.env.EXA_API_KEY;

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY! },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Exa ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

interface ExaResult {
  url: string;
  title?: string | null;
  text?: string;
  publishedDate?: string | null;
  highlights?: string[];
}

export interface Candidate {
  name: string;
  domain: string;
  website: string;
  reason: string;
}

function toCandidate(r: ExaResult): Candidate {
  const domain = normalizeDomain(r.url);
  const raw = (r.title || domain).split(/\s[|\-–—:]\s/)[0].trim();
  return { name: raw || domain, domain, website: `https://${domain}`, reason: (r.highlights?.[0] || r.text || "").replace(/\s+/g, " ").slice(0, 220) };
}

export async function searchCompanies(query: string, numResults = 25): Promise<Candidate[]> {
  const data = await post<{ results: ExaResult[] }>("/search", {
    query,
    category: "company",
    type: "auto",
    numResults,
    contents: { highlights: { numSentences: 2, highlightsPerUrl: 1, query } },
  });
  return data.results.map(toCandidate);
}

export async function findSimilar(url: string, numResults = 10): Promise<Candidate[]> {
  const data = await post<{ results: ExaResult[] }>("/findSimilar", {
    url,
    numResults,
    excludeSourceDomain: true,
    category: "company",
    contents: { highlights: { numSentences: 2, highlightsPerUrl: 1 } },
  });
  return data.results.map(toCandidate);
}

export async function contents(urls: string[], maxCharacters = 4000) {
  const data = await post<{ results: ExaResult[] }>("/contents", { urls, text: { maxCharacters } });
  return data.results.filter((r) => r.text && r.text.length > 200).map((r) => ({ url: r.url, title: r.title || r.url, text: r.text! }));
}

export async function recentNews(companyName: string, domain: string) {
  const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const data = await post<{ results: ExaResult[] }>("/search", {
    query: `${companyName} (${domain}) announcement news`,
    type: "auto",
    numResults: 5,
    startPublishedDate: since,
    contents: { text: { maxCharacters: 3000 } },
  });
  const nameKey = companyName.toLowerCase().split(/\s+/)[0];
  return data.results
    .filter((r) => r.text && (r.text.toLowerCase().includes(nameKey) || normalizeDomain(r.url) === domain))
    .slice(0, 3)
    .map((r) => ({ url: r.url, title: r.title || r.url, text: r.text!, publishedDate: r.publishedDate }));
}
