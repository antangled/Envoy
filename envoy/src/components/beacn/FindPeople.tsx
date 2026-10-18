"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Label, Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import { PRESETS, type PresetKey } from "@/lib/beacn/template";
import { displayName, type ListEntry, type Person, type Usage } from "./types";

interface Company {
  name: string;
  domain: string;
  apolloOrgId?: string | null;
  logoUrl?: string | null;
  linkedinUrl?: string | null;
}
interface Contacted {
  by: string;
  toEmail: string;
  at: string;
  status: string;
}

const looksLikeDomain = (s: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(s.trim().replace(/^https?:\/\//, "").replace(/^www\./, ""));

export function FindPeople({ list, setList, usage, onSpent, onGoSend }: { list: ListEntry[]; setList: (f: (l: ListEntry[]) => ListEntry[]) => void; usage: Usage | null; onSpent: () => void; onGoSend: () => void }) {
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<Company[]>([]);
  const [apollo, setApollo] = useState<{ q: string; results: Company[]; cached: boolean } | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [preset, setPreset] = useState<PresetKey>("decision");
  const [titles, setTitles] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [contacted, setContacted] = useState<Contacted[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);

  // Free: the club's own directory of companies anyone has already found.
  useEffect(() => {
    if (q.trim().length < 2 || company) return;
    const t = setTimeout(() => api<Company[]>(`/api/beacn/companies?q=${encodeURIComponent(q.trim())}`).then(setLocal).catch(() => setLocal([])), 250);
    return () => clearTimeout(t);
  }, [q, company]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const choose = (c: Company, fromWebsite = false) =>
    run("choose", async () => {
      const saved = await api<Company>("/api/beacn/companies", { method: "POST", json: fromWebsite ? { website: c.domain } : { company: { name: c.name, domain: c.domain, apolloOrgId: c.apolloOrgId ?? null, logoUrl: c.logoUrl ?? null, linkedinUrl: c.linkedinUrl ?? null } } });
      setCompany(saved);
      setPeople([]);
      setPicked(new Set());
      setContacted([]);
      setApollo(null);
    });

  const searchApollo = () =>
    run("apollo", async () => {
      const r = await api<{ results: Company[]; cached: boolean; credits: number }>("/api/beacn/companies/search", { method: "POST", json: { q: q.trim() } });
      setApollo({ q: q.trim(), results: r.results, cached: r.cached });
      if (r.credits) onSpent();
      if (!r.results.length) setMsg({ tone: "warn", text: `Apollo found no company named "${q.trim()}". Try a shorter name, or paste the website.` });
    });

  const findPeople = (p = 1) =>
    run("people", async () => {
      if (!company) return;
      const r = await api<{ total: number; page: number; people: Person[]; contacted: Contacted[] }>("/api/beacn/people", {
        method: "POST",
        json: { domain: company.domain, company: company.name, preset, titles: titles.split(",").map((t) => t.trim()).filter(Boolean), page: p },
      });
      setPeople((prev) => (p === 1 ? r.people : [...prev, ...r.people.filter((x) => !prev.some((y) => y.id === x.id))]));
      setTotal(r.total);
      setPage(p);
      setContacted(r.contacted);
      if (p === 1) setPicked(new Set());
      if (!r.people.length && p === 1) setMsg({ tone: "warn", text: "Nobody matched those roles. Try Decision-makers, or add more titles." });
    });

  const inList = useMemo(() => new Set(list.map((l) => l.id)), [list]);
  const chosen = people.filter((p) => picked.has(p.id));
  const toLookUp = chosen.filter((p) => !p.email && !p.lookedUp);
  const toAdd = chosen.filter((p) => p.email && !inList.has(p.id));

  const lookUp = () =>
    run("lookup", async () => {
      const r = await api<{ found: number; missing: number; credits: number; busy?: number }>("/api/beacn/lookup", { method: "POST", json: { ids: toLookUp.map((p) => p.id) } });
      onSpent();
      await findPeopleSilently();
      setMsg({
        tone: r.found ? "ok" : "warn",
        text: `Found ${r.found} email${r.found === 1 ? "" : "s"} for ${r.credits} credit${r.credits === 1 ? "" : "s"}.${r.missing ? ` ${r.missing} had no email on file (no charge).` : ""}${r.busy ? ` ${r.busy} were being looked up by someone else; refresh in a moment.` : ""}`,
      });
    });

  // Refresh the rows after a lookup without clearing the selection (the people search itself is free).
  const findPeopleSilently = async () => {
    if (!company) return;
    const pages = await Promise.all(
      Array.from({ length: page }, (_, i) =>
        api<{ people: Person[] }>("/api/beacn/people", { method: "POST", json: { domain: company.domain, company: company.name, preset, titles: titles.split(",").map((t) => t.trim()).filter(Boolean), page: i + 1 } }),
      ),
    );
    setPeople(pages.flatMap((p) => p.people));
  };

  const add = () => {
    setList((l) => [...l, ...toAdd.map((p) => ({ id: p.id, email: p.email!, firstName: p.firstName, lastName: p.lastName, title: p.title, company: p.company || company?.name || p.domain, domain: p.domain }))]);
    setMsg({ tone: "ok", text: `Added ${toAdd.length} to your send list.` });
    setPicked(new Set());
  };

  const toggle = (id: number, on: boolean) => setPicked((s) => {
    const n = new Set(s);
    if (on) n.add(id);
    else n.delete(id);
    return n;
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-rule bg-surface p-5">
        <h2 className="mb-3 text-[15px] font-semibold">1. Choose a company</h2>
        {company ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote logo from Apollo */}
            {company.logoUrl && <img src={company.logoUrl} alt="" className="h-8 w-8 rounded-md border border-rule object-contain" />}
            <div>
              <p className="font-semibold">{company.name}</p>
              <p className="text-[13px] text-ink-3">{company.domain}</p>
            </div>
            <Button variant="quiet" className="ml-auto" onClick={() => { setCompany(null); setPeople([]); setQ(""); }}>Change company</Button>
          </div>
        ) : (
          <div className="relative max-w-[520px]">
            <Label htmlFor="company" hint="Type a company name, or paste its website.">Company</Label>
            <input id="company" className="field" value={q} onChange={(e) => { setQ(e.target.value); setApollo(null); }} placeholder="e.g. Tesla or tesla.com" autoComplete="off" />
            {q.trim().length >= 2 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-rule bg-surface">
                {looksLikeDomain(q) && (
                  <button className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[14px] hover:bg-sunken" onClick={() => choose({ name: q.trim(), domain: q.trim() }, true)}>
                    <span>Use the website <span className="font-semibold">{q.trim().replace(/^https?:\/\//, "")}</span></span>
                    <Badge tone="ok">Free</Badge>
                  </button>
                )}
                {local.length > 0 && <p className="border-t border-rule px-3 pt-2 text-[12px] font-semibold text-ink-3 first:border-t-0">Already in BEACN&rsquo;s directory (free)</p>}
                {local.map((c) => (
                  <button key={c.domain} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[14px] hover:bg-sunken" onClick={() => choose(c)}>
                    <span><span className="font-semibold">{c.name}</span> <span className="text-ink-3">{c.domain}</span></span>
                  </button>
                ))}
                {apollo?.q === q.trim() ? (
                  <>
                    <p className="border-t border-rule px-3 pt-2 text-[12px] font-semibold text-ink-3">From Apollo{apollo.cached ? " (already searched, free)" : ""}</p>
                    {apollo.results.map((c) => (
                      <button key={c.domain} className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] hover:bg-sunken" onClick={() => choose(c)}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote logo from Apollo */}
                        {c.logoUrl ? <img src={c.logoUrl} alt="" className="h-6 w-6 rounded border border-rule object-contain" /> : <span className="h-6 w-6 rounded border border-rule bg-sunken" />}
                        <span><span className="font-semibold">{c.name}</span> <span className="text-ink-3">{c.domain}</span></span>
                      </button>
                    ))}
                  </>
                ) : (
                  <button className="flex w-full items-center justify-between gap-3 border-t border-rule px-3 py-2 text-left text-[14px] hover:bg-sunken disabled:opacity-50 first:border-t-0" disabled={busy === "apollo" || !usage?.apollo} onClick={searchApollo}>
                    <span>{busy === "apollo" ? "Searching Apollo…" : <>Search Apollo for &ldquo;{q.trim()}&rdquo;</>}</span>
                    <Badge tone="warn">1 credit</Badge>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {company && (
        <section className="rounded-xl border border-rule bg-surface p-5">
          <h2 className="mb-3 text-[15px] font-semibold">2. Who to find</h2>
          <div role="radiogroup" aria-label="Roles" className="flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
              <button key={k} role="radio" aria-checked={preset === k} onClick={() => setPreset(k)} className={`rounded-full border px-3 py-1 text-[13px] font-medium ${preset === k ? "border-ink bg-ink text-canvas" : "border-rule text-ink-2 hover:text-ink"}`}>
                {PRESETS[k].label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 max-w-[520px]">
              <Label htmlFor="titles" hint="Separate titles with commas. Similar titles are included.">Job titles</Label>
              <input id="titles" className="field" value={titles} onChange={(e) => setTitles(e.target.value)} placeholder="e.g. Head of Sustainability, VP Operations" />
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => findPeople(1)} busy={busy === "people"} disabled={!usage?.apollo}>Find people</Button>
            <span className="text-[13px] text-ink-2">Free. No credits used.</span>
          </div>
          {contacted.length > 0 && (
            <div className="mt-4">
              <Notice tone="warn">
                {company.name} was already emailed by {[...new Set(contacted.map((c) => c.by))].join(", ")} ({contacted.length} email{contacted.length === 1 ? "" : "s"}, most recently {new Date(contacted[0].at).toLocaleDateString()}). Check with them before reaching out.
              </Notice>
            </div>
          )}
        </section>
      )}

      {people.length > 0 && (
        <section className="rounded-xl border border-rule bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-3">
            <h2 className="text-[15px] font-semibold">3. Pick people <span className="font-normal text-ink-3">· {people.length} of {total} shown</span></h2>
            <button className="text-[13px] font-semibold text-link hover:underline" onClick={() => setPicked(picked.size === people.length ? new Set() : new Set(people.map((p) => p.id)))}>
              {picked.size === people.length ? "Clear all" : "Select all"}
            </button>
          </div>
          <ul className="divide-y divide-rule">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[14px]">
                <input type="checkbox" aria-label={`Select ${displayName(p)}`} checked={picked.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} className="h-4 w-4 accent-[var(--seal)]" />
                <span className="font-semibold">{displayName(p)}</span>
                <span className="text-ink-2">{p.title}</span>
                <span className="ml-auto flex items-center gap-2 text-[13px]">
                  {p.email ? (
                    <>
                      <span>{p.email}</span>
                      <Badge tone={p.emailStatus === "verified" ? "ok" : "warn"}>{p.emailStatus === "verified" ? "Verified" : p.emailStatus ? p.emailStatus.replace(/_/g, " ") : "Found"}</Badge>
                    </>
                  ) : p.lookedUp ? (
                    <Badge tone="muted">No email on file</Badge>
                  ) : (
                    <Badge tone="muted">{p.apolloHasEmail ? "Email available" : "Email unlikely"}</Badge>
                  )}
                  {inList.has(p.id) && <Badge tone="carbon">On send list</Badge>}
                  {p.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="text-link hover:underline">LinkedIn</a>}
                </span>
              </li>
            ))}
          </ul>
          {people.length < total && (
            <div className="border-t border-rule px-5 py-3">
              <Button variant="quiet" onClick={() => findPeople(page + 1)} busy={busy === "people"}>Show more people (free)</Button>
            </div>
          )}
        </section>
      )}

      {(people.length > 0 || msg) && (
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-rule bg-canvas/95 px-5 py-4 backdrop-blur">
          {people.length > 0 && (
            <>
              <Button variant="seal" onClick={lookUp} busy={busy === "lookup"} disabled={!toLookUp.length}>
                {toLookUp.length ? `Look up ${toLookUp.length} email${toLookUp.length === 1 ? "" : "s"} · up to ${toLookUp.length} credit${toLookUp.length === 1 ? "" : "s"}` : "Look up emails"}
              </Button>
              <Button variant="quiet" onClick={add} disabled={!toAdd.length}>{toAdd.length ? `Add ${toAdd.length} to send list` : "Add to send list"}</Button>
              {list.length > 0 && <button className="text-[13px] font-semibold text-link hover:underline" onClick={onGoSend}>Go to send list ({list.length})</button>}
            </>
          )}
          <span role="status" className={`text-[13px] ${msg?.tone === "bad" ? "text-bad" : msg?.tone === "warn" ? "text-warn" : msg ? "text-ok" : "text-ink-2"}`}>
            {msg ? msg.text : picked.size ? "Credits are only used for emails that are found." : "Tick people to look up their emails or add them to your send list."}
          </span>
        </div>
      )}
    </div>
  );
}
