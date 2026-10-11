import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, handle, requireUser } from "@/lib/session";
import { getOrg, profileComplete, templatesFor } from "@/lib/pipeline/org";
import { unfilledPlaceholders, unknownTokens } from "@/lib/template/render";
import { buildSpec } from "@/lib/pipeline/spec";
import { isScriptedDemo } from "@/lib/demo/run";
import { demoSpec } from "@/lib/demo/fixtures";

export const maxDuration = 60;

export const GET = handle(async () => {
  const u = await requireUser();
  const db = await getDb();
  const cs = await db.select().from(schema.campaigns).where(eq(schema.campaigns.userId, u.id)).orderBy(desc(schema.campaigns.createdAt));
  const ps = await db.select({ campaignId: schema.prospects.campaignId, status: schema.prospects.status }).from(schema.prospects);
  const ss = await db.select({ campaignId: schema.sends.campaignId, status: schema.sends.status }).from(schema.sends).where(eq(schema.sends.userId, u.id));
  return Response.json(
    cs.map((c) => ({
      id: c.id,
      mode: c.mode,
      goalText: c.goalText,
      status: c.status,
      createdAt: c.createdAt,
      prospects: ps.filter((p) => p.campaignId === c.id).length,
      drafted: ps.filter((p) => p.campaignId === c.id && p.status === "drafted").length,
      sent: ss.filter((s) => s.campaignId === c.id && s.status === "sent").length,
    })),
  );
});

const In = z.object({
  mode: z.enum(["client", "partnership"]),
  goalText: z.string().min(10, "Describe the goal in a sentence or two.").max(2000),
  contactCount: z.number().int().min(1).max(50),
  peoplePerCompany: z.number().int().min(1).max(20).default(10),
  attachDeck: z.boolean(),
  advanced: z.object({ geography: z.string().max(200).optional(), sizeHint: z.string().max(200).optional(), extraCriteria: z.string().max(500).optional() }).default({}),
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const org = await getOrg(u.id);
  if (!profileComplete(org)) throw new HttpError(400, "Finish Setup first: add your name and organization to the signature.");
  const body = In.parse(await req.json());
  const t = templatesFor(org);
  const email = `${t.subject}\n${t[body.mode]}`;
  const unfilled = unfilledPlaceholders(email);
  if (unfilled.length) throw new HttpError(400, `Your ${body.mode === "partnership" ? "partnership" : "client"} email still has ${unfilled.length} placeholder${unfilled.length === 1 ? "" : "s"} to replace in Setup, starting with [${unfilled[0]}].`);
  const unknown = unknownTokens(email);
  if (unknown.length) throw new HttpError(400, `Your email uses ${unknown[0]}, which Envoy doesn't recognize. Use the Insert buttons in Setup to add a supported field.`);
  const goal = [body.goalText, body.advanced.geography && `Geography: ${body.advanced.geography}.`, body.advanced.sizeHint && `Company size: ${body.advanced.sizeHint}.`, body.advanced.extraCriteria && `Also must: ${body.advanced.extraCriteria}.`]
    .filter(Boolean)
    .join(" ");
  const { spec, source } = isScriptedDemo(u)
    ? await new Promise<{ spec: ReturnType<typeof demoSpec>; source: "demo" }>((r) => setTimeout(() => r({ spec: demoSpec(body.mode), source: "demo" }), 1200))
    : await buildSpec(goal, body.mode, org!);
  const db = await getDb();
  const [c] = await db
    .insert(schema.campaigns)
    .values({ userId: u.id, mode: body.mode, goalText: body.goalText, contactCount: body.contactCount, peoplePerCompany: body.peoplePerCompany, attachDeck: body.attachDeck, advanced: body.advanced, searchSpec: spec, rolesSelected: spec.roles.filter((r) => r.checked).map((r) => r.title), status: "spec", specSource: source })
    .returning();
  return Response.json({ id: c.id });
});
