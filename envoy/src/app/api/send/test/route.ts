import { HttpError, handle, requireUser } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { accessTokenFromRefresh, buildMime, sendGmail } from "@/lib/providers/gmail";
import { getOrg } from "@/lib/pipeline/org";

/** Sends one test message to the signed-in account's own address. It cannot address anyone else. */
export const POST = handle(async () => {
  const u = await requireUser();
  if (!u.googleRefreshTokenEnc) throw new HttpError(400, "Connect Gmail first: sign out and continue with Google.");
  const org = await getOrg(u.id);
  const name = org?.meName || "";
  const text = [
    `This is a test from Envoy, sent through your Gmail with send-only permission.`,
    ``,
    `Your outreach emails will arrive just like this one: plain text, from your own address, one recipient at a time, with no tracking pixels or rewritten links.`,
    ``,
    `—`,
    `Sent by Envoy on ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.`,
  ].join("\n");
  const token = await accessTokenFromRefresh(decrypt(u.googleRefreshTokenEnc));
  const raw = buildMime({ from: name ? `${name} <${u.email}>` : u.email, to: u.email, subject: "Envoy test: Gmail sending works", text });
  const id = await sendGmail(token, raw);
  return Response.json({ ok: true, to: u.email, gmailMessageId: id });
});
