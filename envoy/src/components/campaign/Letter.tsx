"use client";
import { renderSegments, type Segment } from "@/lib/template/render";
import { Cites } from "./bits";
import type { Brief, Bundle, Contact, Draft } from "./types";

export function Letter({ b, brief, contact, draft, companyName, onCite }: { b: Bundle; brief: Brief; contact: Contact | undefined; draft: Draft; companyName: string; onCite: (eid: string) => void }) {
  if (draft.userEdited || !b.org) {
    return <div className="letter whitespace-pre-wrap">{draft.body}</div>;
  }
  const paras = renderSegments({
    mode: b.campaign.mode,
    org: b.org,
    campaign: { offerPhrase: b.campaign.searchSpec?.offer_phrase || "a focused project", seasonLabel: b.campaign.searchSpec?.season_label || "upcoming", attachDeck: b.campaign.attachDeck },
    company: { name: companyName },
    contact: { firstName: contact?.firstName ?? null },
    slots: { hook: brief.data.hook, ideas: brief.data.ideas },
  });
  return (
    <div className="letter space-y-3">
      {paras.map((p, i) =>
        p[0]?.kind === "idea" ? (
          <ul key={i} className="list-disc space-y-1.5 pl-6">
            {p.map((s, j) => s.kind === "idea" && (
              <li key={j}>
                <span className="carbon"><em>{s.title}</em>: {s.text}</span>
                <Cites ids={s.evidenceIds} onCite={onCite} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {p.map((s: Segment, j) =>
              s.kind === "hook" ? (
                <span key={j}>
                  <span className="carbon">{s.text}</span>
                  <Cites ids={s.evidenceIds} onCite={onCite} />
                </span>
              ) : (
                <span key={j}>{s.text}</span>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
}
