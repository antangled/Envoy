"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStatus } from "@/components/status";
import { Badge, Button, Label, Notice, PageTitle } from "@/components/ui";
import { api } from "@/lib/client/api";
import { FindPeople } from "@/components/beacn/FindPeople";
import { Compose } from "@/components/beacn/Compose";
import { Outbox } from "@/components/beacn/Outbox";
import { useSendList, type Usage } from "@/components/beacn/types";

type Tab = "find" | "send" | "outbox";

export default function BeacnPage() {
  const { status } = useStatus();
  if (!status) return <p className="text-ink-2">Loading…</p>;
  if (!status.user) return <SignInCard />;
  if (status.user.isDemo) return <ExitDemoCard />;
  if (!status.user.beacnMember) return <JoinCard email={status.user.email} />;
  return <Workspace admin={status.user.isAdmin} email={status.user.email} />;
}

function Intro() {
  return (
    <PageTitle sub="Find the right people at a company with BEACN's Apollo account, then send your own email from your Gmail, now or at a time you choose.">
      BEACN Outreach
    </PageTitle>
  );
}

function SignInCard() {
  return (
    <div className="max-w-[560px]">
      <Intro />
      <div className="rounded-xl border border-rule bg-surface p-6">
        <p className="text-[15px]">Sign in with your <span className="font-semibold">@berkeley.edu</span> Google account. Envoy only asks for permission to send email; it can&rsquo;t read your inbox.</p>
        <a href="/api/auth/google?next=/beacn" className="mt-4 inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[14px] font-semibold text-canvas hover:bg-ink/88">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function ExitDemoCard() {
  const { refresh } = useStatus();
  return (
    <div className="max-w-[560px]">
      <Intro />
      <Notice>
        You&rsquo;re in the Envoy demo. BEACN Outreach needs your own Berkeley Google account.{" "}
        <button
          className="font-semibold text-link hover:underline"
          onClick={async () => {
            await api("/api/auth/logout", { method: "POST" });
            await refresh();
          }}
        >
          Exit the demo
        </button>
      </Notice>
    </div>
  );
}

function JoinCard({ email }: { email: string }) {
  const { refresh } = useStatus();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const berkeley = /@berkeley\.edu$/i.test(email);
  return (
    <div className="max-w-[560px]">
      <Intro />
      <form
        className="rounded-xl border border-rule bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            await api("/api/beacn/join", { method: "POST", json: { key } });
            await refresh();
          } catch (e2) {
            setErr((e2 as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="mb-4 text-[14px] text-ink-2">
          Signed in as <span className="font-semibold text-ink">{email}</span>.
        </p>
        {!berkeley && <div className="mb-4"><Notice tone="warn">BEACN Outreach is for @berkeley.edu accounts. Sign out and sign in with your Berkeley Google account.</Notice></div>}
        <Label htmlFor="key" hint="Your BEACN client lead has it. You only enter it once.">BEACN club key</Label>
        <input id="key" type="password" autoComplete="off" className="field max-w-[320px]" value={key} onChange={(e) => setKey(e.target.value)} />
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" busy={busy} disabled={!key.trim()}>Unlock</Button>
          {err && <span role="status" className="text-[13px] text-bad">{err}</span>}
        </div>
      </form>
    </div>
  );
}

function Workspace({ admin, email }: { admin: boolean; email: string }) {
  const [tab, setTab] = useState<Tab>("find");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [list, setList] = useSendList();
  const loadUsage = useCallback(async () => setUsage(await api<Usage>("/api/beacn/usage")), []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadUsage().catch(() => {});
  }, [loadUsage]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "find", label: "Find people" },
    { key: "send", label: `Write & send${list.length ? ` (${list.length})` : ""}` },
    { key: "outbox", label: "Outbox" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <Intro />
        <div className="flex flex-col items-end gap-2 text-[13px]">
          {usage && (
            <span className="rounded-full border border-rule bg-surface px-3 py-1 tabular-nums text-ink-2" title={`The club has used ${usage.usedClub} of ${usage.clubCap} Apollo credits this month.`}>
              {usage.weekLimit === null ? `${usage.usedWeek} credits used this week (admin)` : `${usage.leftWeek} of ${usage.weekLimit} credits left this week`}
            </span>
          )}
          {admin && <Link href="/beacn/admin" className="font-semibold text-link hover:underline">Admin: members and usage</Link>}
        </div>
      </div>
      {usage && !usage.apollo && <div className="mb-4"><Notice tone="warn">Apollo isn&rsquo;t connected yet, so searches are off. An admin needs to add the club&rsquo;s Apollo API key.</Notice></div>}

      <div role="tablist" aria-label="BEACN Outreach" className="mb-6 flex flex-wrap gap-1 rounded-lg border border-rule bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${tab === t.key ? "bg-ink text-canvas" : "text-ink-2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "find" && <FindPeople list={list} setList={setList} usage={usage} onSpent={loadUsage} onGoSend={() => setTab("send")} />}
      {tab === "send" && <Compose list={list} setList={setList} usage={usage} email={email} onSent={() => setTab("outbox")} onFind={() => setTab("find")} />}
      {tab === "outbox" && <Outbox scheduler={!!usage?.scheduler} />}
      <p className="mt-10 text-[12.5px] text-ink-3">
        <Badge tone="muted">Credits</Badge> Searching people is free. Searching Apollo for a company by name costs 1 credit (repeat searches are free), and each email found costs 1 credit. Anyone the club has already looked up is free for everyone.
      </p>
    </div>
  );
}
