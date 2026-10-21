// Program metrics (port of v1 metrics()). Pure: no DB, no clock except the `today` argument.
import { addDays, mastery, minutesOn, readiness, type CategoryMastery } from "./engine";
import type { Banks, Curriculum, RecallState, Track } from "./types";
import { TRACKS } from "./types";

export interface DayRow { date: string; minutes: number; sessions: number; hit: boolean }
export interface Reps { mocks: number; mocks_30d: number; mock_avg: number | null; interviews: number; interviews_30d: number; interview_avg: number | null }
export interface Metrics {
  target: number; today_minutes: number; days: DayRow[]; adherence_7: number; adherence_30: number;
  total_hours: number; days_active: number; readiness: Record<Track, number>; readiness_overall: number;
  mastery: Record<Track, Record<string, CategoryMastery>>; under_time_rate: number | null; trend_14d: number | null;
  reps: Reps; snapshots: { date: string; readiness: number }[];
}
const WEIGHTS: Record<Track, number> = { leetcode: 0.4, python: 0.15, system_design: 0.2, dsa: 0.15, debugging: 0.1 };

export function metrics(st: RecallState, banks: Banks, cur: Curriculum, today: string): Metrics {
  const target = cur.daily_minutes ?? 60;
  const days: DayRow[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i), m = minutesOn(st, d);
    days.push({ date: d, minutes: m, sessions: st.sessions.filter((s) => s.date === d).length, hit: m >= target });
  }
  const adh = (n: number) => Math.round((100 * days.slice(-n).filter((x) => x.hit).length) / n);
  const rd = Object.fromEntries(TRACKS.map((t) => [t, readiness(st, banks, t)])) as Record<Track, number>;
  const overall = Math.round(TRACKS.reduce((a, t) => a + rd[t] * WEIGHTS[t], 0));
  const last20 = st.sessions.slice(-20);
  const under = last20.length
    ? Math.round((100 * last20.filter((s) => s.minutes_used != null && s.timer_minutes && Number(s.minutes_used) <= Number(s.timer_minutes) && s.score >= 7).length) / last20.length)
    : null;
  const cut14 = addDays(today, -14), cut28 = addDays(today, -28);
  const a = st.sessions.filter((s) => s.date >= cut14).map((s) => s.score), b = st.sessions.filter((s) => s.date >= cut28 && s.date < cut14).map((s) => s.score);
  const mean = (xs: number[]) => xs.reduce((p, q) => p + q, 0) / xs.length;
  const trend = a.length && b.length ? Math.round((mean(a) - mean(b)) * 10) / 10 : null;
  const allMin = st.sessions.reduce((p, s) => p + Number(s.minutes_used ?? 0), 0) + Object.values(st.program.minutes ?? {}).reduce((p, v) => p + Number(v), 0) + (st.external ?? []).reduce((p, e) => p + Number(e.minutes ?? 0), 0);
  const active = new Set([...st.sessions.map((s) => s.date), ...Object.entries(st.program.minutes ?? {}).filter(([, v]) => Number(v) > 0).map(([k]) => k), ...(st.external ?? []).map((e) => e.date)]).size;
  const snaps = { ...(st.program.snapshots ?? {}), [today]: overall };
  return {
    target, today_minutes: days[days.length - 1].minutes, days, adherence_7: adh(7), adherence_30: adh(30),
    total_hours: Math.round((allMin / 60) * 10) / 10, days_active: active, readiness: rd, readiness_overall: overall,
    mastery: Object.fromEntries(TRACKS.map((t) => [t, mastery(st, banks, t)])) as Record<Track, Record<string, CategoryMastery>>,
    under_time_rate: under, trend_14d: trend, reps: reps(st, today),
    snapshots: Object.entries(snaps).sort(([x], [y]) => (x < y ? -1 : 1)).slice(-200).map(([date, r]) => ({ date, readiness: Number(r) })),
  };
}

export function reps(st: RecallState, today: string): Reps {
  const L = st.external ?? [], cut = addDays(today, -30);
  const mocks = L.filter((e) => e.kind === "mock_interview"), real = L.filter((e) => e.kind === "interview");
  const avg = (xs: typeof L) => { const r = xs.filter((x) => x.rating != null).map((x) => Number(x.rating)); return r.length ? Math.round((r.reduce((p, q) => p + q, 0) / r.length) * 10) / 10 : null; };
  return { mocks: mocks.length, mocks_30d: mocks.filter((m) => m.date >= cut).length, mock_avg: avg(mocks), interviews: real.length, interviews_30d: real.filter((r) => r.date >= cut).length, interview_avg: avg(real) };
}
