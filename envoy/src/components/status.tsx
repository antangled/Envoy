"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/client/api";

export interface Status {
  integrations: { anthropic: boolean; exa: boolean; hunter: boolean; google: boolean; database: boolean };
  keyStates: Record<"anthropic" | "exa" | "hunter" | "google", "live" | "placeholder" | "missing">;
  user: { id: number; email: string; isDemo: boolean; gmailConnected: boolean; dailyCap: number; isAdmin: boolean; beacnMember: boolean; campaigns: boolean } | null;
  demoOnly: boolean;
  profileComplete: boolean;
}

const Ctx = createContext<{ status: Status | null; refresh: () => Promise<void> }>({ status: null, refresh: async () => {} });

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const refresh = useCallback(async () => {
    setStatus(await api<Status>("/api/status"));
  }, []);
  useEffect(() => {
    let alive = true;
    api<Status>("/api/status")
      .then((s) => alive && setStatus(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return <Ctx.Provider value={{ status, refresh }}>{children}</Ctx.Provider>;
}

export const useStatus = () => useContext(Ctx);
