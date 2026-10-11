import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
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

// $ per million tokens: [input, output, cache read]
const PRICES: Record<string, [number, number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
  "claude-sonnet-5-5": [2, 10, 0.1],
};

export function recordClaude(model: string, u: { input: number; output: number; cacheRead: number }) {
  const s = store.getStore();
  const p = PRICES[model];
  if (s && p) s.claudeUsd += (u.input * p[0] + u.output * p[1] + u.cacheRead * p[2]) / 1e6;
}
export function recordExa(dollars: number | undefined | null) {
  const s = store.getStore();
  if (s && dollars) s.exaUsd += dollars;
}
export function recordHunter(lookups = 1) {
  const s = store.getStore();
  if (s) s.hunterLookups += lookups;
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
