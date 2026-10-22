"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { callModel, NoKey } from "@/lib/ai/callModel";
import { newId } from "@/lib/jobs/store";

// The daily journal (port of v1 journal.py). A note is parsed into typed items with the user's own key and fanned
// out: mock/real interviews and study -> external_reps (Recall); people/events -> Network. Without a key the note is
// kept raw. Page content is data: the parser only ever sees the user's own words.

export const PARSER_VERSION = 2;
const PARSER = `You turn a job-seeker's end-of-day note into structured items. Return ONLY a JSON object:
{"summary": one sentence in the second person ("You did ..."),
 "items": [ ... ]}
Each item is one of:
 {"type":"mock_interview","with":who or where,"format":"coding|system design|behavioral|mixed","rating":1-10,"minutes":int or null,"notes":short}
 {"type":"interview","company":name,"stage":"phone screen|technical|onsite|final|other","rating":1-10,"minutes":int or null,"notes":short}
 {"type":"event","name":event name,"kind":"job fair|meetup|conference|info session|other","org":host if known,"notes":short}
 {"type":"person","name":full name or best guess,"company":company or "","role":role or "","relationship":"contact|mentor|recruiter|peer","met_at":event or context,"how_they_can_help":one phrase,"follow_up":what to do next or ""}
 {"type":"study","what":short,"minutes":int or null}
 {"type":"other","notes":short}
Rating words: aced/crushed/nailed = 9, went well/good = 8, okay/fine/decent = 6, rough/bad/bombed = 3. Use null for unknown minutes.
"three people" with no names = three person items named "Person 1/2/3" with met_at set. Never invent companies or names that are not implied. Keep every string under 120 characters.
Every item has a "date": today unless the note says yesterday, a weekday, or a date. Apply these rules the same way every time.`;
const STR = { type: "string" }, NINT = { type: ["integer", "null"] };
const SCHEMA = { type: "object", additionalProperties: false, required: ["summary", "items"], properties: { summary: STR, items: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "date"], properties: {
  type: { type: "string", enum: ["mock_interview", "interview", "event", "person", "study", "other"] }, date: { type: "string" }, with: STR, format: STR, rating: NINT, minutes: NINT, notes: STR,
  company: STR, stage: STR, name: STR, kind: STR, org: STR, role: STR, relationship: { type: "string", enum: ["contact", "mentor", "recruiter", "peer"] }, met_at: STR, how_they_can_help: STR, follow_up: STR, what: STR } } } } };

export interface Item { type: string; date?: string; id?: string; [k: string]: unknown }
export interface Entry { id: string; date: string; time: string; text: string; summary: string | null; items: Item[]; parse_error: string; parser: number }
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d?: string) => { const s = new Date().toISOString().slice(0, 10); return d && DATE.test(d) && Math.abs(Date.parse(d) - Date.parse(s)) <= 86400000 ? d : s; };

async function ctx() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("signed out");
  return { supabase, uid: data.user.id };
}

export async function getJournal(): Promise<{ entries: Entry[]; has_key: boolean }> {
  const { supabase } = await ctx();
  const [{ data }, { data: s }] = await Promise.all([supabase.from("journal_entries").select("id,date,time,text,summary,items,parse_error,parser").order("date", { ascending: false }).order("time", { ascending: false }).limit(30), supabase.from("ai_settings").select("key_hint").maybeSingle()]);
  return { entries: (data ?? []) as Entry[], has_key: !!s?.key_hint };
}

export async function addEntry(text: string, clientDate?: string): Promise<Entry> {
  const { supabase, uid } = await ctx();
  const t = (text ?? "").trim().slice(0, 4000);
  if (t.length < 3) throw new Error("Say or type what happened first.");
  const date = validDate(clientDate);
  let summary: string | null = null, items: Item[] = [], err = "";
  try {
    const weekday = new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long" });
    const r = await callModel<{ summary: string; items: Item[] }>(supabase, uid, { agent: "journal", system: PARSER, user: `Today is ${date} (${weekday}).\n\nNote:\n${t}`, schema: SCHEMA, maxTokens: 1500 });
    summary = String(r.data.summary ?? ""); items = (r.data.items ?? []).filter((i) => i && i.type).slice(0, 20);
    for (const i of items) if (!DATE.test(String(i.date ?? ""))) i.date = date;
  } catch (e) {
    err = e instanceof NoKey ? "" : String((e as Error)?.message ?? e).slice(0, 200);
  }
  const id = newId();
  for (const i of items) i.id = newId();
  const entry: Entry = { id, date, time: new Date().toTimeString().slice(0, 5), text: t, summary, items, parse_error: err, parser: PARSER_VERSION };
  const { error } = await supabase.from("journal_entries").insert({ ...entry, user_id: uid });
  if (error) throw new Error(error.message);
  // fan out
  const people = items.filter((i) => i.type === "person").map((i) => ({ id: i.id!, user_id: uid, entry_id: id, date: i.date, name: String(i.name ?? "Someone").slice(0, 120), company: String(i.company ?? "").slice(0, 120), role: String(i.role ?? "").slice(0, 120), relationship: ["contact", "mentor", "recruiter", "peer"].includes(String(i.relationship)) ? i.relationship : "contact", met_at: String(i.met_at ?? "").slice(0, 160), how_they_can_help: String(i.how_they_can_help ?? "").slice(0, 300), follow_up: String(i.follow_up ?? "").slice(0, 300), follow_up_done: false }));
  const events = items.filter((i) => i.type === "event").map((i) => ({ id: i.id!, user_id: uid, entry_id: id, date: i.date, name: String(i.name ?? "Event").slice(0, 160), kind: String(i.kind ?? "other").slice(0, 40), org: String(i.org ?? "").slice(0, 160), notes: String(i.notes ?? "").slice(0, 2000) }));
  const reps = items.filter((i) => ["mock_interview", "interview", "study"].includes(i.type)).map((i) => ({ id: i.id!, user_id: uid, date: i.date, kind: i.type, with_who: String(i.with ?? i.company ?? i.what ?? "").slice(0, 120), format: String(i.format ?? i.stage ?? "").slice(0, 60), rating: i.rating == null ? null : Math.max(1, Math.min(10, Math.trunc(Number(i.rating)))), minutes: i.minutes == null ? null : Math.max(0, Math.min(600, Math.trunc(Number(i.minutes)))), notes: String(i.notes ?? "").slice(0, 2000) }));
  if (people.length) await supabase.from("people").insert(people);
  if (events.length) await supabase.from("events").insert(events);
  if (reps.length) await supabase.from("external_reps").insert(reps);
  revalidatePath("/"); revalidatePath("/today"); revalidatePath("/network");
  return entry;
}

/** Remove an entry and everything it created. */
export async function deleteEntry(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { data } = await supabase.from("journal_entries").select("items").eq("id", id).maybeSingle();
  const ids = ((data?.items ?? []) as Item[]).map((i) => i.id).filter(Boolean) as string[];
  await Promise.all([supabase.from("people").delete().eq("entry_id", id), supabase.from("events").delete().eq("entry_id", id), ids.length ? supabase.from("external_reps").delete().in("id", ids) : Promise.resolve(), supabase.from("journal_entries").delete().eq("id", id)]);
  revalidatePath("/"); revalidatePath("/today"); revalidatePath("/network");
  return { ok: true };
}
