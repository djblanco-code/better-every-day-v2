"use server";
import { z } from "zod";
import { isoDate, parse, shortText } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { callModel, DEFAULT_MODEL, type Provider } from "@/lib/ai/callModel";

export interface SettingsView {
  email: string; provider: Provider; model: string; key_hint: string | null; company_focus: string; default_minutes: number;
  budget_cents: number; spent_cents: number; program_start: string | null; companies: string[];
}

async function ctx() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("signed out");
  return { supabase, user: data.user };
}

export async function getSettings(): Promise<SettingsView> {
  const { supabase, user } = await ctx();
  const [{ data: s }, { data: u }, { data: spent }, { data: pr }, { data: meta }] = await Promise.all([
    supabase.from("ai_settings").select("provider,model,key_hint,company_focus,default_minutes").maybeSingle(),
    supabase.from("users").select("budget_cents").maybeSingle(),
    supabase.rpc("ai_spend_cents_this_month"),
    supabase.from("program").select("start").maybeSingle(),
    supabase.from("banks").select("data").eq("track", "leetcode").eq("item_id", "_meta").maybeSingle(),
  ]);
  const provider = ((s?.provider as Provider) ?? "anthropic");
  return {
    email: user.email ?? "", provider, model: (s?.model as string) || DEFAULT_MODEL[provider], key_hint: (s?.key_hint as string) ?? null,
    company_focus: (s?.company_focus as string) ?? "", default_minutes: (s?.default_minutes as number) ?? 25,
    budget_cents: Number(u?.budget_cents ?? 1000), spent_cents: Number(spent ?? 0), program_start: (pr?.start as string) ?? null,
    companies: Object.keys(((meta?.data as { company_lists?: Record<string, string[]> })?.company_lists) ?? {}),
  };
}

/** Save provider/model/focus/timer. The key, if given, goes straight into the Vault via set_ai_key and is never echoed. */
export async function saveSettings(input: { provider: Provider; model: string; company_focus: string; default_minutes: number; api_key?: string; program_start?: string | null }): Promise<{ ok: true; key_hint: string | null }> {
  const { supabase, user } = await ctx();
  input = parse(z.object({ provider: z.enum(["anthropic", "gemini"]), model: shortText(80), company_focus: shortText(60), default_minutes: z.number().int(), api_key: z.string().max(400).optional(), program_start: isoDate.nullable().optional() }), { ...input, program_start: input.program_start || null });
  const provider: Provider = input.provider === "gemini" ? "gemini" : "anthropic";
  const model = (input.model || "").trim().slice(0, 80) || DEFAULT_MODEL[provider];
  const { error } = await supabase.from("ai_settings").upsert(
    { user_id: user.id, provider, model, company_focus: (input.company_focus ?? "").slice(0, 60), default_minutes: [15, 25, 35, 45, 60].includes(input.default_minutes) ? input.default_minutes : 25, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("save settings: " + error.message);
  let hint: string | null = null;
  if (input.api_key && input.api_key.trim()) {
    const { data, error: e2 } = await supabase.rpc("set_ai_key", { p_provider: provider, p_key: input.api_key.trim() });
    if (e2) throw new Error("save key: " + e2.message);
    hint = data as string;
  }
  if (input.program_start !== undefined) {
    if (input.program_start && /^\d{4}-\d{2}-\d{2}$/.test(input.program_start)) {
      const { error: e3 } = await supabase.from("program").upsert({ user_id: user.id, start: input.program_start }, { onConflict: "user_id" });
      if (e3) throw new Error("save program start: " + e3.message);
      // today's plan was built for the old week; drop it so it regenerates
      await supabase.from("plans").delete().eq("date", new Date().toISOString().slice(0, 10));
    }
  }
  revalidatePath("/settings"); revalidatePath("/today");
  return { ok: true, key_hint: hint };
}

export async function clearKey(): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("clear_ai_key");
  if (error) throw new Error("clear key: " + error.message);
  revalidatePath("/settings");
  return { ok: true };
}

/** One tiny call through the gateway: proves the key, the budget check and the audit row all work. */
export async function testKey(): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await ctx();
  try {
    const r = await callModel<string>(supabase, user.id, { agent: "test_key", system: "Reply with the single word OK.", user: "ping", maxTokens: 10 });
    const ok = String(r.data).toUpperCase().includes("OK");
    return { ok, message: ok ? `Key works (${r.model}, ${r.tokens_in + r.tokens_out} tokens, $${(r.cost_cents / 100).toFixed(4)}).` : `Unexpected reply: ${String(r.data).slice(0, 40)}` };
  } catch (e) {
    return { ok: false, message: String((e as Error)?.message ?? e) };
  }
}
