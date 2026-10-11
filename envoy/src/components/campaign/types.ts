import type { BriefAndSlots, SearchSpec } from "@/lib/llm/schemas";
import type { Mode, Signature } from "@/lib/template/render";

export type ContactStatus = "verified" | "accept_all" | "unknown" | "published_generic" | "not_found";

export interface Campaign {
  id: number; mode: "client" | "partnership"; goalText: string; contactCount: number; attachDeck: boolean;
  searchSpec: SearchSpec | null; rolesSelected: string[]; status: string; shortfall: string[]; specSource: string;
}
export interface Prospect { id: number; name: string; domain: string; website: string; reason: string; reasonUrl: string | null; selected: boolean; status: string; skipReason: string | null; source: string }
export interface Brief { id: number; prospectId: number; data: BriefAndSlots; evidenceCount: number; modelUsed: string; validationLog: string[]; sources: Record<string, { url: string; title: string; kind: string } | null> }
export interface Contact { id: number; prospectId: number; name: string | null; firstName: string | null; title: string | null; email: string | null; emailStatus: ContactStatus; confidence: number | null; source: string; sourceUrl: string | null; linkedinUrl: string | null; isPrimary: boolean; selected: boolean }
export interface Draft { id: number; prospectId: number; contactId: number | null; subject: string; body: string; status: "draft" | "selected" | "rejected"; userEdited: boolean; allowGeneric: boolean }
export interface Send { id: number; draftId: number; toEmail: string; toName: string | null; orgName: string; subject: string; scheduledAt: string; sentAt: string | null; status: string; error: string | null; channel: string }

export interface Bundle {
  campaign: Campaign & { usage: { claudeUsd: number; exaUsd: number; hunterLookups: number; sonnetBriefs: number }; peoplePerCompany: number }; prospects: Prospect[]; briefs: Brief[]; contacts: Contact[]; drafts: Draft[]; sends: Send[];
  org: { signature: Signature; templates: { subject: string } & Record<Mode, string>; deckName: string | null } | null; gmailConnected: boolean; dailyCap: number;
}

export const SENDABLE: ContactStatus[] = ["verified", "accept_all", "unknown"];
export const canSend = (c: Contact | undefined, d?: Draft) => !!c?.email && (SENDABLE.includes(c.emailStatus) || (c.emailStatus === "published_generic" && !!d?.allowGeneric));

/** Everyone this company's email will go to: the chosen people, or the main contact if nobody is chosen. */
export function recipientsFor(b: Pick<Bundle, "contacts">, d: Draft | undefined) {
  if (!d) return [];
  const mine = b.contacts.filter((c) => c.prospectId === d.prospectId);
  const chosen = mine.filter((c) => c.selected && canSend(c, d));
  if (chosen.length) return chosen;
  const primary = mine.find((c) => c.id === d.contactId);
  return primary && canSend(primary, d) ? [primary] : [];
}
