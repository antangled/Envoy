import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const integrations = () => ({
  anthropic: !!process.env.ANTHROPIC_API_KEY,
  exa: !!process.env.EXA_API_KEY,
  hunter: !!process.env.HUNTER_API_KEY,
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  database: !!process.env.DATABASE_URL,
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
