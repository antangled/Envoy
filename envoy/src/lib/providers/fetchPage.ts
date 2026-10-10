import "server-only";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export interface FetchedPage {
  url: string;
  title: string;
  text: string;
  links: string[];
  emails: string[];
}

const UA = "Mozilla/5.0 (compatible; EnvoyBot/0.1; +https://envoy.local/bot)";
const EMAIL_RE = /(?<![A-Z0-9._%+-])[A-Z0-9][A-Z0-9._%+-]{0,40}@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,24}(?![A-Z0-9-])/gi;
/** Rejects scraped artefacts: hashes glued to addresses, asset filenames, placeholder domains. */
export function plausibleEmail(e: string) {
  const local = e.split("@")[0];
  return !/[0-9a-f]{12,}/i.test(local) && !/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(e) && !/sentry|example\.|domain\.com|email\.com|wixpress/i.test(e);
}

export function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  if (!/^https?:\/\//.test(s)) s = "https://" + s;
  try {
    return new URL(s).hostname.replace(/^www\./, "");
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, "");
  }
}

const sameSite = (host: string, domain: string) => host.replace(/^www\./, "") === domain || host.endsWith("." + domain);

export async function fetchPage(url: string, timeoutMs = 9000): Promise<FetchedPage | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html")) return null;
    const html = (await res.text()).slice(0, 1_500_000);
    const finalUrl = res.url || url;
    return extract(html, finalUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function extract(html: string, url: string): FetchedPage {
  const { document } = parseHTML(html);
  const domain = normalizeDomain(url);
  const links = new Set<string>();
  const emails = new Set<string>();
  for (const a of Array.from(document.querySelectorAll("a[href]")) as Element[]) {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("mailto:")) {
      let e = "";
      try { e = decodeURIComponent(href.slice(7).split("?")[0]).trim().toLowerCase(); } catch {}
      if (e.includes("@") && plausibleEmail(e)) emails.add(e);
      continue;
    }
    try {
      const u = new URL(href, url);
      if ((u.protocol === "https:" || u.protocol === "http:") && sameSite(u.hostname, domain)) {
        u.hash = "";
        links.add(u.toString());
      }
    } catch {}
  }
  for (const m of html.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase();
    if (plausibleEmail(e)) emails.add(e);
  }
  const title = (document.querySelector("title")?.textContent || "").trim();
  let text = "";
  try {
    const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
    text = article?.textContent || "";
  } catch {}
  if (text.trim().length < 300) {
    const { document: d2 } = parseHTML(html);
    d2.querySelectorAll("script,style,noscript,svg,nav,footer,header").forEach((n: Element) => n.remove());
    text = d2.body?.textContent || "";
  }
  text = text.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
  return { url, title, text, links: [...links], emails: [...emails].filter((e) => e.endsWith(domain) || e.split("@")[1]?.endsWith(domain)) };
}

const KIND_PATTERNS: [string, RegExp][] = [
  ["about", /\/(about|about-us|company|who-we-are|our-story|mission)(\/|$)/i],
  ["team", /\/(team|leadership|people|our-team|management)(\/|$)/i],
  ["news", /\/(news|press|newsroom|blog|media|announcements|updates)(\/|$)/i],
  ["careers", /\/(careers|jobs|join|join-us|work-with-us)(\/|$)/i],
  ["product", /\/(products?|solutions?|platform|technology)(\/|$)/i],
  ["contact", /\/(contact|contact-us|partners|partnerships)(\/|$)/i],
];

export function kindOf(url: string): string {
  try {
    const p = new URL(url).pathname;
    if (p === "/" || p === "") return "home";
    for (const [k, re] of KIND_PATTERNS) if (re.test(p)) return k;
  } catch {}
  return "page";
}

/** Choose up to n subpages worth reading: one per kind first, then guessed paths for kinds the homepage didn't link. */
export function pickSubpages(home: FetchedPage, n = 7): string[] {
  const byKind = new Map<string, string>();
  const sorted = [...home.links].sort((a, b) => a.length - b.length);
  for (const l of sorted) {
    const k = kindOf(l);
    if (k !== "home" && k !== "page" && !byKind.has(k)) byKind.set(k, l);
  }
  const origin = new URL(home.url).origin;
  const guesses: Record<string, string> = { about: "/about", news: "/news", careers: "/careers", team: "/team", contact: "/contact" };
  for (const [k, p] of Object.entries(guesses)) if (!byKind.has(k)) byKind.set(k, origin + p);
  return [...byKind.values()].slice(0, n);
}
