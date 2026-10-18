import { processDue } from "@/lib/pipeline/send";
import { deliverDue } from "@/lib/beacn/send";

export const maxDuration = 60;

/** Vercel Cron: daily on the Hobby plan (every minute needs Pro). While the Send page is open it processes the queue itself every few seconds. Sends at most one due Gmail message per user per tick. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Also a daily safety net for BEACN emails whose scheduled QStash delivery didn't arrive.
  const beacn = await deliverDue();
  return Response.json({ ...(await processDue()), beacn });
}
