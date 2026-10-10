import { and, eq } from "drizzle-orm";
import pLimit from "p-limit";
import { getDb, schema } from "@/db";
import { requireUser, HttpError } from "@/lib/session";
import { ownedCampaign } from "@/lib/pipeline/campaign";
import { getOrg } from "@/lib/pipeline/org";
import { researchProspect, updateShortfall, type Progress } from "@/lib/pipeline/research";
import { exaAvailable, findPeople } from "@/lib/providers/exa";

export const maxDuration = 300;

/** Streams NDJSON progress events while prospects are researched five at a time. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return Response.json({ error: (e as HttpError).message }, { status: 401 });
  }
  const { id } = await ctx.params;
  const c = await ownedCampaign(user.id, Number(id)).catch(() => null);
  if (!c) return Response.json({ error: "Campaign not found." }, { status: 404 });
  const org = await getOrg(user.id);
  const url = new URL(req.url);
  const only = url.searchParams.get("prospect");
  const db = await getDb();
  const all = await db.select().from(schema.prospects).where(and(eq(schema.prospects.campaignId, c.id), eq(schema.prospects.selected, true)));
  const targets = only ? all.filter((p) => p.id === Number(only)) : all.filter((p) => p.status !== "drafted");
  await db.update(schema.campaigns).set({ status: "researching" }).where(eq(schema.campaigns.id, c.id));

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: Progress | Record<string, unknown>) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      emit({ stage: "start", total: targets.length });
      // One Exa Agent run finds people at every company while pages are being read; a failure just means no Exa names.
      const people = exaAvailable()
        ? findPeople(targets.map((p) => ({ name: p.name, domain: p.domain })), c.rolesSelected).catch((e) => {
            console.error("exa people run failed", e);
            return [];
          })
        : Promise.resolve([]);
      const limit = pLimit(5);
      await Promise.all(
        targets.map((p) =>
          limit(async () => {
            try {
              await researchProspect(org!, c, p, emit, people);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error("research failed", p.domain, e);
              await db.update(schema.prospects).set({ status: "skipped", skipReason: `Research failed: ${msg.slice(0, 200)}` }).where(eq(schema.prospects.id, p.id));
              emit({ prospectId: p.id, stage: "error", detail: msg.slice(0, 200) });
            }
          }),
        ),
      );
      const shortfall = await updateShortfall(c.id);
      emit({ stage: "complete", shortfall });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
