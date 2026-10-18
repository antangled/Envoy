import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";
import { createBatch } from "@/lib/beacn/send";

export const maxDuration = 120;

export const GET = handle(async () => {
  const u = await requireMember();
  const db = await getDb();
  const rows = await db.select().from(schema.beacnSends).where(eq(schema.beacnSends.userId, u.id)).orderBy(desc(schema.beacnSends.scheduledAt)).limit(200);
  return Response.json(rows.map(({ body, ...r }) => ({ ...r, preview: body.slice(0, 160) })));
});

const In = z.object({
  items: z.array(z.object({ personId: z.number().int(), subject: z.string().max(300), body: z.string().max(10000) })).min(1).max(100),
  sendAt: z.string().datetime({ offset: true }).nullable(),
  spread: z.boolean().default(false),
});

export const POST = handle(async (req: Request) => {
  const u = await requireMember();
  const b = In.parse(await req.json());
  return Response.json(await createBatch(u, b.items, b.sendAt ? new Date(b.sendAt) : null, b.spread));
});
