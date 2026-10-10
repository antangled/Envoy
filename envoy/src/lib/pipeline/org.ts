import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { RenderInput } from "@/lib/template/render";

export type OrgRow = typeof schema.orgProfiles.$inferSelect;

export async function getOrg(userId: number): Promise<OrgRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.orgProfiles).where(eq(schema.orgProfiles.userId, userId));
  return row ?? null;
}

export function orgForRender(o: OrgRow): RenderInput["org"] {
  return {
    orgName: o.orgName,
    oneLiner: o.oneLiner,
    tagline: o.tagline,
    teamStructure: o.teamStructure,
    proofPoints: o.proofPoints,
    serviceCatalog: o.serviceCatalog,
    meName: o.meName,
    meFirstName: o.meFirstName || o.meName.split(" ")[0] || "",
    meRole: o.meRole,
    mePronouns: o.mePronouns,
    postalAddress: o.postalAddress,
    deckUrl: o.deckUrl,
    hasDeck: !!o.deckB64,
  };
}

export const profileComplete = (o: OrgRow | null) =>
  !!o && !!o.orgName && !!o.meName && !!o.meRole && o.serviceCatalog.length > 0;
