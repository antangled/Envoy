"use client";
import type { Block, Signature } from "@/lib/template/render";
import { footerText } from "@/lib/template/render";

/**
 * The whole email as the recipient will see it. While previewing a template, generated parts show as markers;
 * in a real draft they show as tinted text with source numbers.
 */
export function EmailView({
  subject,
  blocks,
  bodyText,
  signature,
  company,
  showFooter = true,
  attachment,
  onCite,
  highlightVars = false,
  showSubject = true,
}: {
  subject: string;
  blocks?: Block[];
  /** Used instead of blocks when the user has hand-edited a draft. Includes the signature. */
  bodyText?: string;
  signature: Signature;
  company: string;
  showFooter?: boolean;
  attachment?: string | null;
  onCite?: (eid: string) => void;
  highlightVars?: boolean;
  /** The review screen shows its own editable subject field above the letter. */
  showSubject?: boolean;
}) {
  return (
    <div className="text-ink">
      {showSubject && (
        <div className="mb-4 border-b border-rule pb-3">
          <p className="text-[12px] font-semibold text-ink-3">Subject</p>
          <p className="mt-0.5 text-[15px] font-semibold">{subject || <span className="text-ink-3">No subject</span>}</p>
        </div>
      )}
      <div className="letter space-y-3">
        {bodyText !== undefined ? (
          <div className="whitespace-pre-wrap">{bodyText}</div>
        ) : (
          <>
            {blocks?.map((b, i) =>
              b.kind === "ideas" ? (
                <ul key={i} className="list-disc space-y-1.5 pl-6">
                  {b.items
                    ? b.items.map((it, j) => (
                        <li key={j}>
                          <span className="carbon"><em>{it.title}</em>: {it.text}</span>
                          <Cites ids={it.evidenceIds} onCite={onCite} />
                        </li>
                      ))
                    : [0, 1, 2].map((j) => (
                        <li key={j}>
                          <Marker>Idea {j + 1} for {company}, built on one of your services</Marker>
                        </li>
                      ))}
                </ul>
              ) : (
                <p key={i} className="whitespace-pre-line">
                  {b.segs.map((s, j) =>
                    s.kind === "hook" ? (
                      s.text ? (
                        <span key={j}><span className="carbon">{s.text}</span><Cites ids={s.evidenceIds} onCite={onCite} /></span>
                      ) : (
                        <Marker key={j}>a recent, sourced detail about {company}</Marker>
                      )
                    ) : s.kind === "fill" ? (
                      <span key={j} className="rounded-sm bg-bad-bg px-[2px] text-bad" title="Replace this with your own words in the editor">[{s.text}]</span>
                    ) : s.kind === "mine" ? (
                      highlightVars ? (
                        <span key={j} className={`rounded-sm px-[2px] ${s.empty ? "bg-bad-bg text-bad" : "bg-warn-bg text-ink"}`} title={s.empty ? `Add ${s.label.toLowerCase()} in Your details` : `${s.label}, from Your details`}>{s.empty ? `[${s.text}]` : s.text}</span>
                      ) : (
                        <span key={j}>{s.text}</span>
                      )
                    ) : s.kind === "var" && highlightVars ? (
                      <span key={j} className="rounded-sm bg-ok-bg px-[2px] text-ok" title="Example only. Filled in with each real recipient">{s.text}</span>
                    ) : (
                      <span key={j}>{s.text}</span>
                    ),
                  )}
                </p>
              ),
            )}
            <SignatureBlock signature={signature} />
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo is a data: URI; next/image has nothing to optimize */}
        {bodyText !== undefined && signature.logo && <img src={signature.logo} alt="" className="max-h-12 max-w-[180px]" />}
      </div>
      {attachment && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-rule px-2.5 py-1 text-[13px] text-ink-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M21 12.5 12.6 21a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6L15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          {attachment}
        </p>
      )}
      {showFooter && (
        <p className="mt-5 whitespace-pre-line border-t border-dashed border-rule pt-3 text-[12px] leading-relaxed text-ink-3">
          {footerText({ meName: signature.name, orgName: signature.org, postalAddress: signature.postalAddress }, company).replace(/^—\n/, "")}
        </p>
      )}
    </div>
  );
}

/** Mirrors the HTML signature that's sent: italic pronouns, linked organization, grey italic tagline. */
export function SignatureBlock({ signature: s }: { signature: Signature }) {
  const site = s.website ? (/^https?:\/\//.test(s.website) ? s.website : `https://${s.website}`) : "";
  const contact = [s.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), s.phone].filter(Boolean);
  return (
    <div className="pt-1 leading-snug">
      <p className="mb-1.5">{s.signoff}</p>
      <p>{s.name || s.firstName || <span className="text-ink-3">Your name</span>}</p>
      {s.pronouns && <p className="italic">({s.pronouns})</p>}
      {s.title && <p>{s.title}</p>}
      {s.org && <p>{site ? <a href={site} target="_blank" rel="noreferrer" className="text-link underline underline-offset-2">{s.org}</a> : s.org}</p>}
      {s.tagline && <p className="italic text-ink-3">{s.tagline}</p>}
      {contact.length > 0 && <p className="text-[15px] text-ink-2">{contact.join(" · ")}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo is a data: URI; next/image has nothing to optimize */}
      {s.logo && <img src={s.logo} alt="" className="mt-2 max-h-12 max-w-[180px]" />}
    </div>
  );
}

function Marker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md border border-dashed border-carbon-line bg-carbon px-1.5 py-px font-sans text-[13px] font-medium text-link">
      <span aria-hidden>✦</span>
      {children}
    </span>
  );
}

function Cites({ ids, onCite }: { ids: string[]; onCite?: (eid: string) => void }) {
  if (!ids.length || !onCite) return null;
  return (
    <>
      {ids.map((id, i) => (
        <span key={id} className="cite">
          {i > 0 && <span aria-hidden className="text-ink-3">,</span>}
          <button type="button" className="text-link hover:underline" onClick={() => onCite(id)} aria-label={`Source ${id.slice(1)}`}>
            {id.slice(1)}
          </button>
        </span>
      ))}
    </>
  );
}
