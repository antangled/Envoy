import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appUrl, secret } from "@/lib/env";

const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send"];

export async function GET(req: Request) {
  // Google returns to APP_URL, so sign-in has to start there too or the state cookie lands on the wrong host
  // (Vercel serves the same app on several addresses).
  const here = new URL(req.url);
  const home = new URL(appUrl());
  if (here.host !== home.host && !here.hostname.endsWith("localhost") && here.hostname !== "127.0.0.1") redirect(`${home.origin}/api/auth/google${here.search}`);
  const clientId = secret("GOOGLE_CLIENT_ID");
  if (!clientId || !secret("GOOGLE_CLIENT_SECRET")) redirect("/?error=google_not_configured");
  const state = crypto.randomBytes(16).toString("hex");
  // Where to land after sign-in (internal paths only), e.g. /beacn for club members.
  const next = here.searchParams.get("next");
  if (next && /^\/[a-z0-9/_-]*$/i.test(next)) (await cookies()).set("envoy_next", next, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: process.env.NODE_ENV === "production" });
  (await cookies()).set("envoy_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, secure: process.env.NODE_ENV === "production" });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
