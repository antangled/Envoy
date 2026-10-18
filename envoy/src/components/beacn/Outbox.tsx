"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge, Notice } from "@/components/ui";
import { api } from "@/lib/client/api";

interface SendRow {
  id: number;
  toEmail: string;
  toName: string | null;
  company: string;
  subject: string;
  preview: string;
  scheduledAt: string;
  sentAt: string | null;
  status: "scheduled" | "sending" | "sent" | "failed" | "cancelled";
  error: string | null;
}

const fmt = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export function Outbox({ scheduler }: { scheduler: boolean }) {
  const [rows, setRows] = useState<SendRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setRows(await api<SendRow[]>("/api/beacn/sends"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  const pending = rows?.some((r) => r.status === "scheduled" || r.status === "sending");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);
  // While anything is waiting, refresh; without QStash, this open page also delivers due emails.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(async () => {
      if (!scheduler) await api("/api/beacn/deliver-mine", { method: "POST" }).catch(() => {});
      await load();
    }, 15_000);
    return () => clearInterval(t);
  }, [pending, scheduler, load]);

  if (err) return <Notice tone="bad">{err}</Notice>;
  if (!rows) return <p className="text-ink-2">Loading…</p>;
  if (!rows.length) return <p className="text-[14px] text-ink-2">Nothing sent yet. Emails you send or schedule appear here.</p>;

  return (
    <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 py-3 text-[14px]">
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-semibold">{r.toName || r.toEmail}</span> <span className="text-ink-2">at {r.company}</span>
            </p>
            <p className="break-all text-[13px] text-ink-3">{r.toEmail} · {r.subject}</p>
            {r.status === "failed" && r.error && <p className="mt-1 text-[13px] text-bad">{r.error}</p>}
          </div>
          <span className="flex shrink-0 items-center gap-2 text-[13px]">
            {r.status === "sent" && <><span className="text-ink-2">{fmt(r.sentAt ?? r.scheduledAt)}</span><Badge tone="ok">Sent</Badge></>}
            {r.status === "scheduled" && (
              <>
                <span className="text-ink-2">{fmt(r.scheduledAt)}</span>
                <Badge tone="carbon">Scheduled</Badge>
                <button
                  className="text-link hover:underline"
                  onClick={async () => {
                    try {
                      await api(`/api/beacn/sends/${r.id}`, { method: "PATCH" });
                    } catch (e) {
                      setErr((e as Error).message);
                    }
                    await load();
                  }}
                >
                  Cancel
                </button>
              </>
            )}
            {r.status === "sending" && <Badge tone="muted">Sending…</Badge>}
            {r.status === "failed" && <Badge tone="bad">Failed</Badge>}
            {r.status === "cancelled" && <Badge tone="muted">Cancelled</Badge>}
          </span>
        </li>
      ))}
    </ul>
  );
}
