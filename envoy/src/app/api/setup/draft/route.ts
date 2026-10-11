import { z } from "zod";
import { HttpError, handle, requireUser } from "@/lib/session";
import { callStructured, llmAvailable, pdfDoc, textDoc } from "@/lib/llm/client";
import { fetchPage } from "@/lib/providers/fetchPage";

export const maxDuration = 120;

const In = z.object({
  website: z.string().max(300).nullable().optional(),
  deckB64: z.string().nullable().optional(),
  subject: z.string().max(300),
  client: z.string().max(8000),
  partnership: z.string().max(8000),
  me: z.object({ name: z.string(), role: z.string(), org: z.string() }),
});

const Out = z.object({
  org_name: z.string(),
  tagline: z.string(),
  services: z.array(z.string()),
  subject: z.string(),
  template_client: z.string(),
  template_partnership: z.string(),
});

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["org_name", "tagline", "services", "subject", "template_client", "template_partnership"],
  properties: {
    org_name: { type: "string" },
    tagline: { type: "string", description: "Short line for an email signature, from the material; empty if none" },
    services: { type: "array", items: { type: "string" }, description: "3-8 kinds of work offered, short lowercase noun phrases" },
    subject: { type: "string" },
    template_client: { type: "string" },
    template_partnership: { type: "string" },
  },
};

const SYSTEM = `You complete an outreach email template for the sender's organization, using their website and/or deck.
Replace every [bracketed placeholder] with specific, factual wording from the material, matching the grammar around it. The bracket's hint (after "e.g.") shows the expected shape; never copy the example itself unless the material says the same thing.
Keep every {{double_brace}} token exactly as written, in the same place. Do not add new tokens.
Keep all other text exactly as written. Do not add sentences, sign-offs, or a signature.
If the material doesn't support a placeholder, leave that placeholder in its brackets unchanged.
services are the kinds of work the organization offers, as short lowercase noun phrases.`;

const tokens = (s: string) => [...s.matchAll(/\{\{\s*[a-z_]+\s*\}\}/g)].map((m) => m[0].replace(/\s/g, "")).sort().join(",");

/** Fills what we already know (name, role, organization) without a model call. */
function prefill(t: string, me: { name: string; role: string; org: string }) {
  const first = me.name.trim().split(/\s+/)[0];
  const role = me.role.trim();
  return t
    // "a [your role]" becomes "an Analyst" when the role starts with a vowel sound
    .replace(/\b(a|an) \[your role\]/gi, (m, art: string) => (role ? `${/^[aeiou]/i.test(role) ? (art[0] === "A" ? "An" : "an") : art[0] === "A" ? "A" : "a"} ${role}` : m))
    .replace(/\[your first name\]/gi, (m) => first || m)
    .replace(/\[your role\]/gi, (m) => me.role.trim() || m)
    .replace(/\[your organization\]/gi, (m) => me.org.trim() || m);
}

export const POST = handle(async (req: Request) => {
  await requireUser();
  const b = In.parse(await req.json());
  const base = { subject: prefill(b.subject, b.me), client: prefill(b.client, b.me), partnership: prefill(b.partnership, b.me) };
  if (!llmAvailable()) return Response.json({ ...base, orgName: b.me.org, tagline: "", services: [], ai: false });

  const content: Parameters<typeof callStructured>[0]["content"] = [];
  if (b.deckB64) content.push(pdfDoc(b.deckB64));
  let website = b.website?.trim() || "";
  if (website) {
    if (!/^https?:\/\//.test(website)) website = `https://${website}`;
    const page = await fetchPage(website);
    if (page?.text) content.push(textDoc(page.text.slice(0, 20000), website, "the sender's website"));
  }
  if (!content.length) throw new HttpError(422, "Couldn't read that website. Check the address, or upload your deck instead.");
  content.push({
    type: "text",
    text: `Sender: ${b.me.name || "unknown"}, ${b.me.role || "role unknown"} at ${b.me.org || "organization unknown"}.

Subject template:
${base.subject}

Client-outreach email template:
${base.client}

Partnership email template:
${base.partnership}`,
  });
  const r = await callStructured({ system: SYSTEM, content, schema, parse: Out, maxTokens: 6000, effort: "medium", label: "setup-draft" });
  const d = r.data;
  // Never accept a version that lost or invented a token.
  const keep = (orig: string, next: string) => (tokens(orig) === tokens(next) && next.trim() ? next.trim() : orig);
  return Response.json({
    subject: keep(base.subject, d.subject),
    client: keep(base.client, d.template_client),
    partnership: keep(base.partnership, d.template_partnership),
    orgName: d.org_name,
    tagline: d.tagline,
    services: d.services.slice(0, 8),
    ai: true,
  });
});
