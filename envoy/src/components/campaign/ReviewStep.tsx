"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Notice } from "@/components/ui";
import { useStatus } from "@/components/status";
import { api } from "@/lib/client/api";
import { ContactBadge, CONTACT_LABEL, CriteriaDots, Cites, FitScore } from "./bits";
import { Letter } from "./Letter";
import { recipientsFor, type Bundle, type Prospect } from "./types";

export type ProgressMap = Record<number, { stage: string; detail?: string }>;

export function ReviewStep({ b, reload, progress, running, onContinue }: { b: Bundle; reload: () => Promise<void>; progress: ProgressMap; running: boolean; onContinue: () => void }) {
  const list = b.prospects.filter((p) => p.selected);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = list.find((p) => p.id === activeId) ?? list.find((p) => b.drafts.some((d) => d.prospectId === p.id)) ?? list[0];
  const selectedCount = b.drafts.filter((d) => d.status === "selected").reduce((n, d) => n + recipientsFor(b, d).length, 0);
  const ready = list.filter((p) => b.drafts.some((d) => d.prospectId === p.id)).length;
  // Drafts that have at least one recipient with an address can be sent; "Select all" toggles every one of them.
  const sendableDrafts = b.drafts.filter((d) => list.some((p) => p.id === d.prospectId) && recipientsFor(b, d).length > 0);
  const allDraftsOn = sendableDrafts.length > 0 && sendableDrafts.every((d) => d.status === "selected");
  const [bulk, setBulk] = useState(false);
  const selectAllDrafts = async () => {
    setBulk(true);
    try {
      for (const d of sendableDrafts) await api(`/api/drafts/${d.id}`, { method: "PATCH", json: { status: allDraftsOn ? "draft" : "selected" } });
      await reload();
    } finally {
      setBulk(false);
    }
  };

  return (
    <div>
      {b.campaign.shortfall.length > 0 && !running && <div className="mb-5"><Notice>{b.campaign.shortfall.join(" ")}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="Organizations" className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[13px] text-ink-2 tabular-nums">{running ? `Researching… ${ready} of ${list.length} ready` : `${ready} briefs · ${selectedCount} selected to send`}</p>
            {!running && sendableDrafts.length > 1 && (
              <button type="button" disabled={bulk} onClick={selectAllDrafts} className="shrink-0 text-[13px] font-semibold text-link hover:underline disabled:opacity-50">
                {allDraftsOn ? "Clear all" : "Select all"}
              </button>
            )}
          </div>
          <ul className="max-h-[70vh] divide-y divide-rule overflow-auto rounded-xl border border-rule bg-surface">
            {list.map((p) => (
              <ProspectRow key={p.id} p={p} b={b} active={active?.id === p.id} progress={progress[p.id]} onClick={() => setActiveId(p.id)} />
            ))}
          </ul>
        </nav>
        <div className="min-w-0">{active ? <Dossier key={active.id} p={active} b={b} reload={reload} progress={progress[active.id]} /> : <p className="text-ink-2">Select an organization.</p>}</div>
      </div>
      <div className="sticky bottom-0 -mx-5 mt-8 flex flex-wrap items-center gap-3 border-t border-rule bg-canvas/95 px-5 py-4 backdrop-blur">
        <Button onClick={onContinue} disabled={running || !selectedCount}>Review {selectedCount} email{selectedCount === 1 ? "" : "s"} to send</Button>
        <span className="text-[13px] text-ink-2">{running ? "You can read briefs as they finish." : "Toggle Send on each draft, or use Select all in the list."}</span>
      </div>
    </div>
  );
}

function ProspectRow({ p, b, active, progress, onClick }: { p: Prospect; b: Bundle; active: boolean; progress?: { stage: string; detail?: string }; onClick: () => void }) {
  const brief = b.briefs.find((x) => x.prospectId === p.id);
  const draft = b.drafts.find((x) => x.prospectId === p.id);
  const contact = b.contacts.find((x) => x.id === draft?.contactId);
  const working = progress && !["done", "error", "skipped"].includes(progress.stage) && !draft;
  return (
    <li>
      <button type="button" onClick={onClick} aria-current={active ? "true" : undefined} className={`flex w-full items-start gap-3 px-4 py-3 text-left ${active ? "bg-carbon" : "hover:bg-sunken"}`}>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-2">
            {working && <><span className="working h-1.5 w-1.5 rounded-full bg-link" />{progress?.detail}</>}
            {!working && p.status === "skipped" && <span className="text-bad">{p.skipReason || "Skipped"}</span>}
            {!working && brief && <><CriteriaDots criteria={brief.data.criteria} />{contact && <ContactBadge status={contact.emailStatus} named={!!contact.name} />}</>}
            {!working && !brief && p.status !== "skipped" && <span>Waiting</span>}
          </p>
        </div>
        {brief && <div className="flex flex-col items-end gap-1"><FitScore score={brief.data.fit_score} />{draft?.status === "selected" && recipientsFor(b, draft).length > 0 && <span className="text-[11px] font-semibold text-seal">Send to {recipientsFor(b, draft).length}</span>}</div>}
      </button>
    </li>
  );
}

function Dossier({ p, b, reload, progress }: { p: Prospect; b: Bundle; reload: () => Promise<void>; progress?: { stage: string; detail?: string } }) {
  const { status } = useStatus();
  const brief = b.briefs.find((x) => x.prospectId === p.id);
  const draft = b.drafts.find((x) => x.prospectId === p.id);
  const contacts = b.contacts.filter((x) => x.prospectId === p.id);
  const contact = contacts.find((x) => x.id === draft?.contactId) ?? contacts.find((x) => x.isPrimary);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const toggleContact = async (id: number, selected: boolean) => {
    setBusy(`c${id}`);
    try { await api(`/api/contacts/${id}`, { method: "PATCH", json: { selected } }); await reload(); } finally { setBusy(null); }
  };
  const selectAllContacts = async (pickable: number[], on: boolean) => {
    setBusy("all");
    try {
      for (const id of pickable) await api(`/api/contacts/${id}`, { method: "PATCH", json: { selected: on } });
      await reload();
    } finally {
      setBusy(null);
    }
  };
  const findEmail = async (id: number) => {
    setBusy(`e${id}`);
    setLookupMsg(null);
    try {
      const r = await api<{ found: boolean; email?: string }>(`/api/contacts/${id}/email`, { method: "POST" });
      setLookupMsg(r.found ? `Found ${r.email}. Tick the box to add them.` : "Hunter couldn't find an email for this person. No credit was used.");
      await reload();
    } catch (e) {
      setLookupMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sourceNums = useMemo(() => Object.entries(brief?.sources ?? {}).sort((a, b2) => Number(a[0].slice(1)) - Number(b2[0].slice(1))), [brief]);
  const onCite = (eid: string) => {
    document.getElementById(`src-${p.id}-${eid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(eid);
    setTimeout(() => setFlash(null), 1600);
  };
  const patch = async (json: Record<string, unknown>, label: string) => {
    if (!draft) return;
    setBusy(label);
    try { await api(`/api/drafts/${draft.id}`, { method: "PATCH", json }); await reload(); } finally { setBusy(null); }
  };

  if (!brief || !draft) {
    return (
      <div className="rounded-xl border border-rule bg-surface px-6 py-12 text-center">
        <p className="font-serif text-[22px]">{p.name}</p>
        <p className="mt-2 text-ink-2">{p.status === "skipped" ? p.skipReason : progress?.detail || "Waiting to be researched."}</p>
      </div>
    );
  }
  const d = brief.data;
  const recipients = recipientsFor(b, draft);
  const sendable = recipients.length > 0;
  const critText = new Map((b.campaign.searchSpec?.criteria ?? []).map((c) => [c.id, c.text]));

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-start gap-4 rounded-xl border border-rule bg-surface p-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[28px] font-medium leading-tight">{p.name}</h2>
          <a href={p.website} target="_blank" rel="noreferrer" className="text-[14px] text-link hover:underline">{p.domain}</a>
          <p className="mt-3 max-w-[68ch] text-[15px] text-ink">{d.profile}</p>
        </div>
        <div className="text-right">
          <FitScore score={d.fit_score} size="lg" />
          <p className="mt-1 text-[12px] text-ink-3">fit score</p>
          <p className="mt-2">{brief.modelUsed === "demo-rules" ? <Badge tone="warn">Demo draft</Badge> : brief.modelUsed === "demo-sample" ? <Badge tone="muted" title="Written in advance for the demo. No AI was used.">Sample brief</Badge> : <Badge tone="carbon">{brief.modelUsed.includes("sonnet") ? "Checked by Sonnet" : "AI brief"}</Badge>}</p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-rule bg-surface p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Fit against your criteria</h3>
          <ul className="space-y-3">
            {d.criteria.map((c) => (
              <li key={c.id} className="text-[14px]">
                <div className="flex items-start gap-2">
                  <Badge tone={c.status === "supported" ? "ok" : c.status === "not_met" ? "warn" : "muted"}>{c.status === "supported" ? "Supported" : c.status === "not_met" ? "Not met" : "Unknown"}</Badge>
                  <span className="font-medium">{critText.get(c.id) ?? c.id}</span>
                </div>
                <p className="mt-1 pl-1 text-[13px] text-ink-2">{c.note}<Cites ids={c.evidence_ids} onCite={onCite} /></p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-rule bg-surface p-5">
          <h3 className="mb-3 text-[15px] font-semibold">What both sides gain</h3>
          <ul className="space-y-2.5 text-[14px]">
            {d.mutual_benefit.map((m, i) => (
              <li key={i}>
                <Badge tone={m.basis === "evidenced" ? "ok" : "muted"}>{m.basis === "evidenced" ? "Evidenced" : "Inferred"}</Badge>{" "}
                {m.claim}<Cites ids={m.evidence_ids} onCite={onCite} />
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-5 text-[15px] font-semibold">Still unknown</h3>
          <ul className="space-y-2 text-[14px]">
            {d.missing_information.map((m, i) => (
              <li key={i}>
                <span className="font-medium">{m.question}</span>
                <span className="block text-[13px] text-ink-2">{m.why_it_matters} {m.how_to_verify}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-rule bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold">Who to write to</h3>
          <span className="flex items-baseline gap-3 text-[13px] text-ink-2 tabular-nums">
            {contacts.filter((c) => c.name).length} people found · {recipients.length} will get this email
            {(() => {
              const pickable = contacts.filter((c) => !!c.email && (c.emailStatus === "published_generic" ? draft.allowGeneric : c.emailStatus !== "not_found")).map((c) => c.id);
              if (pickable.length < 2) return null;
              const allOn = pickable.every((id) => recipients.some((r) => r.id === id));
              return (
                <button type="button" disabled={busy === "all"} onClick={() => selectAllContacts(pickable, !allOn)} className="font-semibold text-link hover:underline disabled:opacity-50">
                  {allOn ? "Clear all" : "Select all with email"}
                </button>
              );
            })()}
          </span>
        </div>
        <ul className="divide-y divide-rule rounded-lg border border-rule">
          {contacts.map((c) => {
            const previewing = c.id === draft.contactId;
            const generic = c.emailStatus === "published_generic";
            const canPick = !!c.email && (generic ? draft.allowGeneric : c.emailStatus !== "not_found");
            const picked = recipients.some((r) => r.id === c.id);
            return (
              <li key={c.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${previewing ? "bg-carbon" : ""}`}>
                <input
                  type="checkbox"
                  aria-label={`Send to ${c.name || c.email || "this contact"}`}
                  disabled={!canPick || busy === `c${c.id}`}
                  checked={picked}
                  onChange={(e) => toggleContact(c.id, e.target.checked)}
                  className="h-4 w-4 accent-[var(--seal)] disabled:opacity-40"
                />
                <ContactBadge status={c.emailStatus} named={!!c.name} checked={c.confidence !== null} />
                <span className="font-semibold">{c.name || (c.emailStatus === "not_found" ? `No named contact. Try: ${c.title}` : "Company address")}</span>
                {c.title && c.name && <span className="text-[14px] text-ink-2">{c.title}</span>}
                {c.email && <span className="text-[14px]">{c.email}</span>}
                {!c.email && c.name && c.confidence === null && status?.integrations.hunter && (
                  <Button variant="ghost" className="text-[13px]" busy={busy === `e${c.id}`} onClick={() => findEmail(c.id)}>Find email</Button>
                )}
                <span className="ml-auto flex items-center gap-3 text-[13px]">
                  {c.sourceUrl && <a className="text-link hover:underline" href={c.sourceUrl} target="_blank" rel="noreferrer">{c.emailStatus === "not_found" && !c.name ? "Contact page" : "Source"}</a>}
                  {c.linkedinUrl && <a className="text-link hover:underline" href={c.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>}
                  {!previewing && c.email && <button className="text-link hover:underline" onClick={() => patch({ contactId: c.id }, "contact")}>Preview</button>}
                </span>
              </li>
            );
          })}
        </ul>
        {lookupMsg && <p className="mt-2 text-[13px] text-ink-2">{lookupMsg}</p>}
        <p className="mt-2 text-[13px] text-ink-2">Tick everyone who should get this email; each person gets their own copy, greeted by name. {contact && CONTACT_LABEL[contact.emailStatus].help}</p>
        {contacts.some((c) => c.emailStatus === "published_generic") && (
          <label className="mt-2 flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={draft.allowGeneric} onChange={(e) => patch({ allowGeneric: e.target.checked }, "generic")} className="h-4 w-4 accent-[var(--ink)]" />
            Allow sending to shared inboxes (info@, press@) at this company
          </label>
        )}
        {!status?.integrations.hunter && <p className="mt-2 text-[12px] text-ink-3">Demo mode: only addresses published on the company&rsquo;s site. Add your Hunter key in envoy/.env.local to find named people by title.</p>}
      </section>

      <section className="rounded-xl border border-rule bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule px-5 py-3">
          <h3 className="text-[15px] font-semibold">Draft</h3>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><span className="carbon inline-block h-3 w-5" />written for {p.name}; everything else is your template</span>
          <label className={`ml-auto flex items-center gap-2 text-[14px] font-semibold ${sendable ? "" : "opacity-50"}`} title={sendable ? "" : "No sendable address for this company"}>
            <input type="checkbox" disabled={!sendable} checked={draft.status === "selected" && sendable} onChange={(e) => patch({ status: e.target.checked ? "selected" : "draft" }, "select")} className="h-4 w-4 accent-[var(--seal)]" />
            Send
          </label>
        </div>
        <div className="px-5 py-4">
          <label htmlFor={`subj${draft.id}`} className="text-[12px] font-semibold text-ink-2">Subject</label>
          <input key={draft.subject} id={`subj${draft.id}`} className="field mt-1" defaultValue={draft.subject} onBlur={(e) => e.target.value !== draft.subject && patch({ subject: e.target.value }, "subject")} />
        </div>
        <div className="border-t border-rule bg-[color-mix(in_oklab,var(--surface),var(--canvas)_40%)] px-6 py-6 sm:px-10">
          {editing ? (
            <AutoGrow value={body} onChange={setBody} />
          ) : (
            <div
              role="button"
              tabIndex={0}
              title="Click to edit this email"
              onClick={(e) => { if ((e.target as HTMLElement).closest("a,button")) return; setBody(draft.body); setEditing(true); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setBody(draft.body); setEditing(true); } }}
              className="-m-3 cursor-text rounded-lg p-3 outline-offset-2 transition-colors hover:bg-sunken/60"
            >
              <Letter b={b} brief={brief} contact={contact} draft={draft} companyName={p.name} onCite={onCite} />
            </div>
          )}
          
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-rule px-5 py-3">
          {editing ? (
            <>
              <Button busy={busy === "body"} onClick={async () => { await patch({ body }, "body"); setEditing(false); }}>Save changes</Button>
              <Button variant="quiet" onClick={() => { setBody(draft.body); setEditing(false); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button variant="quiet" onClick={() => { setBody(draft.body); setEditing(true); }}>Edit this email</Button>
              <span className="text-[13px] text-ink-3">or click anywhere in it. Add anything specific to {p.name}.</span>
            </>
          )}
          {(status?.integrations.anthropic || draft.userEdited) && (
            <Button variant="ghost" busy={busy === "regen"} onClick={async () => { setBusy("regen"); try { await api(`/api/drafts/${draft.id}/regenerate`, { method: "POST" }); await reload(); setEditing(false); } finally { setBusy(null); } }}>
              {status?.integrations.anthropic ? "Rewrite opening and ideas" : "Restore generated draft"}
            </Button>
          )}
          {draft.userEdited && <Badge>Edited by you</Badge>}
        </div>
      </section>

      <section className="rounded-xl border border-rule bg-surface p-5">
        <h3 className="mb-3 text-[15px] font-semibold">Sources</h3>
        <ol className="space-y-1.5 text-[14px]">
          {sourceNums.map(([eid, s]) => (
            <li key={eid} id={`src-${p.id}-${eid}`} className={`flex gap-3 rounded-md px-2 py-1 transition-colors ${flash === eid ? "bg-carbon" : ""}`}>
              <span className="w-5 shrink-0 text-right font-semibold text-link tabular-nums">{eid.slice(1)}</span>
              {s ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">
                  <span className="text-ink">{s.title || s.url}</span> <span className="text-ink-3">{s.url.replace(/^https?:\/\//, "").replace(/^\/demo\/source\//, "")}</span>
                </a>
              ) : <span className="text-ink-3">Source no longer available</span>}
            </li>
          ))}
        </ol>
        <details className="mt-4 text-[13px] text-ink-2">
          <summary className="cursor-pointer font-semibold">How this brief was checked</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{brief.evidenceCount} pages read. Every citation was matched against the pages sent; quotes in the opening were confirmed word for word.</li>
            {brief.validationLog.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </details>
      </section>
    </article>
  );
}

/** Editing a single draft: the whole email in one box that grows with its text. */
function AutoGrow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} autoFocus aria-label="Email body" className="field letter resize-none overflow-hidden" value={value} onChange={(e) => onChange(e.target.value)} />;
}
