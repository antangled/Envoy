"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStatus } from "@/components/status";
import { Button, Notice } from "@/components/ui";
import { api } from "@/lib/client/api";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or try the demo.",
  access_denied: "Google sign-in was cancelled.",
  gmail_permission_not_granted: "Envoy needs permission to send email on your behalf. Sign in again and leave the Gmail box checked.",
  state_mismatch: "Sign-in expired. Try again.",
};

function Landing() {
  const { status, refresh } = useStatus();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const err = params.get("error");

  useEffect(() => {
    if (status?.user) router.replace(status.profileComplete ? "/campaigns" : "/setup");
  }, [status, router]);

  return (
    <div className="grid items-start gap-12 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <div className="max-w-[560px]">
        <h1 className="font-serif text-[44px] font-medium leading-[1.08] tracking-[-0.015em] sm:text-[52px]">
          Reach the right person with a reason they&rsquo;ll recognize.
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
          Describe who you want to work with. Envoy finds organizations that fit, researches each one with sources you can click, finds the person to write to, and drafts an email in your own words. You review every message and send it from your Gmail.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {status?.integrations.google ? (
            <a href="/api/auth/google" className="inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-[14px] font-semibold text-paper hover:opacity-90">
              Continue with Google
            </a>
          ) : (
            <Button disabled>Continue with Google</Button>
          )}
          <Button
            variant="quiet"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              await api("/api/auth/demo", { method: "POST" });
              await refresh();
            }}
          >
            Try the demo
          </Button>
        </div>
        <p className="mt-3 text-[13px] text-ink-3">
          Envoy asks only for permission to send. It can&rsquo;t read your inbox.
          {status && !status.integrations.google && " Google sign-in activates once OAuth credentials are added."}
        </p>
        {err && (
          <div className="mt-6">
            <Notice tone="bad">{ERRORS[err] ?? `Sign-in failed: ${err}`}</Notice>
          </div>
        )}
        <ul className="mt-12 grid gap-5 border-t border-rule pt-8 text-[14px] text-ink-2 sm:grid-cols-3">
          <li><span className="block font-semibold text-ink">Sourced, not guessed</span>Every claim links to the page it came from. Unknowns are listed, not filled in.</li>
          <li><span className="block font-semibold text-ink">Your template</span>Your intro, credentials, and ask stay word for word. Only the opening and ideas are written per company.</li>
          <li><span className="block font-semibold text-ink">Sent like a person</span>From your Gmail, one at a time, a few minutes apart, 30 a day by default.</li>
        </ul>
      </div>

      <figure className="rounded-xl border border-rule bg-surface p-7 shadow-[0_1px_0_var(--rule)]">
        <figcaption className="mb-4 flex items-center justify-between text-[13px] text-ink-3">
          <span>A draft, as Envoy shows it</span>
          <span className="flex items-center gap-1.5"><span className="carbon inline-block h-3 w-5" /> written for this company</span>
        </figcaption>
        <div className="letter text-ink">
          <p>Dear Alejandro,</p>
          <p className="mt-3">
            Hope you&rsquo;re doing well! I&rsquo;m Adam, a Project Manager at BEACN, a student-run sustainability consulting group at UC Berkeley. I saw{" "}
            <span className="carbon">Lightship&rsquo;s launch of PowerSled as a new commercial business and your plans to quadruple manufacturing capacity by the end of 2026</span>
            <sup className="cite">1</sup>, and wanted to reach out about potentially supporting that growth through a semester-long project.
          </p>
          <p className="mt-3">A few ideas that came to mind:</p>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            <li><span className="carbon"><em>Market targeting</em>: Identify the industries and applications where PowerSled offers the strongest commercial advantage over diesel generators.</span><sup className="cite">1</sup></li>
            <li><span className="carbon"><em>Customer economics</em>: Model the cost and emissions case for PowerSled across priority use cases.</span><sup className="cite">2</sup></li>
          </ul>
        </div>
        <div className="mt-5 border-t border-rule pt-3 text-[13px] text-ink-2">
          <p><span className="font-semibold text-link">1</span> lightshiprv.com, product announcement</p>
          <p><span className="font-semibold text-link">2</span> lightshiprv.com, PowerSled page</p>
        </div>
      </figure>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
