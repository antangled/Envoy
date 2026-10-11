/**
 * The email template engine, shared by the Setup editor, the review screen, and sending.
 *
 * A template is the whole email as one piece of text:
 *   {{first_name}}, {{company}}  filled per contact
 *   {{ai_opening}}               written per company (an observed, sourced fact)
 *   {{ai_ideas}}                 three ideas written per company, each built on one of your services
 *   [bracketed text]             placeholder the user still has to replace
 */

export type Mode = "client" | "partnership";

export const VARIABLES = [
  { token: "{{first_name}}", label: "First name", help: "The contact's first name. Falls back to “{company} team” when no name is found." },
  { token: "{{company}}", label: "Company", help: "The organization's name." },
] as const;

export const AI_BLOCKS = [
  { token: "{{ai_opening}}", label: "Tailored opening", help: "One or two recent, sourced facts about the company, written to fit the words around it." },
  { token: "{{ai_ideas}}", label: "Tailored ideas", help: "Three short ideas for this company, each built on one of your services." },
] as const;

export const DEFAULT_SUBJECT = "[Your organization] x {{company}} collaboration?";

export const DEFAULT_TEMPLATES: Record<Mode, string> = {
  client: `Dear {{first_name}},

Hope you're doing well! I'm [your first name], a [your role] at [your organization], [what your organization is, e.g. a student-run sustainability consulting group]. I saw {{ai_opening}}, and wanted to reach out about potentially supporting that through [what you're offering, e.g. a semester-long project].

A few ideas that came to mind:

{{ai_ideas}}

To provide some context, [who does the work, e.g. each project is staffed by seven analysts plus an MBA mentor]. Across [your track record, e.g. 180+ projects for 150+ organizations], we've worked on [your services, e.g. market sizing, competitive landscaping, and regulatory research].

We're finalizing our [season, e.g. fall] projects this week, and I'd love to hear what would actually be most useful to {{company}}.

Would this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.`,
  partnership: `Hi {{first_name}},

I'm [your first name], [your role] at [your organization], [what your organization does]. I saw {{ai_opening}}, and wanted to explore whether there's a way for [your organization] and {{company}} to work together.

A few ways this could look:

{{ai_ideas}}

For context, [your track record, e.g. we work with 40+ clinics across California].

Would a 20-minute call be worthwhile? Happy to work around your calendar.`,
};

// ---------------------------------------------------------------- parsing

export type Part =
  | { kind: "text"; text: string }
  | { kind: "var"; name: "first_name" | "company"; raw: string }
  | { kind: "ai"; name: "ai_opening" | "ai_ideas"; raw: string }
  | { kind: "fill"; text: string }
  | { kind: "unknown"; raw: string };

const TOKEN_RE = /(\{\{\s*[a-z_]+\s*\}\}|\[[^\]\n]{1,160}\])/g;

export function tokenize(s: string): Part[] {
  const out: Part[] = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN_RE)) {
    if (m.index! > last) out.push({ kind: "text", text: s.slice(last, m.index) });
    const raw = m[0];
    if (raw.startsWith("[")) out.push({ kind: "fill", text: raw.slice(1, -1) });
    else {
      const name = raw.replace(/[{}\s]/g, "");
      if (name === "first_name" || name === "company") out.push({ kind: "var", name, raw });
      else if (name === "ai_opening" || name === "ai_ideas") out.push({ kind: "ai", name, raw });
      else out.push({ kind: "unknown", raw });
    }
    last = m.index! + raw.length;
  }
  if (last < s.length) out.push({ kind: "text", text: s.slice(last) });
  return out;
}

/** Bracketed placeholders still waiting for the user's words. */
export const unfilledPlaceholders = (s: string) => [...s.matchAll(/\[([^\]\n]{1,160})\]/g)].map((m) => m[1]);
export const unknownTokens = (s: string) => tokenize(s).flatMap((p) => (p.kind === "unknown" ? [p.raw] : []));
export const usesAi = (s: string) => ({ opening: /\{\{\s*ai_opening\s*\}\}/.test(s), ideas: /\{\{\s*ai_ideas\s*\}\}/.test(s) });

// ---------------------------------------------------------------- rendering

export interface Slots {
  hook: { text: string; evidence_ids: string[] };
  ideas: { title: string; sentence: string; evidence_ids: string[] }[];
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "var"; text: string }
  | { kind: "fill"; text: string }
  | { kind: "hook"; text: string | null; evidenceIds: string[] };

export type Block = { kind: "para"; segs: Segment[] } | { kind: "ideas"; items: { title: string; text: string; evidenceIds: string[] }[] | null };

export interface RenderContext {
  company: string;
  firstName: string | null;
  /** Null while previewing a template: the AI parts render as markers. */
  slots: Slots | null;
}

export function renderBody(template: string, ctx: RenderContext): Block[] {
  const blocks: Block[] = [];
  for (const para of template.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    let segs: Segment[] = [];
    const flush = () => {
      if (segs.some((s) => s.kind !== "text" || s.text.trim())) blocks.push({ kind: "para", segs: trimSegs(segs) });
      segs = [];
    };
    for (const p of tokenize(para)) {
      if (p.kind === "text") segs.push({ kind: "text", text: p.text });
      else if (p.kind === "fill") segs.push({ kind: "fill", text: p.text });
      else if (p.kind === "unknown") segs.push({ kind: "text", text: p.raw });
      else if (p.kind === "var") segs.push({ kind: "var", text: p.name === "company" ? ctx.company : ctx.firstName || `${ctx.company} team` });
      else if (p.name === "ai_opening") segs.push({ kind: "hook", text: ctx.slots?.hook.text ?? null, evidenceIds: ctx.slots?.hook.evidence_ids ?? [] });
      else {
        flush();
        blocks.push({ kind: "ideas", items: ctx.slots ? ctx.slots.ideas.map((x) => ({ title: x.title, text: x.sentence, evidenceIds: x.evidence_ids })) : null });
      }
    }
    flush();
  }
  return blocks;
}

function trimSegs(segs: Segment[]): Segment[] {
  const out = [...segs];
  if (out[0]?.kind === "text") out[0] = { kind: "text", text: out[0].text.replace(/^\s+/, "") };
  const l = out.length - 1;
  if (out[l]?.kind === "text") out[l] = { kind: "text", text: (out[l] as { text: string }).text.replace(/\s+$/, "") };
  return out;
}

export function renderSubject(template: string, ctx: Pick<RenderContext, "company" | "firstName">) {
  return tokenize(template || DEFAULT_SUBJECT)
    .map((p) => (p.kind === "text" ? p.text : p.kind === "var" ? (p.name === "company" ? ctx.company : ctx.firstName || ctx.company) : p.kind === "fill" ? `[${p.text}]` : ""))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) =>
      b.kind === "ideas"
        ? (b.items ?? []).map((i) => `- ${i.title}: ${i.text}`).join("\n")
        : b.segs.map((s) => (s.kind === "hook" ? (s.text ?? "[tailored opening]") : s.kind === "fill" ? `[${s.text}]` : s.text)).join(""),
    )
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------- signature and footer

export interface Signature {
  signoff: string;
  name: string;
  firstName: string;
  pronouns: string;
  title: string;
  org: string;
  tagline: string;
  website: string;
  phone: string;
  postalAddress: string;
  logo: string | null;
}

export function signatureLines(s: Signature): string[] {
  return [
    s.signoff,
    s.name || s.firstName,
    s.pronouns ? `(${s.pronouns})` : "",
    s.title,
    s.org,
    s.tagline,
    [s.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), s.phone].filter(Boolean).join(" · "),
  ].filter((x) => x && x.trim());
}

export function footerText(o: { meName: string; orgName: string; postalAddress: string }, companyName: string) {
  return [
    "—",
    [o.meName, o.orgName, o.postalAddress].filter(Boolean).join(" · "),
    `You're receiving this because I found your role at ${companyName} on your company's website. If you'd rather not hear from me, reply "unsubscribe" and I'll remove you.`,
  ].join("\n");
}

/** The full plain-text body that is stored on a draft: the email, then the signature. The legal footer is added at send time. */
export function draftText(blocks: Block[], sig: Signature) {
  return `${blocksToText(blocks)}\n\n${signatureLines(sig).join("\n")}`;
}

// ---------------------------------------------------------------- HTML version (sent alongside plain text)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Converts the stored plain-text draft to simple HTML: paragraphs, "- " lists, then the logo and a small grey footer. */
export function emailHtml(text: string, footer: string, logoCid: string | null) {
  const paras = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => {
    const lines = p.split("\n");
    if (lines.every((l) => l.startsWith("- "))) return `<ul style="margin:0 0 14px 0;padding-left:22px">${lines.map((l) => `<li style="margin:0 0 6px 0">${esc(l.slice(2))}</li>`).join("")}</ul>`;
    return `<p style="margin:0 0 14px 0">${lines.map(esc).join("<br>")}</p>`;
  });
  const logo = logoCid ? `<p style="margin:4px 0 14px 0"><img src="cid:${logoCid}" alt="" style="max-height:48px;max-width:180px"></p>` : "";
  const foot = `<p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;line-height:1.5">${footer.split("\n").filter((l) => l !== "—").map(esc).join("<br>")}</p>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2937">${paras.join("")}${logo}${foot}</div>`;
}

// ---------------------------------------------------------------- legacy profiles

/** Profiles saved before the single-template editor: fill the default template's brackets from the old fields. */
export function templateFromLegacy(o: { meFirstName: string; meName: string; meRole: string; orgName: string; oneLiner: string; teamStructure: string; proofPoints: string[]; serviceCatalog: string[] }) {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`);
  const map: Record<string, string> = {
    "your first name": o.meFirstName || o.meName.split(" ")[0],
    "your role": o.meRole,
    "your organization": o.orgName,
    "what your organization is, e.g. a student-run sustainability consulting group": o.oneLiner,
    "who does the work, e.g. each project is staffed by seven analysts plus an MBA mentor": o.teamStructure,
    "your track record, e.g. 180+ projects for 150+ organizations": list(o.proofPoints),
    "your services, e.g. market sizing, competitive landscaping, and regulatory research": list(o.serviceCatalog),
  };
  const fill = (t: string) => t.replace(/\[([^\]\n]{1,160})\]/g, (m, k: string) => (map[k] ? map[k] : m));
  return { subject: fill(DEFAULT_SUBJECT), client: fill(DEFAULT_TEMPLATES.client), partnership: fill(DEFAULT_TEMPLATES.partnership) };
}
