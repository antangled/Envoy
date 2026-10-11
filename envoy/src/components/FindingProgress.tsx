"use client";
import { useEffect, useState } from "react";

const TIPS = [
  "Every company comes with the pages Envoy read, so you can check its work.",
  "Envoy never sends anything until you choose who gets what.",
  "Companies you've already emailed are skipped automatically.",
  "Each email opens with something recent and real about that company.",
  "You can edit any draft before it goes out.",
];

/** Shown while a campaign's organizations are found (an Exa search that takes up to a minute). */
export function FindingProgress({ phase, live }: { phase: "goal" | "search"; live: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setT((Date.now() - start) / 1000), 250);
    return () => clearInterval(id);
  }, []);
  // Eases toward 95% and never claims to be finished before it is.
  const pct = phase === "goal" ? Math.min(14, 4 + t * 3) : Math.min(95, 15 + 80 * (1 - Math.exp(-t / (live ? 30 : 4))));
  const steps = [
    { label: "Understanding your goal", done: phase === "search" },
    { label: live ? "Searching the web for organizations that match" : "Loading the demo company list", done: false, active: phase === "search" },
    { label: "Checking each one against your goal", done: false, active: phase === "search" && t > (live ? 15 : 1.5) },
    { label: "Skipping anyone you've already contacted", done: false, active: phase === "search" && t > (live ? 35 : 3) },
  ];
  const tip = TIPS[Math.floor(t / 6) % TIPS.length];

  return (
    <div className="mx-auto max-w-[680px] py-6" role="status" aria-live="polite">
      <h2 className="font-serif text-[30px] font-medium leading-tight">Finding organizations for you</h2>
      <p className="mt-2 text-[15px] text-ink-2">
        {Math.floor(t)}s{live ? " · usually under a minute" : ""}
      </p>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className="h-full rounded-full bg-seal transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-3 text-[15px] ${s.done || s.active ? "text-ink" : "text-ink-3"}`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${s.done ? "bg-ok text-canvas" : s.active ? "border-2 border-seal" : "border border-rule"}`}>
              {s.done ? "✓" : s.active ? <span className="working h-2 w-2 rounded-full bg-seal" /> : i + 1}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <ul className="mt-8 space-y-2" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-rule bg-surface px-4 py-3">
            <span className="shimmer h-4 w-4 rounded" />
            <span className="shimmer h-3.5 rounded" style={{ width: `${30 + ((i * 17) % 25)}%` }} />
            <span className="shimmer ml-auto h-3 w-16 rounded" />
          </li>
        ))}
      </ul>

      <p key={tip} className="fade-up mt-6 text-center text-[14px] text-ink-2">{tip}</p>
    </div>
  );
}
