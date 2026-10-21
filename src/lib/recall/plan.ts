// Pure helpers that turn engine output + state into what the Today page shows. No DB, no model (testable).
import { addDays, minutesOn, readiness } from "./engine";
import type { Banks, Curriculum, Plan, RecallState, Slot, Track } from "./types";
import { TRACKS } from "./types";

export type SlotView = Slot & { done: boolean; score?: number | null; substituted?: boolean };
export interface PlanView extends Omit<Plan, "slots"> { slots: SlotView[]; minutes_planned: number; minutes_done: number; target: number; complete: boolean }

/** Completion is derived live: a practice slot is done when any session today is on that item (or, as a
 *  substitute, any session today in that track); a reading/homework slot when its id is in program.done. */
export function planView(plan: Plan, st: RecallState, cur: Curriculum, today: string): PlanView {
  const done = st.program?.done ?? {};
  const todays = st.sessions.filter((s) => s.date === today);
  const slots: SlotView[] = plan.slots.map((s) => {
    if (s.kind === "practice") {
      const hit = todays.filter((x) => x.track === s.track && x.item === s.id);
      const alt = todays.filter((x) => x.track === s.track);
      const last = (hit.length ? hit : alt).at(-1);
      return { ...s, done: !!(hit.length || alt.length), score: last ? last.score : null, substituted: !!(alt.length && !hit.length) };
    }
    return { ...s, done: s.id in done };
  });
  return {
    ...plan, slots,
    minutes_planned: slots.reduce((a, s) => a + (s.minutes ?? 0), 0),
    minutes_done: minutesOn(st, today),
    target: cur.daily_minutes ?? 60,
    complete: slots.every((s) => s.done),
  };
}

export interface Summary { streak: number; due: number; readiness: Record<Track, number>; readiness_overall: number; today_minutes: number; target: number }
const WEIGHTS: Record<Track, number> = { leetcode: 0.4, python: 0.15, system_design: 0.2, dsa: 0.15, debugging: 0.1 };

export function summary(st: RecallState, banks: Banks, cur: Curriculum, today: string): Summary {
  // streak: consecutive active days ending today or yesterday; a logged mock/interview counts as a day too
  const days = new Set<string>([...st.sessions.map((s) => s.date), ...(st.external ?? []).map((e) => e.date)]);
  let streak = 0, d = today;
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) { streak += 1; d = addDays(d, -1); }
  const due = Object.values(st.items).filter((v) => v.next_due && v.next_due <= today).length;
  const rd = Object.fromEntries(TRACKS.map((t) => [t, readiness(st, banks, t)])) as Record<Track, number>;
  const overall = Math.round(TRACKS.reduce((a, t) => a + rd[t] * WEIGHTS[t], 0));
  return { streak, due, readiness: rd, readiness_overall: overall, today_minutes: minutesOn(st, today), target: cur.daily_minutes ?? 60 };
}
