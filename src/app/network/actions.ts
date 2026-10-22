"use server";
import { z } from "zod";
import { id as idS, isoDate, longText, parse, shortText } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { newId } from "@/lib/jobs/store";
import { sessionUser } from "@/lib/supabase/session";

export interface Person { id: string; entry_id: string | null; date: string | null; name: string; company: string; role: string; relationship: "contact" | "mentor" | "recruiter" | "peer"; met_at: string; how_they_can_help: string; follow_up: string; follow_up_done: boolean; email: string; linkedin: string; notes: string }
export interface Event { id: string; entry_id: string | null; date: string | null; name: string; kind: string; org: string; notes: string; people?: number }
export interface NetworkState { people: Person[]; events: Event[]; follow_ups: Person[]; today: string }

async function ctx() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  return { supabase, uid: data.user.id };
}
const bump = () => { revalidatePath("/network"); revalidatePath("/"); };

export async function getNetwork(): Promise<NetworkState> {
  const { supabase } = await ctx();
  const [p, e] = await Promise.all([supabase.from("people").select("*").order("date", { ascending: false }), supabase.from("events").select("*").order("date", { ascending: false })]);
  if (p.error || e.error) throw new Error((p.error ?? e.error)!.message);
  const people = (p.data ?? []) as Person[];
  const events = ((e.data ?? []) as Event[]).map((ev) => ({ ...ev, people: people.filter((x) => x.met_at && x.met_at.toLowerCase() === (ev.name ?? "").toLowerCase()).length }));
  return { people, events, follow_ups: people.filter((x) => x.follow_up && !x.follow_up_done), today: new Date().toISOString().slice(0, 10) };
}

export async function savePerson(rec: Partial<Person>): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  rec = parse(z.object({ id: idS.optional(), entry_id: idS.nullable().optional(), date: isoDate.nullable().optional(), name: shortText(120).min(1, "name is required"), company: shortText(120).optional(), role: shortText(120).optional(), relationship: z.enum(["contact", "mentor", "recruiter", "peer"]).optional(), met_at: shortText(160).optional(), how_they_can_help: shortText(300).optional(), follow_up: shortText(300).optional(), follow_up_done: z.boolean().optional(), email: shortText(160).optional(), linkedin: shortText(300).optional(), notes: longText(4000).optional() }), { ...rec, id: rec.id || undefined, date: rec.date || null });
  if (!(rec.name ?? "").trim()) throw new Error("Name is required");
  const row = { id: rec.id || newId(), user_id: uid, entry_id: rec.entry_id ?? null, date: rec.date || new Date().toISOString().slice(0, 10), name: rec.name!.trim().slice(0, 120), company: (rec.company ?? "").slice(0, 120), role: (rec.role ?? "").slice(0, 120), relationship: rec.relationship ?? "contact", met_at: (rec.met_at ?? "").slice(0, 160), how_they_can_help: (rec.how_they_can_help ?? "").slice(0, 300), follow_up: (rec.follow_up ?? "").slice(0, 300), follow_up_done: !!rec.follow_up_done, email: (rec.email ?? "").slice(0, 160), linkedin: (rec.linkedin ?? "").slice(0, 300), notes: (rec.notes ?? "").slice(0, 4000) };
  const { error } = await supabase.from("people").upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export async function saveEvent(rec: Partial<Event>): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  rec = parse(z.object({ id: idS.optional(), entry_id: idS.nullable().optional(), date: isoDate.nullable().optional(), name: shortText(160).min(1, "event name is required"), kind: shortText(40).optional(), org: shortText(160).optional(), notes: longText(4000).optional() }), { ...rec, id: rec.id || undefined, date: rec.date || null });
  if (!(rec.name ?? "").trim()) throw new Error("Event name is required");
  const row = { id: rec.id || newId(), user_id: uid, entry_id: rec.entry_id ?? null, date: rec.date || new Date().toISOString().slice(0, 10), name: rec.name!.trim().slice(0, 160), kind: rec.kind ?? "other", org: (rec.org ?? "").slice(0, 160), notes: (rec.notes ?? "").slice(0, 4000) };
  const { error } = await supabase.from("events").upsert(row, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}

export async function removeNetwork(kind: "person" | "event", id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  kind = parse(z.enum(["person", "event"]), kind); id = parse(idS, id);
  const { error } = await supabase.from(kind === "person" ? "people" : "events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  bump();
  return { ok: true };
}
