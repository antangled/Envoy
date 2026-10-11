import { HttpError, handle, requireUser } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { accessTokenFromRefresh, buildMime, logoPart, sendGmail } from "@/lib/providers/gmail";
import { getOrg, signatureFor, templatesFor } from "@/lib/pipeline/org";
import { blocksToText, emailHtml, footerText, renderBody, renderSubject, signatureLines } from "@/lib/template/render";

/**
 * Sends your client-outreach email, as a sample addressed to a placeholder company, to the signed-in account only.
 * Generated parts appear as bracketed notes so you can see exactly where they go.
 */
export const POST = handle(async () => {
  const u = await requireUser();
  if (!u.googleRefreshTokenEnc) throw new HttpError(400, "Connect Gmail first: sign out and continue with Google.");
  const org = await getOrg(u.id);
  const sig = signatureFor(org);
  const t = templatesFor(org);
  const ctx = {
    company: "Northwind Robotics",
    firstName: sig.firstName || "there",
    slots: {
      hook: { text: "[Envoy writes a recent, sourced detail about the company here]", evidence_ids: [] },
      ideas: [1, 2, 3].map((n) => ({ title: `[Idea ${n}]`, sentence: "[Envoy writes an idea for this company here, built on one of your services]", evidence_ids: [] })),
    },
  };
  const body = `${blocksToText(renderBody(t.client, ctx))}\n\n${signatureLines(sig).join("\n")}`;
  const footer = footerText({ meName: sig.name, orgName: sig.org, postalAddress: sig.postalAddress || "[your postal address]" }, ctx.company);
  const logo = logoPart(sig.logo);
  const token = await accessTokenFromRefresh(decrypt(u.googleRefreshTokenEnc));
  const raw = buildMime({
    from: sig.name ? `${sig.name} <${u.email}>` : u.email,
    to: u.email,
    subject: `[Envoy test] ${renderSubject(t.subject, ctx)}`,
    text: `${body}\n\n${footer}`,
    html: emailHtml(body, footer, logo?.cid ?? null),
    logo,
  });
  const id = await sendGmail(token, raw);
  return Response.json({ ok: true, to: u.email, gmailMessageId: id });
});
