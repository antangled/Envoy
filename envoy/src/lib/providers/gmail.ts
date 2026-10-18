import "server-only";
import crypto from "node:crypto";
import { secret } from "@/lib/env";

// Overridable only so the end-to-end tests can point at the local mock server.
const TOKEN_URL = () => process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const GMAIL_BASE = () => process.env.GMAIL_BASE_URL || "https://gmail.googleapis.com";

export async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: secret("GOOGLE_CLIENT_ID")!,
      client_secret: secret("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${data.error_description || data.error || res.status}. Sign in again to reconnect Gmail.`);
  return data.access_token as string;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");
const wrap = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

/**
 * multipart/mixed
 *   multipart/alternative
 *     text/plain
 *     multipart/related (only when there's a logo)
 *       text/html
 *       image/* (Content-ID: logo)
 *   application/pdf (only when attaching the deck)
 */
export function buildMime(opts: {
  from: string;
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html?: string | null;
  logo?: { mime: string; base64: string; cid: string } | null;
  attachment?: { filename: string; base64: string } | null;
}) {
  const b = () => "envoy_" + crypto.randomBytes(8).toString("hex");
  const to = opts.toName ? `${encodeHeader(opts.toName)} <${opts.to}>` : opts.to;
  const headers = [
    `From: ${opts.from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@envoy.local>`,
    "MIME-Version: 1.0",
  ];
  const part = (type: string, body: string, extra: string[] = []) => [`Content-Type: ${type}`, ...extra, "Content-Transfer-Encoding: base64", "", wrap(body)].join("\r\n");
  const multipart = (kind: string, parts: string[]) => {
    const bd = b();
    return [`Content-Type: multipart/${kind}; boundary="${bd}"`, "", ...parts.flatMap((p) => [`--${bd}`, p]), `--${bd}--`, ""].join("\r\n");
  };
  const textPart = part("text/plain; charset=UTF-8", b64(opts.text));
  let content = textPart;
  if (opts.html) {
    let htmlPart = part("text/html; charset=UTF-8", b64(opts.html));
    if (opts.logo) {
      const img = part(opts.logo.mime, opts.logo.base64, [`Content-ID: <${opts.logo.cid}>`, `Content-Disposition: inline; filename="logo"`]);
      htmlPart = multipart("related", [htmlPart, img]);
    }
    content = multipart("alternative", [textPart, htmlPart]);
  }
  if (opts.attachment) {
    const att = part(`application/pdf; name="${opts.attachment.filename}"`, opts.attachment.base64, [`Content-Disposition: attachment; filename="${opts.attachment.filename}"`]);
    content = multipart("mixed", [content, att]);
  }
  return Buffer.from([...headers, content].join("\r\n")).toString("base64url");
}

/** Splits a data: URI into the pieces an inline MIME image needs. */
export function logoPart(dataUri: string | null | undefined) {
  const m = dataUri?.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/);
  return m ? { mime: m[1], base64: m[2], cid: "logo@envoy" } : null;
}

export async function sendGmail(accessToken: string, raw: string): Promise<string> {
  const res = await fetch(`${GMAIL_BASE()}/gmail/v1/users/me/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gmail send failed (${res.status})`);
  return data.id as string;
}
