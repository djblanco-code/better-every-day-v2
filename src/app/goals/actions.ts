"use server";
import { z } from "zod";
import { id as idS, longText, parse, shortText } from "@/lib/validate";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { newId } from "@/lib/jobs/store";
import { sessionUser } from "@/lib/supabase/session";
import { AREAS, DAYS, type Goal, type GoalProfile } from "@/lib/goals/types";

export interface GoalsState { goals: Goal[]; profile: GoalProfile | null }

async function ctx() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  return { supabase, uid: data.user.id };
}
const bump = () => { revalidatePath("/goals"); revalidatePath("/"); };

export async function getGoals(): Promise<GoalsState> {
  const { supabase } = await ctx();
  const [g, p] = await Promise.all([
    supabase.from("goals").select("id,area,title,why,priority,active").order("priority").order("created_at"),
    supabase.from("goal_profile").select("wish,obstacle,if_then,hours_per_week,best_time,days_off").maybeSingle(),
  ]);
  if (g.error) throw new Error(g.error.message);
  return { goals: (g.data ?? []) as Goal[], profile: (p.data as GoalProfile | null) ?? null };
}

const AreaS = z.enum(AREAS.map((a) => a.id) as [string, ...string[]]);
const GoalS = z.object({ id: idS.optional(), area: AreaS, title: shortText(160).min(1, "Say what done looks like"), why: longText(600).optional(), priority: z.coerce.number().int().min(0).max(99).optional(), active: z.boolean().optional() });
const ProfileS = z.object({ wish: longText(600).optional(), obstacle: longText(600).optional(), if_then: longText(600).optional(), hours_per_week: z.coerce.number().int().min(1).max(60).optional(), best_time: z.enum(["morning", "afternoon", "evening"]).optional(), days_off: z.array(z.enum(DAYS)).max(7).optional() });

/** The questionnaire saves everything at once: the profile and the ordered goals (replacing the active set). */
export async function saveQuestionnaire(input: { profile: Partial<GoalProfile>; goals: { id?: string; area: string; title: string; why?: string }[] }): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const prof = parse(ProfileS, input.profile ?? {});
  const goals = parse(z.array(GoalS).max(6), input.goals ?? []);
  const { error: pe } = await supabase.from("goal_profile").upsert({ user_id: uid, ...prof, updated_at: new Date().toISOString() });
  if (pe) throw new Error(pe.message);
  const rows = goals.map((g, i) => ({ id: g.id ?? newId(), user_id: uid, area: g.area, title: g.title.trim(), why: (g.why ?? "").trim(), priority: i, active: true }));
  const keep = rows.map((r) => r.id);
  if (rows.length) { const { error } = await supabase.from("goals").upsert(rows); if (error) throw new Error(error.message); }
  const q = supabase.from("goals").update({ active: false });
  const { error: de } = keep.length ? await q.not("id", "in", `(${keep.map((k) => `"${k}"`).join(",")})`) : await q.eq("active", true);
  if (de) throw new Error(de.message);
  bump(); return { ok: true };
}

export async function saveGoal(g: Partial<Goal> & { area: string; title: string }): Promise<{ ok: true }> {
  const { supabase, uid } = await ctx();
  const r = parse(GoalS, { ...g, id: g.id || undefined });
  const { error } = await supabase.from("goals").upsert({ id: r.id ?? newId(), user_id: uid, area: r.area, title: r.title.trim(), why: (r.why ?? "").trim(), priority: r.priority ?? 0, active: r.active ?? true });
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
export async function removeGoal(id: string): Promise<{ ok: true }> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("goals").delete().eq("id", parse(idS, id));
  if (error) throw new Error(error.message);
  bump(); return { ok: true };
}
