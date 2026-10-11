"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, PageTitle } from "@/components/ui";
import { api } from "@/lib/client/api";

interface Row { id: number; campaignId: number; toEmail: string; toName: string | null; orgName: string; subject: string; scheduledAt: string; sentAt: string | null; status: string; channel: string; error: string | null; replied: boolean; optedOut: boolean; gmailMessageId: string | null }

export default function History() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const router = useRouter();
  const load = useCallback(() => api<Row[]>("/api/history").then(setRows), []);
  useEffect(() => { load().catch(() => router.replace("/")); }, [load, router]);
  const patch = async (id: number, json: Record<string, boolean>) => { await api(`/api/sends/${id}`, { method: "PATCH", json }); await load(); };
  const sent = rows?.filter((r) => r.status === "sent") ?? [];

  return (
    <div>
      <PageTitle sub="Everything Envoy has sent or scheduled for you. Envoy can't read your inbox, so mark replies and opt-outs here.">Sent</PageTitle>
      {rows && (
        <p className="mb-4 text-[14px] text-ink-2 tabular-nums">
          {sent.length} sent · {sent.filter((r) => r.replied).length} replied · {rows.filter((r) => r.status === "scheduled").length} scheduled
        </p>
      )}
      {rows?.length === 0 && (
        <div className="rounded-xl border border-dashed border-rule px-6 py-14 text-center">
          <p className="font-serif text-[22px]">Nothing sent yet.</p>
          <p className="mt-2 text-ink-2">Messages appear here once you send them from a campaign.</p>
        </div>
      )}
      {!!rows?.length && (
        <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface sm:hidden">
          {rows.map((r) => (
            <li key={r.id} className="space-y-1.5 px-4 py-3 text-[14px]">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/campaigns/${r.campaignId}`} className="font-semibold hover:underline">{r.orgName}</Link>
                <StatusBadges r={r} />
              </div>
              <p className="break-all text-ink-2">{r.toEmail}</p>
              <p className="truncate text-[13px] text-ink-3">{r.subject}</p>
              <p className="text-[13px] text-ink-3">{new Date(r.sentAt ?? r.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              {r.status === "sent" && (
                <div className="flex gap-4 pt-1 text-[13px]">
                  <button className="text-link hover:underline" onClick={() => patch(r.id, { replied: !r.replied })}>{r.replied ? "Unmark reply" : "Mark replied"}</button>
                  <button className="text-link hover:underline" onClick={() => patch(r.id, { optedOut: !r.optedOut })}>{r.optedOut ? "Undo opt-out" : "Mark opted out"}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!!rows?.length && (
        <div className="hidden overflow-x-auto rounded-xl border border-rule bg-surface sm:block">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-b border-rule text-[13px] text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Organization</th>
                <th className="px-4 py-2.5 font-semibold">To</th>
                <th className="px-4 py-2.5 font-semibold">Subject</th>
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold"><Link href={`/campaigns/${r.campaignId}`} className="hover:underline">{r.orgName}</Link></td>
                  <td className="px-4 py-3 text-ink-2">{r.toName && <span className="block text-ink">{r.toName}</span>}{r.toEmail}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-ink-2" title={r.subject}>{r.subject}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">{new Date(r.sentAt ?? r.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="px-4 py-3"><StatusBadges r={r} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-[13px]">
                    {r.status === "sent" && (
                      <span className="flex flex-col items-end gap-1">
                        <button className="text-link hover:underline" onClick={() => patch(r.id, { replied: !r.replied })}>{r.replied ? "Unmark reply" : "Mark replied"}</button>
                        <button className="text-link hover:underline" onClick={() => patch(r.id, { optedOut: !r.optedOut })}>{r.optedOut ? "Undo opt-out" : "Mark opted out"}</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadges({ r }: { r: Row }) {
  return (
    <span className="flex flex-wrap justify-end gap-1 sm:justify-start">
      {r.status === "sent" && <Badge tone="ok">{r.channel === "demo" ? "Recorded (demo)" : "Sent"}</Badge>}
      {r.status === "scheduled" && <Badge>Scheduled</Badge>}
      {r.status === "failed" && <Badge tone="bad" title={r.error ?? ""}>Failed</Badge>}
      {r.status === "skipped" && <Badge title={r.error ?? ""}>Not sent</Badge>}
      {r.replied && <Badge tone="carbon">Replied</Badge>}
      {r.optedOut && <Badge tone="warn">Opted out</Badge>}
    </span>
  );
}
