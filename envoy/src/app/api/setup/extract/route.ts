import { z } from "zod";
import { handle, requireUser } from "@/lib/session";
import { extractProfile } from "@/lib/pipeline/profile";

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  await requireUser();
  const body = z.object({ deckB64: z.string().nullable().optional(), website: z.string().nullable().optional() }).parse(await req.json());
  try {
    const r = await extractProfile(body);
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Extraction failed" }, { status: 422 });
  }
});
