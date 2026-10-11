import "server-only";
import { callStructured, llmAvailable } from "@/lib/llm/client";
import { SearchSpecZ, searchSpecSchema, type SearchSpec } from "@/lib/llm/schemas";
import { SPEC_SYSTEM } from "@/lib/llm/prompts";
import { heuristicSpec } from "@/lib/llm/heuristic";
import type { OrgRow } from "./org";

export async function buildSpec(goal: string, mode: "client" | "partnership", org: OrgRow): Promise<{ spec: SearchSpec; source: "ai" | "demo" }> {
  if (!llmAvailable()) return { spec: heuristicSpec(goal, mode), source: "demo" };
  const today = new Date().toISOString().slice(0, 10);
  const r = await callStructured({
    system: SPEC_SYSTEM(mode),
    content: [
      {
        type: "text",
        text: `Today is ${today}.\nSender: ${org.orgName} — ${org.oneLiner}. Services: ${org.serviceCatalog.join("; ")}.\nGoal: ${goal}`,
      },
    ],
    schema: searchSpecSchema,
    parse: SearchSpecZ,
    label: "spec",
    maxTokens: 3000,
  });
  const spec = r.data;
  spec.criteria = spec.criteria.slice(0, 6).map((c, i) => ({ ...c, id: `c${i + 1}` }));
  if (!spec.roles.some((x) => x.checked)) spec.roles.slice(0, 2).forEach((x) => (x.checked = true));
  return { spec, source: "ai" };
}
