"use server";
import { z } from "zod";
import { id as idS, isoDate, longText, parse, shortText, clientDate as cd } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { newId } from "@/lib/jobs/store";
import { sessionUser } from "@/lib/supabase/session";
import { CATEGORIES, type Budget, type Checkin, type Habit, type HabitLog, type Transaction } from "@/lib/life/types";

export interface LifeState {
  today: string;
  month: string;                       // YYYY-MM
  habits: Habit[];
  logs: HabitLog[];                    // last 28 days
  checkins: Checkin[];                 // last 28 days, newest first
  transactions: Transaction[];         // this month, newest first
  budgets: Budget[];
}

async function ctx() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  return { supabase, uid: data.user.id };
}
const bump = () => { revalidatePath("/life"); revalidatePath("/today"); revalidatePath("/"); };
const daysAgo = (date: string, n: number) => { const d = new Date(date + "T12:00"); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export async function getLife(clientDate?: string): Promise<LifeState> {
  const { supabase } = await ctx();
  const today = cd(clientDate), since = daysAgo(today, 27), month = today.slice(0, 7);
  const [h, l, c, t, b] = await Promise.all([
    supabase.from("habits").select("id,name,icon,cadence,target_per_week,active,sort").order("sort").order("created_at"),
    supabase.from("habit_logs").select("habit_id,date,done,note").gte("date", since),
    supabase.from("checkins").select("date,sleep_hours,energy,mood,exercise_minutes,weight,time_available,note").gte("date", since).order("date", { ascending: false }),
    supabase.from("transactions").select("id,date,kind,amount_cents,category,merchant,note").gte("date", month + "-01").order("date", { ascending: false }),
    supabase.from("budgets").select("category,limit_cents"),
  ]);
  for (const r of [h, l, c, t, b]) if (r.error) throw new Error("life: " + r.error.message);
  return { today, month, habits: (h.data ?? []) as Habit[], logs: (l.data ?? []) as HabitLog[], checkins: ((c.data ?? []) as Checkin[]).map(numeric), transactions: (t.data ?? []) as Transaction[], budgets: (b.data ?? []) as Budget[] };
}
const numeric = (c: Checkin): Checkin => ({ ...c, sleep_hours: c.sleep_hours == null ? null : Number(c.sleep_hours), weight: c.weight == null ? null : Number(c.weight) });

const HabitS = z.object({ id: idS.optional(), name: shortText(60).min(1, "name is required"), icon: shortText(4).optional(), cadence: z.enum(["daily", "weekdays", "weekly"]).optional(), target_per_week: z.coerce.number().int().min(1).max(7).optional(), active: z.boolean().optional(), sort: z.coerce.number().int().min(0).max(999).optional() });
export async function saveHabit(rec: Partial<Habit>): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const r = parse(HabitS, { ...rec, id: rec.id || undefined });
  const row = { id: r.id ?? newId(), user_id: uid, name: r.name.trim(), icon: r.icon ?? "", cadence: r.cadence ?? "daily", target_per_week: r.target_per_week ?? (r.cadence === "weekdays" ? 5 : r.cadence === "weekly" ? 3 : 7), active: r.active ?? true, sort: r.sort ?? 0 };
  const { error } = await supabase.from("habits").upsert(row);
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
export async function removeHabit(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const hid = parse(idS, id);
  await supabase.from("habit_logs").delete().eq("habit_id", hid);
  const { error } = await supabase.from("habits").delete().eq("id", hid);
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
/** Toggle one habit for one day. */
export async function logHabit(habit_id: string, date: string, done: boolean): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const hid = parse(idS, habit_id), d = parse(isoDate, date);
  const { error } = await supabase.from("habit_logs").upsert({ user_id: uid, habit_id: hid, date: d, done: !!done });
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}

const CheckinS = z.object({ date: isoDate, sleep_hours: z.coerce.number().min(0).max(24).nullable().optional(), energy: z.coerce.number().int().min(1).max(5).nullable().optional(), mood: z.coerce.number().int().min(1).max(5).nullable().optional(), exercise_minutes: z.coerce.number().int().min(0).max(600).optional(), weight: z.coerce.number().min(0).max(999).nullable().optional(), time_available: z.coerce.number().int().min(0).max(600).nullable().optional(), note: longText(1000).optional() });
/** Upsert today's check-in; only the fields passed change (merge with the existing row). */
export async function saveCheckin(rec: Partial<Checkin> & { date: string }): Promise<Checkin> {
  const { supabase, uid } = await ctx();
  const r = parse(CheckinS, rec);
  const { data: cur } = await supabase.from("checkins").select("*").eq("date", r.date).maybeSingle();
  const row = { ...(cur ?? {}), ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)), user_id: uid, date: r.date, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("checkins").upsert(row).select("date,sleep_hours,energy,mood,exercise_minutes,weight,time_available,note").single();
  if (error) throw new Error(error.message);
  bump(); return numeric(data as Checkin);
}

const TxS = z.object({ id: idS.optional(), date: isoDate, kind: z.enum(["expense", "income"]).optional(), amount: z.coerce.number().min(0).max(1_000_000), category: z.enum(CATEGORIES).optional(), merchant: shortText(80).optional(), note: shortText(300).optional() });
export async function saveTransaction(rec: { id?: string; date: string; kind?: "expense" | "income"; amount: number | string; category?: string; merchant?: string; note?: string }): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const r = parse(TxS, { ...rec, id: rec.id || undefined });
  const row = { id: r.id ?? newId(), user_id: uid, date: r.date, kind: r.kind ?? "expense", amount_cents: Math.round(r.amount * 100), category: r.category ?? "other", merchant: (r.merchant ?? "").trim(), note: r.note ?? "" };
  const { error } = await supabase.from("transactions").upsert(row);
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
export async function removeTransaction(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("transactions").delete().eq("id", parse(idS, id));
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
export async function saveBudget(category: string, limit: number | string): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const r = parse(z.object({ category: z.enum(CATEGORIES), limit: z.coerce.number().min(0).max(1_000_000) }), { category, limit });
  const { error } = r.limit === 0
    ? await supabase.from("budgets").delete().eq("category", r.category)
    : await supabase.from("budgets").upsert({ user_id: uid, category: r.category, limit_cents: Math.round(r.limit * 100) });
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
