"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { api } from "@/lib/client/api";

interface Admin {
  weeklyLimit: number;
  clubCap: number;
  clubUsed: number;
  members: { id: number; email: string; name: string | null; joinedAt: string | null; week: number; total: number; sent: number }[];
  log: { at: string; who: string; kind: string; credits: number; detail: Record<string, unknown> }[];
}

export default function BeacnAdmin() {
  const [d, setD] = useState<Admin | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setD(await api<Admin>("/api/beacn/admin"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load();
  }, [load]);

  if (err) return <Notice tone="bad">{err}</Notice>;
  if (!d) return <p className="text-ink-2">Loading…</p>;
  return (
    <div className="space-y-8">
      <div>
        <Link href="/beacn" className="text-[13px] font-semibold text-link hover:underline">Back to BEACN Outreach</Link>
        <PageTitle sub={`Each member can spend ${d.weeklyLimit} credits in any 7 days. The club has used ${d.clubUsed} of ${d.clubCap} this month.`}>Members and usage</PageTitle>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Members <span className="font-normal text-ink-3">· {d.members.length}</span></h2>
        <div className="overflow-x-auto rounded-xl border border-rule bg-surface">
          <table className="w-full text-[14px]">
            <thead className="text-left text-[12.5px] text-ink-3">
              <tr className="border-b border-rule">
                <th className="px-4 py-2 font-semibold">Member</th>
                <th className="px-4 py-2 font-semibold">Joined</th>
                <th className="px-4 py-2 text-right font-semibold">This week</th>
                <th className="px-4 py-2 text-right font-semibold">All time</th>
                <th className="px-4 py-2 text-right font-semibold">Emails sent</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {d.members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5"><span className="font-semibold">{m.name || m.email}</span>{m.name && <span className="block text-[12.5px] text-ink-3">{m.email}</span>}</td>
                  <td className="px-4 py-2.5 text-ink-2">{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.week >= d.weeklyLimit ? <Badge tone="warn">{m.week} (limit)</Badge> : m.week}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.total}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.sent}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="text-[13px] text-bad hover:underline"
                      onClick={async () => {
                        await api("/api/beacn/admin", { method: "PATCH", json: { userId: m.id } });
                        await load();
                      }}
                    >
                      Remove access
                    </button>
                  </td>
                </tr>
              ))}
              {!d.members.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-ink-2">Nobody has joined yet. Share the site and the club key with the committee.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold">Recent credit use</h2>
        <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface text-[13.5px]">
          {d.log.map((l, i) => (
            <li key={i} className="flex flex-wrap gap-x-3 px-4 py-2">
              <span className="w-40 shrink-0 text-ink-3">{new Date(l.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
              <span className="font-semibold">{l.who}</span>
              <span className="text-ink-2">{l.kind === "company_search" ? `searched "${String(l.detail.q ?? "")}"` : `looked up emails (${String(l.detail.found ?? 0)} found of ${String(l.detail.requested ?? 0)})`}</span>
              <span className="ml-auto tabular-nums">{l.credits} credit{l.credits === 1 ? "" : "s"}</span>
            </li>
          ))}
          {!d.log.length && <li className="px-4 py-6 text-ink-2">No credits spent yet.</li>}
        </ul>
      </section>
    </div>
  );
}
