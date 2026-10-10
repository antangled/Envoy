import { handle, requireUser } from "@/lib/session";
import { processDue } from "@/lib/pipeline/send";

/** Called by the open Send page every few seconds so sending works without a cron in local dev. */
export const POST = handle(async () => {
  const u = await requireUser();
  return Response.json(await processDue(u.id));
});
