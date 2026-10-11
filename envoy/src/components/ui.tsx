"use client";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "seal" | "quiet" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:opacity-90",
  seal: "bg-seal text-on-seal hover:bg-seal-hover",
  quiet: "bg-surface text-ink border border-rule hover:bg-sunken",
  ghost: "text-link hover:underline",
};
// Ghost buttons sit inline in text and rows, so they take no fixed height or padding.
const size = (v: Variant) => (v === "ghost" ? "" : "h-9 px-3.5");

export function Button({ variant = "primary", className = "", busy, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${size(variant)} ${styles[variant]} ${className}`}
    >
      {busy && <span className="working inline-block h-2 w-2 rounded-full bg-current" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", children, className = "" }: { href: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors duration-150 ${size(variant)} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

type Tone = "ok" | "warn" | "bad" | "muted" | "carbon";
const tones: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  muted: "bg-muted-bg text-ink-2",
  carbon: "bg-carbon text-link",
};
export function Badge({ tone = "muted", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-lg px-4 py-3 text-[14px] ${tones[tone]}`}>{children}</div>;
}

export function Label({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="text-[14px] font-semibold text-ink">{children}</span>
      {hint && <span className="mt-0.5 block text-[13px] text-ink-2">{hint}</span>}
    </label>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-[32px] font-medium leading-[1.12] tracking-[-0.015em] text-ink">{children}</h1>
      {sub && <p className="mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{sub}</p>}
    </div>
  );
}
