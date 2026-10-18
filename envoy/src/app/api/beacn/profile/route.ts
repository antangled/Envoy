import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle } from "@/lib/session";
import { requireMember } from "@/lib/beacn/access";
import { BEACN_BODY, BEACN_SUBJECT } from "@/lib/beacn/template";

export const GET = handle(async () => {
  const u = await requireMember();
  const db = await getDb();
  const [p] = await db.select().from(schema.beacnProfiles).where(eq(schema.beacnProfiles.userId, u.id));
  return Response.json({
    name: p?.name || u.name || "",
    pronouns: p?.pronouns ?? "",
    title: p?.title ?? "Project Manager",
    phone: p?.phone ?? "",
    signoff: p?.signoff ?? "Best,",
    subject: p?.subject || BEACN_SUBJECT,
    body: p?.body || BEACN_BODY,
    saved: !!p,
  });
});

const In = z.object({
  name: z.string().max(120),
  pronouns: z.string().max(40),
  title: z.string().max(120),
  phone: z.string().max(60),
  signoff: z.string().max(60),
  subject: z.string().max(300),
  body: z.string().max(8000),
});

export const PUT = handle(async (req: Request) => {
  const u = await requireMember();
  const b = In.parse(await req.json());
  const db = await getDb();
  const values = { ...b, updatedAt: new Date() };
  await db.insert(schema.beacnProfiles).values({ userId: u.id, ...values }).onConflictDoUpdate({ target: schema.beacnProfiles.userId, set: values });
  return Response.json({ ok: true });
});
