"use client";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import { footerText } from "@/lib/template/render";
import { ContactBadge } from "./bits";
import { canSend, type Bundle } from "./types";

export function SendStep({ b, reload }: { b: Bundle; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ queued: number; skipped: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const queuedDraftIds = new Set(b.sends.map((s) => s.draftId));
  const pending = b.drafts
    .filter((d) => d.status === "selected" && !queuedDraftIds.has(d.id))
    .map((d) => ({ d, p: b.prospects.find((x) => x.id === d.prospectId)!, c: b.contacts.find((x) => x.id === d.contactId) }))
    .filter((x) => canSend(x.c, x.d));
  const scheduled = b.sends.filter((s) => s.status === "scheduled");
  const live = b.gmailConnected;
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!scheduled.length) return;
    const t = setInterval(async () => {
      setNow(Date.now());
      await api("/api/send/process", { method: "POST" }).catch(() => {});
      await reloadRef.current();
    }, 4000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, [scheduled.length]);

  async function queue() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ queued: number; skipped: string[] }>(`/api/campaigns/${b.campaign.id}/queue`, { method: "POST", json: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      setResult(r);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const fmt = (iso: string) => {
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return "sending now";
    const s = Math.round(ms / 1000);
    return s < 90 ? `in ${s}s` : s < 5400 ? `in ${Math.round(s / 60)} min` : new Date(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="space-y-8">
        {pending.length > 0 && (
          <section>
            <h2 className="mb-3 font-serif text-[22px] font-medium">Ready to send</h2>
            <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
              {pending.map(({ d, p, c }) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className="min-w-[140px] font-semibold">{p.name}</span>
                  <span className="text-[14px] text-ink-2">{c?.name ? `${c.name}, ` : ""}{c?.email}</span>
                  {c && <ContactBadge status={c.emailStatus} />}
                  <span className="w-full truncate text-[13px] text-ink-3 sm:ml-auto sm:w-auto sm:max-w-[280px]">{d.subject}</span>
                </li>
              ))}
            </ul>
            {pending.some((x) => x.c?.emailStatus !== "verified") && <p className="mt-2 text-[13px] text-warn">Some addresses aren&rsquo;t verified and may bounce. Envoy pauses the campaign if Gmail reports a sending problem.</p>}
          </section>
        )}

        {b.sends.length > 0 && (
          <section>
            <h2 className="mb-3 font-serif text-[22px] font-medium">Outbox</h2>
            <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
              {b.sends.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14px]">
                  <span className="min-w-[140px] font-semibold">{s.orgName}</span>
                  <span className="text-ink-2">{s.toEmail}</span>
                  <span className="ml-auto flex items-center gap-2 tabular-nums">
                    {s.status === "scheduled" && <><span className="working h-1.5 w-1.5 rounded-full bg-seal" /><span className="text-ink-2">{fmt(s.scheduledAt)}</span>
                      <button className="text-[13px] text-link hover:underline" onClick={async () => { await api(`/api/sends/${s.id}`, { method: "PATCH", json: { cancel: true } }); await reload(); }}>Cancel</button></>}
                    {s.status === "sent" && <span className="seal-press inline-flex"><Badge tone="ok">{s.channel === "demo" ? "Recorded" : "Sent"}</Badge></span>}
                    {s.status === "failed" && <Badge tone="bad" title={s.error ?? ""}>Failed</Badge>}
                    {s.status === "skipped" && <Badge title={s.error ?? ""}>Not sent</Badge>}
                  </span>
                  {s.status === "failed" && <span className="w-full text-[13px] text-bad">{s.error}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!pending.length && !b.sends.length && <Notice>No drafts are selected. Go back to Review and toggle Send on the drafts you want.</Notice>}
      </div>

      <aside className="space-y-5">
        <div className="rounded-xl border border-rule bg-surface p-5">
          <h3 className="text-[15px] font-semibold">How these go out</h3>
          <ul className="mt-3 space-y-2 text-[14px] text-ink-2">
            <li>{live ? "From your Gmail, one message per recipient." : <><span className="font-semibold text-warn">Demo outbox.</span> Messages are recorded here but not delivered. Connect Gmail to send for real.</>}</li>
            <li>{live ? `Spaced 1 to 3 minutes apart, weekdays 8am to 6pm your time, up to ${b.dailyCap} a day and 10 an hour.` : "Spacing is shortened to a few seconds in demo mode."}</li>
            <li>Plain text, no tracking pixels, no rewritten links.</li>
            <li>Anyone who opted out or was already contacted is skipped.</li>
          </ul>
        </div>
        {b.org && (
          <div className="rounded-xl border border-rule bg-surface p-5">
            <h3 className="text-[15px] font-semibold">Footer on every email</h3>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] text-ink-2">{footerText(b.org, pending[0]?.p.name || "the company")}</pre>
          </div>
        )}
        {err && <Notice tone="bad">{err}</Notice>}
        {result && (
          <Notice tone={result.queued ? "ok" : "warn"}>
            {result.queued ? `${result.queued} email${result.queued === 1 ? "" : "s"} scheduled.` : "Nothing was scheduled."}
            {result.skipped.length > 0 && <span className="mt-1 block">Skipped: {result.skipped.join("; ")}</span>}
          </Notice>
        )}
        <Button variant="seal" className="w-full py-3 text-[15px]" busy={busy} disabled={!pending.length} onClick={queue}>
          Send {pending.length} selected
        </Button>
      </aside>
    </div>
  );
}
