import { z } from "zod";
import { HttpError, handle, requireUser } from "@/lib/session";
import { ownedCampaign } from "@/lib/pipeline/campaign";
import { addManualProspect } from "@/lib/pipeline/discover";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireUser();
  const { id } = await ctx.params;
  const c = await ownedCampaign(u.id, Number(id));
  const { website } = z.object({ website: z.string().min(3) }).parse(await req.json());
  try {
    await addManualProspect(c, website);
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Couldn't add that site.");
  }
  return Response.json({ ok: true });
});
