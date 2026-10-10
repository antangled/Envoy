import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";
import { normalizeDomain } from "@/lib/providers/fetchPage";

const ProfileIn = z.object({
  orgName: z.string().max(200),
  tagline: z.string().max(300),
  oneLiner: z.string().max(300),
  whatWeDo: z.string().max(1000),
  proofPoints: z.array(z.string().max(300)).max(12),
  serviceCatalog: z.array(z.string().max(120)).max(20),
  teamStructure: z.string().max(500),
  website: z.string().max(300),
  deckUrl: z.string().max(500),
  postalAddress: z.string().max(300),
  meName: z.string().max(120),
  meFirstName: z.string().max(60),
  meRole: z.string().max(120),
  mePronouns: z.string().max(40),
  extractedFrom: z.string().max(40).optional(),
  deck: z.object({ name: z.string(), base64: z.string() }).nullable().optional(),
  removeDeck: z.boolean().optional(),
  exclusionsText: z.string().max(200_000).optional(),
  dailyCap: z.number().int().min(1).max(150).optional(),
});

export const GET = handle(async () => {
  const u = await requireUser();
  const db = await getDb();
  const [org] = await db.select().from(schema.orgProfiles).where(eq(schema.orgProfiles.userId, u.id));
  const excl = await db.select().from(schema.exclusions).where(eq(schema.exclusions.userId, u.id));
  const supp = await db.select().from(schema.suppressions).where(eq(schema.suppressions.userId, u.id));
  return Response.json({
    profile: org ? { ...org, deckB64: undefined, hasDeck: !!org.deckB64 } : null,
    exclusions: excl.map((e) => ({ value: e.value, source: e.source })),
    suppressions: supp.map((s) => ({ email: s.email, reason: s.reason })),
    dailyCap: u.dailyCap,
  });
});

export const PUT = handle(async (req: Request) => {
  const u = await requireUser();
  const body = ProfileIn.parse(await req.json());
  const db = await getDb();
  const { deck, removeDeck, exclusionsText, dailyCap, ...p } = body;
  if (deck && deck.base64.length > 14_000_000) throw new Error("Deck is larger than 10 MB. Export a smaller PDF.");
  const values = {
    ...p,
    proofPoints: p.proofPoints.map((s) => s.trim()).filter(Boolean),
    serviceCatalog: p.serviceCatalog.map((s) => s.trim()).filter(Boolean),
    updatedAt: new Date(),
    ...(deck ? { deckB64: deck.base64, deckName: deck.name } : {}),
    ...(removeDeck ? { deckB64: null, deckName: null } : {}),
  };
  await db.insert(schema.orgProfiles).values({ userId: u.id, ...values }).onConflictDoUpdate({ target: schema.orgProfiles.userId, set: values });
  if (exclusionsText) {
    const vals = [...new Set(exclusionsText.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => (s.includes("@") ? s : normalizeDomain(s))))];
    for (const value of vals) await db.insert(schema.exclusions).values({ userId: u.id, value, source: "import" }).onConflictDoNothing();
  }
  if (dailyCap) await db.update(schema.users).set({ dailyCap }).where(eq(schema.users.id, u.id));
  return Response.json({ ok: true });
});
