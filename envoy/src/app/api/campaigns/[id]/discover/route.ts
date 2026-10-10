import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";
import { ownedCampaign } from "@/lib/pipeline/campaign";
import { discover } from "@/lib/pipeline/discover";

// Discovery is an Exa Agent run that is polled to completion; allow up to five minutes.
export const maxDuration = 300;

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const c = await ownedCampaign(u.id, Number(id));
  const db = await getDb();
  await db.delete(schema.prospects).where(eq(schema.prospects.campaignId, c.id));
  return Response.json(await discover(c));
});
