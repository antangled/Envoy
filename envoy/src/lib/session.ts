import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { authSecret, campaignsAllowed } from "./env";
import { getDb, schema } from "@/db";

const COOKIE = "envoy_session";
const secret = () => new TextEncoder().encode(authSecret());

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const db = await getDb();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, Number(payload.uid)));
    return u ?? null;
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Any signed-in account. Used by the BEACN tool, which does its own membership check. */
export async function requireAnyUser() {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Sign in to continue.");
  return u;
}

/** Envoy campaign routes. On a demo-only deployment only demo accounts and admins get through, so no one else can spend AI credits. */
export async function requireUser() {
  const u = await requireAnyUser();
  if (!campaignsAllowed(u)) throw new HttpError(403, "Envoy campaigns aren't open on this site yet. Try the demo, or use BEACN Outreach if you're a member.");
  return u;
}

/** Wrap a route handler so thrown HttpErrors and unexpected errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
    }
  };
}
