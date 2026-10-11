"use client";
import { EmailView } from "@/components/EmailView";
import { renderBody, renderSubject } from "@/lib/template/render";
import type { Brief, Bundle, Contact, Draft } from "./types";

export function Letter({ b, brief, contact, draft, companyName, onCite }: { b: Bundle; brief: Brief; contact: Contact | undefined; draft: Draft; companyName: string; onCite: (eid: string) => void }) {
  if (!b.org) return <div className="letter whitespace-pre-wrap">{draft.body}</div>;
  const attachment = b.campaign.attachDeck && b.org.deckName ? b.org.deckName : null;
  if (draft.userEdited) {
    return <EmailView subject={draft.subject} bodyText={draft.body} signature={b.org.signature} company={companyName} attachment={attachment} showSubject={false} />;
  }
  const ctx = { company: companyName, firstName: contact?.firstName ?? null, slots: { hook: brief.data.hook, ideas: brief.data.ideas } };
  return (
    <EmailView
      subject={draft.subject || renderSubject(b.org.templates.subject, ctx)}
      blocks={renderBody(b.org.templates[b.campaign.mode], ctx)}
      signature={b.org.signature}
      company={companyName}
      attachment={attachment}
      onCite={onCite}
      showSubject={false}
    />
  );
}
