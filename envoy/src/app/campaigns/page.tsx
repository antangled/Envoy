"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, LinkButton, Notice, PageTitle } from "@/components/ui";
import { useStatus } from "@/components/status";
import { api } from "@/lib/client/api";

interface Row { id: number; mode: string; goalText: string; status: string; createdAt: string; prospects: number; drafted: number; sent: number }
const STATUS: Record<string, string> = { spec: "Choosing targets", targets: "Choosing targets", researching: "Researching", review: "Ready to review", sending: "Sending", paused: "Paused" };

export default function Campaigns() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const { status } = useStatus();
  const router = useRouter();
  useEffect(() => {
    api<Row[]>("/api/campaigns").then(setRows).catch(() => router.replace("/"));
  }, [router]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle sub="Each campaign is one goal: who you want to reach and why.">Campaigns</PageTitle>
        <LinkButton href={status?.profileComplete ? "/campaigns/new" : "/setup"}>New campaign</LinkButton>
      </div>
      {status && !status.profileComplete && (
        <div className="mb-6"><Notice tone="warn">Finish <Link className="font-semibold underline" href="/setup">Setup</Link> first. Envoy needs your organization, your role, and your services to write the fixed parts of each email.</Notice></div>
      )}
      {rows && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-rule px-6 py-14 text-center">
          <p className="font-serif text-[22px]">No campaigns yet.</p>
          <p className="mt-2 text-ink-2">Start one by describing who you want to reach, in a sentence or two.</p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/campaigns/${r.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-sunken sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{r.goalText}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {r.mode === "partnership" ? "Partnership" : "Client outreach"} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[13px] text-ink-2 tabular-nums">
                  <span>{r.prospects} organizations</span>
                  <span>{r.drafted} drafted</span>
                  <span>{r.sent} sent</span>
                  <Badge tone={r.status === "review" ? "carbon" : r.status === "paused" ? "bad" : "muted"}>{STATUS[r.status] ?? r.status}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
