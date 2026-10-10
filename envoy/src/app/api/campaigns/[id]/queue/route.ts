import { z } from "zod";
import { HttpError, handle, requireUser } from "@/lib/session";
import { ownedCampaign } from "@/lib/pipeline/campaign";
import { queueCampaign } from "@/lib/pipeline/send";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const c = await ownedCampaign(u.id, Number(id));
  const { tz } = z.object({ tz: z.string().default("America/Los_Angeles") }).parse(await req.json().catch(() => ({})));
  try {
    return Response.json(await queueCampaign(u, c.id, tz));
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Couldn't queue emails.");
  }
});
