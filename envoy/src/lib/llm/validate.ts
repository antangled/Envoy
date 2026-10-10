import type { BriefAndSlots } from "./schemas";

export interface EvidenceDoc {
  eid: string;
  url: string;
  title: string;
  text: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

function tokenSim(a: string, b: string) {
  const ta = new Set(norm(a).split(/[^a-z0-9]+/).filter(Boolean));
  const tb = new Set(norm(b).split(/[^a-z0-9]+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

export interface ValidationResult {
  brief: BriefAndSlots;
  log: string[];
  /** Number of items relabelled or dropped; drives escalation to the stronger model. */
  problems: number;
  hookFailed: boolean;
}

/** Deterministic checks from the spec (§3.2, steps 1–5). Never trusts the model's citations. */
export function validateBrief(input: BriefAndSlots, docs: EvidenceDoc[], catalog: string[]): ValidationResult {
  const b: BriefAndSlots = structuredClone(input);
  const log: string[] = [];
  let problems = 0;
  const ids = new Set(docs.map((d) => d.eid));
  const byId = new Map(docs.map((d) => [d.eid, norm(d.text)]));
  const keepIds = (list: string[], where: string) => {
    const ok = list.filter((x) => ids.has(x));
    if (ok.length !== list.length) {
      problems++;
      log.push(`${where}: dropped unknown evidence id(s) ${list.filter((x) => !ids.has(x)).join(", ")}`);
    }
    return [...new Set(ok)];
  };

  // 1 + 3: criteria and benefits must cite real evidence
  for (const c of b.criteria) {
    c.evidence_ids = keepIds(c.evidence_ids, `criterion ${c.id}`);
    if ((c.status === "supported" || c.status === "not_met") && c.evidence_ids.length === 0) {
      log.push(`criterion ${c.id}: "${c.status}" without citations, relabelled unknown`);
      c.status = "unknown";
      problems++;
    }
  }
  for (const m of b.mutual_benefit) {
    m.evidence_ids = keepIds(m.evidence_ids, "benefit");
    if (m.basis === "evidenced" && m.evidence_ids.length === 0) {
      log.push(`benefit "${m.claim.slice(0, 40)}…": evidenced without citations, relabelled inferred`);
      m.basis = "inferred";
      problems++;
    }
  }

  // 2: hook quotes must be exact substrings of a cited document
  b.hook.evidence_ids = keepIds(b.hook.evidence_ids, "hook");
  const citedText = b.hook.evidence_ids.map((id) => byId.get(id) || "");
  const goodQuotes = b.hook.quotes.filter((q) => q.trim().length >= 8 && citedText.some((t) => t.includes(norm(q))));
  if (goodQuotes.length !== b.hook.quotes.length) {
    log.push(`hook: ${b.hook.quotes.length - goodQuotes.length} quote(s) not found verbatim in cited evidence`);
  }
  b.hook.quotes = goodQuotes;
  const hookFailed = goodQuotes.length === 0 || b.hook.evidence_ids.length === 0;
  if (hookFailed) {
    log.push("hook: no verifiable quote; needs regeneration");
    problems++;
  }
  b.hook.text = b.hook.text.trim().replace(/[.!]+$/, "");

  // 4: exactly three ideas, each tied to a catalog service and evidence
  if (b.ideas.length !== 3) {
    log.push(`ideas: expected 3, got ${b.ideas.length}`);
    problems++;
    b.ideas = b.ideas.slice(0, 3);
  }
  for (const idea of b.ideas) {
    idea.evidence_ids = keepIds(idea.evidence_ids, `idea "${idea.title}"`);
    if (catalog.length) {
      const best = catalog.map((s) => [s, tokenSim(s, idea.service)] as const).sort((x, y) => y[1] - x[1])[0];
      if (best[1] >= 0.5) idea.service = best[0];
      else {
        log.push(`idea "${idea.title}": service "${idea.service}" not in catalog`);
        problems++;
      }
    }
    if (idea.evidence_ids.length === 0) {
      log.push(`idea "${idea.title}": no evidence cited`);
      problems++;
    }
  }

  // 5: thin evidence caps the fit score
  b.fit_score = Math.max(0, Math.min(100, Math.round(b.fit_score)));
  if (docs.length < 3) {
    b.fit_score = Math.min(b.fit_score, 50);
    b.missing_information.push({
      question: `Limited public information found (${docs.length} page${docs.length === 1 ? "" : "s"})`,
      why_it_matters: "The fit assessment rests on very little evidence.",
      how_to_verify: "Ask about current priorities on a first call, or check recent press and job listings.",
    });
    log.push(`fit capped at 50: only ${docs.length} evidence page(s)`);
  }
  if (b.subject.length > 60) b.subject = b.subject.slice(0, 57).trimEnd() + "…";
  b.subject = b.subject.replace(/^(re|fwd?):\s*/i, "");
  return { brief: b, log, problems, hookFailed };
}

/** Claims the verifier model should check: supported criteria and evidenced benefits, with their cited passages. */
export function claimsForVerifier(b: BriefAndSlots, docs: EvidenceDoc[], criteriaText: Map<string, string>) {
  const byId = new Map(docs.map((d) => [d.eid, d.text]));
  const passages = (ids: string[]) => ids.map((id) => `[${id}] ${(byId.get(id) || "").slice(0, 1500)}`).join("\n");
  const out: { id: string; claim: string; passages: string }[] = [];
  for (const c of b.criteria)
    if (c.status === "supported") out.push({ id: `crit:${c.id}`, claim: `${criteriaText.get(c.id) || c.id} — ${c.note}`, passages: passages(c.evidence_ids) });
  b.mutual_benefit.forEach((m, i) => {
    if (m.basis === "evidenced") out.push({ id: `ben:${i}`, claim: m.claim, passages: passages(m.evidence_ids) });
  });
  return out;
}

export function applyVerdicts(b: BriefAndSlots, verdicts: { id: string; verdict: string }[], log: string[]) {
  let n = 0;
  for (const v of verdicts) {
    if (v.verdict !== "not_supported") continue;
    const [kind, key] = v.id.split(":");
    if (kind === "crit") {
      const c = b.criteria.find((x) => x.id === key);
      if (c && c.status === "supported") {
        c.status = "unknown";
        log.push(`verifier: criterion ${key} not supported by its sources, relabelled unknown`);
        n++;
      }
    } else if (kind === "ben") {
      const m = b.mutual_benefit[Number(key)];
      if (m && m.basis === "evidenced") {
        m.basis = "inferred";
        log.push(`verifier: benefit ${Number(key) + 1} not supported by its sources, relabelled inferred`);
        n++;
      }
    }
  }
  return n;
}
