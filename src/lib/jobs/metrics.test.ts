import { describe, expect, it } from "vitest";
import { bySource, daysToFirstResponse, funnel, headline, median, weekly } from "./metrics";
import type { Application } from "./types";

const app = (o: Partial<Application>): Application => ({ id: "x", company: "C", role: "R", location: "", pay: "", url: "", source: "agent", stage: "applied", applied_on: "2026-10-01", notes: "", follow_up: "", history: [], record: "", search_id: null, kind: "applied", blocker: "", todo: "", todo_status: "", next_action: "", next_action_on: null, last_contact_on: null, ...o });

describe("jobs metrics", () => {
  const apps = [
    app({ id: "1", applied_on: "2026-10-01", stage: "rejected", history: [{ stage: "rejected", on: "2026-10-08" }] }),
    app({ id: "2", applied_on: "2026-10-02", stage: "interview", history: [{ stage: "intro_call", on: "2026-10-05" }, { stage: "interview", on: "2026-10-12" }], source: "me" }),
    app({ id: "3", applied_on: "2026-10-20" }),
    app({ id: "4", applied_on: "2026-10-21", stage: "ghosted" }),
  ];
  it("days to first response counts the first stage change only", () => {
    expect(daysToFirstResponse(apps[0])).toBe(7);
    expect(daysToFirstResponse(apps[1])).toBe(3);
    expect(daysToFirstResponse(apps[2])).toBeNull();
    expect(median([7, 3])).toBe(5);
  });
  it("funnel steps are cumulative reach with conversion from the previous step", () => {
    const f = funnel(apps);
    expect(f.map((s) => s.n)).toEqual([4, 2, 1, 0, 0]);
    expect(f[1].ofPrev).toBe(50); expect(f[2].ofPrev).toBe(50); expect(f[0].ofPrev).toBeNull();
  });
  it("headline: rates, last 7 vs prior 7, open count", () => {
    const h = headline(apps, "2026-10-22");
    expect(h.responseRate).toBe(50); expect(h.interviewRate).toBe(25); expect(h.medianDays).toBe(5);
    expect(h.last7).toBe(2); expect(h.prior7).toBe(0); expect(h.open).toBe(2);
  });
  it("weekly buckets start on Monday and end with the current week", () => {
    const w = weekly(apps, "2026-10-22", 4);   // 2026-10-22 is a Thursday
    expect(w.at(-1)?.start).toBe("2026-10-19"); expect(w.at(-1)?.n).toBe(2);
    expect(w.length).toBe(4);
  });
  it("source split", () => {
    const s = bySource(apps);
    expect(s[0].n).toBe(3); expect(s[1].n).toBe(1); expect(s[1].interviewRate).toBe(100);
  });
});
