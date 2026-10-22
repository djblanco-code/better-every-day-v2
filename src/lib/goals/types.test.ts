import { describe, expect, it } from "vitest";
import { defaultAllocations, encouragement, nearestOption, planningDay, suggestMinutes, type Goal } from "./types";

const g = (id: string, priority: number): Goal => ({ id, area: "craft", title: id, why: "", priority, active: true });

describe("planningDay", () => {
  it("rolls over at 06:00 New York time, not midnight", () => {
    expect(planningDay(new Date("2026-10-22T09:59:00Z"))).toBe("2026-10-21");
    expect(planningDay(new Date("2026-10-22T10:00:00Z"))).toBe("2026-10-22");
    expect(planningDay(new Date("2026-10-23T03:30:00Z"))).toBe("2026-10-22");
  });
});

describe("morning check-in helpers", () => {
  it("suggests a third of what is left until ten, in 5-minute steps, within the chips", () => {
    const at9 = new Date("2026-10-22T09:00:00");
    expect(suggestMinutes("18:00", at9)).toBe(80);     // 4 h left -> 80
    expect(suggestMinutes("21:30", at9)).toBe(20);     // floor
    expect(suggestMinutes("09:00", at9)).toBe(120);    // 13 h left -> capped
    expect(suggestMinutes(null, at9)).toBeNull();
    expect(nearestOption(80)).toBe(90); expect(nearestOption(50)).toBe(40);
  });
  it("gives the essential goal half and shares the rest, all multiples of five that add up", () => {
    const a = defaultAllocations([g("a", 0), g("b", 1), g("c", 2)], 60, "b");
    expect(a.b).toBe(30); expect(a.a + a.c).toBe(30); expect(Object.values(a).every((v) => v % 5 === 0)).toBe(true);
    expect(defaultAllocations([g("a", 0)], 20, null)).toEqual({ a: 20 });
    expect(defaultAllocations([], 60, null)).toEqual({});
  });
  it("encourages without guilt and stays short", () => {
    const line = encouragement(20, g("Gym four times a week", 0), "Contains Duplicate");
    expect(line).toContain("20 minutes is a real day");
    expect(line).toContain("1% better");
    expect(line.split(" ").length).toBeLessThan(24);
  });
});
