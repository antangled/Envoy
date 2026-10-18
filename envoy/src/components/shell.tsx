"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStatus } from "./status";
import { api } from "@/lib/client/api";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const ENVOY_NAV = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/history", label: "Sent" },
  { href: "/setup", label: "Setup" },
];
const BEACN_NAV = { href: "/beacn", label: "BEACN Outreach" };

export function Shell({ children }: { children: React.ReactNode }) {
  const { status, refresh } = useStatus();
  const path = usePathname();
  const router = useRouter();
  const user = status?.user;
  const i = status?.integrations;
  const live = i ? [i.anthropic && "AI", i.exa && "Discovery", i.hunter && "Contacts"].filter(Boolean) : [];
  const demo = i && (!i.anthropic || !i.exa || !i.hunter);

  // The signed-out home page is the marketing page and brings its own navigation, full width.
  if (path === "/" || path.startsWith("/demo/source/")) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-rule bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-x-6 px-5">
          <Link href="/" aria-label="Envoy home" className="flex items-center gap-2.5 rounded-md">
            <Logo />
          </Link>
          {user && (
            <nav className="flex gap-0.5" aria-label="Main">
              {[...(user.campaigns ? ENVOY_NAV : []), ...(!user.isDemo && (user.beacnMember || !user.campaigns) ? [BEACN_NAV] : [])].map((n) => {
                const active = path.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md px-2.5 py-1.5 text-[14px] font-medium transition-colors duration-150 ${active ? "bg-sunken text-ink" : "text-ink-2 hover:bg-sunken/70 hover:text-ink"}`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-3 text-[13px] text-ink-2">
            <ThemeToggle />
            {demo && (
              <Link href="/setup#connections" className="rounded-full border border-warn/30 bg-warn-bg px-2.5 py-0.5 font-semibold text-warn" title={`Live: ${live.join(", ") || "none"}`}>
                Demo mode
              </Link>
            )}
            {user && (
              <>
                {user.isDemo ? (
                  <span className="rounded-full border border-rule bg-sunken px-2.5 py-0.5 font-semibold text-ink-2" title="Sample companies and people. Nothing is sent.">
                    Demo · sample data
                  </span>
                ) : (
                  <span className="hidden items-center gap-2 sm:flex">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] font-semibold text-on-seal" aria-hidden>
                      {user.email.slice(0, 1).toUpperCase()}
                    </span>
                    {user.email}
                  </span>
                )}
                <span className="hidden h-4 w-px bg-rule sm:block" aria-hidden />
                <button
                  className="rounded-md px-1.5 py-1 font-medium text-ink-2 hover:text-ink"
                  onClick={async () => {
                    await api("/api/auth/logout", { method: "POST" });
                    await refresh();
                    router.push("/");
                  }}
                >
                  {user.isDemo ? "Exit demo" : "Sign out"}
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
