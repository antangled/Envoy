"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Label, Notice } from "@/components/ui";
import { TemplateEditor } from "@/components/TemplateEditor";
import { api } from "@/lib/client/api";
import { MY_FIELDS } from "@/lib/template/render";
import { renderEmail, templateProblems, type BeacnMe } from "@/lib/beacn/template";
import { displayName, type ListEntry, type Usage } from "./types";

interface Profile extends BeacnMe {
  subject: string;
  body: string;
  saved: boolean;
}

/** datetime-local value for "now + minutes", in the member's own time zone. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function Compose({ list, setList, usage, email, onSent, onFind }: { list: ListEntry[]; setList: (f: (l: ListEntry[]) => ListEntry[]) => void; usage: Usage | null; email: string; onSent: () => void; onFind: () => void }) {
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [at, setAt] = useState(() => localInput(new Date(Date.now() + 60 * 60_000)));
  const [spread, setSpread] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);
  // A clock for validating the scheduled time, refreshed each minute (render must stay pure).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api<Profile>("/api/beacn/profile")
      .then((d) => {
        setP(d);
        setSaved(JSON.stringify(d));
      })
      .catch((e) => setMsg({ tone: "bad", text: (e as Error).message }));
  }, []);

  const problems = useMemo(() => (p ? templateProblems(p.subject, p.body) : []), [p]);
  const missing = p ? [!p.name.trim() && "your name", !p.title.trim() && "your title"].filter(Boolean) : [];
  const dirty = !!p && saved !== JSON.stringify(p);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setConfirm(false);
    setP((x) => (x ? { ...x, [k]: v } : x));
  };

  const emailFor = (r: ListEntry) => {
    const base = renderEmail({ subject: p!.subject, body: p!.body }, p!, { firstName: r.firstName, company: r.company });
    return { subject: r.subject ?? base.subject, body: r.body ?? base.body, edited: r.subject !== undefined || r.body !== undefined };
  };

  const save = async () => {
    if (!p) return false;
    setBusy("save");
    try {
      const { saved: _s, ...body } = p;
      void _s;
      await api("/api/beacn/profile", { method: "PUT", json: body });
      setSaved(JSON.stringify(p));
      setMsg({ tone: "ok", text: "Saved your details and template." });
      return true;
    } catch (e) {
      setMsg({ tone: "bad", text: `Not saved: ${(e as Error).message}` });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const when = mode === "now" ? null : new Date(at);
  const blocked =
    !list.length ? "Your send list is empty." : missing.length ? `Add ${missing.join(" and ")} above.` : problems.length ? problems[0] : !usage?.gmail ? "Sign in with Google again to allow sending from your Gmail." : mode === "later" && (!when || isNaN(when.getTime()) || when.getTime() < now) ? "Pick a time in the future." : null;

  const send = async () => {
    if (!p) return;
    if (dirty && !(await save())) return;
    setBusy("send");
    setMsg(null);
    try {
      const items = list.map((r) => ({ personId: r.id, ...emailFor(r) })).map(({ edited, ...x }) => (void edited, x));
      const r = await api<{ queued: number; sent: number; failed?: number; skipped: string[] }>("/api/beacn/sends", { method: "POST", json: { items, sendAt: when ? when.toISOString() : null, spread } });
      const done = new Set(list.filter((x) => !r.skipped.some((s) => s.startsWith(x.email))).map((x) => x.id));
      setList((l) => l.filter((x) => !done.has(x.id)));
      setConfirm(false);
      const head = when || spread ? `Scheduled ${r.queued} email${r.queued === 1 ? "" : "s"}.` : `Sent ${r.sent} email${r.sent === 1 ? "" : "s"}.${r.failed ? ` ${r.failed} failed; see the Outbox.` : ""}`;
      setMsg({ tone: r.failed ? "warn" : "ok", text: `${head}${r.skipped.length ? ` Skipped: ${r.skipped.join("; ")}.` : ""}` });
      if (r.queued) setTimeout(onSent, 900);
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (!p) return msg ? <Notice tone="bad">{msg.text}</Notice> : <p className="text-ink-2">Loading…</p>;
  const preview = list[0] ? emailFor(list[0]) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-rule bg-surface p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="b-name">Your name</Label><input id="b-name" className="field" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Jordan Lee" /></div>
          <div><Label htmlFor="b-title">Your title</Label><input id="b-title" className="field" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="Project Manager" /></div>
          <div><Label htmlFor="b-pron">Pronouns (optional)</Label><input id="b-pron" className="field" value={p.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="she/her" /></div>
          <div><Label htmlFor="b-phone">Phone (optional)</Label><input id="b-phone" className="field" value={p.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
        <p className="mt-3 text-[13px] text-ink-2">Emails go out from <span className="font-semibold text-ink">{email}</span>, signed as BEACN. Fields in yellow ({MY_FIELDS.map((f) => f.label.toLowerCase()).join(", ")}) fill in from these details.</p>
      </section>

      <section className="rounded-xl border border-rule bg-surface p-5">
        <h2 className="mb-3 text-[15px] font-semibold">Your template</h2>
        <Label htmlFor="b-subject">Subject</Label>
        <input id="b-subject" className="field mb-4" value={p.subject} onChange={(e) => set("subject", e.target.value)} />
        <TemplateEditor id="b-body" label="Email template" value={p.body} onChange={(v) => set("body", v)} ai={false} />
        {problems.length > 0 && (
          <ul className="mt-3 space-y-1 text-[13px] text-bad">
            {problems.map((x) => <li key={x}>{x}</li>)}
          </ul>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="quiet" onClick={save} busy={busy === "save"} disabled={!dirty}>{dirty ? "Save template" : "Saved"}</Button>
          <span className="text-[13px] text-ink-2">Green fields change for each person. Red brackets must be replaced before sending.</span>
        </div>
      </section>

      <section className="rounded-xl border border-rule bg-surface">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-3">
          <h2 className="text-[15px] font-semibold">Send list <span className="font-normal text-ink-3">· {list.length} {list.length === 1 ? "person" : "people"}</span></h2>
          <div className="flex gap-4 text-[13px]">
            <button className="font-semibold text-link hover:underline" onClick={onFind}>Find more people</button>
            {list.length > 0 && <button className="font-semibold text-link hover:underline" onClick={() => setList(() => [])}>Clear list</button>}
          </div>
        </div>
        {!list.length ? (
          <p className="px-5 py-6 text-[14px] text-ink-2">Nobody yet. In Find people, tick people with emails and choose Add to send list.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {list.map((r) => {
              const e = emailFor(r);
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
                    <span className="font-semibold">{displayName(r)}</span>
                    <span className="text-ink-2">{r.title}{r.title ? ", " : ""}{r.company}</span>
                    <span className="text-[13px] text-ink-3">{r.email}</span>
                    {e.edited && <span className="text-[12px] font-semibold text-link">Edited</span>}
                    <span className="ml-auto flex gap-3 text-[13px]">
                      <button className="font-semibold text-link hover:underline" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Close" : "Preview and edit"}</button>
                      <button className="text-ink-2 hover:text-bad" onClick={() => setList((l) => l.filter((x) => x.id !== r.id))}>Remove</button>
                    </span>
                  </div>
                  {open === r.id && (
                    <div className="mt-3 space-y-2">
                      <input aria-label="Subject for this email" className="field" value={e.subject} onChange={(ev) => setList((l) => l.map((x) => (x.id === r.id ? { ...x, subject: ev.target.value, body: x.body ?? e.body } : x)))} />
                      <textarea aria-label="Email for this person" className="field letter min-h-[280px]" value={e.body} onChange={(ev) => setList((l) => l.map((x) => (x.id === r.id ? { ...x, body: ev.target.value, subject: x.subject ?? e.subject } : x)))} />
                      {e.edited && <button className="text-[13px] text-link hover:underline" onClick={() => setList((l) => l.map((x) => (x.id === r.id ? { ...x, subject: undefined, body: undefined } : x)))}>Reset to template</button>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {preview && !open && (
        <section className="rounded-xl border border-rule bg-surface p-5">
          <p className="text-[12px] font-semibold text-ink-3">Preview for {displayName(list[0])}</p>
          <p className="mt-1 font-semibold">{preview.subject}</p>
          <div className="letter mt-3 whitespace-pre-wrap text-ink">{preview.body}</div>
        </section>
      )}

      <div className="sticky bottom-0 -mx-5 space-y-3 border-t border-rule bg-canvas/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
          <label className="flex items-center gap-2"><input type="radio" name="when" checked={mode === "now"} onChange={() => { setMode("now"); setConfirm(false); }} className="accent-[var(--seal)]" /> Send now</label>
          <label className="flex items-center gap-2"><input type="radio" name="when" checked={mode === "later"} onChange={() => { setMode("later"); setConfirm(false); }} className="accent-[var(--seal)]" /> Schedule for</label>
          <input type="datetime-local" aria-label="Send time" className="field w-auto py-1.5" value={at} min={localInput(new Date(now))} disabled={mode !== "later"} onChange={(e) => { setAt(e.target.value); setConfirm(false); }} />
          <label className="flex items-center gap-2 text-ink-2"><input type="checkbox" checked={spread} onChange={(e) => { setSpread(e.target.checked); setConfirm(false); }} className="h-4 w-4 accent-[var(--seal)]" /> Spread over 30 minutes</label>
        </div>
        {mode === "later" && usage && !usage.scheduler && <p className="text-[13px] text-warn">Scheduled sending isn&rsquo;t set up on this site yet; scheduled emails go out when the Outbox page is open, or once a day.</p>}
        <div className="flex flex-wrap items-center gap-3">
          {confirm ? (
            <>
              <Button variant="seal" onClick={send} busy={busy === "send"}>Confirm: {mode === "now" && !spread ? "send" : "schedule"} {list.length} email{list.length === 1 ? "" : "s"}</Button>
              <Button variant="quiet" onClick={() => setConfirm(false)}>Back</Button>
            </>
          ) : (
            <Button variant="seal" onClick={() => setConfirm(true)} disabled={!!blocked || !!busy}>{mode === "now" && !spread ? `Send ${list.length} email${list.length === 1 ? "" : "s"}` : `Schedule ${list.length} email${list.length === 1 ? "" : "s"}`}</Button>
          )}
          <span role="status" className={`text-[13px] ${msg?.tone === "bad" ? "text-bad" : msg?.tone === "warn" ? "text-warn" : msg ? "text-ok" : blocked ? "text-ink-2" : "text-ink-2"}`}>
            {msg
              ? msg.text
              : confirm
                ? `${list.length} individual email${list.length === 1 ? "" : "s"} from ${email}, ${mode === "now" ? "right now" : `at ${new Date(at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}${spread ? ", spread over 30 minutes" : ", all at once"}.`
                : blocked ?? "Each person gets their own email, greeted by name."}
          </span>
        </div>
      </div>
    </div>
  );
}
