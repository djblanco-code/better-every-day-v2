"use server";
import { z } from "zod";
import { id as idS, minutes as minutesS, parse, rating as ratingS, shortText } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { loadBanks } from "@/lib/recall/banks";
import { loadState, savePlan, saveProgram } from "@/lib/recall/store";
import { buildPlan, recommend } from "@/lib/recall/engine";
import { planView, summary, type PlanView, type Summary } from "@/lib/recall/plan";
import type { PracticeSlot } from "@/lib/recall/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The browser sends its local date; the server accepts it only if it is within a day of its own clock. */
function validDate(d: string | undefined): string {
  const server = new Date().toISOString().slice(0, 10);
  if (!d || !DATE.test(d)) return server;
  const diff = Math.abs(Date.parse(d) - Date.parse(server)) / 86400000;
  return diff <= 1 ? d : server;
}

async function ctx(today?: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("signed out");
  const d = validDate(today);
  const [{ banks, cur }, st] = await Promise.all([loadBanks(supabase), loadState(supabase, d)]);
  return { supabase, user: data.user, today: d, banks, cur, st };
}

export interface TodayData { plan: PlanView; summary: Summary; today: string }

/** Today's plan, generated once per day and then fixed (it must not shift under the user). */
export async function getToday(clientDate?: string): Promise<TodayData> {
  const c = await ctx(clientDate);
  let plan = c.st.plans[c.today];
  if (!plan) {
    const started = !!c.st.program.start;
    plan = buildPlan(c.st, c.banks, c.cur, c.today);
    await savePlan(c.supabase, c.user.id, plan);
    if (!started) await saveProgram(c.supabase, c.user.id, { start: c.st.program.start! });
    c.st.plans[c.today] = plan;
  }
  return { plan: planView(plan, c.st, c.cur, c.today), summary: summary(c.st, c.banks, c.cur, c.today), today: c.today };
}

/** Replace one practice slot's problem with the next recommendation, excluding what was there. */
export async function swapSlot(n: number, clientDate?: string): Promise<TodayData> {
  n = parse(z.number().int().min(0).max(5), n);
  const c = await ctx(clientDate);
  const plan = c.st.plans[c.today];
  if (!plan) return getToday(clientDate);
  const s = plan.slots[n];
  if (!s || s.kind !== "practice") throw new Error("Only practice slots can be swapped");
  const ex = new Set([...(s.skipped ?? []), s.id].filter(Boolean) as string[]);
  const r = recommend(c.st, c.banks, c.cur, s.track, c.today, { exclude: [...ex] });
  if (!r) throw new Error("Nothing else in this track");
  const next: PracticeSlot = { ...s, ...r, skipped: [...ex].sort() };
  plan.slots[n] = next;
  await savePlan(c.supabase, c.user.id, plan);
  revalidatePath("/today");
  return { plan: planView(plan, c.st, c.cur, c.today), summary: summary(c.st, c.banks, c.cur, c.today), today: c.today };
}

/** Tick (or untick) a reading/homework item; its minutes count toward today. */
export async function markDone(id: string, minutes: number, undo = false, clientDate?: string): Promise<TodayData> {
  id = parse(idS, id); minutes = parse(minutesS, minutes || 0);
  const c = await ctx(clientDate);
  const done = { ...(c.st.program.done ?? {}) };
  const mins = { ...(c.st.program.minutes ?? {}) };
  if (undo) {
    const old = done[id];
    if (old) { delete done[id]; mins[old.date] = Math.max(0, Number(mins[old.date] ?? 0) - Number(old.minutes ?? 0)); }
  } else if (!(id in done)) {
    const m = Math.max(0, Math.min(300, Math.trunc(minutes || 0)));
    done[id] = { date: c.today, minutes: m };
    mins[c.today] = Number(mins[c.today] ?? 0) + m;
  }
  await saveProgram(c.supabase, c.user.id, { done, minutes: mins });
  c.st.program.done = done; c.st.program.minutes = mins;
  revalidatePath("/today");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return { plan: planView(plan, c.st, c.cur, c.today), summary: summary(c.st, c.banks, c.cur, c.today), today: c.today };
}

/** Extra study minutes outside a graded session. */
export async function logMinutes(minutes: number, clientDate?: string): Promise<TodayData> {
  minutes = parse(minutesS.min(1), minutes);
  const c = await ctx(clientDate);
  const m = Math.max(1, Math.min(300, Math.trunc(minutes || 0)));
  const mins = { ...(c.st.program.minutes ?? {}) };
  mins[c.today] = Number(mins[c.today] ?? 0) + m;
  await saveProgram(c.supabase, c.user.id, { minutes: mins });
  c.st.program.minutes = mins;
  revalidatePath("/today");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return { plan: planView(plan, c.st, c.cur, c.today), summary: summary(c.st, c.banks, c.cur, c.today), today: c.today };
}

/** A mock or real interview done outside the app. Counts toward minutes, streak and metrics. */
export async function logRep(input: { kind: "mock_interview" | "interview" | "study"; with_who?: string; format?: string; rating?: number | null; minutes?: number | null }, clientDate?: string): Promise<TodayData> {
  input = parse(z.object({ kind: z.enum(["mock_interview", "interview", "study"]), with_who: shortText(120).optional(), format: shortText(60).optional(), rating: ratingS.optional(), minutes: minutesS.nullable().optional() }), input);
  const c = await ctx(clientDate);
  const id = `${c.today}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const rating = input.rating == null ? null : Math.max(1, Math.min(10, Math.trunc(input.rating)));
  const minutes = input.minutes == null ? null : Math.max(0, Math.min(600, Math.trunc(input.minutes)));
  const { error } = await c.supabase.from("external_reps").insert({ id, user_id: c.user.id, date: c.today, kind: input.kind, with_who: (input.with_who ?? "").slice(0, 120), format: (input.format ?? "").slice(0, 60), rating, minutes });
  if (error) throw new Error("log rep: " + error.message);
  revalidatePath("/today");
  return getToday(clientDate);
}
