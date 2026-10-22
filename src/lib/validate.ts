// Input validation for server actions (ASVS V5). Every action parses its input with one of these before touching
// the database; a bad input throws a readable message instead of reaching a query.
import { z } from "zod";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
export const shortText = (max = 200) => z.string().trim().max(max);
export const longText = (max = 4000) => z.string().max(max);
export const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "bad id");
export const track = z.enum(["leetcode", "python", "system_design", "dsa", "debugging"]);
export const stage = z.enum(["applied", "intro_call", "interview", "final", "offer", "ghosted", "rejected", "passed"]);
export const minutes = z.coerce.number().int().min(0).max(600);
export const rating = z.coerce.number().int().min(1).max(10).nullable();

/** Parse or throw a short, user-readable error (the first issue only). */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const i = r.error.issues[0];
  throw new Error(`${i.path.join(".") || "input"}: ${i.message}`);
}

/** The browser's local date is accepted only within a day of the server clock; otherwise the server date wins. */
export function clientDate(d?: string | null): string {
  const server = new Date().toISOString().slice(0, 10);
  if (!d || !isoDate.safeParse(d).success) return server;
  return Math.abs(Date.parse(d) - Date.parse(server)) <= 86400000 ? d : server;
}
