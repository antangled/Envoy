import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeJwt } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { appUrl, secret } from "@/lib/env";
import { encrypt } from "@/lib/crypto";
import { createSession } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("envoy_oauth_state")?.value;
  jar.delete("envoy_oauth_state");
  if (url.searchParams.get("error")) redirect(`/?error=${encodeURIComponent(url.searchParams.get("error")!)}`);
  if (!code || !state || state !== expected) redirect("/?error=state_mismatch");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: secret("GOOGLE_CLIENT_ID")!,
      client_secret: secret("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tok = await res.json();
  if (!res.ok || !tok.id_token) redirect(`/?error=${encodeURIComponent(tok.error || "token_exchange_failed")}`);
  if (!String(tok.scope || "").includes("gmail.send")) redirect("/?error=gmail_permission_not_granted");
  const { email, name } = decodeJwt(tok.id_token) as { email?: string; name?: string };
  if (!email) redirect("/?error=no_email");

  const db = await getDb();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  let id: number;
  if (existing) {
    id = existing.id;
    await db
      .update(schema.users)
      .set({ ...(tok.refresh_token ? { googleRefreshTokenEnc: encrypt(tok.refresh_token) } : {}), ...(name ? { name } : {}) })
      .where(eq(schema.users.id, id));
  } else {
    const [row] = await db.insert(schema.users).values({ email: email.toLowerCase(), name: name ?? null, googleRefreshTokenEnc: tok.refresh_token ? encrypt(tok.refresh_token) : null }).returning();
    id = row.id;
  }
  await createSession(id);
  void appUrl;
  redirect("/campaigns");
}
