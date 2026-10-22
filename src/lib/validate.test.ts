import { describe, expect, it } from "vitest";
import { clientDate, id, isoDate, parse, rating, stage } from "./validate";
import { z } from "zod";

describe("validate", () => {
  it("accepts good values and rejects bad ones with a readable message", () => {
    expect(parse(isoDate, "2026-10-22")).toBe("2026-10-22");
    expect(() => parse(isoDate, "22/10/2026")).toThrow(/YYYY-MM-DD/);
    expect(() => parse(id, "x; drop table")).toThrow(/bad id/);
    expect(parse(stage, "offer")).toBe("offer");
    expect(() => parse(stage, "hired")).toThrow();
    expect(parse(rating, "9")).toBe(9);
    expect(() => parse(rating, 11)).toThrow();
    expect(() => parse(z.object({ company: z.string().min(1) }), { company: "" })).toThrow(/company/);
  });
  it("accepts a client date only within a day of the server", () => {
    const server = new Date().toISOString().slice(0, 10);
    expect(clientDate(server)).toBe(server);
    expect(clientDate("2000-01-01")).toBe(server);
    expect(clientDate("nope")).toBe(server);
  });
});
