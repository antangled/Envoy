import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Spend recorded while a campaign step runs. Dollar figures use list prices; Hunter is counted in lookups. */
export interface Usage {
  claudeUsd: number;
  exaUsd: number;
  hunterLookups: number;
  sonnetBriefs: number;
}

const store = new AsyncLocalStorage<Usage>();
const empty = (): Usage => ({ claudeUsd: 0, exaUsd: 0, hunterLookups: 0, sonnetBriefs: 0 });

// $ per million tokens: [input, output, cache read]. Cache writes (5-minute TTL) cost 1.25x input.
const PRICES: Record<string, [number, number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
  "claude-sonnet-5-5": [2, 10, 0.2],
};

/** Optional per-call ledger for cost diagnostics: set ENVOY_USAGE_LOG to a file path to append one JSON line per paid call. */
function ledger(entry: Record<string, unknown>) {
  const file = process.env.ENVOY_USAGE_LOG;
  if (!file) return;
  try {
    appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
  } catch {}
}

export function recordClaude(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite?: number }, label = "claude") {
  const s = store.getStore();
  const p = PRICES[model];
  const usd = p ? (u.input * p[0] + u.output * p[1] + u.cacheRead * p[2] + (u.cacheWrite ?? 0) * p[0] * 1.25) / 1e6 : 0;
  if (s) s.claudeUsd += usd;
  ledger({ api: "claude", label, model, ...u, usd });
}
export function recordExa(dollars: number | undefined | null, label = "exa", detail?: Record<string, unknown>) {
  const s = store.getStore();
  if (s && dollars) s.exaUsd += dollars;
  ledger({ api: "exa", label, usd: dollars ?? null, ...detail });
}
export function recordHunter(lookups = 1, label = "hunter", detail?: Record<string, unknown>) {
  const s = store.getStore();
  if (s) s.hunterLookups += lookups;
  ledger({ api: "hunter", label, lookups, ...detail });
}
/** Free events worth seeing in the ledger, such as cache hits. */
export function recordFree(api: string, label: string, detail?: Record<string, unknown>) {
  ledger({ api, label, free: true, ...detail });
}
export function recordSonnetBrief() {
  const s = store.getStore();
  if (s) s.sonnetBriefs += 1;
}

/** Runs fn with a usage collector, then adds what it spent to the campaign's running total. */
export async function withUsage<T>(campaignId: number, fn: () => Promise<T>): Promise<T> {
  const u = empty();
  try {
    return await store.run(u, fn);
  } finally {
    const db = await getDb();
    await db
      .update(schema.campaigns)
      .set({
        usage: sql`jsonb_build_object(
          'claudeUsd', coalesce((${schema.campaigns.usage}->>'claudeUsd')::float, 0) + ${u.claudeUsd},
          'exaUsd', coalesce((${schema.campaigns.usage}->>'exaUsd')::float, 0) + ${u.exaUsd},
          'hunterLookups', coalesce((${schema.campaigns.usage}->>'hunterLookups')::int, 0) + ${u.hunterLookups},
          'sonnetBriefs', coalesce((${schema.campaigns.usage}->>'sonnetBriefs')::int, 0) + ${u.sonnetBriefs}
        )`,
      })
      .where(eq(schema.campaigns.id, campaignId));
  }
}
