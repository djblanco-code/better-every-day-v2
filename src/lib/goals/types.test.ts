import { describe, expect, it } from "vitest";
import { planningDay } from "./types";

describe("planningDay", () => {
  it("rolls over at 06:00 New York time, not midnight", () => {
    expect(planningDay(new Date("2026-10-22T09:59:00Z"))).toBe("2026-10-21");   // 05:59 EDT: still yesterday's plan
    expect(planningDay(new Date("2026-10-22T10:00:00Z"))).toBe("2026-10-22");   // 06:00 EDT: new day
    expect(planningDay(new Date("2026-10-23T03:30:00Z"))).toBe("2026-10-22");   // 23:30 EDT the same evening
  });
});
