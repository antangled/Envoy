"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStatus } from "./status";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/history", label: "Sent" },
  { href: "/setup", label: "Setup" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { status, refresh } = useStatus();
  const path = usePathname();
  const router = useRouter();
  const user = status?.user;
  const i = status?.integrations;
  const live = i ? [i.anthropic && "AI", i.exa && "Discovery", i.hunter && "Contacts"].filter(Boolean) : [];
  const demo = i && (!i.anthropic || !i.exa || !i.hunter);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
          <Link href={user ? "/campaigns" : "/"} className="flex items-center gap-2.5">
            <Seal />
            <span className="font-serif text-[22px] font-semibold tracking-[-0.01em]">Envoy</span>
          </Link>
          {user && (
            <nav className="flex gap-1" aria-label="Main">
              {NAV.map((n) => {
                const active = path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`rounded-md px-3 py-1.5 text-[14px] font-medium ${active ? "bg-sunken text-ink" : "text-ink-2 hover:text-ink"}`}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-4 text-[13px] text-ink-2">
            {demo && (
              <Link href="/setup#connections" className="rounded-full bg-warn-bg px-2.5 py-1 font-semibold text-warn" title={`Live: ${live.join(", ") || "none"}`}>
                Demo mode
              </Link>
            )}
            {user && (
              <>
                <span className="hidden sm:inline">{user.email}</span>
                <button
                  className="text-link hover:underline"
                  onClick={async () => {
                    await api("/api/auth/logout", { method: "POST" });
                    await refresh();
                    router.push("/");
                  }}
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-5 py-10">{children}</main>
    </div>
  );
}

export function Seal({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <path d="M16 2.5c2 0 2.6 1.7 4.4 2.2 1.9.5 3.5-.4 4.8.9 1.3 1.3.4 2.9.9 4.8.5 1.8 2.2 2.4 2.2 4.4s-1.7 2.6-2.2 4.4c-.5 1.9.4 3.5-.9 4.8-1.3 1.3-2.9.4-4.8.9-1.8.5-2.4 2.2-4.4 2.2s-2.6-1.7-4.4-2.2c-1.9-.5-3.5.4-4.8-.9-1.3-1.3-.4-2.9-.9-4.8C4.4 18.6 2.7 18 2.7 16s1.7-2.6 2.2-4.4c.5-1.9-.4-3.5.9-4.8 1.3-1.3 2.9-.4 4.8-.9C12.4 4.2 14 2.5 16 2.5Z" fill="var(--seal)" />
      <path d="M11 11h10M11 16h7M11 21h10" stroke="var(--on-seal)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
