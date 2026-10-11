import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";
import { campaignBundle, ownedCampaign } from "@/lib/pipeline/campaign";
import { getOrg, signatureFor, templatesFor } from "@/lib/pipeline/org";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const bundle = await campaignBundle(u.id, Number(id));
  const org = await getOrg(u.id);
  return Response.json({ ...bundle, org: org ? { signature: signatureFor(org), templates: templatesFor(org), deckName: org.deckB64 ? org.deckName || "deck.pdf" : null } : null, gmailConnected: !!u.googleRefreshTokenEnc, dailyCap: u.dailyCap, isDemo: u.isDemo });
});

const Patch = z.object({
  rolesSelected: z.array(z.string()).optional(),
  criteria: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  attachDeck: z.boolean().optional(),
  prospects: z.array(z.object({ id: z.number(), selected: z.boolean() })).optional(),
  status: z.enum(["paused", "sending"]).optional(),
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const c = await ownedCampaign(u.id, Number(id));
  const body = Patch.parse(await req.json());
  const db = await getDb();
  const set: Partial<typeof schema.campaigns.$inferInsert> = {};
  if (body.rolesSelected) set.rolesSelected = body.rolesSelected;
  if (body.attachDeck !== undefined) set.attachDeck = body.attachDeck;
  if (body.status) set.status = body.status;
  if (body.criteria && c.searchSpec) set.searchSpec = { ...c.searchSpec, criteria: body.criteria.slice(0, 6) };
  if (Object.keys(set).length) await db.update(schema.campaigns).set(set).where(eq(schema.campaigns.id, c.id));
  if (body.prospects?.length) {
    for (const sel of [true, false]) {
      const ids = body.prospects.filter((p) => p.selected === sel).map((p) => p.id);
      if (ids.length) await db.update(schema.prospects).set({ selected: sel }).where(and(eq(schema.prospects.campaignId, c.id), inArray(schema.prospects.id, ids)));
    }
  }
  return Response.json({ ok: true });
});
