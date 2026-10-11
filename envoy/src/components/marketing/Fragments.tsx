/**
 * Interface fragments for the landing page. They are built from the same tokens as the app, so the page shows the
 * product itself rather than illustrations of it. Every fragment uses fictional companies on .example domains, so no
 * real organization is shown with invented data or quotes.
 */

const EXAMPLE = { company: "Northwind Robotics", domain: "northwind.example" };

function Dots() {
  return (
    <span className="flex gap-1.5" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
      <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
      <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
    </span>
  );
}

function Cite({ n }: { n: number }) {
  return <sup className="cite">{n}</sup>;
}

function Pill({ tone, children }: { tone: "ok" | "warn" | "muted" | "carbon"; children: React.ReactNode }) {
  const t = { ok: "bg-ok-bg text-ok", warn: "bg-warn-bg text-warn", muted: "bg-muted-bg text-ink-2", carbon: "bg-carbon text-link" }[tone];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${t}`}>{children}</span>;
}

/** The hero: a campaign window with a sourced draft, and the source it cites lifted out beside it. */
export function HeroWindow() {
  const orgs = [
    { name: EXAMPLE.company, fit: 84, on: true },
    { name: "Harbor Cell Works", fit: 79 },
    { name: "Lumen Grid", fit: 74 },
    { name: "Tidewater Motors", fit: 68 },
    { name: "Copperline Labs", fit: 61 },
  ];
  return (
    <div className="relative">
      <div className="hero-window overflow-hidden rounded-xl border border-rule bg-surface text-ink shadow-[var(--shadow-window)]">
        <div className="flex items-center gap-3 border-b border-rule bg-sunken px-4 py-2.5">
          <Dots />
          <span className="truncate text-[12px] font-medium text-ink-3">Example campaign · Bay Area hardware, fall projects</span>
        </div>
        <div className="grid md:grid-cols-[188px_minmax(0,1fr)]">
          <aside className="hidden border-r border-rule bg-canvas p-3 md:block" aria-label="Organizations in this campaign">
            <p className="px-2 pb-2 text-[11.5px] font-semibold text-ink-3">5 organizations</p>
            <ul className="space-y-0.5">
              {orgs.map((o) => (
                <li key={o.name} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] ${o.on ? "bg-surface font-semibold shadow-[var(--shadow-lift)]" : "text-ink-2"}`}>
                  <span>{o.name}</span>
                  <span className={`font-serif tabular-nums ${o.fit >= 70 ? "text-ok" : "text-ink-3"}`}>{o.fit}</span>
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0 p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold">{EXAMPLE.company}</span>
              <span className="text-[12.5px] text-ink-3">{EXAMPLE.domain}</span>
              <Pill tone="ok">3 of 3 criteria supported</Pill>
            </div>
            <div className="letter text-[15px] leading-[1.7] sm:text-[15.5px]">
              <p>Dear Jordan,</p>
              <p className="mt-3">
                Hope you&rsquo;re doing well! I&rsquo;m Adam, a Project Manager at BEACN, a student-run sustainability consulting group at UC Berkeley. I saw{" "}
                <span className="carbon hero-sweep">Northwind&rsquo;s second assembly line in Fremont and the plan to double warehouse-robot output by next spring</span>
                <Cite n={1} />, and wanted to reach out about supporting that growth through a semester-long project.
              </p>
              <p className="mt-3">A few ideas that came to mind:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  <span className="carbon"><em>Market targeting</em>: which warehouse segments the new line should serve first.</span>
                  <Cite n={1} />
                </li>
                <li className="hidden sm:list-item">
                  <span className="carbon"><em>Supplier map</em>: second sources for the motors and sensors the line depends on.</span>
                  <Cite n={2} />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <figure className="hero-source relative mx-3 -mt-6 rounded-lg border border-rule bg-surface p-3.5 text-ink shadow-[var(--shadow-window)] sm:absolute sm:-bottom-8 sm:right-4 sm:mx-0 sm:mt-0 sm:w-[300px] lg:-right-16">
        <figcaption className="mb-2 flex items-center gap-2 text-[12px] text-ink-3">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-carbon text-[10px] font-bold text-link">1</span>
          northwind.example/news · Second Fremont line
        </figcaption>
        <p className="text-[13px] leading-relaxed text-ink-2">
          &hellip;the second line opens this fall, and{" "}
          <mark className="rounded-sm bg-carbon px-0.5 text-ink">we expect to double warehouse-robot output by next spring</mark>, said the COO&hellip;
        </p>
        <p className="mt-2 text-[11.5px] font-medium text-ok">Quote matched word for word</p>
      </figure>
    </div>
  );
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-surface shadow-[var(--shadow-lift)]">
      <div className="flex items-center gap-3 border-b border-rule bg-sunken px-4 py-2">
        <Dots />
        <span className="truncate text-[12px] font-medium text-ink-3">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function GoalFragment() {
  const roles = [
    { r: "VP Operations", on: true },
    { r: "Head of Strategy", on: true },
    { r: "Chief of Staff", on: true },
    { r: "Head of Product" },
    { r: "Founder / CEO" },
  ];
  return (
    <Frame title="New campaign">
      <p className="mb-1.5 text-[13px] font-semibold">Who do you want to work with?</p>
      <div className="rounded-lg border border-rule bg-canvas px-3 py-2.5 text-[14px] leading-relaxed">
        Three fall consulting projects with growth-stage robotics and clean-energy hardware companies in the Bay Area that are scaling manufacturing.
      </div>
      <p className="mb-1.5 mt-4 text-[13px] font-semibold">People to write to</p>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((x) => (
          <span key={x.r} className={`rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium ${x.on ? "border-ink bg-ink text-canvas" : "border-rule text-ink-2"}`}>
            {x.r}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[13px] font-semibold text-canvas">Find organizations</span>
        <span className="text-[12.5px] text-ink-3">10 organizations · 10 people each</span>
      </div>
    </Frame>
  );
}

export function OrgsFragment() {
  const rows = [
    { n: EXAMPLE.company, d: EXAMPLE.domain, r: "Opening a second assembly line for warehouse robots in Fremont." },
    { n: "Harbor Cell Works", d: "harborcell.example", r: "Piloting sodium-ion packs with two utility partners." },
    { n: "Lumen Grid", d: "lumengrid.example", r: "Hiring a first operations lead ahead of a Series A." },
  ];
  return (
    <Frame title="Choose organizations">
      <ul className="divide-y divide-rule">
        {rows.map((x, i) => (
          <li key={x.n} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${i < 2 ? "border-seal bg-seal text-on-seal" : "border-rule-strong"}`} aria-hidden>
              {i < 2 && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <div className="min-w-0 text-[13.5px]">
              <p>
                <span className="font-semibold">{x.n}</span> <span className="text-ink-3">{x.d}</span>
              </p>
              <p className="text-ink-2">
                {x.r} <span className="font-medium text-link">Source</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

export function BriefFragment() {
  return (
    <Frame title={`${EXAMPLE.company} · Brief`}>
      <p className="mb-2 text-[13px] font-semibold">Fit against your criteria</p>
      <ul className="space-y-2 text-[13.5px]">
        <li className="flex items-start gap-2">
          <Pill tone="ok">Supported</Pill>
          <span>Scaling manufacturing<Cite n={1} /></span>
        </li>
        <li className="flex items-start gap-2">
          <Pill tone="ok">Supported</Pill>
          <span>Hardware company in the Bay Area<Cite n={2} /></span>
        </li>
        <li className="flex items-start gap-2">
          <Pill tone="muted">Unknown</Pill>
          <span>Has budget for outside research</span>
        </li>
      </ul>
      <p className="mb-1.5 mt-4 text-[13px] font-semibold">Still unknown</p>
      <p className="text-[13.5px] text-ink-2">Who owns the new line&rsquo;s launch plan. Check the careers page or ask in the first call.</p>
      <div className="mt-4 border-t border-rule pt-3 text-[12.5px] text-ink-2">
        <p><span className="font-semibold text-link">1</span> northwind.example/news, &ldquo;Second Fremont line&rdquo;</p>
        <p><span className="font-semibold text-link">2</span> northwind.example/about</p>
      </div>
    </Frame>
  );
}

export function PeopleFragment() {
  const people = [
    { n: "Jordan Lee", t: "VP Operations", s: "Verified", tone: "ok" as const, on: true },
    { n: "Casey Morgan", t: "Head of Strategy", s: "Verified", tone: "ok" as const, on: true },
    { n: "Taylor Kim", t: "Director of Operations", s: "Risky", tone: "warn" as const, on: true },
    { n: "Quinn Patel", t: "Chief of Staff", s: "Email not checked", tone: "muted" as const, find: true },
  ];
  return (
    <Frame title={`${EXAMPLE.company} · Who to write to`}>
      <p className="mb-2 flex justify-between text-[12.5px] text-ink-2">
        <span className="font-semibold text-ink">10 people found</span>
        <span className="tabular-nums">3 will get this email</span>
      </p>
      <ul className="divide-y divide-rule rounded-lg border border-rule">
        {people.map((p) => (
          <li key={p.n} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-2 text-[13px]">
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${p.on ? "border-seal bg-seal text-on-seal" : "border-rule-strong"}`} aria-hidden>
              {p.on && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <Pill tone={p.tone}>{p.s}</Pill>
            <span className="font-semibold">{p.n}</span>
            <span className="text-ink-2">{p.t}</span>
            {p.find && <span className="ml-auto font-medium text-link">Find email</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[12.5px] text-ink-2">Each person gets their own copy, greeted by name.</p>
    </Frame>
  );
}

/** The sender's own template with the three kinds of fill-ins colored the way Setup colors them. */
export function TemplateFragment() {
  const mine = "rounded-sm bg-warn-bg px-0.5 text-ink";
  const each = "rounded-sm bg-ok-bg px-0.5 text-ok";
  const ai = "rounded-sm bg-carbon px-0.5 text-link";
  return (
    <Frame title="Setup · Your email">
      <div className="text-[14px] leading-[1.75]">
        <p>
          Dear <span className={each}>first name</span>,
        </p>
        <p className="mt-2">
          I&rsquo;m <span className={mine}>Adam</span>, <span className={mine}>Project Manager</span> at <span className={mine}>BEACN</span>, a student-run sustainability consulting group. I saw{" "}
          <span className={ai}>✦ a recent, sourced detail</span>, and wanted to reach out about a semester-long project.
        </p>
        <p className="mt-2">
          <span className={ai}>✦ three ideas built on your services</span>
        </p>
        <p className="mt-2">Would this be of interest to you?</p>
      </div>
      <dl className="mt-4 grid gap-x-4 gap-y-1.5 border-t border-rule pt-3 text-[12.5px] sm:grid-cols-3">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-warn-bg ring-1 ring-warn/40" aria-hidden /><dt className="text-ink-2">Filled from your details</dt></div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-ok-bg ring-1 ring-ok/40" aria-hidden /><dt className="text-ink-2">Changes per person</dt></div>
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-carbon ring-1 ring-link/40" aria-hidden /><dt className="text-ink-2">Researched by Envoy</dt></div>
      </dl>
    </Frame>
  );
}

export function QueueFragment() {
  const rows = [
    { t: "10:42", who: "Jordan Lee", s: "Sent", tone: "ok" as const },
    { t: "10:44", who: "Casey Morgan", s: "Sent", tone: "ok" as const },
    { t: "10:47", who: "Taylor Kim", s: "Scheduled", tone: "muted" as const },
    { t: "10:49", who: "Avery Brooks", s: "Scheduled", tone: "muted" as const },
  ];
  return (
    <Frame title="Send · From you@yourclub.org">
      <ul className="divide-y divide-rule text-[13px]">
        {rows.map((r) => (
          <li key={r.who} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="w-11 shrink-0 text-ink-3">{r.t}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{r.who}</span> <span className="text-ink-2">at {r.who === "Avery Brooks" ? "Harbor Cell Works" : EXAMPLE.company}</span>
            </span>
            <Pill tone={r.tone}>{r.s}</Pill>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-rule pt-3 text-[12.5px] text-ink-2">2 of 30 sent today · next in about 2 minutes</p>
    </Frame>
  );
}
