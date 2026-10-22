"use server";
import { z } from "zod";
import { id as idS, isoDate, longText, parse, track as trackS } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { callModel } from "@/lib/ai/callModel";
import { findItem, loadBanks } from "@/lib/recall/banks";
import { schedule } from "@/lib/recall/engine";
import { BANDS, DEBUG_GRADER, GRADER, GRADER_VERSION, GRADE_SCHEMA } from "@/lib/recall/graders";
import { TRACKS, type Progress, type Track } from "@/lib/recall/types";
import { sessionUser } from "@/lib/supabase/session";

interface Grade { score: number; correctness: number; complexity: number; code_quality: number; communication: number; verdict: string; strengths: string[]; gaps: string[]; next_step: string; model_outline: string }
const n10 = (v: unknown) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Grade what the user wrote (nothing is executed), store the session, reschedule the item, clear the draft. */
export async function assess(input: { track: string; id: string; answer: string; minutes_used: number; timer_minutes: number; clientDate?: string }): Promise<{ session_id: string }> {
  input = parse(z.object({ track: trackS, id: idS, answer: longText(12000), minutes_used: z.number().min(0).max(600), timer_minutes: z.number().int().min(1).max(120), clientDate: isoDate.optional() }), input);
  const track = input.track as Track;
  if (!(TRACKS as string[]).includes(track)) throw new Error("bad track");
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) throw new Error("You're signed out. Sign in again.");
  const { banks } = await loadBanks(supabase);
  const item = findItem(banks, track, input.id);
  if (!item) throw new Error("Unknown problem");
  const answer = (input.answer ?? "").trim().slice(0, 12000);
  if (answer.length < 20) throw new Error("Write your answer first.");

  // Same prompt shape as v1 so scores stay comparable.
  let q: string;
  if (track === "leetcode") q = `LeetCode problem: ${item.title} (${item.difficulty}; topics: ${(item.topics ?? []).join(", ")}). URL: ${item.url}. You know this problem; grade against its real statement and constraints.`;
  else if (track === "debugging") q = `Debugging exercise: ${item.title}\nSymptom reported: ${item.symptom ?? ""}\nScript:\n\`\`\`python\n${item.prompt ?? ""}\n\`\`\`\nWhat a strong diagnosis contains: ${item.rubric ?? ""}`;
  else q = `Question: ${item.title}\n${item.prompt ?? ""}\nRubric for a strong answer: ${item.rubric ?? ""}`;
  const user = `${q}\n\nTime allowed: ${input.timer_minutes} min. Time used: ${input.minutes_used} min.\n\nCANDIDATE ANSWER (not executed):\n\`\`\`\n${answer}\n\`\`\``;
  const system = (track === "debugging" ? DEBUG_GRADER : GRADER) + "\n" + BANDS;

  const r = await callModel<Grade>(supabase, auth.user.id, { agent: "grader", system, user, schema: GRADE_SCHEMA as unknown as Record<string, unknown> });
  const g = r.data;
  const today = input.clientDate && DATE.test(input.clientDate) ? input.clientDate : new Date().toISOString().slice(0, 10);
  const sid = `${today}-${Date.now()}`;
  const score = n10(g.score);
  const { error: e1 } = await supabase.from("sessions").insert({
    id: sid, user_id: auth.user.id, date: today, time: new Date().toTimeString().slice(0, 5), track, item_id: item.id, title: item.title,
    difficulty: String(item.difficulty ?? ""), topic: item.topic ?? "", minutes_used: input.minutes_used, timer_minutes: input.timer_minutes, score,
    sub: { correctness: n10(g.correctness), complexity: n10(g.complexity), code_quality: n10(g.code_quality), communication: n10(g.communication) },
    verdict: String(g.verdict ?? ""), strengths: (g.strengths ?? []).map(String).slice(0, 5), gaps: (g.gaps ?? []).map(String).slice(0, 6),
    next_step: String(g.next_step ?? ""), model_outline: String(g.model_outline ?? ""), answer, grader: GRADER_VERSION, model: r.model,
  });
  if (e1) throw new Error("save session: " + e1.message);

  const { data: prev } = await supabase.from("progress").select("attempts,best,interval,next_due").eq("track", track).eq("item_id", item.id).maybeSingle();
  const p: Progress = { attempts: (prev?.attempts ?? 0) + 1, best: Math.max(prev?.best ?? 0, score), last: score, last_date: today, interval: prev?.interval ?? 0, next_due: prev?.next_due ?? undefined };
  schedule(p, score, today);
  const { error: e2 } = await supabase.from("progress").upsert({ user_id: auth.user.id, track, item_id: item.id, attempts: p.attempts, best: p.best, last: p.last, last_date: p.last_date, interval: p.interval, next_due: p.next_due }, { onConflict: "user_id,track,item_id" });
  if (e2) throw new Error("save progress: " + e2.message);
  await supabase.from("drafts").delete().eq("track", track).eq("item_id", item.id);
  revalidatePath("/today");
  return { session_id: sid };
}
