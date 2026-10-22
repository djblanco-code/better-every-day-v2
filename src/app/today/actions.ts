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
import { sessionUser } from "@/lib/supabase/session";
import { dueToday, type Checkin, type Habit } from "@/lib/life/types";
import { planningDay, type DayPlan, type Goal } from "@/lib/goals/types";

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
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  const d = validDate(today);
  const [{ banks, cur }, st] = await Promise.all([loadBanks(supabase), loadState(supabase, d)]);
  return { supabase, user: data.user, today: d, banks, cur, st };
}

export interface DueItem { kind: "assessment" | "call" | "follow_up"; id: string; title: string; detail: string; due: string | null; overdue: boolean; href: string }
export interface DayExtras {
  checkin: Checkin | null;
  habits: { habit: Habit; done: boolean }[];      // active habits due today
  due: DueItem[];                                  // assessments, intro calls, network follow-ups
  spent_cents: number; limit_cents: number;        // money, this month
  goals: Goal[];                                   // active goals, most important first
  plan_day: string;                                // the planning day (06:00 America/New_York rollover)
  day_plan: DayPlan | null;                        // today's answers, or null until the ritual is done
}
export interface TodayData { plan: PlanView; summary: Summary; today: string; day: DayExtras }

/** Everything on Today that is not the Recall plan. One parallel fetch; each table is RLS-scoped. */
async function dayExtras(c: Awaited<ReturnType<typeof ctx>>): Promise<DayExtras> {
  const today = c.today, soon = (() => { const d = new Date(today + "T12:00"); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })();
  const [ck, hb, hl, na, as, ac, pp, tx, bg, gl, dp] = await Promise.all([
    c.supabase.from("checkins").select("date,sleep_hours,energy,mood,exercise_minutes,weight,time_available,note").eq("date", today).maybeSingle(),
    c.supabase.from("habits").select("id,name,icon,cadence,target_per_week,active,sort").eq("active", true).order("sort"),
    c.supabase.from("habit_logs").select("habit_id,done").eq("date", today),
    c.supabase.from("applications").select("id,company,role,next_action,next_action_on,stage").eq("kind", "applied").not("next_action_on", "is", null).lte("next_action_on", soon),
    c.supabase.from("assessments").select("id,company,role,platform,due,status").in("status", ["todo", "expired"]),
    c.supabase.from("actions").select("id,company,text,due,done").eq("done", false),
    c.supabase.from("people").select("id,name,company,follow_up,follow_up_done").eq("follow_up_done", false).neq("follow_up", ""),
    c.supabase.from("transactions").select("amount_cents").eq("kind", "expense").gte("date", today.slice(0, 7) + "-01"),
    c.supabase.from("budgets").select("limit_cents"),
    c.supabase.from("goals").select("id,area,title,why,priority,active").eq("active", true).order("priority"),
    c.supabase.from("day_plans").select("day,time_available,energy,focus_goal_id,note").eq("day", planningDay()).maybeSingle(),
  ]);
  const doneIds = new Set(((hl.data ?? []) as { habit_id: string; done: boolean }[]).filter((l) => l.done).map((l) => l.habit_id));
  const habits = ((hb.data ?? []) as Habit[]).filter((h) => dueToday(h, today)).map((habit) => ({ habit, done: doneIds.has(habit.id) }));
  const due: DueItem[] = [];
  for (const a of (na.data ?? []) as { id: string; company: string; role: string; next_action: string; next_action_on: string; stage: string }[]) {
    if (["applied", "intro_call", "interview", "final"].includes(a.stage)) due.push({ kind: "call", id: "na-" + a.id, title: `${a.company}: ${a.next_action || "next step"}`, detail: a.role, due: a.next_action_on, overdue: a.next_action_on < today, href: "/jobs/pipeline" });
  }
  for (const a of (as.data ?? []) as { id: string; company: string; role: string; platform: string; due: string | null }[]) {
    if (!a.due || a.due <= soon) due.push({ kind: "assessment", id: a.id, title: `${a.company} assessment`, detail: [a.platform, a.role].filter(Boolean).join(" · "), due: a.due, overdue: !!a.due && a.due < today, href: "/jobs/action" });
  }
  for (const a of (ac.data ?? []) as { id: string; company: string; text: string; due: string | null }[]) {
    if (!a.due || a.due <= soon) due.push({ kind: "call", id: a.id, title: `${a.company}: ${a.text}`, detail: "intro call to set up", due: a.due, overdue: !!a.due && a.due < today, href: "/jobs/action" });
  }
  for (const p of ((pp.data ?? []) as { id: string; name: string; company: string; follow_up: string }[]).slice(0, 5)) {
    due.push({ kind: "follow_up", id: p.id, title: p.follow_up, detail: `${p.name}${p.company ? ` · ${p.company}` : ""}`, due: null, overdue: false, href: "/network" });
  }
  due.sort((a, b) => (a.overdue === b.overdue ? (a.due ?? "9999").localeCompare(b.due ?? "9999") : a.overdue ? -1 : 1));
  const ckRow = (ck.data ?? null) as Checkin | null;
  return {
    checkin: ckRow ? { ...ckRow, sleep_hours: ckRow.sleep_hours == null ? null : Number(ckRow.sleep_hours), weight: ckRow.weight == null ? null : Number(ckRow.weight) } : null,
    habits, due: due.slice(0, 10),
    spent_cents: ((tx.data ?? []) as { amount_cents: number }[]).reduce((a, t) => a + t.amount_cents, 0),
    limit_cents: ((bg.data ?? []) as { limit_cents: number }[]).reduce((a, b) => a + b.limit_cents, 0),
    goals: (gl.data ?? []) as Goal[],
    plan_day: planningDay(),
    day_plan: (dp.data as DayPlan | null) ?? null,
  };
}

/** The daily plan ritual: time, the goal that gets today, energy. Once per planning day; the answers also land on
 *  today's check-in so the hour is sized the same way everywhere. */
export async function makeDayPlan(input: { time_available: number; focus_goal_id: string | null; energy: number | null; sleep_hours?: number | null; mood?: number | null; exercise_minutes?: number | null }, clientDate?: string): Promise<TodayData> {
  const r = parse(z.object({ time_available: z.number().int().min(0).max(600), focus_goal_id: idS.nullable(), energy: z.number().int().min(1).max(5).nullable(), sleep_hours: z.number().min(0).max(24).nullable().optional(), mood: z.number().int().min(1).max(5).nullable().optional(), exercise_minutes: z.number().int().min(0).max(600).nullable().optional() }), input);
  const c = await ctx(clientDate);
  const day = planningDay();
  const { error } = await c.supabase.from("day_plans").upsert({ user_id: c.user.id, day, time_available: r.time_available, energy: r.energy, focus_goal_id: r.focus_goal_id, note: "" });
  if (error) throw new Error(error.message);
  const { data: cur } = await c.supabase.from("checkins").select("*").eq("date", c.today).maybeSingle();
  const patch: Record<string, unknown> = { time_available: r.time_available };
  if (r.energy != null) patch.energy = r.energy;
  if (r.sleep_hours != null) patch.sleep_hours = r.sleep_hours;
  if (r.mood != null) patch.mood = r.mood;
  if (r.exercise_minutes != null) patch.exercise_minutes = r.exercise_minutes;
  await c.supabase.from("checkins").upsert({ ...(cur ?? {}), ...patch, user_id: c.user.id, date: c.today, updated_at: new Date().toISOString() });
  revalidatePath("/"); revalidatePath("/life");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return out(c, plan);
}
async function out(c: Awaited<ReturnType<typeof ctx>>, plan: Parameters<typeof planView>[0]): Promise<TodayData> {
  return { plan: planView(plan, c.st, c.cur, c.today), summary: summary(c.st, c.banks, c.cur, c.today), today: c.today, day: await dayExtras(c) };
}

/** Minutes the user can give Recall today. Stored on the check-in row; the plan trims to it on the client. */
export async function setTimeAvailable(minutes: number | null, clientDate?: string): Promise<TodayData> {
  const m = parse(z.number().int().min(0).max(600).nullable(), minutes);
  const c = await ctx(clientDate);
  const { data: cur } = await c.supabase.from("checkins").select("*").eq("date", c.today).maybeSingle();
  const { error } = await c.supabase.from("checkins").upsert({ ...(cur ?? {}), user_id: c.user.id, date: c.today, time_available: m, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return out(c, plan);
}

/** Tick a habit from Today. */
export async function tickHabit(habit_id: string, done: boolean, clientDate?: string): Promise<TodayData> {
  const hid = parse(idS, habit_id);
  const c = await ctx(clientDate);
  const { error } = await c.supabase.from("habit_logs").upsert({ user_id: c.user.id, habit_id: hid, date: c.today, done: !!done });
  if (error) throw new Error(error.message);
  revalidatePath("/today"); revalidatePath("/life");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return out(c, plan);
}

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
  return out(c, plan);
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
  return out(c, plan);
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
  return out(c, plan);
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
  return out(c, plan);
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

/** "Change": forget today's answers so the ritual asks again. */
export async function clearDayPlan(clientDate?: string): Promise<TodayData> {
  const c = await ctx(clientDate);
  const { error } = await c.supabase.from("day_plans").delete().eq("day", planningDay());
  if (error) throw new Error(error.message);
  revalidatePath("/");
  const plan = c.st.plans[c.today] ?? buildPlan(c.st, c.banks, c.cur, c.today);
  return out(c, plan);
}
