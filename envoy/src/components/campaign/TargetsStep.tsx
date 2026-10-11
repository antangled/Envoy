"use client";
import { useState } from "react";
import { Badge, Button, Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import type { Bundle } from "./types";

export function TargetsStep({ b, reload, onResearch }: { b: Bundle; reload: () => Promise<void>; onResearch: () => void }) {
  const c = b.campaign;
  const spec = c.searchSpec;
  const [roles, setRoles] = useState<string[]>(c.rolesSelected);
  const [criteria, setCriteria] = useState(spec?.criteria ?? []);
  const [site, setSite] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = b.prospects.filter((p) => p.selected);
  const demoList = b.prospects.some((p) => p.source === "demo");

  const toggleProspect = async (id: number, selected: boolean) => {
    await api(`/api/campaigns/${c.id}`, { method: "PATCH", json: { prospects: [{ id, selected }] } });
    await reload();
  };
  const saveRoles = async (next: string[]) => {
    setRoles(next);
    await api(`/api/campaigns/${c.id}`, { method: "PATCH", json: { rolesSelected: next } });
  };
  const removeCriterion = async (id: string) => {
    const next = criteria.filter((x) => x.id !== id);
    setCriteria(next);
    await api(`/api/campaigns/${c.id}`, { method: "PATCH", json: { criteria: next } });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[22px] font-medium">Organizations</h2>
          <span className="text-[13px] text-ink-2 tabular-nums">{selected.length} selected of {b.prospects.length}</span>
        </div>
        {demoList && <div className="mb-4"><Notice tone="warn">Demo mode: these come from a built-in list of clean-energy companies, not a search of your goal. Add any company by website below. To search the web for your goal, add your Exa key in <code className="text-[13px]">envoy/.env.local</code>.</Notice></div>}
        {c.shortfall.length > 0 && <div className="mb-4"><Notice>{c.shortfall.join(" ")}</Notice></div>}
        <ul className="divide-y divide-rule rounded-xl border border-rule bg-surface">
          {b.prospects.map((p) => (
            <li key={p.id} className="flex items-start gap-3 px-4 py-3">
              <input id={`p${p.id}`} type="checkbox" checked={p.selected} onChange={(e) => toggleProspect(p.id, e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ink)]" />
              <label htmlFor={`p${p.id}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="font-semibold">{p.name}</span>{" "}
                <a href={p.website} target="_blank" rel="noreferrer" className="text-[13px] text-link hover:underline" onClick={(e) => e.stopPropagation()}>{p.domain}</a>
                {p.source === "manual" && <span className="ml-2"><Badge>Added by you</Badge></span>}
                {p.reason && p.source !== "demo" && p.source !== "manual" && (
                  <span className="mt-0.5 block text-[13px] text-ink-2">
                    {p.reason}
                    {p.reasonUrl && <> <a href={p.reasonUrl} target="_blank" rel="noreferrer" className="text-link hover:underline" onClick={(e) => e.stopPropagation()}>Source</a></>}
                  </span>
                )}
              </label>
            </li>
          ))}
          {!b.prospects.length && <li className="px-4 py-6 text-ink-2">No organizations yet. Add one by website below.</li>}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            try {
              await api(`/api/campaigns/${c.id}/prospects`, { method: "POST", json: { website: site } });
              setSite("");
              await reload();
            } catch (x) {
              setErr((x as Error).message);
            }
          }}
        >
          <label htmlFor="addsite" className="sr-only">Add a company by website</label>
          <input id="addsite" className="field max-w-[320px]" placeholder="Add a company by website, e.g. acme.com" value={site} onChange={(e) => setSite(e.target.value)} />
          <Button variant="quiet" type="submit" disabled={!site}>Add</Button>
        </form>
        {err && <p className="mt-2 text-[13px] text-bad">{err}</p>}
      </section>

      <aside className="space-y-8">
        <div>
          <h2 className="font-serif text-[20px] font-medium">Who to write to</h2>
          <p className="mb-3 mt-1 text-[13px] text-ink-2">Envoy looks for people with these titles first.</p>
          <div className="flex flex-wrap gap-2">
            {spec?.roles.map((r) => {
              const on = roles.includes(r.title);
              return (
                <button key={r.title} type="button" aria-pressed={on} onClick={() => saveRoles(on ? roles.filter((x) => x !== r.title) : [...roles, r.title])}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium ${on ? "border-ink bg-ink text-canvas" : "border-rule bg-surface text-ink-2 hover:text-ink"}`}>
                  {r.title}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="font-serif text-[20px] font-medium">What makes a good fit</h2>
          <p className="mb-3 mt-1 text-[13px] text-ink-2">Each brief checks every organization against these, with sources.</p>
          <ul className="space-y-2">
            {criteria.map((x) => (
              <li key={x.id} className="group flex items-start gap-2 text-[14px]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />
                <span className="flex-1">{x.text}</span>
                {criteria.length > 1 && (
                  <button type="button" onClick={() => removeCriterion(x.id)} aria-label={`Remove criterion: ${x.text}`} title="Remove"
                    className="-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded text-[16px] leading-none text-ink-3 opacity-0 hover:bg-sunken hover:text-bad focus:opacity-100 group-hover:opacity-100">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {c.specSource === "demo" && <p className="mt-3 text-[12px] text-ink-3">Demo mode: general criteria for this campaign type. With your Anthropic key added, they&rsquo;re written from your goal.</p>}
        </div>
        <div className="border-t border-rule pt-6">
          <Button
            className="w-full"
            busy={busy}
            disabled={!selected.length || !roles.length}
            onClick={() => {
              setBusy(true);
              onResearch();
            }}
          >
            Research {selected.length} organization{selected.length === 1 ? "" : "s"}
          </Button>
          <p className="mt-2 text-[12px] text-ink-3">Reads each company&rsquo;s site and recent news, writes a brief, finds a contact, and drafts an email. Nothing is sent.</p>
        </div>
      </aside>
    </div>
  );
}
