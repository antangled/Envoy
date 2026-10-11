"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { Bundle } from "@/components/campaign/types";
import { TargetsStep } from "@/components/campaign/TargetsStep";
import { ReviewStep, type ProgressMap } from "@/components/campaign/ReviewStep";
import { SendStep } from "@/components/campaign/SendStep";

type Step = "targets" | "review" | "send";
const STEPS: { key: Step; label: string }[] = [
  { key: "targets", label: "Choose organizations" },
  { key: "review", label: "Review briefs and drafts" },
  { key: "send", label: "Send" },
];

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [b, setB] = useState<Bundle | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    const data = await api<Bundle>(`/api/campaigns/${id}`);
    setB(data);
    setStep((s) => s ?? (data.sends.length ? "send" : data.drafts.length ? "review" : "targets"));
  }, [id]);

  useEffect(() => {
    let alive = true;
    api<Bundle>(`/api/campaigns/${id}`)
      .then((data) => {
        if (!alive) return;
        setB(data);
        setStep((s) => s ?? (data.sends.length ? "send" : data.drafts.length ? "review" : "targets"));
      })
      .catch((e) => (e.status === 401 ? router.replace("/") : setErr(e.message)));
    return () => {
      alive = false;
    };
  }, [id, router]);

  const research = useCallback(async () => {
    setStep("review");
    window.scrollTo({ top: 0 });
    setRunning(true);
    setErr(null);
    try {
      const res = await fetch(`/api/campaigns/${id}/research`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error || "Research failed to start.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.prospectId) setProgress((m) => ({ ...m, [ev.prospectId]: { stage: ev.stage, detail: ev.detail } }));
          if (ev.stage === "done" || ev.stage === "skipped" || ev.stage === "error") {
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
            reloadTimer.current = setTimeout(() => reload(), 250);
          }
        }
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setRunning(false);
      await reload();
    }
  }, [id, reload]);

  if (err && !b) return <Notice tone="bad">{err}</Notice>;
  if (!b || !step) return <p className="text-ink-2">Loading…</p>;
  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const maxIdx = b.sends.length ? 2 : b.drafts.length || running ? 1 : 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-[13px] text-ink-2">{b.campaign.mode === "partnership" ? "Partnership" : "Client outreach"}</p>
        <h1 className="mt-1 max-w-[70ch] font-serif text-[20px] font-medium leading-snug sm:text-[26px]">{b.campaign.goalText}</h1>
        <Spend u={b.campaign.usage} companies={b.briefs.length} />
      </div>
      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Campaign steps">
        {STEPS.map((s, i) => {
          const reachable = i <= Math.max(maxIdx, stepIdx);
          const current = s.key === step;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                onClick={() => { setStep(s.key); window.scrollTo({ top: 0 }); }}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-medium disabled:opacity-40 ${current ? "border-ink bg-ink text-paper" : "border-rule bg-surface text-ink-2 hover:text-ink"}`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[12px] tabular-nums ${current ? "bg-paper text-ink" : "bg-sunken text-ink-2"}`}>{i + 1}</span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      {err && <div className="mb-5"><Notice tone="bad">{err}</Notice></div>}
      {step === "targets" && <TargetsStep b={b} reload={reload} onResearch={research} />}
      {step === "review" && <ReviewStep b={b} reload={reload} progress={progress} running={running} onContinue={() => { setStep("send"); window.scrollTo({ top: 0 }); }} />}
      {step === "send" && <SendStep b={b} reload={reload} />}
    </div>
  );
}

/** What this campaign has cost so far, so spend is never a surprise. */
function Spend({ u, companies }: { u: { claudeUsd: number; exaUsd: number; hunterLookups: number; sonnetBriefs: number } | undefined; companies: number }) {
  if (!u) return null;
  const total = (u.claudeUsd ?? 0) + (u.exaUsd ?? 0);
  if (!total && !u.hunterLookups) return null;
  const money = (n: number) => (n < 0.01 ? "under $0.01" : `$${n.toFixed(2)}`);
  return (
    <p className="mt-2 text-[13px] text-ink-2 tabular-nums" title="List prices. Hunter lookups come out of your Hunter plan's monthly allowance.">
      Spent so far: <span className="font-semibold text-ink">{money(total)}</span>
      {" "}(AI writing {money(u.claudeUsd ?? 0)}, company and people search {money(u.exaUsd ?? 0)})
      {" · "}{u.hunterLookups ?? 0} email lookup{u.hunterLookups === 1 ? "" : "s"}
      {companies > 0 && total > 0 && <> · about {money(total / companies)} per company</>}
    </p>
  );
}
