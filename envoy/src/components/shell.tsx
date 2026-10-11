"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStatus } from "./status";
import { api } from "@/lib/client/api";
import { Logo } from "./Logo";

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
            <Logo />
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
