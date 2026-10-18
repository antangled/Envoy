/**
 * BEACN outreach emails: the member's own template, with no AI sections. Shared by the editor (client) and sending (server).
 *   {{my_first_name}} {{my_title}} {{my_company}}  the member's details
 *   {{first_name}} {{company}}                    filled per recipient
 *   [bracketed text]                              must be replaced before sending
 */
import { signatureLines, tokenize, type Signature } from "@/lib/template/render";

export const CLUB = {
  org: "BEACN",
  tagline: "Student-run consulting for environmentally and socially responsible organizations.",
  website: "",
};

export const BEACN_SUBJECT = "{{my_company}} x {{company}} collaboration?";

export const BEACN_BODY = `Dear {{first_name}},

Hope you're doing well! I'm {{my_first_name}}, a {{my_title}} at {{my_company}}, a student-run sustainability consulting group at UC Berkeley. I wanted to reach out about potentially supporting {{company}} through a semester-long consulting project.

To provide some context, {{my_company}} projects are staffed by seven Berkeley students plus an MBA mentor from Haas. Across 180+ projects for 150+ organizations, we've worked on market sizing, competitive landscaping, regulatory research, supply-chain analysis, and data collection.

We're finalizing our [season, e.g. spring 2027] projects, and I'd love to hear what would be most useful to {{company}}.

Would this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.`;

export interface BeacnMe {
  name: string;
  pronouns: string;
  title: string;
  phone: string;
  signoff: string;
}

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export function signatureFor(me: BeacnMe): Signature {
  return {
    signoff: me.signoff || "Best,",
    name: me.name,
    firstName: firstNameOf(me.name),
    pronouns: me.pronouns,
    title: me.title,
    org: CLUB.org,
    tagline: CLUB.tagline,
    website: CLUB.website,
    phone: me.phone,
    postalAddress: "",
    logo: null,
  };
}

/** What still blocks sending: placeholders, AI sections (not available here yet), and tokens Envoy doesn't know. */
export function templateProblems(subject: string, body: string): string[] {
  const out: string[] = [];
  for (const p of tokenize(`${subject}\n${body}`)) {
    if (p.kind === "fill") out.push(`Replace [${p.text}]`);
    else if (p.kind === "ai") out.push(`Remove ${p.raw}: AI sections aren't available in BEACN Outreach yet`);
    else if (p.kind === "unknown") out.push(`${p.raw} isn't a field Envoy knows`);
  }
  return [...new Set(out)];
}

const fill = (s: string, me: BeacnMe, r: { firstName: string | null; company: string }) =>
  s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (m, k: string) => {
    switch (k.toLowerCase()) {
      case "my_first_name":
        return firstNameOf(me.name) || m;
      case "my_title":
        return me.title || m;
      case "my_company":
        return CLUB.org;
      case "first_name":
        return r.firstName?.trim() || `${r.company} team`;
      case "company":
        return r.company;
      default:
        return m;
    }
  });

/** The finished email for one recipient: the filled template, then the signature. The opt-out footer is added at send time. */
export function renderEmail(tpl: { subject: string; body: string }, me: BeacnMe, r: { firstName: string | null; company: string }) {
  const sig = signatureFor(me);
  return { subject: fill(tpl.subject, me, r).trim(), body: `${fill(tpl.body, me, r).trim()}\n\n${signatureLines(sig).join("\n")}` };
}

export const optOutFooter = () => `—\nIf you'd rather not hear from ${CLUB.org}, reply "unsubscribe" and I won't contact you again.`;

/** Role filters for Apollo people search. Titles use Apollo's "similar titles" matching. */
export const PRESETS = {
  decision: { label: "Decision-makers", seniorities: ["owner", "founder", "c_suite", "partner", "vp", "head", "director"], titles: [] as string[] },
  strategy: { label: "Strategy and operations", seniorities: ["c_suite", "vp", "head", "director", "manager"], titles: ["Strategy", "Operations", "Business Development", "Chief of Staff", "Partnerships"] },
  sustainability: { label: "Sustainability and ESG", seniorities: ["c_suite", "vp", "head", "director", "manager"], titles: ["Sustainability", "ESG", "Climate", "Environmental", "Impact"] },
  custom: { label: "Custom titles", seniorities: [] as string[], titles: [] as string[] },
} as const;
export type PresetKey = keyof typeof PRESETS;
