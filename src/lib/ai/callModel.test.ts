// Unit test with a fake transport and a fake Supabase client: verifies the request shape (temperature 0, forced
// tool use with the schema), the audit row, and that a spent budget blocks the call before any request is made.
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BudgetExceeded, NoKey, callModel, geminiSchema } from "./callModel";
import { RateLimited } from "./ratelimit";

function fakeSupabase(opts: { key: string | null; spent: number; budget?: number; provider?: string; recent?: number }) {
  const inserts: unknown[] = [];
  const sb = {
    from: (table: string) => ({
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => o?.head
        ? { eq: () => ({ gte: async () => ({ count: opts.recent ?? 0, error: null }) }) }
        : { maybeSingle: async () => ({ data: table === "ai_settings" ? { provider: opts.provider ?? "anthropic", model: null } : { budget_cents: opts.budget ?? 1000 } }) },
      insert: async (row: unknown) => { inserts.push(row); return { error: null }; },
    }),
    rpc: async (fn: string) => ({ data: fn === "read_ai_key" ? opts.key : opts.spent }),
  } as unknown as SupabaseClient;
  return { sb, inserts };
}

const schema = { type: "object", properties: { score: { type: "integer" } }, required: ["score"] };

describe("callModel", () => {
  it("sends temperature 0 and a forced tool with the schema, parses tool_use, writes an audit row", async () => {
    const { sb, inserts } = fakeSupabase({ key: "sk-ant-test", spent: 0 });
    const transport = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.temperature).toBe(0);
      expect(body.tool_choice).toEqual({ type: "tool", name: "emit" });
      expect(body.tools[0].input_schema).toEqual(schema);
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-ant-test");
      return { status: 200, json: async () => ({ content: [{ type: "tool_use", input: { score: 7 } }], usage: { input_tokens: 100, output_tokens: 50 } }) };
    });
    const r = await callModel<{ score: number }>(sb, "u1", { agent: "grader", system: "s", user: "u", schema }, transport);
    expect(r.data).toEqual({ score: 7 });
    expect(r.tokens_in).toBe(100);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ user_id: "u1", agent: "grader", ok: true, tokens_in: 100, tokens_out: 50 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("refuses with a clear message when the budget is spent, before any request", async () => {
    const { sb } = fakeSupabase({ key: "sk-ant-test", spent: 1000 });
    const transport = vi.fn();
    await expect(callModel(sb, "u1", { agent: "grader", system: "s", user: "u" }, transport)).rejects.toBeInstanceOf(BudgetExceeded);
    expect(transport).not.toHaveBeenCalled();
  });

  it("refuses when more than 10 calls were made in the last minute", async () => {
    const { sb } = fakeSupabase({ key: "sk-ant-test", spent: 0, recent: 10 });
    const transport = vi.fn();
    await expect(callModel(sb, "u1", { agent: "grader", system: "s", user: "u" }, transport)).rejects.toBeInstanceOf(RateLimited);
    expect(transport).not.toHaveBeenCalled();
  });

  it("refuses without a key", async () => {
    const { sb } = fakeSupabase({ key: null, spent: 0 });
    await expect(callModel(sb, "u1", { agent: "grader", system: "s", user: "u" }, vi.fn())).rejects.toBeInstanceOf(NoKey);
  });

  it("retries a 429 then succeeds, and records a failed audit row when all tries fail", async () => {
    const { sb, inserts } = fakeSupabase({ key: "sk-ant-test", spent: 0 });
    let n = 0;
    const flaky = vi.fn(async () => (++n === 1 ? { status: 429, json: async () => ({}) } : { status: 200, json: async () => ({ content: [{ type: "text", text: "OK" }], usage: {} }) }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const p = callModel<string>(sb, "u1", { agent: "test_key", system: "s", user: "u" }, flaky);
    await vi.advanceTimersByTimeAsync(3000);
    const r = await p;
    vi.useRealTimers();
    expect(r.data).toBe("OK");
    expect(flaky).toHaveBeenCalledTimes(2);
    const dead = vi.fn(async () => ({ status: 401, json: async () => ({ error: "bad key" }) }));
    await expect(callModel(sb, "u1", { agent: "test_key", system: "s", user: "u" }, dead)).rejects.toThrow(/401/);
    expect(inserts.at(-1)).toMatchObject({ ok: false });
  });

  it("converts a JSON schema to Gemini's dialect", () => {
    expect(geminiSchema({ type: "object", additionalProperties: false, properties: { n: { type: ["integer", "null"] } } })).toEqual({ type: "object", properties: { n: { type: "integer", nullable: true } } });
  });
});
