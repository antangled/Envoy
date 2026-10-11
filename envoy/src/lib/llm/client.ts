import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { secret } from "@/lib/env";
import { recordClaude } from "@/lib/usage";

export const MODELS = { fast: "claude-haiku-5-5", strong: "claude-sonnet-5-5" } as const;

let client: Anthropic | null = null;
// Pin the base URL: the SDK otherwise reads ANTHROPIC_BASE_URL, which developer tools sometimes set for their own use.
const anthropic = () =>
  (client ??= new Anthropic({
    apiKey: secret("ANTHROPIC_API_KEY"),
    baseURL: process.env.ENVOY_ANTHROPIC_BASE_URL || "https://api.anthropic.com",
    maxRetries: 3,
    // Keys not scoped to a workspace must name one on every request.
    defaultHeaders: secret("ANTHROPIC_WORKSPACE_ID") ? { "anthropic-workspace-id": secret("ANTHROPIC_WORKSPACE_ID")! } : undefined,
  }));

export const llmAvailable = () => !!secret("ANTHROPIC_API_KEY");

type Content = Anthropic.Messages.ContentBlockParam[];

export interface StructuredCall<T> {
  system: string;
  content: Content;
  schema: Record<string, unknown>;
  parse: ZodType<T>;
  model?: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Names the step in the cost ledger, e.g. "brief" or "verifier". */
  label?: string;
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { input: number; output: number; cacheRead: number };
}

/**
 * One structured-output call. The system prompt is marked cacheable so it is paid once per campaign.
 * On a refusal or unparseable output the call is retried once on the stronger model.
 */
export async function callStructured<T>(req: StructuredCall<T>): Promise<StructuredResult<T>> {
  const model = req.model ?? MODELS.fast;
  try {
    return await once(req, model);
  } catch (e) {
    if (model !== MODELS.strong && (e instanceof RefusalError || e instanceof ParseError)) {
      return once(req, MODELS.strong);
    }
    throw e;
  }
}

class RefusalError extends Error {}
class ParseError extends Error {}

async function once<T>(req: StructuredCall<T>, model: string): Promise<StructuredResult<T>> {
  const msg = await anthropic().messages.create({
    model,
    max_tokens: req.maxTokens ?? 8000,
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: req.content }],
    output_config: { effort: req.effort ?? "medium", format: { type: "json_schema", schema: req.schema } },
  });
  // Record before any throw: refused or truncated calls are still billed.
  recordClaude(
    model,
    { input: msg.usage.input_tokens, output: msg.usage.output_tokens, cacheRead: msg.usage.cache_read_input_tokens ?? 0, cacheWrite: msg.usage.cache_creation_input_tokens ?? 0 },
    `${req.label ?? "claude"}${msg.stop_reason === "max_tokens" ? ":truncated" : ""}`,
  );
  if (msg.stop_reason === "refusal") throw new RefusalError("Model declined this request");
  const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ParseError(`Model returned invalid JSON (stop_reason=${msg.stop_reason})`);
  }
  const parsed = req.parse.safeParse(json);
  if (!parsed.success) throw new ParseError(parsed.error.message);
  return {
    data: parsed.data,
    model,
    usage: {
      input: msg.usage.input_tokens,
      output: msg.usage.output_tokens,
      cacheRead: msg.usage.cache_read_input_tokens ?? 0,
    },
  };
}

export const textDoc = (text: string, title: string, context?: string): Anthropic.Messages.DocumentBlockParam => ({
  type: "document",
  source: { type: "text", media_type: "text/plain", data: text },
  title,
  ...(context ? { context } : {}),
});

export const pdfDoc = (base64: string): Anthropic.Messages.DocumentBlockParam => ({
  type: "document",
  source: { type: "base64", media_type: "application/pdf", data: base64 },
});
