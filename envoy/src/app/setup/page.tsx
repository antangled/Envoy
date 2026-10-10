"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStatus } from "@/components/status";
import { Badge, Button, Label, Notice, PageTitle } from "@/components/ui";
import { api, fileToBase64 } from "@/lib/client/api";

interface Profile {
  orgName: string; tagline: string; oneLiner: string; whatWeDo: string; proofPoints: string[]; serviceCatalog: string[];
  teamStructure: string; website: string; deckUrl: string; postalAddress: string; meName: string; meFirstName: string;
  meRole: string; mePronouns: string; extractedFrom?: string; hasDeck?: boolean; deckName?: string | null;
}
const EMPTY: Profile = { orgName: "", tagline: "", oneLiner: "", whatWeDo: "", proofPoints: [], serviceCatalog: [], teamStructure: "", website: "", deckUrl: "", postalAddress: "", meName: "", meFirstName: "", meRole: "", mePronouns: "" };

/** Taken from the founder's real outreach email (BEACN → Lightship, Sept 2026). Postal address is left for the user. */
const SAMPLE: Partial<Profile> = {
  orgName: "BEACN",
  tagline: "Student-run consulting for environmentally and socially responsible organizations.",
  oneLiner: "a student-run sustainability consulting group at UC Berkeley",
  whatWeDo: "Semester-long consulting projects for environmentally and socially responsible organizations.",
  proofPoints: ["180+ projects for 150+ organizations"],
  serviceCatalog: ["market sizing", "competitive landscaping", "regulatory research", "supply-chain analysis", "data collection"],
  teamStructure: "BEACN projects are staffed by seven Berkeley students plus an MBA mentor from Haas",
  meName: "Adam Tang",
  meFirstName: "Adam",
  meRole: "Project Manager",
  mePronouns: "he/him/his",
  extractedFrom: "sample",
};

const lines = (s: string) => s.split("\n");

export default function SetupPage() {
  const { status, refresh } = useStatus();
  const router = useRouter();
  const [p, setP] = useState<Profile>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [deck, setDeck] = useState<{ name: string; base64: string } | null>(null);
  const [removeDeck, setRemoveDeck] = useState(false);
  const [exclusions, setExclusions] = useState<{ value: string; source: string }[]>([]);
  const [exclText, setExclText] = useState("");
  const [cap, setCap] = useState(30);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);

  useEffect(() => {
    api<{ profile: Profile | null; exclusions: { value: string; source: string }[]; dailyCap: number }>("/api/setup")
      .then((d) => {
        if (d.profile) setP({ ...EMPTY, ...d.profile });
        setExclusions(d.exclusions);
        setCap(d.dailyCap);
        setLoaded(true);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const missing = useMemo(() => {
    const m: string[] = [];
    if (!p.orgName) m.push("organization name");
    if (!p.meName) m.push("your name");
    if (!p.meRole) m.push("your role");
    if (!p.serviceCatalog.filter(Boolean).length) m.push("at least one service");
    return m;
  }, [p]);

  async function extract() {
    setExtracting(true);
    setMsg(null);
    try {
      const r = await api<{ profile: Record<string, unknown>; source: string }>("/api/setup/extract", { method: "POST", json: { deckB64: deck?.base64 ?? null, website: p.website || null } });
      const x = r.profile as Record<string, string & string[]>;
      setP((cur) => ({
        ...cur,
        orgName: x.org_name || cur.orgName,
        tagline: x.tagline || cur.tagline,
        oneLiner: x.one_liner || cur.oneLiner,
        whatWeDo: x.what_we_do || cur.whatWeDo,
        proofPoints: x.proof_points?.length ? x.proof_points : cur.proofPoints,
        serviceCatalog: x.service_catalog?.length ? x.service_catalog : cur.serviceCatalog,
        teamStructure: x.team_structure || cur.teamStructure,
        extractedFrom: r.source,
      }));
      setMsg({ tone: "ok", text: "Read your material. Check each field below; whatever you save here is used word for word in every email." });
    } catch (e) {
      setMsg({ tone: "warn", text: (e as Error).message });
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/setup", { method: "PUT", json: { ...p, hasDeck: undefined, deckName: undefined, deck, removeDeck, exclusionsText: exclText, dailyCap: cap } });
      const d = await api<{ profile: Profile; exclusions: { value: string; source: string }[] }>("/api/setup");
      setP({ ...EMPTY, ...d.profile });
      setExclusions(d.exclusions);
      setExclText("");
      setDeck(null);
      setRemoveDeck(false);
      await refresh();
      setMsg({ tone: "ok", text: "Saved." });
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const i = status?.integrations;
  if (!loaded) return <p className="text-ink-2">Loading…</p>;

  return (
    <div className="max-w-[760px]">
      <PageTitle sub="Set this up once. Envoy uses it to write the fixed parts of every email and to decide what to research.">Setup</PageTitle>

      <Section id="connections" title="Connections">
        <div className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          <Conn name="Gmail" on={!!status?.user?.gmailConnected} live="Connected. Envoy sends from your account with send-only permission." off={i?.google ? "Not connected. Sign out and continue with Google to send real email." : "Demo outbox. Messages are recorded here but not delivered. Add Google OAuth credentials to send for real."} />
          <Conn name="AI research" on={!!i?.anthropic} live="Claude Haiku writes briefs, with Sonnet re-checking any that fail validation." off="Demo drafts. Briefs are assembled by rules from the company's own pages. Add ANTHROPIC_API_KEY for AI briefs." />
          <Conn name="Company discovery" on={!!i?.exa} live="Exa searches the web for organizations matching your goal." off="Demo list of 14 clean-energy companies. You can also add any company by website. Add EXA_API_KEY to search." />
          <Conn name="Named contacts" on={!!i?.hunter} live="Hunter finds people by title with email confidence and catch-all checks." off="Only addresses published on company sites. Add HUNTER_API_KEY to find named people." />
        </div>
      </Section>

      <Section title="Your organization" sub="Upload your outreach deck or paste your website and Envoy fills these in. You can also type them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="deck" hint={p.hasDeck && !removeDeck ? `Current: ${p.deckName}` : "PDF, up to 10 MB. Also used as the email attachment."}>Outreach deck</Label>
            <input id="deck" type="file" accept="application/pdf" className="field file:mr-3 file:rounded-md file:border-0 file:bg-sunken file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-ink"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDeck({ name: f.name, base64: await fileToBase64(f) }); }} />
            {p.hasDeck && !removeDeck && <button className="mt-1 text-[13px] text-link hover:underline" onClick={() => setRemoveDeck(true)}>Remove current deck</button>}
          </div>
          <div>
            <Label htmlFor="website" hint="Your homepage">Website</Label>
            <input id="website" className="field" placeholder="yourorg.com" value={p.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="quiet" onClick={extract} busy={extracting} disabled={!deck && !p.website}>Read deck and website</Button>
          <Button variant="ghost" onClick={() => { setP((cur) => ({ ...cur, ...SAMPLE })); setMsg({ tone: "warn", text: "Loaded the BEACN sample profile. Add a postal address, then save." }); }}>Use the BEACN sample</Button>
        </div>
        {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

        <div className="mt-6 grid gap-4">
          <Row><Field id="orgName" label="Organization name" value={p.orgName} onChange={(v) => set("orgName", v)} /></Row>
          <Field id="oneLiner" label="One-line description" hint={`Reads as: “I'm Adam, a Project Manager at ${p.orgName || "BEACN"}, ___.”`} value={p.oneLiner} onChange={(v) => set("oneLiner", v)} />
          <Field id="teamStructure" label="Who does the work" hint="Reads as: “To provide some context, ___.”" value={p.teamStructure} onChange={(v) => set("teamStructure", v)} />
          <Area id="proofPoints" label="Track record" hint="One per line, e.g. 180+ projects for 150+ organizations" value={p.proofPoints.join("\n")} onChange={(v) => set("proofPoints", lines(v))} />
          <Area id="services" label="Services" hint="One per line. Each tailored idea in an email is built on one of these." value={p.serviceCatalog.join("\n")} onChange={(v) => set("serviceCatalog", lines(v))} rows={5} />
          <Field id="tagline" label="Signature tagline" value={p.tagline} onChange={(v) => set("tagline", v)} />
          <Field id="deckUrl" label="Deck link" hint="Optional. Used instead of attaching the PDF when a campaign is set to link." value={p.deckUrl} onChange={(v) => set("deckUrl", v)} />
        </div>
      </Section>

      <Section title="You">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="meName" label="Full name" value={p.meName} onChange={(v) => set("meName", v)} />
          <Field id="meFirstName" label="First name, as you sign" value={p.meFirstName} onChange={(v) => set("meFirstName", v)} />
          <Field id="meRole" label="Role" value={p.meRole} onChange={(v) => set("meRole", v)} />
          <Field id="mePronouns" label="Pronouns" hint="Optional" value={p.mePronouns} onChange={(v) => set("mePronouns", v)} />
        </div>
      </Section>

      <Section title="Required footer" sub="US and Canadian law require a postal address and a way to opt out. Envoy adds this to every email.">
        <Field id="postalAddress" label="Organization postal address" value={p.postalAddress} onChange={(v) => set("postalAddress", v)} />
      </Section>

      <Section title="Already contacted" sub="Envoy skips these companies and people. Everyone you send to is added automatically.">
        <Area id="excl" label="Add emails or websites" hint="Paste a list separated by commas or new lines." value={exclText} onChange={setExclText} rows={3} />
        <p className="mt-2 text-[13px] text-ink-2">{exclusions.length ? `${exclusions.length} on the list (${exclusions.filter((e) => e.source === "sent").length} added by sending).` : "Nobody on the list yet."}</p>
      </Section>

      <Section title="Sending limit">
        <Label htmlFor="cap" hint="New Gmail accounts should stay at 30 or below. Envoy never exceeds 10 an hour.">Emails per day</Label>
        <input id="cap" type="number" min={1} max={150} className="field max-w-[120px]" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
        {cap > 50 && <p className="mt-2 text-[13px] text-warn">Above 50 a day raises the chance Gmail limits your account. Only go higher on a Google Workspace account with a sending history.</p>}
      </Section>

      <div className="sticky bottom-0 -mx-5 mt-10 flex flex-wrap items-center gap-3 border-t border-rule bg-paper/95 px-5 py-4 backdrop-blur">
        <Button onClick={save} busy={saving}>Save setup</Button>
        {!missing.length && status?.profileComplete && <Button variant="quiet" onClick={() => router.push("/campaigns/new")}>Start a campaign</Button>}
        {missing.length > 0 && <span className="text-[13px] text-ink-2">Still needed: {missing.join(", ")}.</span>}
      </div>
    </div>
  );
}

function Section({ id, title, sub, children }: { id?: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6 first-of-type:mt-0">
      <h2 className="font-serif text-[22px] font-medium">{title}</h2>
      {sub && <p className="mb-4 mt-1 text-[14px] text-ink-2">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (<div><Label htmlFor={id} hint={hint}>{label}</Label><input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} /></div>);
}
function Area({ id, label, hint, value, onChange, rows = 2 }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (<div><Label htmlFor={id} hint={hint}>{label}</Label><textarea id={id} rows={rows} className="field resize-y" value={value} onChange={(e) => onChange(e.target.value)} /></div>);
}
function Conn({ name, on, live, off }: { name: string; on: boolean; live: string; off: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex w-44 shrink-0 items-center gap-2 font-semibold">{name}</div>
      <div className="flex-1 text-[14px] text-ink-2"><span className="mr-2 align-middle">{on ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">Demo</Badge>}</span>{on ? live : off}</div>
    </div>
  );
}
