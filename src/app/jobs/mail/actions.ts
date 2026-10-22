"use server";
import { z } from "zod";
import { id as idS, parse, shortText, stage as stageS } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/supabase/session";
import { checkInbox, type Suggestion } from "@/lib/mail/check";
import { updateApplication } from "../actions";
import type { Stage } from "@/lib/jobs/types";

export interface MailState { address: string; hint: string | null; last_checked_at: string | null; suggestions: (Suggestion & { status: string })[] }

async function ctx() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  return { supabase, uid: data.user.id };
}
const bump = () => { revalidatePath("/jobs/mail"); revalidatePath("/jobs"); revalidatePath("/settings"); };

export async function getMail(): Promise<MailState> {
  const { supabase } = await ctx();
  const [{ data: s }, { data: sug }] = await Promise.all([
    supabase.from("mail_settings").select("address,secret_hint,last_checked_at").maybeSingle(),
    supabase.from("mail_suggestions").select("id,received_at,from_addr,from_name,subject,snippet,kind,app_id,company,status").eq("status", "new").order("received_at", { ascending: false }).limit(100),
  ]);
  return { address: s?.address ?? "", hint: s?.secret_hint ?? null, last_checked_at: s?.last_checked_at ?? null, suggestions: (sug ?? []) as MailState["suggestions"] };
}

/** Store the Gmail address + app password in the Vault (set_mail_secret). The password is never echoed. */
export async function saveMail(address: string, appPassword: string): Promise<{ ok: true; hint: string }> {
  const { supabase } = await ctx();
  const r = parse(z.object({ address: z.string().trim().email().max(160), appPassword: z.string().min(8).max(200) }), { address, appPassword });
  const { data, error } = await supabase.rpc("set_mail_secret", { p_address: r.address, p_secret: r.appPassword });
  if (error) throw new Error(error.message);
  bump(); return { ok: true, hint: String(data) };
}
export async function clearMail(): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("clear_mail_secret");
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}

/** Read the inbox and store new suggestions. Idempotent on message id. */
export async function checkMail(days = 14): Promise<{ ok: true; found: number; added: number }> {
  const { supabase, uid } = await ctx();
  const d = parse(z.number().int().min(1).max(60), days);
  const [{ data: s }, { data: key, error: ke }, { data: apps }] = await Promise.all([
    supabase.from("mail_settings").select("address").maybeSingle(),
    supabase.rpc("read_mail_secret"),
    supabase.from("applications").select("id,company").eq("kind", "applied"),
  ]);
  if (ke) throw new Error(ke.message);
  if (!s?.address || !key) throw new Error("Add your Gmail address and an app password in Settings first.");
  const found = await checkInbox({ address: s.address, password: String(key), days: d, candidates: (apps ?? []) as { id: string; company: string }[] });
  let added = 0;
  if (found.length) {
    const { data: existing } = await supabase.from("mail_suggestions").select("id").in("id", found.map((f) => f.id));
    const seen = new Set((existing ?? []).map((e: { id: string }) => e.id));
    const rows = found.filter((f) => !seen.has(f.id)).map((f) => ({ ...f, user_id: uid, status: "new" }));
    if (rows.length) { const { error } = await supabase.from("mail_suggestions").insert(rows); if (error) throw new Error(error.message); }
    added = rows.length;
  }
  await supabase.from("mail_settings").update({ last_checked_at: new Date().toISOString() }).eq("user_id", uid);
  bump(); return { ok: true, found: found.length, added };
}

/** Apply a suggestion: optional stage change on the matched application, then mark it applied. */
export async function applySuggestion(id: string, stage: Stage | null, appId: string | null, clientDate?: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const sid = parse(shortText(200).min(1), id);
  if (stage && appId) await updateApplication(parse(idS, appId), { stage: parse(stageS, stage), last_contact_on: clientDate ?? new Date().toISOString().slice(0, 10) }, clientDate);
  const { error } = await supabase.from("mail_suggestions").update({ status: "applied" }).eq("id", sid);
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
export async function dismissSuggestion(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("mail_suggestions").update({ status: "dismissed" }).eq("id", parse(shortText(200).min(1), id));
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
