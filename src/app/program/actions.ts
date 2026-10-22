"use server";
import { clientDate as cd } from "@/lib/validate";
import { supabaseServer } from "@/lib/supabase/server";
import { loadBanks } from "@/lib/recall/banks";
import { loadState, saveProgram } from "@/lib/recall/store";
import { addDays, weekNo } from "@/lib/recall/engine";
import { metrics, type Metrics } from "@/lib/recall/metrics";
import type { Curriculum } from "@/lib/recall/types";
import { sessionUser } from "@/lib/supabase/session";

const validDate = (d?: string) => cd(d);

export interface ProgramData {
  today: string; week: number; of: number; phase: string; start: string | null; end: string | null; daily_minutes: number;
  weeks: (Curriculum["weeks"][number] & { reading_done: number; homework_done: number })[];
  done: Record<string, { date: string; minutes: number }>; principles: [string, string][]; metrics: Metrics; categories: string[];
}

export async function getProgram(clientDate?: string): Promise<ProgramData> {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) throw new Error("You're signed out. Sign in again.");
  const today = validDate(clientDate);
  const [{ banks, cur }, st] = await Promise.all([loadBanks(supabase), loadState(supabase, today)]);
  const m = metrics(st, banks, cur, today);
  // one readiness snapshot a day, persisted, so the curve is history and not a recomputation
  const snaps = st.program.snapshots ?? {};
  if (snaps[today] !== m.readiness_overall) await saveProgram(supabase, data.user.id, { snapshots: { ...snaps, [today]: m.readiness_overall } });
  const n = weekNo(st, cur, today);
  const done = st.program.done ?? {};
  return {
    today, week: n, of: cur.weeks.length, phase: cur.weeks.find((w) => w.week === n)?.phase ?? "learn", start: st.program.start ?? null,
    end: st.program.start ? addDays(st.program.start, 7 * cur.weeks.length) : null, daily_minutes: cur.daily_minutes ?? 60,
    weeks: cur.weeks.map((w) => ({ ...w, reading_done: w.reading.filter((x) => x.id in done).length, homework_done: w.homework.filter((x) => x.id in done).length })),
    done, principles: cur.principles ?? [], metrics: m, categories: banks.leetcode.categories,
  };
}
