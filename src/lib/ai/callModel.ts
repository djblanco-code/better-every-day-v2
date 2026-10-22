import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit } from "./ratelimit";

// The one way the app talks to a model (PROCESS.md hard rule). Stability rules from v1, kept:
// temperature 0, a JSON schema enforced by the provider (Claude tool use / Gemini responseSchema), retries with
// backoff on 408/429/5xx and network errors, a budget check BEFORE the call, and an audit row AFTER it.
export type Provider = "anthropic" | "gemini";
export const DEFAULT_MODEL: Record<Provider, string> = { anthropic: "claude-sonnet-5-5", gemini: "gemini-2.5-flash" };

// Rough list prices per million tokens (USD) for the budget guard; precision is not the point, the cap is.
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 3, out: 15 }, "claude-haiku-5-5": { in: 1, out: 5 }, "claude-opus-5-5": { in: 15, out: 75 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 }, "gemini-2.5-pro": { in: 1.25, out: 10 },
};

export interface CallOpts { agent: string; system: string; user: string; schema?: Record<string, unknown>; maxTokens?: number }
export interface CallResult<T> { data: T; model: string; provider: Provider; tokens_in: number; tokens_out: number; cost_cents: number }
export interface Transport { (url: string, init: RequestInit): Promise<{ status: number; json: () => Promise<unknown> }> }

export class BudgetExceeded extends Error {}
export class NoKey extends Error {}

/** Resolve the caller's provider/model/key and budget. Key comes from the Vault via read_ai_key(); it is held in
 *  memory for the duration of the call and never returned to the caller or logged. */
async function settings(supabase: SupabaseClient) {
  const [{ data: s }, { data: u }, { data: key }, { data: spent }] = await Promise.all([
    supabase.from("ai_settings").select("provider,model").maybeSingle(),
    supabase.from("users").select("budget_cents").maybeSingle(),
    supabase.rpc("read_ai_key"),
    supabase.rpc("ai_spend_cents_this_month"),
  ]);
  const provider = ((s?.provider as Provider) ?? "anthropic");
  return { provider, model: (s?.model as string) || DEFAULT_MODEL[provider], key: (key as string | null) ?? null, budget: Number(u?.budget_cents ?? 1000), spent: Number(spent ?? 0) };
}

export async function callModel<T = string>(supabase: SupabaseClient, userId: string, o: CallOpts, transport: Transport = fetchTransport): Promise<CallResult<T>> {
  const cfg = await settings(supabase);
  if (!cfg.key) throw new NoKey("No AI key saved. Open Settings and paste your Anthropic or Gemini key.");
  await checkRateLimit(supabase, userId);
  if (cfg.spent >= cfg.budget) throw new BudgetExceeded(`Monthly AI budget reached ($${(cfg.budget / 100).toFixed(2)}). Raise it in Settings or wait for next month.`);
  const inputHash = createHash("sha256").update(o.system + "\n" + o.user).digest("hex").slice(0, 16);
  let result: CallResult<T> | null = null, err: string | null = null;
  try {
    result = cfg.provider === "anthropic" ? await anthropic<T>(cfg, o, transport) : await gemini<T>(cfg, o, transport);
  } catch (e) {
    err = String((e as Error)?.message ?? e).slice(0, 400);
  } finally {
    await supabase.from("audit_log").insert({
      user_id: userId, agent: o.agent, provider: cfg.provider, model: cfg.model, input_hash: inputHash, ok: !!result,
      tokens_in: result?.tokens_in ?? 0, tokens_out: result?.tokens_out ?? 0, cost_cents: result?.cost_cents ?? 0, error: err,
    });
  }
  if (!result) throw new Error(err ?? "model call failed");
  return result;
}

const fetchTransport: Transport = (url, init) => fetch(url, init);

async function withRetry(fn: () => Promise<{ status: number; json: () => Promise<unknown> }>, tries = 3): Promise<unknown> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fn();
      if (r.status >= 200 && r.status < 300) return r.json();
      const retryable = [408, 409, 429, 500, 502, 503, 504, 529].includes(r.status);
      const body = JSON.stringify(await r.json().catch(() => ({}))).slice(0, 300);
      if (retryable && i < tries - 1) { await sleep(2 ** (i + 1) * 1000); continue; }
      throw new Error(`Model API error ${r.status}: ${body}`);
    } catch (e) {
      if (i < tries - 1 && !(e as Error).message?.startsWith("Model API error")) { await sleep(2 ** (i + 1) * 1000); continue; }
      throw e;
    }
  }
  throw new Error("unreachable");
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cost(model: string, tin: number, tout: number) {
  const p = PRICE[model] ?? { in: 3, out: 15 };
  return Math.round(((tin * p.in + tout * p.out) / 1e6) * 100 * 10000) / 10000; // cents, 4 dp
}

async function anthropic<T>(cfg: { model: string; key: string | null }, o: CallOpts, t: Transport): Promise<CallResult<T>> {
  const body: Record<string, unknown> = { model: cfg.model, max_tokens: o.maxTokens ?? 1800, temperature: 0, system: o.system, messages: [{ role: "user", content: o.user }] };
  if (o.schema) { body.tools = [{ name: "emit", description: "Return the result.", input_schema: o.schema }]; body.tool_choice = { type: "tool", name: "emit" }; }
  const out = (await withRetry(() => t("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": cfg.key!, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body),
  }))) as { content?: Array<{ type: string; text?: string; input?: unknown }>; usage?: { input_tokens?: number; output_tokens?: number } };
  const tin = out.usage?.input_tokens ?? 0, tout = out.usage?.output_tokens ?? 0;
  let data: unknown;
  if (o.schema) { const tu = out.content?.find((b) => b.type === "tool_use"); data = tu?.input ?? JSON.parse(textOf(out.content)); }
  else data = textOf(out.content);
  return { data: data as T, model: cfg.model, provider: "anthropic", tokens_in: tin, tokens_out: tout, cost_cents: cost(cfg.model, tin, tout) };
}
const textOf = (c?: Array<{ type: string; text?: string }>) => (c ?? []).map((b) => b.text ?? "").join("");

async function gemini<T>(cfg: { model: string; key: string | null }, o: CallOpts, t: Transport): Promise<CallResult<T>> {
  const gen: Record<string, unknown> = { maxOutputTokens: o.maxTokens ?? 1800, temperature: 0 };
  if (o.schema) { gen.responseMimeType = "application/json"; gen.responseSchema = geminiSchema(o.schema); }
  const out = (await withRetry(() => t(`https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": cfg.key! },
    body: JSON.stringify({ system_instruction: { parts: [{ text: o.system }] }, contents: [{ role: "user", parts: [{ text: o.user }] }], generationConfig: gen }),
  }))) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
  const txt = (out.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const tin = out.usageMetadata?.promptTokenCount ?? 0, tout = out.usageMetadata?.candidatesTokenCount ?? 0;
  return { data: (o.schema ? JSON.parse(txt) : txt) as T, model: cfg.model, provider: "gemini", tokens_in: tin, tokens_out: tout, cost_cents: cost(cfg.model, tin, tout) };
}

/** Gemini's schema dialect: no additionalProperties; ["integer","null"] becomes integer + nullable. */
export function geminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(geminiSchema);
  if (s && typeof s === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) if (k !== "additionalProperties") o[k] = geminiSchema(v);
    if (Array.isArray(o.type)) { const types = o.type as string[]; o.nullable = types.includes("null"); o.type = types.find((t) => t !== "null"); }
    return o;
  }
  return s;
}
