"use server";
import { z } from "zod";
import { clientDate as cd, id as idS, isoDate, longText, parse, shortText, stage as stageS } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { loadJobs, newId } from "@/lib/jobs/store";
import { lookup, type Lookup } from "@/lib/jobs/lookup";
import { STAGES, type Action, type Application, type Assessment, type JobsState, type Stage } from "@/lib/jobs/types";
import { sessionUser } from "@/lib/supabase/session";

const validDate = (d?: string) => cd(d);

async function ctx() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("signed out");
  return { supabase, uid: data.user.id };
}
const bump = () => { revalidatePath("/jobs"); revalidatePath("/"); };

export async function getJobs(sid: string | null, clientDate?: string): Promise<JobsState> {
  const { supabase, uid } = await ctx();
  sid = sid == null ? null : parse(z.union([z.literal("all"), idS]), sid);
  return loadJobs(supabase, uid, sid, validDate(clientDate));
}

/** Change stage / notes / follow-up on one application. Stage changes are appended to its history. */
export async function updateApplication(id: string, patch: { stage?: Stage; notes?: string; follow_up?: string; next_action?: string; next_action_on?: string | null; last_contact_on?: string | null }, clientDate?: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  id = parse(idS, id); patch = parse(z.object({ stage: stageS.optional(), notes: longText(4000).optional(), follow_up: shortText(500).optional(), next_action: shortText(200).optional(), next_action_on: isoDate.nullable().optional(), last_contact_on: isoDate.nullable().optional() }), patch);
  const { data: cur } = await supabase.from("applications").select("stage,history").eq("id", id).maybeSingle();
  if (!cur) throw new Error("not found");
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.stage && (STAGES as readonly string[]).includes(patch.stage) && patch.stage !== cur.stage) {
    row.stage = patch.stage; row.history = [...(cur.history ?? []), { stage: patch.stage, on: validDate(clientDate) }];
  }
  if (patch.notes !== undefined) row.notes = patch.notes.slice(0, 4000);
  if (patch.follow_up !== undefined) row.follow_up = patch.follow_up.slice(0, 500);
  if (patch.next_action !== undefined) row.next_action = patch.next_action.slice(0, 200);
  if (patch.next_action_on !== undefined) row.next_action_on = patch.next_action_on;
  if (patch.last_contact_on !== undefined) row.last_contact_on = patch.last_contact_on;
  const { error } = await supabase.from("applications").update(row).eq("id", id);
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export async function lookupUrl(url: string): Promise<Lookup> {
  await ctx();
  url = parse(z.string().trim().url().max(1000), url);
  return lookup(url);
}

/** Add an application you did by hand (or mark an "apply yourself" row as applied). */
export async function addApplication(info: { url: string; company: string; role: string; location?: string; pay?: string; applied_on?: string; notes?: string; fromTodo?: string }, clientDate?: string): Promise<{ ok: true; id: string }> {
  const { supabase, uid } = await ctx();
  info = parse(z.object({ url: z.string().trim().max(500), company: shortText(120).min(1, "company is required"), role: shortText(160), location: shortText(120).optional(), pay: shortText(60).optional(), applied_on: isoDate.optional(), notes: longText(4000).optional(), fromTodo: idS.optional() }), { ...info, applied_on: info.applied_on || undefined, fromTodo: info.fromTodo || undefined });
  const today = validDate(clientDate);
  const base = (info.url || "").split("?")[0].replace(/\/+$/, "").toLowerCase() || (info.company + info.role).toLowerCase();
  const id = info.fromTodo || createHash("sha1").update(base).digest("hex").slice(0, 12);
  const { data: s } = await supabase.from("searches").select("id").is("end", null).maybeSingle();
  const row = {
    id, user_id: uid, company: info.company.trim().slice(0, 120), role: (info.role ?? "").trim().slice(0, 160), location: (info.location ?? "").slice(0, 120), pay: (info.pay ?? "").slice(0, 60),
    url: (info.url ?? "").slice(0, 500), source: "me", stage: "applied", applied_on: info.applied_on && isoDate.safeParse(info.applied_on).success ? info.applied_on : today, notes: (info.notes ?? "").slice(0, 4000),
    kind: "applied", search_id: s?.id ?? null, todo_status: info.fromTodo ? `Applied by me ${today}` : "", updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("applications").upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true, id };
}

export async function skipTodo(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  id = parse(idS, id);
  await supabase.from("applications").update({ todo_status: "Skipped", kind: "todo" }).eq("id", id);
  await supabase.from("applications").delete().eq("id", id).eq("kind", "todo");
  bump();
  return { ok: true };
}

export async function startSearch(name: string, clientDate?: string): Promise<{ ok: true; id: string }> {
  const { supabase, uid } = await ctx();
  name = parse(shortText(80), name ?? "");
  const d = validDate(clientDate);
  const { data: all } = await supabase.from("searches").select("id,end");
  await supabase.from("searches").update({ end: d }).is("end", null);
  const id = `s${(all?.length ?? 0) + 1}`;
  const { error } = await supabase.from("searches").insert({ id, user_id: uid, name: name.trim().slice(0, 80) || `Job search ${(all?.length ?? 0) + 1}`, start: d, end: null });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true, id };
}

export async function saveAssessment(a: Partial<Assessment> & { id?: string }): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  a = parse(z.object({ id: idS.optional(), company: shortText(120).min(1, "company is required"), role: shortText(160).optional(), platform: shortText(60).optional(), minutes: z.coerce.string().max(10).optional(), invited: isoDate.nullable().optional(), due: isoDate.nullable().optional(), status: z.enum(["todo", "done", "expired", "skipped"]).optional(), notes: longText(2000).optional() }), { ...a, id: a.id || undefined, invited: a.invited || null, due: a.due || null });
  const row = { id: a.id || newId(), user_id: uid, company: (a.company ?? "").slice(0, 120), role: (a.role ?? "").slice(0, 160), platform: (a.platform ?? "").slice(0, 60), minutes: String(a.minutes ?? "").slice(0, 10), invited: a.invited || null, due: a.due || null, status: a.status ?? "todo", notes: (a.notes ?? "").slice(0, 2000) };
  const { error } = await supabase.from("assessments").upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export async function saveAction(a: Partial<Action> & { id?: string }): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  a = parse(z.object({ id: idS.optional(), company: shortText(120).min(1, "company is required"), text: shortText(300).min(1, "what is required"), type: shortText(40).optional(), due: isoDate.nullable().optional(), note: longText(2000).optional(), done: z.boolean().optional() }), { ...a, id: a.id || undefined, due: a.due || null });
  const row = { id: a.id || newId(), user_id: uid, company: (a.company ?? "").slice(0, 120), text: (a.text ?? "").slice(0, 300), type: a.type ?? "schedule", due: a.due || null, note: (a.note ?? "").slice(0, 2000), done: !!a.done };
  const { error } = await supabase.from("actions").upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export async function removeItem(table: "assessments" | "actions" | "applications", id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  table = parse(z.enum(["assessments", "actions", "applications"]), table); id = parse(idS, id);
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export type { Application, Stage };

/** Stale application: schedule a follow-up for today. Nothing else changes. */
export async function nudge(id: string, clientDate?: string): Promise<{ ok: true }> {
  return updateApplication(id, { next_action: "Follow up with the recruiter", next_action_on: validDate(clientDate) }, clientDate);
}
/** The next action was done: clear it and record the contact date. */
export async function completeNextAction(id: string, clientDate?: string): Promise<{ ok: true }> {
  return updateApplication(id, { next_action: "", next_action_on: null, last_contact_on: validDate(clientDate) }, clientDate);
}
