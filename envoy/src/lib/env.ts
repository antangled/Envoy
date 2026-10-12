import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PLACEHOLDER = /^(paste|your|replace|placeholder|changeme|change-me|todo|xxx|none|null|undefined)|_here$|^<.*>$/i;

/** Reads a credential from the environment. Empty values and template placeholders (e.g. PASTE_YOUR_KEY_HERE) count as unset. */
export function secret(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && !PLACEHOLDER.test(v) ? v : undefined;
}

/** "placeholder" means the variable exists in .env.local but still holds the template value. */
const state = (...names: string[]) =>
  names.every((n) => secret(n)) ? "live" : names.some((n) => process.env[n]?.trim()) ? "placeholder" : "missing";

/** Public demo deployments set ENVOY_DEMO_ONLY=1: Google sign-in is off and only scripted demo accounts can use the app. */
export const demoOnly = () => process.env.ENVOY_DEMO_ONLY === "1";

export const integrations = () => ({
  anthropic: !!secret("ANTHROPIC_API_KEY"),
  exa: !!secret("EXA_API_KEY"),
  hunter: !!secret("HUNTER_API_KEY"),
  google: !demoOnly() && !!(secret("GOOGLE_CLIENT_ID") && secret("GOOGLE_CLIENT_SECRET")),
  database: !!secret("DATABASE_URL"),
});

export const integrationStates = () => ({
  anthropic: state("ANTHROPIC_API_KEY"),
  exa: state("EXA_API_KEY"),
  hunter: state("HUNTER_API_KEY"),
  google: state("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
});

export type Integrations = ReturnType<typeof integrations>;

/** Dev-only secret persisted under .data so sessions survive restarts. Production must set AUTH_SECRET / TOKEN_ENCRYPTION_KEY. */
function devSecret(name: string): string {
  if (process.env.NODE_ENV === "production") throw new Error(`${name} must be set in production`);
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name.toLowerCase()}.txt`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("base64"));
  return fs.readFileSync(file, "utf8").trim();
}

export const authSecret = () => process.env.AUTH_SECRET || devSecret("AUTH_SECRET");
export const tokenKey = () => process.env.TOKEN_ENCRYPTION_KEY || devSecret("TOKEN_ENCRYPTION_KEY");
export const appUrl = () => process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
