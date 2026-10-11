"use client";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "envoy-theme";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Theme, string> = { system: "Theme: matches your system", light: "Theme: light", dark: "Theme: dark" };

/** Sets the theme before first paint so there is no flash. Rendered once in the root layout's head. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** Cycles System, Light, Dark. The choice is remembered on this device. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a stored preference once after mount
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);
  const choose = () => {
    const t = NEXT[theme];
    setTheme(t);
    const root = document.documentElement;
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={choose}
      title={`${LABEL[theme]}. Click to change.`}
      aria-label={`${LABEL[theme]}. Change theme`}
      className={`grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink ${className}`}
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </svg>
      ) : theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4.5" width="18" height="12" rx="2" />
          <path d="M8.5 20h7M12 16.5V20" />
        </svg>
      )}
    </button>
  );
}
