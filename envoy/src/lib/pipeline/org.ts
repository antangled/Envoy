import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEFAULT_SUBJECT, DEFAULT_TEMPLATES, templateFromLegacy, type Mode, type Signature } from "@/lib/template/render";

export type OrgRow = typeof schema.orgProfiles.$inferSelect;

export async function getOrg(userId: number): Promise<OrgRow | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.orgProfiles).where(eq(schema.orgProfiles.userId, userId));
  return row ?? null;
}

export function signatureFor(o: OrgRow | null): Signature {
  return {
    signoff: o?.signoff ?? "Best,",
    name: o?.meName ?? "",
    firstName: o?.meFirstName || o?.meName.split(" ")[0] || "",
    pronouns: o?.mePronouns ?? "",
    title: o?.meRole ?? "",
    org: o?.orgName ?? "",
    tagline: o?.tagline ?? "",
    website: o?.website ?? "",
    phone: o?.phone ?? "",
    postalAddress: o?.postalAddress ?? "",
    logo: o?.logoDataUri ?? null,
  };
}

/** The user's templates; profiles from before the editor get the default filled from their old fields. */
export function templatesFor(o: OrgRow | null): { subject: string } & Record<Mode, string> {
  if (o && (o.templateClient || o.templatePartnership)) {
    return { subject: o.subjectTemplate || DEFAULT_SUBJECT, client: o.templateClient || DEFAULT_TEMPLATES.client, partnership: o.templatePartnership || DEFAULT_TEMPLATES.partnership };
  }
  if (o && o.orgName && o.oneLiner) return templateFromLegacy(o);
  return { subject: DEFAULT_SUBJECT, ...DEFAULT_TEMPLATES };
}

/** Setup is done when the signature names a person and an organization; template placeholders are checked per campaign. */
export const profileComplete = (o: OrgRow | null) => !!o && !!o.orgName && !!o.meName;
