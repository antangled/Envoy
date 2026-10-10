import "server-only";
import { callStructured, llmAvailable, pdfDoc, textDoc, MODELS } from "@/lib/llm/client";
import { OrgProfileZ, orgProfileSchema, type OrgProfile } from "@/lib/llm/schemas";
import { PROFILE_SYSTEM } from "@/lib/llm/prompts";
import { fetchPage } from "@/lib/providers/fetchPage";

export async function extractProfile(input: { deckB64?: string | null; website?: string | null }): Promise<{ profile: OrgProfile; source: string }> {
  if (!llmAvailable()) throw new Error("Profile extraction needs ANTHROPIC_API_KEY. Fill the form by hand, or load the sample profile.");
  const content: Parameters<typeof callStructured>[0]["content"] = [];
  const sources: string[] = [];
  if (input.deckB64) {
    content.push(pdfDoc(input.deckB64));
    sources.push("deck");
  }
  if (input.website) {
    const url = /^https?:\/\//.test(input.website) ? input.website : `https://${input.website}`;
    const page = await fetchPage(url);
    if (page?.text) {
      content.push(textDoc(page.text.slice(0, 20000), url));
      sources.push("url");
    }
  }
  if (!content.length) throw new Error("Couldn't read the deck or website. Check the URL, or upload a PDF.");
  content.push({ type: "text", text: "Extract the organization profile." });
  const r = await callStructured({ system: PROFILE_SYSTEM, content, schema: orgProfileSchema, parse: OrgProfileZ, model: MODELS.fast, maxTokens: 4000 });
  return { profile: r.data, source: sources.join("+") };
}
