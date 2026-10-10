import type { BriefAndSlots, SearchSpec } from "@/lib/llm/schemas";
import type { RenderInput } from "@/lib/template/render";

export type ContactStatus = "verified" | "accept_all" | "unknown" | "published_generic" | "not_found";

export interface Campaign {
  id: number; mode: "client" | "partnership"; goalText: string; contactCount: number; attachDeck: boolean;
  searchSpec: SearchSpec | null; rolesSelected: string[]; status: string; shortfall: string[]; specSource: string;
}
export interface Prospect { id: number; name: string; domain: string; website: string; reason: string; reasonUrl: string | null; selected: boolean; status: string; skipReason: string | null; source: string }
export interface Brief { id: number; prospectId: number; data: BriefAndSlots; evidenceCount: number; modelUsed: string; validationLog: string[]; sources: Record<string, { url: string; title: string; kind: string } | null> }
export interface Contact { id: number; prospectId: number; name: string | null; firstName: string | null; title: string | null; email: string | null; emailStatus: ContactStatus; confidence: number | null; source: string; sourceUrl: string | null; linkedinUrl: string | null; isPrimary: boolean }
export interface Draft { id: number; prospectId: number; contactId: number | null; subject: string; body: string; status: "draft" | "selected" | "rejected"; userEdited: boolean; allowGeneric: boolean }
export interface Send { id: number; draftId: number; toEmail: string; toName: string | null; orgName: string; subject: string; scheduledAt: string; sentAt: string | null; status: string; error: string | null; channel: string }

export interface Bundle {
  campaign: Campaign; prospects: Prospect[]; briefs: Brief[]; contacts: Contact[]; drafts: Draft[]; sends: Send[];
  org: RenderInput["org"] | null; gmailConnected: boolean; dailyCap: number;
}

export const SENDABLE: ContactStatus[] = ["verified", "accept_all", "unknown"];
export const canSend = (c: Contact | undefined, d?: Draft) => !!c?.email && (SENDABLE.includes(c.emailStatus) || (c.emailStatus === "published_generic" && !!d?.allowGeneric));
