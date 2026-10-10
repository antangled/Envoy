import "server-only";
import crypto from "node:crypto";

export async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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

export function buildMime(opts: {
  from: string;
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  attachment?: { filename: string; base64: string } | null;
}) {
  const boundary = "envoy_" + crypto.randomBytes(8).toString("hex");
  const to = opts.toName ? `${encodeHeader(opts.toName)} <${opts.to}>` : opts.to;
  const headers = [
    `From: ${opts.from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@envoy.local>`,
    "MIME-Version: 1.0",
  ];
  const textPart = ["Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap(b64(opts.text))].join("\r\n");
  let mime: string;
  if (opts.attachment) {
    const att = [
      `Content-Type: application/pdf; name="${opts.attachment.filename}"`,
      `Content-Disposition: attachment; filename="${opts.attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap(opts.attachment.base64),
    ].join("\r\n");
    mime = [...headers, `Content-Type: multipart/mixed; boundary="${boundary}"`, "", `--${boundary}`, textPart, `--${boundary}`, att, `--${boundary}--`, ""].join("\r\n");
  } else {
    mime = [...headers, textPart].join("\r\n");
  }
  return Buffer.from(mime).toString("base64url");
}

export async function sendGmail(accessToken: string, raw: string): Promise<string> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gmail send failed (${res.status})`);
  return data.id as string;
}
