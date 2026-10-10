import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";
import { ownedDraft } from "@/lib/pipeline/ownership";
import { getOrg } from "@/lib/pipeline/org";
import { renderDraft } from "@/lib/pipeline/draft";
import { callStructured, llmAvailable, textDoc } from "@/lib/llm/client";
import { SLOTS_SYSTEM } from "@/lib/llm/prompts";
import { SlotsZ, slotsSchema } from "@/lib/llm/schemas";
import { validateBrief } from "@/lib/llm/validate";

export const maxDuration = 120;

/** Re-runs only the hook and ideas against the cached brief and evidence. Without an AI key it restores the generated draft. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const { draft, prospect, campaign } = await ownedDraft(u.id, Number(id));
  const db = await getDb();
  const org = (await getOrg(u.id))!;
  const [b] = await db.select().from(schema.briefs).where(eq(schema.briefs.prospectId, prospect.id));
  const [contact] = draft.contactId ? await db.select().from(schema.contacts).where(eq(schema.contacts.id, draft.contactId)) : [null];
  let data = b.data;
  const log = [...b.validationLog];
  if (llmAvailable()) {
    const rows = await db.select().from(schema.evidence);
    const docs = Object.entries(b.evidenceIds)
      .map(([eid, rowId]) => {
        const r = rows.find((x) => x.id === rowId);
        return r ? { eid, url: r.url, title: r.title, text: r.text.slice(0, 4000) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const r = await callStructured({
      system: SLOTS_SYSTEM({ org_name: org.orgName, service_catalog: org.serviceCatalog }),
      content: [
        ...docs.map((d) => textDoc(d.text, d.url, `evidence id ${d.eid}`)),
        { type: "text", text: `Company: ${prospect.name}\nBrief profile: ${b.data.profile}\nPrevious hook: ${b.data.hook.text}\nPrevious ideas: ${b.data.ideas.map((x) => x.title).join("; ")}` },
      ],
      schema: slotsSchema(docs.map((d) => d.eid)),
      parse: SlotsZ,
      effort: "medium",
    });
    const v = validateBrief({ ...b.data, ...r.data }, docs, org.serviceCatalog);
    if (!v.hookFailed) {
      data = { ...b.data, hook: v.brief.hook, ideas: v.brief.ideas, subject: v.brief.subject };
      log.push("regenerated hook and ideas", ...v.log);
      await db.update(schema.briefs).set({ data, validationLog: log }).where(eq(schema.briefs.id, b.id));
    } else {
      log.push("regeneration rejected: hook quotes not found in evidence; kept previous version");
    }
  }
  const { subject, body } = renderDraft(org, campaign, prospect.name, contact, data);
  await db.update(schema.drafts).set({ subject, body, userEdited: false, updatedAt: new Date() }).where(eq(schema.drafts.id, draft.id));
  return Response.json({ ok: true, ai: llmAvailable() });
});
