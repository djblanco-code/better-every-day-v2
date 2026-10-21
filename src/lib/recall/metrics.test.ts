import { describe, expect, it } from "vitest";
import { metrics } from "./metrics";
import { planView, summary } from "./plan";
import type { Banks, Curriculum, RecallState } from "./types";

const banks: Banks = {
  leetcode: { items: [{ id: "a", title: "A", difficulty: "Easy", topic: "Arrays", lists: ["neetcode150"] }, { id: "b", title: "B", difficulty: "Hard", topic: "Arrays", lists: ["neetcode150"] }], categories: ["Arrays"] },
  python: { items: [{ id: "p", title: "P", difficulty: "Easy", topic: "Core" }], categories: ["Core"] },
  system_design: { items: [{ id: "s", title: "S", difficulty: "Easy", topic: "Classic" }], categories: ["Classic"] },
  dsa: { items: [{ id: "d", title: "D", difficulty: "Easy", topic: "Heaps" }], categories: ["Heaps"] },
  debugging: { items: [{ id: "g", title: "G", difficulty: "Easy", topic: "Bugs" }], categories: ["Bugs"] },
};
const cur: Curriculum = { weeks: [{ week: 1, phase: "learn", focus: {}, reading: [{ id: "r1", est_min: 30, what: "Read" }], homework: [] }], daily_minutes: 60 };
const today = "2026-10-21";
const st: RecallState = {
  items: { "leetcode:a": { attempts: 2, best: 9, interval: 2, next_due: "2026-10-23" }, "python:p": { attempts: 1, best: 4, interval: 0, next_due: "2026-10-21" } },
  sessions: [
    { id: "1", date: "2026-10-20", track: "leetcode", item: "a", topic: "Arrays", score: 9, minutes_used: 20, timer_minutes: 25 },
    { id: "2", date: "2026-10-21", track: "python", item: "p", topic: "Core", score: 4, minutes_used: 30, timer_minutes: 25 },
  ],
  plans: {}, program: { start: "2026-10-21", done: { r1: { date: today, minutes: 30 } }, minutes: { [today]: 30 }, snapshots: {} },
  external: [{ date: "2026-10-21", kind: "mock_interview", minutes: 45, rating: 9 }],
};

describe("metrics", () => {
  const m = metrics(st, banks, cur, today);
  it("counts minutes from sessions, logged minutes and reps", () => {
    expect(m.today_minutes).toBe(30 + 30 + 45);
    expect(m.days.at(-1)?.hit).toBe(true);
    expect(m.adherence_7).toBe(Math.round(100 / 7));
  });
  it("computes readiness, under-time rate, trend and reps", () => {
    expect(m.readiness.leetcode).toBeGreaterThan(0);
    expect(m.under_time_rate).toBe(50);          // one of two sessions on time with 7+
    expect(m.trend_14d).toBeNull();              // no sessions in the previous window
    expect(m.reps).toMatchObject({ mocks: 1, mocks_30d: 1, mock_avg: 9, interviews: 0 });
    expect(m.snapshots.at(-1)).toEqual({ date: today, readiness: m.readiness_overall });
    expect(m.days_active).toBe(2);
  });
});

describe("plan view and summary", () => {
  it("derives done flags live and counts the streak", () => {
    const plan = { date: today, week: 1, slots: [
      { kind: "practice" as const, track: "python" as const, minutes: 25, id: "p", title: "P" },
      { kind: "practice" as const, track: "leetcode" as const, minutes: 25, id: "b", title: "B" },
      { kind: "reading" as const, id: "r1", week: 1, minutes: 30, title: "Read", book: "", track: "" },
    ] };
    const v = planView(plan, st, cur, today);
    expect(v.slots[0].done).toBe(true);
    expect(v.slots[0].score).toBe(4);
    expect(v.slots[1].done).toBe(false);
    expect(v.slots[2].done).toBe(true);
    expect(v.minutes_done).toBe(105);
    expect(v.complete).toBe(false);
    const s = summary(st, banks, cur, today);
    expect(s.streak).toBe(2);
    expect(s.due).toBe(1);
  });
});
