"use client";
import { useCallback, useEffect, useState } from "react";

export interface Person {
  id: number;
  firstName: string;
  lastName: string | null;
  lastNameObfuscated: string;
  title: string | null;
  linkedinUrl: string | null;
  email: string | null;
  emailStatus: string | null;
  lookedUp: boolean;
  apolloHasEmail: boolean;
  company: string;
  domain: string;
}

export interface Usage {
  usedWeek: number;
  weekLimit: number | null;
  leftWeek: number | null;
  usedClub: number;
  clubCap: number;
  leftClub: number;
  apollo: boolean;
  scheduler: boolean;
  gmail: boolean;
}

/** Someone on the send list. `subject`/`body` are set only when the member edited this one email by hand. */
export interface ListEntry {
  id: number;
  email: string;
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string;
  domain: string;
  subject?: string;
  body?: string;
}

export const displayName = (p: { firstName: string; lastName: string | null; lastNameObfuscated?: string }) =>
  [p.firstName, p.lastName || p.lastNameObfuscated].filter(Boolean).join(" ");

const KEY = "beacn-send-list";

/** The send list survives page reloads on this device. */
export function useSendList() {
  const [list, setList] = useState<ListEntry[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved list once after mount
      if (raw) setList(JSON.parse(raw));
    } catch {}
  }, []);
  const save = useCallback((next: ListEntry[] | ((l: ListEntry[]) => ListEntry[])) => {
    setList((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {}
      return v;
    });
  }, []);
  return [list, save] as const;
}
