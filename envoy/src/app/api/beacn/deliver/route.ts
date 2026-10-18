import { Receiver } from "@upstash/qstash";
import { secret } from "@/lib/env";
import { deliverDue } from "@/lib/beacn/send";

export const maxDuration = 120;

/** Called by QStash at each scheduled send time. Only requests signed by QStash are accepted. */
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature");
  const current = secret("QSTASH_CURRENT_SIGNING_KEY");
  const next = secret("QSTASH_NEXT_SIGNING_KEY");
  if (!signature || !current || !next) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature, body, clockTolerance: 30 }).catch(() => false);
  if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let batchId: string | undefined;
  try {
    batchId = JSON.parse(body).batchId;
  } catch {}
  return Response.json(await deliverDue(batchId ? { batchId } : {}));
}
