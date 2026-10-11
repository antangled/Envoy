import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { handle, requireUser } from "@/lib/session";
import { normalizeDomain } from "@/lib/providers/fetchPage";
import { signatureFor, templatesFor } from "@/lib/pipeline/org";

const In = z.object({
  orgName: z.string().max(200),
  tagline: z.string().max(300),
  website: z.string().max(300),
  serviceCatalog: z.array(z.string().max(120)).max(20),
  meName: z.string().max(120),
  mePronouns: z.string().max(40),
  meRole: z.string().max(120),
  phone: z.string().max(60),
  signoff: z.string().max(60),
  postalAddress: z.string().max(300),
  subjectTemplate: z.string().max(300),
  templateClient: z.string().max(8000),
  templatePartnership: z.string().max(8000),
  deck: z.object({ name: z.string(), base64: z.string() }).nullable().optional(),
  removeDeck: z.boolean().optional(),
  logo: z.string().max(300_000).nullable().optional(),
  exclusionsText: z.string().max(200_000).optional(),
  dailyCap: z.number().int().min(1).max(150).optional(),
});

export const GET = handle(async () => {
  const u = await requireUser();
  const db = await getDb();
  const [org] = await db.select().from(schema.orgProfiles).where(eq(schema.orgProfiles.userId, u.id));
  const excl = await db.select().from(schema.exclusions).where(eq(schema.exclusions.userId, u.id));
  const t = templatesFor(org ?? null);
  return Response.json({
    profile: {
      orgName: org?.orgName ?? "",
      tagline: org?.tagline ?? "",
      website: org?.website ?? "",
      serviceCatalog: org?.serviceCatalog ?? [],
      meName: org?.meName || u.name || "",
      mePronouns: org?.mePronouns ?? "",
      meRole: org?.meRole ?? "",
      phone: org?.phone ?? "",
      signoff: org?.signoff ?? "Best,",
      postalAddress: org?.postalAddress ?? "",
      subjectTemplate: t.subject,
      templateClient: t.client,
      templatePartnership: t.partnership,
      logo: org?.logoDataUri ?? null,
      deckName: org?.deckB64 ? org.deckName || "deck.pdf" : null,
      saved: !!org,
    },
    signature: signatureFor(org ?? null),
    exclusions: excl.map((e) => ({ value: e.value, source: e.source })),
    dailyCap: u.dailyCap,
    email: u.email,
  });
});

export const PUT = handle(async (req: Request) => {
  const u = await requireUser();
  const b = In.parse(await req.json());
  // About 3 MB of PDF once base64-encoded; the hosting platform rejects request bodies over 4.5 MB.
  if (b.deck && b.deck.base64.length > 4_300_000) throw new Error("The deck is larger than 3 MB. Export a compressed PDF and try again.");
  if (b.logo && !/^data:image\/(png|jpeg|gif|webp);base64,/.test(b.logo)) throw new Error("The logo must be a PNG, JPG, GIF, or WebP image.");
  const db = await getDb();
  const values = {
    orgName: b.orgName.trim(),
    tagline: b.tagline.trim(),
    website: b.website.trim(),
    serviceCatalog: b.serviceCatalog.map((s) => s.trim()).filter(Boolean),
    meName: b.meName.trim(),
    meFirstName: b.meName.trim().split(/\s+/)[0] ?? "",
    mePronouns: b.mePronouns.trim(),
    meRole: b.meRole.trim(),
    phone: b.phone.trim(),
    signoff: b.signoff.trim() || "Best,",
    postalAddress: b.postalAddress.trim(),
    subjectTemplate: b.subjectTemplate,
    templateClient: b.templateClient,
    templatePartnership: b.templatePartnership,
    updatedAt: new Date(),
    ...(b.logo !== undefined ? { logoDataUri: b.logo } : {}),
    ...(b.deck ? { deckB64: b.deck.base64, deckName: b.deck.name } : {}),
    ...(b.removeDeck ? { deckB64: null, deckName: null } : {}),
  };
  await db.insert(schema.orgProfiles).values({ userId: u.id, ...values }).onConflictDoUpdate({ target: schema.orgProfiles.userId, set: values });
  if (b.exclusionsText) {
    const vals = [...new Set(b.exclusionsText.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => (s.includes("@") ? s : normalizeDomain(s))))];
    for (const value of vals) await db.insert(schema.exclusions).values({ userId: u.id, value, source: "import" }).onConflictDoNothing();
  }
  if (b.dailyCap) await db.update(schema.users).set({ dailyCap: b.dailyCap }).where(eq(schema.users.id, u.id));
  return Response.json({ ok: true });
});
