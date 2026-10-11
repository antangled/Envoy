"use client";
import { Badge } from "@/components/ui";
import type { ContactStatus } from "./types";

export const CONTACT_LABEL: Record<ContactStatus, { label: string; tone: "ok" | "warn" | "muted" | "bad"; help: string }> = {
  verified: { label: "Verified", tone: "ok", help: "The mail server or a high-confidence source confirms this address." },
  accept_all: { label: "Risky", tone: "warn", help: "This company's mail server accepts every address, so this one can't be confirmed. It may bounce." },
  unknown: { label: "Unverified", tone: "warn", help: "Found, but not confirmed. It may bounce." },
  published_generic: { label: "Shared inbox", tone: "muted", help: "A general address published on the company's site, like info@. Not sent to by default." },
  not_found: { label: "No contact", tone: "bad", help: "No named person or address was found." },
};

export function ContactBadge({ status, named, checked = true }: { status: ContactStatus; named?: boolean; checked?: boolean }) {
  if (status === "not_found" && named && !checked) return <Badge tone="muted" title="Not looked up yet, to save lookup credits. Use Find email.">Email not checked</Badge>;
  if (status === "not_found" && named) return <Badge tone="warn" title="This person was found, but no email address for them was.">No email</Badge>;
  const c = CONTACT_LABEL[status];
  return <Badge tone={c.tone} title={c.help}>{c.label}</Badge>;
}

export function FitScore({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const tone = score >= 70 ? "text-ok" : score >= 50 ? "text-ink" : "text-ink-3";
  return (
    <span className={`font-serif tabular-nums ${tone} ${size === "lg" ? "text-[30px] leading-none" : "text-[17px]"}`} title="Fit score, 0 to 100">
      {score}
    </span>
  );
}

const DOT: Record<string, string> = { supported: "bg-ok", not_met: "bg-warn", unknown: "bg-rule" };
export function CriteriaDots({ criteria }: { criteria: { id: string; status: string }[] }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${criteria.filter((c) => c.status === "supported").length} of ${criteria.length} criteria supported`}>
      {criteria.map((c) => (
        <span key={c.id} className={`h-2 w-2 rounded-full ${DOT[c.status]}`} />
      ))}
    </span>
  );
}

export function Cites({ ids, onCite }: { ids: string[]; onCite: (eid: string) => void }) {
  if (!ids.length) return null;
  return (
    <>
      {ids.map((id) => (
        <button key={id} type="button" className="cite" onClick={() => onCite(id)} aria-label={`Source ${id.slice(1)}`}>
          {id.slice(1)}
        </button>
      ))}
    </>
  );
}
