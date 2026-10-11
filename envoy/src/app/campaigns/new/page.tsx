"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Label, Notice, PageTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useStatus } from "@/components/status";
import { FindingProgress } from "@/components/FindingProgress";

const EXAMPLES = {
  client: "We want three fall consulting projects with growth-stage clean-energy hardware companies in the Bay Area that are scaling manufacturing or launching a new product line.",
  partnership: "We're an AI scheduling tool for dental clinics. Find practice-management software companies and dental supply distributors that could bundle or resell us.",
};

export default function NewCampaign() {
  const router = useRouter();
  const [mode, setMode] = useState<"client" | "partnership">("client");
  const [goal, setGoal] = useState("");
  const [count, setCount] = useState(10);
  const [people, setPeople] = useState(10);
  const [phase, setPhase] = useState<"goal" | "search" | null>(null);
  const [attach, setAttach] = useState(true);
  const [geo, setGeo] = useState("");
  const [size, setSize] = useState("");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasDeck, setHasDeck] = useState<boolean | null>(null);
  const { status } = useStatus();
  const liveSearch = !!status?.integrations.exa;
  useEffect(() => {
    api<{ profile: { hasDeck?: boolean; deckUrl?: string } | null }>("/api/setup")
      .then((d) => setHasDeck(!!d.profile?.hasDeck))
      .catch(() => setHasDeck(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setPhase("goal");
    try {
      const { id } = await api<{ id: number }>("/api/campaigns", { method: "POST", json: { mode, goalText: goal, contactCount: count, peoplePerCompany: people, attachDeck: attach && hasDeck !== false, advanced: { geography: geo, sizeHint: size, extraCriteria: extra } } });
      setPhase("search");
      await api(`/api/campaigns/${id}/discover`, { method: "POST" });
      router.push(`/campaigns/${id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      setPhase(null);
    }
  }

  if (phase) return <FindingProgress phase={phase} live={liveSearch} />;

  return (
    <form onSubmit={submit} className="max-w-[720px]">
      <PageTitle sub="Say who you want to reach and what you're offering. Envoy turns it into criteria and roles you can adjust before any research runs.">New campaign</PageTitle>

      <fieldset>
        <legend className="mb-2 text-[14px] font-semibold">What are you doing?</legend>
        <div className="inline-flex rounded-lg border border-rule bg-surface p-1" role="radiogroup">
          {(["client", "partnership"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
              className={`rounded-md px-4 py-1.5 text-[14px] font-semibold ${mode === m ? "bg-ink text-canvas" : "text-ink-2 hover:text-ink"}`}>
              {m === "client" ? "Pitching a client" : "Proposing a partnership"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        <Label htmlFor="goal" hint="Two to four sentences. Mention the kind of organization, where, and what makes one a good fit.">Goal</Label>
        <textarea id="goal" rows={5} className="field resize-y" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={EXAMPLES[mode]} required minLength={10} />
        <button type="button" className="mt-1 text-[13px] text-link hover:underline" onClick={() => setGoal(EXAMPLES[mode])}>Use this example</button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Inputs sit on a shared baseline even when one hint wraps to two lines. */}
        <div className="flex flex-col">
          <Label htmlFor="count" hint="Fewer if there aren't enough good fits.">How many organizations</Label>
          <input id="count" type="number" min={1} max={50} className="field mt-auto max-w-[120px]" value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div className="flex flex-col">
          <Label htmlFor="people" hint="Emails are looked up only for people you pick.">People per company</Label>
          <input id="people" type="number" min={1} max={20} className="field mt-auto max-w-[120px]" value={people} onChange={(e) => setPeople(Number(e.target.value))} />
        </div>
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold">Your deck</span>
          {hasDeck === false ? (
            <p className="text-[14px] text-ink-2">No deck uploaded yet. <Link href="/setup" className="text-link hover:underline">Add one in Setup</Link> to attach it.</p>
          ) : (
            <label className="flex items-center gap-2 text-[14px] text-ink-2">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
              Attach it to each email
            </label>
          )}
        </div>
      </div>

      <details className="mt-6 rounded-lg border border-rule bg-surface px-4 py-3">
        <summary className="cursor-pointer text-[14px] font-semibold">More criteria</summary>
        <div className="mt-4 grid gap-4">
          <div><Label htmlFor="geo">Geography</Label><input id="geo" className="field" value={geo} onChange={(e) => setGeo(e.target.value)} placeholder="e.g. San Francisco Bay Area" /></div>
          <div><Label htmlFor="size">Company size</Label><input id="size" className="field" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 20 to 500 employees" /></div>
          <div><Label htmlFor="extra">Must also</Label><input id="extra" className="field" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. have raised a Series A or later" /></div>
        </div>
      </details>

      {err && <div className="mt-6"><Notice tone="bad">{err}</Notice></div>}
      <div className="mt-8 flex items-center gap-3">
        <Button type="submit" busy={busy}>{busy ? "Finding organizations" : "Find organizations"}</Button>
        <span className="text-[13px] text-ink-3">{busy && liveSearch ? "Searching the web. This usually takes under a minute." : "Nothing is sent until you choose."}</span>
      </div>
    </form>
  );
}
