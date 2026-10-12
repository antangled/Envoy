"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStatus } from "@/components/status";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Notice } from "@/components/ui";
import { api } from "@/lib/client/api";
import { BriefFragment, GoalFragment, HeroWindow, OrgsFragment, PeopleFragment, QueueFragment, ResearchPanel, TemplateFragment } from "./Fragments";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or try the demo.",
  access_denied: "Google sign-in was cancelled.",
  gmail_permission_not_granted: "Envoy needs permission to send email on your behalf. Sign in again and leave the Gmail box checked.",
  state_mismatch: "Sign-in expired. Try again.",
  demo_only: "Sign-in is closed on this site for now. Try the demo: it runs the full flow on sample data and sends nothing.",
};

/** Sign-in actions, shared by the nav, the hero, and the closing band. Signed-in visitors get a way back into the app. */
function useSignIn() {
  const { status, refresh } = useStatus();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const google = !!status?.integrations.google;
  const signedIn = !!status?.user;
  const appHref = status?.profileComplete ? "/campaigns" : "/setup";
  const demo = async () => {
    setBusy(true);
    try {
      await api("/api/auth/demo", { method: "POST" });
      await refresh();
      router.push("/campaigns");
    } finally {
      setBusy(false);
    }
  };
  return { google, busy, demo, signedIn, appHref };
}

const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[14.5px] font-semibold transition-colors duration-150 disabled:opacity-60";

function Actions({ onBrand = false }: { onBrand?: boolean }) {
  const { google, busy, demo, signedIn, appHref } = useSignIn();
  const primary = onBrand ? "bg-on-brand text-brand-deep hover:bg-white" : "bg-ink text-canvas hover:bg-ink/88";
  const secondary = onBrand
    ? "border border-on-brand-2/40 text-on-brand hover:bg-on-brand/10"
    : "border border-rule bg-surface text-ink shadow-[0_1px_1px_oklch(0.2_0.03_268/0.05)] hover:border-rule-strong";
  if (signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={appHref} className={`${btn} ${primary}`}>
          Open Envoy
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {google ? (
        <a href="/api/auth/google" className={`${btn} ${primary}`}>
          <GoogleMark />
          Continue with Google
        </a>
      ) : null}
      <button type="button" onClick={demo} disabled={busy} className={`${btn} ${google ? secondary : primary}`}>
        {busy && <span className="working inline-block h-2 w-2 rounded-full bg-current" aria-hidden />}
        Try the demo
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#template", label: "Your email" },
  { href: "#sending", label: "Sending" },
  { href: "#cost", label: "Cost" },
];

function MarketingNav() {
  const { google, busy, demo, signedIn, appHref } = useSignIn();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`sticky top-0 z-30 transition-[background-color,border-color] duration-200 ${scrolled ? "border-b border-rule bg-canvas/85 backdrop-blur-md" : "border-b border-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-5 sm:px-8">
        <Link href="/" aria-label="Envoy home" className="rounded-md">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-md px-2.5 py-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href={appHref} className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[14px] font-semibold text-canvas transition-colors hover:bg-ink/88">
              Open Envoy
            </Link>
          ) : (
          <>
          {google && (
            <button type="button" onClick={demo} disabled={busy} className="hidden h-9 rounded-lg px-3 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink sm:block">
              Try the demo
            </button>
          )}
          {google ? (
            <a href="/api/auth/google" className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[14px] font-semibold text-canvas transition-colors hover:bg-ink/88">
              Sign in
            </a>
          ) : (
            <button type="button" onClick={demo} disabled={busy} className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-[14px] font-semibold text-canvas transition-colors hover:bg-ink/88">
              Try the demo
            </button>
          )}
          </>
          )}
        </div>
      </div>
    </header>
  );
}

function ClosingNote() {
  const { google } = useSignIn();
  return (
    <p className="mt-5 max-w-[50ch] text-[16.5px] leading-relaxed text-on-brand-2">
      {google
        ? "Try the demo with sample data, or sign in with Google to send from your own address."
        : "The demo runs the whole flow on sample companies, with no sign-up. Nothing is sent."}
    </p>
  );
}

/** A section heading in the reference sites' cadence: one plain statement, then a muted continuation. */
function Lede({ strong, rest, className = "" }: { strong: string; rest: string; className?: string }) {
  return (
    <h2 className={`max-w-[30ch] text-balance font-serif text-[clamp(1.75rem,1.2rem+1.9vw,2.6rem)] font-medium leading-[1.14] tracking-[-0.018em] ${className}`}>
      <span className="text-ink">{strong}</span> <span className="text-ink-3">{rest}</span>
    </h2>
  );
}

const STEPS = [
  { title: "Say who you want to work with", body: "One goal in plain English. Envoy turns it into checkable criteria and the job titles worth writing to.", Fragment: GoalFragment },
  { title: "Get organizations that fit", body: "A short list, each with the one-line reason it matches and the page that reason came from. Anyone you've already emailed is skipped.", Fragment: OrgsFragment },
  { title: "Read a brief with sources", body: "Every criterion is marked supported, not met, or unknown, with numbered sources. What Envoy couldn't verify is listed, not filled in.", Fragment: BriefFragment },
  { title: "Pick the people", body: "About ten people per company, several per role. Emails are only looked up for the people you choose, so you don't pay for the rest.", Fragment: PeopleFragment },
];

const RECEIPT = [
  { what: "Research and writing", who: "Claude", cost: "$0.005" },
  { what: "Company and news search", who: "Exa", cost: "$0.018" },
  { what: "Email lookup", who: "Hunter, 1 credit", cost: "$0.025" },
];

function Landing() {
  const params = useSearchParams();
  const err = params.get("error");

  return (
    <div className="overflow-x-clip">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-14 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pt-20 xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="min-w-0">
            <p className="hero-rise mb-6 inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1 text-[13px] text-ink-2 shadow-[0_1px_1px_oklch(0.2_0.03_268/0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
              Sends from your own Gmail. Can&rsquo;t read your inbox.
            </p>
            <h1 className="hero-rise max-w-[14ch] text-balance font-serif text-[clamp(2.75rem,1.6rem+4.6vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.03em] text-ink [animation-delay:60ms]">
              Outreach with receipts.
            </h1>
            <p className="hero-rise mt-6 max-w-[56ch] text-pretty text-[clamp(1.05rem,0.98rem+0.3vw,1.2rem)] leading-relaxed text-ink-2 [animation-delay:120ms]">
              Describe who you want to work with. Envoy finds organizations that fit, reads their sites and news, finds the right people at each, and drafts your email with a source behind every sentence. You approve each one before it sends.
            </p>
            <div className="hero-rise mt-8 [animation-delay:180ms]">
              <Actions />
              {err && (
                <div className="mt-5 max-w-[56ch]">
                  <Notice tone="bad">{ERRORS[err] ?? `Sign-in failed: ${err}`}</Notice>
                </div>
              )}
            </div>
            </div>
            <div className="hero-rise hidden min-w-0 [animation-delay:240ms] lg:block">
              <ResearchPanel />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 top-16 bg-brand-deep sm:top-24" aria-hidden>
              <div className="brand-grid absolute inset-0 opacity-60" />
            </div>
            <div className="relative mx-auto max-w-[1200px] px-5 pb-20 sm:px-8 sm:pb-28">
              <div className="hero-lift mx-auto max-w-[940px]">
                <HeroWindow />
              </div>
            </div>
          </div>
        </section>

        {/* Problem statement */}
        <section className="border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
            <Lede
              strong="Cold outreach is five tools and an evening per company."
              rest="LinkedIn for names, the company site for something specific to say, an email finder, a spreadsheet, a mail merge. Envoy runs the whole chain and shows its work."
              className="max-w-[34ch]"
            />
          </div>
        </section>

        {/* How it works: a real sequence, so it is numbered */}
        <section id="how" className="scroll-mt-16 border-b border-rule">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
            <Lede strong="From a goal to a short list you'd actually send to." rest="Four steps, a few minutes for a whole campaign." />
            <ol className="mt-14 divide-y divide-rule border-y border-rule">
              {STEPS.map(({ title, body, Fragment }, i) => (
                <li key={title} className="grid gap-8 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-14">
                  <div className="lg:sticky lg:top-24 lg:self-start">
                    <span className="font-serif text-[15px] tabular-nums text-ink-3">{i + 1}</span>
                    <h3 className="mt-2 text-balance text-[22px] font-semibold leading-snug tracking-[-0.01em]">{title}</h3>
                    <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">{body}</p>
                  </div>
                  <div className="min-w-0">
                    <Fragment />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The sender's own email */}
        <section id="template" className="scroll-mt-16 border-b border-rule bg-surface">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <Lede strong="Your email stays yours." rest="Envoy only writes the parts it marks." />
              <p className="mt-6 max-w-[48ch] text-[16px] leading-relaxed text-ink-2">
                Paste the email you already send. Your introduction, credentials, and ask go out word for word. Envoy writes two parts per company, the opening detail and three ideas, and colors them so you always know which words are its. Click into any finished draft to add something specific before it sends.
              </p>
            </div>
            <TemplateFragment />
          </div>
        </section>

        {/* Sending */}
        <section id="sending" className="scroll-mt-16 border-b border-rule">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0 lg:order-2">
              <Lede strong="Sent like a person." rest="From your own Gmail, one at a time." />
              <dl className="mt-8 grid max-w-[48ch] gap-x-8 gap-y-5 text-[15px] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-ink">One at a time</dt>
                  <dd className="mt-1 text-ink-2">A minute or three apart, in business hours.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">A daily cap</dt>
                  <dd className="mt-1 text-ink-2">30 a day by default. You can lower it.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">No tracking pixels</dt>
                  <dd className="mt-1 text-ink-2">Plain, personal email. Nothing hidden inside.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Send-only access</dt>
                  <dd className="mt-1 text-ink-2">Envoy asks Google to send. It never reads your inbox.</dd>
                </div>
              </dl>
            </div>
            <div className="min-w-0 lg:order-1">
              <QueueFragment />
            </div>
          </div>
        </section>

        {/* Cost, as a receipt */}
        <section id="cost" className="scroll-mt-16 border-b border-rule">
          <div className="mx-auto grid max-w-[1200px] items-start gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
            <div className="min-w-0">
              <Lede strong="About five cents a company." rest="Measured, not estimated." />
              <p className="mt-6 max-w-[48ch] text-[16px] leading-relaxed text-ink-2">
                Most of it is the email lookup, and Hunter&rsquo;s free plan covers 50 lookups a month. Every campaign shows what it has spent so far, broken down by service, so the cost never surprises you.
              </p>
            </div>
            <figure className="mx-auto w-full max-w-[400px] rounded-lg border border-rule bg-surface px-6 pb-6 pt-5 shadow-[var(--shadow-lift)]">
              <figcaption className="flex items-baseline justify-between border-b border-dashed border-rule-strong pb-3">
                <span className="font-serif text-[18px] font-medium">One company</span>
                <span className="text-[12.5px] text-ink-3">researched and drafted</span>
              </figcaption>
              <table className="mt-3 w-full text-[14px]">
                <tbody>
                  {RECEIPT.map((r) => (
                    <tr key={r.what}>
                      <td className="py-1.5 pr-3 align-top">
                        <span className="block text-ink">{r.what}</span>
                        <span className="block text-[12.5px] text-ink-3">{r.who}</span>
                      </td>
                      <td className="py-1.5 text-right align-top text-ink">{r.cost}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-dashed border-rule-strong">
                    <td className="pt-3 font-semibold">Total</td>
                    <td className="pt-3 text-right font-semibold">about $0.05</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">Hunter priced on its $49 Starter plan. Measured October 2026 on a five-company campaign.</p>
            </figure>
          </div>
        </section>

        {/* Closing */}
        <section className="relative overflow-hidden bg-brand-deep text-on-brand">
          <div className="brand-grid absolute inset-0 opacity-50" aria-hidden />
          <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
            <h2 className="max-w-[20ch] text-balance font-serif text-[clamp(2rem,1.3rem+2.6vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.022em]">
              Write to the right person, with a reason they&rsquo;ll recognize.
            </h2>
            <ClosingNote />
            <div className="mt-8">
              <Actions onBrand />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-5 py-8 text-[13px] text-ink-3 sm:px-8">
          <Logo />
          <span>Nothing sends without your approval.</span>
          <span className="sm:ml-auto">Companies and people shown on this page are fictional examples.</span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
