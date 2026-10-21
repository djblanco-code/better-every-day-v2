import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExternalRep, Plan, Progress, RecallState, Session, Track } from "./types";

// Loads one user's Recall state from the per-user tables (RLS guarantees only the caller's rows come back) into
// the plain RecallState the engine consumes, and writes the pieces back. No business rules live here.

type ProgressRow = { track: string; item_id: string; attempts: number; best: number; last: number | null; last_date: string | null; interval: number; next_due: string | null };
type SessionRow = { id: string; date: string; track: string; item_id: string; topic: string; score: number; minutes_used: number | string | null; timer_minutes: number | null };
type PlanRow = { date: string; plan: Plan };
type ProgramRow = { start: string | null; done: Record<string, { date: string; minutes: number }>; minutes: Record<string, number>; snapshots: Record<string, number> };
type RepRow = { date: string; kind: ExternalRep["kind"]; minutes: number | null; rating: number | null };

export async function loadState(supabase: SupabaseClient, today: string): Promise<RecallState> {
  const since = addDaysIso(today, -120);
  const [p, s, pl, pr, ex] = await Promise.all([
    supabase.from("progress").select("track,item_id,attempts,best,last,last_date,interval,next_due"),
    supabase.from("sessions").select("id,date,track,item_id,topic,score,minutes_used,timer_minutes").gte("date", since).order("date").order("created_at"),
    supabase.from("plans").select("date,plan").gte("date", addDaysIso(today, -60)),
    supabase.from("program").select("start,done,minutes,snapshots").maybeSingle(),
    supabase.from("external_reps").select("date,kind,minutes,rating").gte("date", since),
  ]);
  for (const r of [p, s, pl, pr, ex]) if (r.error) throw new Error("recall state: " + r.error.message);
  const items: Record<string, Progress> = {};
  for (const r of (p.data ?? []) as ProgressRow[]) {
    items[`${r.track}:${r.item_id}`] = { attempts: r.attempts, best: r.best, last: r.last ?? undefined, last_date: r.last_date ?? undefined, interval: r.interval, next_due: r.next_due ?? undefined };
  }
  const sessions: Session[] = ((s.data ?? []) as SessionRow[]).map((r) => ({
    id: r.id, date: r.date, track: r.track as Track, item: r.item_id, topic: r.topic, score: r.score,
    minutes_used: r.minutes_used == null ? null : Number(r.minutes_used), timer_minutes: r.timer_minutes,
  }));
  const plans: Record<string, Plan> = {};
  for (const r of (pl.data ?? []) as PlanRow[]) plans[r.date] = r.plan;
  const program = (pr.data as ProgramRow | null) ?? { start: null, done: {}, minutes: {}, snapshots: {} };
  const external: ExternalRep[] = ((ex.data ?? []) as RepRow[]).map((r) => ({ date: r.date, kind: r.kind, minutes: r.minutes, rating: r.rating }));
  return { items, sessions, plans, program: { start: program.start ?? undefined, done: program.done ?? {}, minutes: program.minutes ?? {}, snapshots: program.snapshots ?? {} }, external };
}

export async function savePlan(supabase: SupabaseClient, userId: string, plan: Plan) {
  const { error } = await supabase.from("plans").upsert({ user_id: userId, date: plan.date, plan }, { onConflict: "user_id,date" });
  if (error) throw new Error("save plan: " + error.message);
}

export async function saveProgram(supabase: SupabaseClient, userId: string, patch: Partial<{ start: string; done: RecallState["program"]["done"]; minutes: RecallState["program"]["minutes"]; snapshots: RecallState["program"]["snapshots"] }>) {
  const { error } = await supabase.from("program").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw new Error("save program: " + error.message);
}

export async function saveProgress(supabase: SupabaseClient, userId: string, track: Track, itemId: string, p: Progress) {
  const { error } = await supabase.from("progress").upsert(
    { user_id: userId, track, item_id: itemId, attempts: p.attempts, best: p.best, last: p.last ?? null, last_date: p.last_date ?? null, interval: p.interval, next_due: p.next_due ?? null },
    { onConflict: "user_id,track,item_id" },
  );
  if (error) throw new Error("save progress: " + error.message);
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10);
}
