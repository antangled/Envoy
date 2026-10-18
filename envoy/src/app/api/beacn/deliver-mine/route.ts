import { handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";
import { deliverDue } from "@/lib/beacn/send";

export const maxDuration = 120;

/** Backup for when QStash isn't set up (local dev): the open outbox page delivers the member's own due emails. */
export const POST = handle(async () => {
  const u = await requireMember();
  return Response.json(await deliverDue({ userId: u.id }));
});
