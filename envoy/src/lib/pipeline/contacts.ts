import "server-only";
import { callStructured, llmAvailable, textDoc } from "@/lib/llm/client";
import { TEAM_SYSTEM } from "@/lib/llm/prompts";
import { TeamPeopleZ, teamPeopleSchema } from "@/lib/llm/schemas";
import { domainSearch, emailFinder, hunterAvailable, type HunterPerson } from "@/lib/providers/hunter";
import type { ContactStatus } from "@/db/schema";
import type { EvidenceRow } from "./evidence";
import type { ExaPerson } from "@/lib/providers/exa";

export interface ContactDraft {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  emailStatus: ContactStatus;
  confidence: number | null;
  source: string;
  sourceUrl: string | null;
  linkedinUrl: string | null;
  score: number;
}

const GENERIC = /^(info|hello|hi|contact|contactus|partnerships?|partners|press|media|pr|sales|support|help|team|admin|office|careers|jobs|hr|investors?|ir|marketing|business|bd|general|inquiries|enquiries|community|mailbox|noreply|no-reply)([-._+][a-z0-9-]*)?@/i;
const SENDABLE: ContactStatus[] = ["verified", "accept_all", "unknown"];
export const isSendable = (s: ContactStatus) => SENDABLE.includes(s);

const toks = (s: string) => new Set(s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["and", "the", "head", "director"].includes(w)));
function titleScore(title: string | null, roles: string[]) {
  if (!title) return 0;
  const t = title.toLowerCase();
  let best = 0;
  for (const r of roles) {
    const rt = toks(r);
    const tt = toks(title);
    let inter = 0;
    for (const w of rt) if (tt.has(w)) inter++;
    best = Math.max(best, rt.size ? inter / rt.size : 0);
  }
  if (/\b(ceo|founder|co-founder|president)\b/.test(t)) best = Math.max(best, 0.55);
  if (/\b(chief|vp|vice president|head)\b/.test(t)) best += 0.15;
  return best;
}

function statusFromHunter(p: HunterPerson, acceptAll: boolean): ContactStatus {
  const v = p.verification?.status;
  if (v === "valid") return "verified";
  if (acceptAll || v === "accept_all") return "accept_all";
  if (p.confidence >= 90) return "verified";
  return "unknown";
}

export async function findContacts(args: { domain: string; roles: string[]; evidence: EvidenceRow[]; website: string; exaPeople?: ExaPerson[]; limit?: number }): Promise<ContactDraft[]> {
  const { domain, roles, evidence } = args;
  const out: ContactDraft[] = [];

  // A. Hunter domain search (named people with titles, confidence, and catch-all flag)
  let acceptAll = false;
  let pattern: string | null = null;
  if (hunterAvailable()) {
    try {
      const ds = await domainSearch(domain);
      acceptAll = ds.accept_all;
      pattern = ds.pattern;
      for (const p of ds.emails) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || null;
        out.push({
          name,
          firstName: p.first_name,
          lastName: p.last_name,
          title: p.position,
          email: p.value,
          emailStatus: GENERIC.test(p.value) ? "published_generic" : statusFromHunter(p, ds.accept_all),
          confidence: p.confidence,
          source: "hunter",
          sourceUrl: p.sources?.[0]?.uri ?? null,
          linkedinUrl: p.linkedin ? (p.linkedin.startsWith("http") ? p.linkedin : `https://www.linkedin.com/in/${p.linkedin}`) : null,
          score: titleScore(p.position, roles),
        });
      }
    } catch (e) {
      console.warn("hunter domain search failed", domain, e);
    }
  }

  // A2. People Exa confirmed in the target roles. To save Hunter credits, an email is looked up automatically only for the
  // best-matching person when Hunter found nobody reachable; everyone else gets a "Find email" button.
  const reachable = () => out.some((c) => c.name && isSendable(c.emailStatus));
  const exaRanked = [...(args.exaPeople ?? [])].sort((a, b) => titleScore(b.jobTitle, roles) - titleScore(a.jobTitle, roles));
  const sameName = (a: string | null, b: string) => !!a && a.toLowerCase().replace(/[^a-z]/g, "") === b.toLowerCase().replace(/[^a-z]/g, "");
  for (const p of exaRanked) {
    const existing = out.find((c) => sameName(c.name, p.name));
    if (existing) {
      existing.linkedinUrl ??= p.linkedinUrl;
      existing.title ??= p.jobTitle;
      continue;
    }
    const [first, ...rest] = p.name.split(/\s+/);
    const last = rest.at(-1) ?? "";
    let email: string | null = null;
    let status: ContactStatus = "not_found";
    let confidence: number | null = null;
    if (hunterAvailable() && first && last && !reachable()) {
      const f = await emailFinder(domain, first, last).catch(() => null);
      confidence = 0; // looked up; overwritten below when an address is found
      if (f?.email) {
        email = f.email;
        confidence = f.score;
        status = f.verification?.status === "valid" ? "verified" : acceptAll || f.accept_all ? "accept_all" : (f.score ?? 0) >= 90 ? "verified" : "unknown";
      }
    }
    out.push({ name: p.name, firstName: first, lastName: last || null, title: p.jobTitle, email, emailStatus: status, confidence, source: email ? "exa+hunter" : "exa", sourceUrl: p.sourceUrl, linkedinUrl: p.linkedinUrl, score: titleScore(p.jobTitle, roles) });
  }

  // B. Published contacts on the company's own pages
  for (const r of evidence) {
    for (const email of r.emails) {
      if (out.some((c) => c.email === email)) continue;
      // A scraped address counts as personal only if it looks like a name (first.last, j.doe); otherwise it's a shared inbox.
      const generic = GENERIC.test(email) || !/^[a-z]+[._-][a-z]+@/.test(email);
      out.push({
        name: null,
        firstName: null,
        lastName: null,
        title: generic ? null : "Listed on company site",
        email,
        emailStatus: generic ? "published_generic" : "unknown",
        confidence: null,
        source: "published",
        sourceUrl: r.url,
        linkedinUrl: null,
        score: generic ? -1 : 0.1,
      });
    }
  }

  // Team page names: only worth a model call if Hunter found nobody matching the target roles
  const team = evidence.find((r) => r.kind === "team");
  const haveGoodNamed = out.some((c) => c.name && isSendable(c.emailStatus) && c.score >= 0.4);
  if (team && llmAvailable() && !haveGoodNamed) {
    try {
      const r = await callStructured({ system: TEAM_SYSTEM, content: [textDoc(team.text.slice(0, 8000), team.url), { type: "text", text: "List the people." }], schema: teamPeopleSchema, parse: TeamPeopleZ, maxTokens: 2000, effort: "low", label: "team-page" });
      const ranked = r.data.people.map((p) => ({ ...p, score: titleScore(p.title, roles) })).sort((a, b) => b.score - a.score).slice(0, 2);
      for (const p of ranked) {
        const [first, ...rest] = p.name.split(/\s+/);
        const last = rest.at(-1) ?? "";
        let email: string | null = null;
        let status: ContactStatus = "not_found";
        let confidence: number | null = null;
        if (hunterAvailable() && first && last) {
          const f = await emailFinder(domain, first, last).catch(() => null);
          confidence = 0;
          if (f?.email) {
            email = f.email;
            confidence = f.score;
            status = f.verification?.status === "valid" ? "verified" : acceptAll || f.accept_all ? "accept_all" : (f.score ?? 0) >= 90 ? "verified" : "unknown";
          }
        }
        out.push({ name: p.name, firstName: first, lastName: last || null, title: p.title, email, emailStatus: status, confidence, source: email ? "finder" : "team_page", sourceUrl: team.url, linkedinUrl: null, score: p.score });
      }
    } catch (e) {
      console.warn("team page extraction failed", domain, e);
    }
  }

  const rank = (c: ContactDraft) => (isSendable(c.emailStatus) ? 10 : c.emailStatus === "published_generic" ? 1 : c.name ? 2 : 0) + (c.emailStatus === "verified" ? 2 : 0) + c.score * 5 + (c.name ? 1 : 0);
  out.sort((a, b) => rank(b) - rank(a));
  const top = out.slice(0, Math.max(1, args.limit ?? 10));
  if (!top.length) {
    const contactPage = evidence.find((r) => r.kind === "contact");
    top.push({ name: null, firstName: null, lastName: null, title: roles[0] ?? null, email: null, emailStatus: "not_found", confidence: null, source: "none", sourceUrl: contactPage?.url ?? args.website, linkedinUrl: null, score: 0 });
  }
  void pattern;
  return top;
}

/** Status for an address Hunter's email finder returned. */
export function finderStatus(f: { score: number | null; accept_all?: boolean; verification?: { status: string | null } }, domainAcceptAll = false): ContactStatus {
  if (f.verification?.status === "valid") return "verified";
  if (domainAcceptAll || f.accept_all) return "accept_all";
  return (f.score ?? 0) >= 90 ? "verified" : "unknown";
}
