import { z } from "zod";

export const OrgProfileZ = z.object({
  org_name: z.string(),
  tagline: z.string(),
  one_liner: z.string(),
  what_we_do: z.string(),
  proof_points: z.array(z.string()),
  service_catalog: z.array(z.string()),
  team_structure: z.string(),
});
export type OrgProfile = z.infer<typeof OrgProfileZ>;

export const SearchSpecZ = z.object({
  target_description: z.string(),
  seed_examples: z.array(z.string()),
  geography: z.string(),
  size_hint: z.string(),
  criteria: z.array(z.object({ id: z.string(), text: z.string() })),
  roles: z.array(z.object({ title: z.string(), checked: z.boolean() })),
  offer_phrase: z.string(),
  season_label: z.string(),
});
export type SearchSpec = z.infer<typeof SearchSpecZ>;

export const BriefAndSlotsZ = z.object({
  fit_score: z.number(),
  profile: z.string(),
  criteria: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["supported", "not_met", "unknown"]),
      evidence_ids: z.array(z.string()),
      note: z.string(),
    }),
  ),
  mutual_benefit: z.array(
    z.object({ claim: z.string(), basis: z.enum(["evidenced", "inferred"]), evidence_ids: z.array(z.string()) }),
  ),
  missing_information: z.array(z.object({ question: z.string(), why_it_matters: z.string(), how_to_verify: z.string() })),
  recommended_roles: z.array(z.string()),
  hook: z.object({ text: z.string(), evidence_ids: z.array(z.string()), quotes: z.array(z.string()) }),
  ideas: z.array(z.object({ title: z.string(), sentence: z.string(), service: z.string(), evidence_ids: z.array(z.string()) })),
  subject: z.string(),
});
export type BriefAndSlots = z.infer<typeof BriefAndSlotsZ>;

export const SlotsZ = BriefAndSlotsZ.pick({ hook: true, ideas: true, subject: true });
export type Slots = z.infer<typeof SlotsZ>;

export const VerdictsZ = z.object({
  verdicts: z.array(z.object({ id: z.string(), verdict: z.enum(["supported", "not_supported"]) })),
});

export const TeamPeopleZ = z.object({ people: z.array(z.object({ name: z.string(), title: z.string() })) });

// ---------- JSON Schemas sent to the API (flat, strict, every field required) ----------
type JS = Record<string, unknown>;
const str = (description?: string): JS => (description ? { type: "string", description } : { type: "string" });
const arr = (items: JS, description?: string): JS => ({ type: "array", items, ...(description ? { description } : {}) });
const obj = (properties: Record<string, JS>): JS => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const orgProfileSchema = obj({
  org_name: str(),
  tagline: str("Short descriptive line used under the signature; empty if none"),
  one_liner: str("Appositive phrase describing the org, e.g. 'a student-run sustainability consulting group at UC Berkeley'"),
  what_we_do: str(),
  proof_points: arr(str()),
  service_catalog: arr(str()),
  team_structure: str(),
});

export const searchSpecSchema = obj({
  target_description: str(),
  seed_examples: arr(str()),
  geography: str("Empty string if unspecified"),
  size_hint: str("Empty string if unspecified"),
  criteria: arr(obj({ id: str("c1..c6"), text: str() })),
  roles: arr(obj({ title: str(), checked: { type: "boolean" } })),
  offer_phrase: str(),
  season_label: str(),
});

/** Evidence ids are constrained to the ids actually supplied, so the model cannot cite a document that does not exist. */
export function briefSchema(evidenceIds: string[], criteriaIds: string[]) {
  const eid: JS = evidenceIds.length ? { type: "string", enum: evidenceIds } : { type: "string" };
  const cid: JS = criteriaIds.length ? { type: "string", enum: criteriaIds } : { type: "string" };
  return obj({
    fit_score: { type: "integer", description: "0-100" },
    profile: str(),
    criteria: arr(obj({ id: cid, status: { type: "string", enum: ["supported", "not_met", "unknown"] }, evidence_ids: arr(eid), note: str() })),
    mutual_benefit: arr(obj({ claim: str(), basis: { type: "string", enum: ["evidenced", "inferred"] }, evidence_ids: arr(eid) })),
    missing_information: arr(obj({ question: str(), why_it_matters: str(), how_to_verify: str() })),
    recommended_roles: arr(str()),
    hook: obj({ text: str(), evidence_ids: arr(eid), quotes: arr(str()) }),
    ideas: arr(obj({ title: str(), sentence: str(), service: str(), evidence_ids: arr(eid) })),
    subject: str(),
  });
}

export function slotsSchema(evidenceIds: string[]) {
  const full = briefSchema(evidenceIds, []) as { properties: Record<string, JS> };
  return obj({ hook: full.properties.hook, ideas: full.properties.ideas, subject: full.properties.subject });
}

export const verdictsSchema = obj({
  verdicts: arr(obj({ id: str(), verdict: { type: "string", enum: ["supported", "not_supported"] } })),
});

export const teamPeopleSchema = obj({ people: arr(obj({ name: str(), title: str() })) });
