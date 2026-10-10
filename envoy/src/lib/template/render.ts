/** Shared by server and client: renders the locked template + generated slots into segments (for highlighting) and plain text. */

export type Mode = "client" | "partnership";

export interface RenderInput {
  mode: Mode;
  org: {
    orgName: string;
    oneLiner: string;
    tagline: string;
    teamStructure: string;
    proofPoints: string[];
    serviceCatalog: string[];
    meName: string;
    meFirstName: string;
    meRole: string;
    mePronouns: string;
    postalAddress: string;
    deckUrl: string;
    hasDeck: boolean;
  };
  campaign: { offerPhrase: string; seasonLabel: string; attachDeck: boolean };
  company: { name: string };
  contact: { firstName: string | null };
  slots: { hook: { text: string; evidence_ids: string[] }; ideas: { title: string; sentence: string; evidence_ids: string[] }[] };
}

export type Segment =
  | { kind: "locked"; text: string }
  | { kind: "hook"; text: string; evidenceIds: string[] }
  | { kind: "idea"; title: string; text: string; evidenceIds: string[] };

const joinList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`);

export function renderSegments(i: RenderInput): Segment[][] {
  const { org, campaign, company, mode } = i;
  const greetingName = i.contact.firstName || `${company.name} team`;
  const deckLine = org.hasDeck && campaign.attachDeck ? " (More info in deck attached)" : org.deckUrl ? ` (More info: ${org.deckUrl})` : "";
  const one = org.oneLiner ? `, ${org.oneLiner}` : "";
  const partnership = mode === "partnership";

  const paras: Segment[][] = [
    [{ kind: "locked", text: `Dear ${greetingName},` }],
    [
      { kind: "locked", text: `Hope you're doing well! I'm ${org.meFirstName || org.meName}, a ${org.meRole} at ${org.orgName}${one}. I saw ` },
      { kind: "hook", text: i.slots.hook.text, evidenceIds: i.slots.hook.evidence_ids },
      {
        kind: "locked",
        text: partnership
          ? `, and wanted to explore whether there's a way for ${org.orgName} and ${company.name} to work together.`
          : `, and wanted to reach out about potentially supporting that through ${campaign.offerPhrase}.`,
      },
    ],
    [{ kind: "locked", text: partnership ? "A few ways this could look:" : "A few ideas that came to mind:" }],
    i.slots.ideas.map((x) => ({ kind: "idea" as const, title: x.title, text: x.sentence, evidenceIds: x.evidence_ids })),
  ];
  const cred: string[] = [];
  if (org.teamStructure) cred.push(`To provide some context, ${org.teamStructure.replace(/\.$/, "")}.`);
  if (org.proofPoints.length || org.serviceCatalog.length)
    cred.push(
      `${org.proofPoints.length ? `Across ${joinList(org.proofPoints)}, we've` : "We've"} worked on ${joinList(org.serviceCatalog)}.${deckLine}`,
    );
  if (cred.length) paras.push([{ kind: "locked", text: cred.join(" ") }]);
  paras.push([
    {
      kind: "locked",
      text: partnership
        ? `We're mapping our ${campaign.seasonLabel} partnerships now, and I'd love to hear what would be most useful to ${company.name}.`
        : `We're finalizing our ${campaign.seasonLabel} projects this week, and I'd love to hear what would actually be most useful to ${company.name}.`,
    },
  ]);
  paras.push([
    {
      kind: "locked",
      text: partnership
        ? "Would a 20-minute call be worthwhile? Happy to work around your calendar."
        : "Would this be of interest to you? If so, I'm happy to arrange a time as early as tomorrow; happy to work around your calendar.",
    },
  ]);
  const sig = ["Best,", org.meFirstName || org.meName, org.mePronouns ? `(${org.mePronouns})` : "", org.meRole, org.orgName, org.tagline].filter(Boolean).join("\n");
  paras.push([{ kind: "locked", text: sig }]);
  return paras;
}

export function segmentsToText(paras: Segment[][]): string {
  return paras
    .map((p) =>
      p[0]?.kind === "idea"
        ? p.map((s) => (s.kind === "idea" ? `- ${s.title}: ${s.text}` : s.text)).join("\n")
        : p.map((s) => s.text).join(""),
    )
    .join("\n\n");
}

export function footerText(o: { meName: string; orgName: string; postalAddress: string }, companyName: string) {
  return [
    "—",
    [o.meName, o.orgName, o.postalAddress].filter(Boolean).join(" · "),
    `You're receiving this because I found your role at ${companyName} on your company's website. If you'd rather not hear from me, reply "unsubscribe" and I'll remove you.`,
  ].join("\n");
}
