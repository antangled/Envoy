"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStatus } from "@/components/status";
import { Badge, Button, Label, Notice } from "@/components/ui";
import { TemplateEditor } from "@/components/TemplateEditor";
import { EmailView } from "@/components/EmailView";
import { api, fileToBase64 } from "@/lib/client/api";
import { meFrom, renderBody, renderSubject, unfilledPlaceholders, unknownTokens, usesAi, type Mode, type Signature } from "@/lib/template/render";

interface Profile {
  orgName: string; tagline: string; website: string; serviceCatalog: string[];
  meName: string; mePronouns: string; meRole: string; phone: string; signoff: string; postalAddress: string;
  subjectTemplate: string; templateClient: string; templatePartnership: string;
  logo: string | null; deckName: string | null; saved: boolean;
}

const FREE_MAIL = /@(gmail|googlemail|yahoo|outlook|hotmail|live|msn|icloud|me|aol|proton|protonmail|gmx|zoho)\./i;
const SAMPLE = { company: "Example Co.", firstName: "Jordan" };

/** Filled from the founder's real outreach email (BEACN → Lightship, Sept 2026). */
const BEACN: Partial<Profile> = {
  orgName: "BEACN",
  tagline: "Student-run consulting for environmentally and socially responsible organizations.",
  serviceCatalog: ["market sizing", "competitive landscaping", "regulatory research", "supply-chain analysis", "data collection"],
  meName: "Adam Tang",
  mePronouns: "he/him/his",
  meRole: "Project Manager",
  subjectTemplate: "{{my_company}} x {{company}} collaboration?",
  templateClient: `Dear {{first_name}},

Hope you're doing well! I'm {{my_first_name}}, a {{my_title}} at {{my_company}}, a student-run sustainability consulting group at UC Berkeley. I saw {{ai_opening}}, and wanted to reach out about potentially supporting that through a semester-long project.

A few ideas that came to mind:

{{ai_ideas}}

To provide some context, {{my_company}} projects are staffed by seven Berkeley students plus an MBA mentor from Haas. Across 180+ projects for 150+ organizations, we've worked on market sizing, competitive landscaping, regulatory research, supply-chain analysis, and data collection. (More info in deck attached)

We're finalizing our fall projects this week, and I'd love to hear what would actually be most useful to {{company}}.

Would this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.`,
};

/** Shrinks a logo to at most 360×120 so it stays small inside every email. */
async function logoDataUri(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 360 / img.width, 120 / img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function SetupPage() {
  const { status, refresh } = useStatus();
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [saved, setSaved] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<Mode>("client");
  const [deck, setDeck] = useState<{ name: string; base64: string } | null>(null);
  const [removeDeck, setRemoveDeck] = useState(false);
  const [exclusions, setExclusions] = useState<{ value: string; source: string }[]>([]);
  const [exclText, setExclText] = useState("");
  const [cap, setCap] = useState(30);
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);
  const [testSent, setTestSent] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  /** Keeps the part being edited in view: signature fields scroll the preview to its end, the email back to its top. */
  const showPreview = (where: "top" | "bottom") => {
    const el = previewRef.current;
    if (el) el.scrollTo({ top: where === "top" ? 0 : el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    api<{ profile: Profile; exclusions: { value: string; source: string }[]; dailyCap: number; email: string }>("/api/setup")
      .then((d) => {
        const guess = d.profile.website || (FREE_MAIL.test(d.email) || d.email.endsWith(".local") ? "" : d.email.split("@")[1]);
        setP({ ...d.profile, website: guess });
        setSaved(JSON.stringify(d.profile));
        setExclusions(d.exclusions);
        setCap(d.dailyCap);
        setEmail(d.email);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => (x ? { ...x, [k]: v } : x));
  const templateKey = mode === "client" ? "templateClient" : "templatePartnership";

  const sig: Signature | null = useMemo(
    () =>
      p && {
        signoff: p.signoff,
        name: p.meName,
        firstName: p.meName.split(" ")[0] ?? "",
        pronouns: p.mePronouns,
        title: p.meRole,
        org: p.orgName,
        tagline: p.tagline,
        website: p.website,
        phone: p.phone,
        postalAddress: p.postalAddress,
        logo: p.logo,
      },
    [p],
  );

  if (!p || !sig) return <p className="text-ink-2">Loading…</p>;

  const body = p[templateKey];
  const unfilled = unfilledPlaceholders(`${p.subjectTemplate}\n${body}`);
  const unknown = unknownTokens(`${p.subjectTemplate}\n${body}`);
  const ai = usesAi(body);
  const dirty = saved !== JSON.stringify(p) || !!deck || removeDeck || !!exclText;
  const detailsDone = !!(p.meName && p.meRole && p.orgName);
  const emailDone = !unfilledPlaceholders(`${p.subjectTemplate}\n${p.templateClient}`).length && !unknown.length;
  const gmail = !!status?.user?.gmailConnected;
  const ctx = { ...SAMPLE, me: meFrom(sig), slots: null };

  async function fill() {
    if (!p) return;
    setFilling(true);
    setMsg(null);
    try {
      const r = await api<{ subject: string; client: string; partnership: string; orgName: string; tagline: string; services: string[] }>("/api/setup/draft", {
        method: "POST",
        json: { website: p.website || null, deckB64: deck?.base64 ?? null, subject: p.subjectTemplate, client: p.templateClient, partnership: p.templatePartnership, me: { name: p.meName, role: p.meRole, org: p.orgName } },
      });
      setP((x) => x && { ...x, subjectTemplate: r.subject, templateClient: r.client, templatePartnership: r.partnership, orgName: x.orgName || r.orgName, tagline: x.tagline || r.tagline, serviceCatalog: x.serviceCatalog.length ? x.serviceCatalog : r.services });
      const left = unfilledPlaceholders(`${r.subject}\n${r.client}`).length;
      setMsg({ tone: left ? "warn" : "ok", text: left ? `Written from your ${deck ? "deck" : "site"}. ${left} red placeholder${left === 1 ? "" : "s"} left for you to fill in below.` : "Written from your site. Read it over, then save." });
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    } finally {
      setFilling(false);
    }
  }

  async function save() {
    if (!p) return;
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/setup", { method: "PUT", json: { ...p, deck, removeDeck, exclusionsText: exclText, dailyCap: cap } });
      const d = await api<{ profile: Profile; exclusions: { value: string; source: string }[] }>("/api/setup");
      setP(d.profile);
      setSaved(JSON.stringify(d.profile));
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

  async function sendTest() {
    if (dirty) await save();
    setMsg(null);
    try {
      await api("/api/send/test", { method: "POST" });
      setTestSent(true);
      setMsg({ tone: "ok", text: `Test sent to ${email}. Check your inbox.` });
    } catch (e) {
      setMsg({ tone: "bad", text: (e as Error).message });
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-serif text-[34px] font-medium leading-tight tracking-[-0.01em]">Your email</h1>
        <p className="mt-2 max-w-[64ch] text-[15px] text-ink-2">Write it once. For every company, Envoy fills in who it&rsquo;s to and writes the blue parts from that company&rsquo;s own website and news.</p>
      </div>

      <ol className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="Setup checklist">
        <Check done={detailsDone} n={1} title="Your details" detail={detailsDone ? `${p.meName}, ${p.meRole}, ${p.orgName}` : "Name, title, organization"} />
        <Check done={emailDone} n={2} title="Your email" detail={emailDone ? "Ready to send" : `${unfilledPlaceholders(`${p.subjectTemplate}\n${p.templateClient}`).length} red placeholders to fill`} />
        <Check done={testSent} n={3} title="Send yourself a test" detail={gmail ? (testSent ? "Sent" : `To ${email}`) : "Sign in with Google first"} action={gmail && !testSent ? <button type="button" className="text-link hover:underline" onClick={sendTest}>Send test</button> : null} />
      </ol>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="me-h" className="rounded-xl border border-rule bg-surface p-5" onFocus={() => showPreview("top")}>
            <h2 id="me-h" className="text-[16px] font-semibold">Your details</h2>
            <p className="mt-1 text-[14px] text-ink-2">These fill the <mark className="rounded-sm bg-warn-bg px-1 text-ink">yellow</mark> parts of your email and your signature.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="meName" label="Your name" value={p.meName} onChange={(v) => set("meName", v)} placeholder="Adam Tang" />
              <Field id="meRole" label="Your title" value={p.meRole} onChange={(v) => set("meRole", v)} placeholder="Project Manager" />
              <Field id="orgName" label="Your organization" value={p.orgName} onChange={(v) => set("orgName", v)} placeholder="BEACN" />
              <Field id="website" label="Organization website" value={p.website} onChange={(v) => set("website", v)} placeholder="yourorg.com" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
              <Button onClick={fill} busy={filling} disabled={!p.website && !deck}>{filling ? "Reading your site" : "Write the rest from my website"}</Button>
              <span className="text-[13px] text-ink-3">
                Fills the red placeholders from your site or deck. Or{" "}
                <button type="button" className="text-link hover:underline" onClick={() => { setP((x) => x && { ...x, ...BEACN, website: x.website }); setMsg({ tone: "ok", text: "Loaded the BEACN example. Save to keep it." }); }}>
                  start from the BEACN example
                </button>
                .
              </span>
            </div>
            {msg && <div className="mt-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
          </section>

          <section aria-labelledby="email-h" onFocus={() => showPreview("top")}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h2 id="email-h" className="font-serif text-[22px] font-medium">The email</h2>
              <div className="inline-flex rounded-lg border border-rule bg-surface p-1" role="tablist" aria-label="Which email">
                {(["client", "partnership"] as const).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1 text-[13px] font-semibold ${mode === m ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}>
                    {m === "client" ? "Pitching a client" : "Proposing a partnership"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <input id="subject" className="field" value={p.subjectTemplate} onChange={(e) => set("subjectTemplate", e.target.value)} />
              </div>
              <TemplateEditor id="body" label="Email body" value={body} onChange={(v) => set(templateKey, v)} />
              <Guide />
              {unfilled.length > 0 && <p className="text-[13px] text-bad">Replace the {unfilled.length} red placeholder{unfilled.length === 1 ? "" : "s"} with your own words before starting a campaign.</p>}
              {unknown.length > 0 && <p className="text-[13px] text-bad">Envoy doesn&rsquo;t recognize {unknown.join(", ")}. Use the Insert buttons above.</p>}
              {!ai.opening && !ai.ideas && <p className="text-[13px] text-warn">This email has no blue parts, so every company gets the same text. Insert a tailored opening or ideas to personalize it.</p>}
            </div>
            <div className="mt-6">
              <Label htmlFor="services" hint="Each tailored idea is built on one of these. One per line.">What you offer</Label>
              <textarea id="services" rows={3} className="field resize-y" value={p.serviceCatalog.join("\n")} onChange={(e) => set("serviceCatalog", e.target.value.split("\n"))} placeholder={"market sizing\ncompetitive landscaping\nregulatory research"} />
            </div>
          </section>

          <section aria-labelledby="sig-h" onFocus={() => showPreview("bottom")}>
            <h2 id="sig-h" className="font-serif text-[22px] font-medium">Signature</h2>
            <p className="mb-4 mt-1 text-[14px] text-ink-2">Your name, title, and organization come from Your details; your organization links to its website. The preview updates as you type.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="signoff" label="Sign-off" value={p.signoff} onChange={(v) => set("signoff", v)} placeholder="Best," />
              <Field id="mePronouns" label="Pronouns" value={p.mePronouns} onChange={(v) => set("mePronouns", v)} placeholder="Optional, e.g. she/her" />
              <div className="sm:col-span-2"><Field id="tagline" label="Tagline" value={p.tagline} onChange={(v) => set("tagline", v)} placeholder="Optional, one line under your organization" /></div>
              <Field id="phone" label="Phone" value={p.phone} onChange={(v) => set("phone", v)} placeholder="Optional" />
              <Field id="postal" label="Mailing address" value={p.postalAddress} onChange={(v) => set("postalAddress", v)} placeholder="Optional" />
              <div className="sm:col-span-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo is a data: URI; next/image has nothing to optimize */}
                  {p.logo && <img src={p.logo} alt="Your logo" className="max-h-10 max-w-[140px] rounded border border-rule bg-white p-1" />}
                  <input id="logo" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="max-w-full text-[13px] file:mr-3 file:rounded-md file:border file:border-rule file:bg-surface file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-ink"
                    onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("logo", await logoDataUri(f)); }} />
                  {p.logo && <button type="button" className="text-[13px] text-link hover:underline" onClick={() => set("logo", null)}>Remove</button>}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-ink-3">Every email ends with one short line saying how you found the person and how to opt out.</p>
          </section>

          <details className="rounded-xl border border-rule bg-surface px-5 py-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Deck attachment <span className="font-normal text-ink-3">· {p.deckName && !removeDeck ? p.deckName : deck ? deck.name : "none"}</span></summary>
            <p className="mt-2 text-[14px] text-ink-2">Attached to each email when a campaign is set to attach it. Envoy can also read it to write your email.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input id="deck" type="file" accept="application/pdf" className="max-w-full text-[13px] file:mr-3 file:rounded-md file:border file:border-rule file:bg-surface file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-ink"
                onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setDeck({ name: f.name, base64: await fileToBase64(f) }); setRemoveDeck(false); } }} />
              {p.deckName && !removeDeck && <button type="button" className="text-[13px] text-link hover:underline" onClick={() => setRemoveDeck(true)}>Remove {p.deckName}</button>}
            </div>
          </details>

          <details className="rounded-xl border border-rule bg-surface px-5 py-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Sending limits and people you&rsquo;ve already contacted</summary>
            <div className="mt-4 grid gap-5">
              <div>
                <Label htmlFor="cap" hint="Envoy never sends more than 10 an hour. New Gmail accounts should stay at 30 or fewer a day.">Emails per day</Label>
                <input id="cap" type="number" min={1} max={150} className="field max-w-[120px]" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="excl" hint={`Envoy skips these. Everyone you send to is added automatically. ${exclusions.length} on the list now.`}>Already contacted</Label>
                <textarea id="excl" rows={3} className="field resize-y" value={exclText} onChange={(e) => setExclText(e.target.value)} placeholder="Paste emails or websites, separated by commas or new lines" />
              </div>
            </div>
          </details>

          <details className="rounded-xl border border-rule bg-surface px-5 py-4">
            <summary className="cursor-pointer text-[15px] font-semibold">Service status</summary>
            <ul className="mt-3 space-y-2 text-[14px]">
              <Svc name="Gmail" on={gmail} detail={gmail ? `Sending as ${email}` : "Sign out and continue with Google to send real email."} />
              <Svc name="AI writing" on={!!status?.integrations.anthropic} detail="Claude writes briefs and the tailored parts." />
              <Svc name="Company search" on={!!status?.integrations.exa} detail="Exa finds companies and the right people." />
              <Svc name="Email finding" on={!!status?.integrations.hunter} detail="Hunter finds and checks email addresses." />
            </ul>
          </details>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-ink-2">Preview</h2>
            <span className="text-[12px] text-ink-3">
              Sent to an example: <span className="rounded-sm bg-ok-bg px-1 text-ok">{SAMPLE.firstName}</span> at <span className="rounded-sm bg-ok-bg px-1 text-ok">{SAMPLE.company}</span>
            </span>
          </div>
          <div ref={previewRef} className="max-h-[calc(100dvh-9rem)] overflow-auto rounded-xl border border-rule bg-surface p-5 shadow-[0_1px_0_var(--rule)]">
            <EmailView
              subject={renderSubject(p.subjectTemplate, ctx)}
              blocks={renderBody(body, ctx)}
              signature={sig}
              company={SAMPLE.company}
              attachment={(p.deckName && !removeDeck) || deck ? (deck?.name ?? p.deckName) : null}
              highlightVars
            />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-10 flex flex-wrap items-center gap-3 border-t border-rule bg-paper/95 px-5 py-4 backdrop-blur">
        <Button onClick={save} busy={saving} disabled={!dirty && p.saved}>{dirty || !p.saved ? "Save" : "Saved"}</Button>
        {status?.profileComplete && !dirty && <Button variant="quiet" onClick={() => router.push("/campaigns/new")}>Start a campaign</Button>}
        {dirty && <span className="text-[13px] text-ink-2">Unsaved changes</span>}
      </div>
    </>
  );
}

function Check({ done, n, title, detail, action }: { done: boolean; n: number; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <li className={`flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 ${done ? "border-ok-bg bg-ok-bg/50" : "border-rule bg-surface"}`}>
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${done ? "bg-ok text-paper" : "border border-rule text-ink-2"}`} aria-hidden>
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 text-[14px]">
        <p className="font-semibold">{title}<span className="sr-only">{done ? " (done)" : " (to do)"}</span></p>
        <p className="truncate text-[13px] text-ink-2">{detail}</p>
        {action && <p className="mt-0.5 text-[13px]">{action}</p>}
      </div>
    </li>
  );
}

/** Plain-language key to the colors, with what each field turns into. */
function Guide() {
  const row = (cls: string, token: string, becomes: string) => (
    <li className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-3">
      <code className={`justify-self-start rounded-sm px-1 text-[12px] ${cls}`}>{token}</code>
      <span>{becomes}</span>
    </li>
  );
  return (
    <details className="rounded-lg border border-rule bg-surface px-4 py-2.5 text-[13px] text-ink-2" open>
      <summary className="cursor-pointer font-semibold text-ink">What the colors mean</summary>
      <ul className="mt-2 space-y-1.5">
        {row("bg-warn-bg text-warn", "{{my_first_name}}", "Yellow: your details, already filled in from the top of this page. Also {{my_title}} and {{my_company}}.")}
        {row("bg-ok-bg text-ok", "{{first_name}}", "Green: changes for each person you email. Also {{company}}. Falls back to “{company} team” if no name is found.")}
        {row("bg-carbon text-link", "{{ai_opening}}", "Blue: Envoy writes this for each company from its website and news, with sources. {{ai_ideas}} adds three tailored ideas.")}
        {row("bg-bad-bg text-bad", "[like this]", "Red: type your own words here. Campaigns can’t start until none are left.")}
      </ul>
      <p className="mt-2">Type anywhere to change the wording. Use the Insert buttons to add a field where your cursor is.</p>
    </details>
  );
}

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Svc({ name, on, detail }: { name: string; on: boolean; detail: string }) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="w-32 font-semibold">{name}</span>
      {on ? <Badge tone="ok">Live</Badge> : <Badge tone="warn">Demo</Badge>}
      <span className="text-ink-2">{detail}</span>
    </li>
  );
}
