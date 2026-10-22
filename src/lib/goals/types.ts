// Goals and the morning check-in (PRD §4.8). Goals are the user's own, in any area of life; the daily questions are
// time, the one essential thing, and minutes per goal. Questionnaire shape: WOOP + implementation intentions.
export type Area = "career" | "craft" | "body" | "mind" | "money" | "people" | "projects" | "other";
export const AREAS: { id: Area; label: string; hint: string }[] = [
  { id: "career", label: "Career", hint: "the job search, the promotion, the next role" },
  { id: "craft", label: "Craft", hint: "skills you are building: interviews, code, a language, an instrument" },
  { id: "body", label: "Body", hint: "sleep, exercise, food, habits" },
  { id: "mind", label: "Mind", hint: "reading, reflection, less phone" },
  { id: "money", label: "Money", hint: "spend less than planned, know where it goes" },
  { id: "people", label: "People", hint: "friends, mentors, network, family" },
  { id: "projects", label: "Projects", hint: "a business, a side project, something you are making" },
  { id: "other", label: "Something else", hint: "your words" },
];
export interface Goal { id: string; area: Area; title: string; why: string; priority: number; active: boolean }
export interface GoalProfile { wish: string; obstacle: string; if_then: string; hours_per_week: number; best_time: "morning" | "afternoon" | "evening"; days_off: string[] }
export interface DayPlan { day: string; time_available: number; energy: number | null; focus_goal_id: string | null; note: string; allocations: Record<string, number>; busy_until: string | null; suggested_minutes: number | null; summary: string }

export const PLAN_TIME_OPTIONS = [20, 40, 60, 90, 120] as const;
export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const areaLabel = (a: Area) => AREAS.find((x) => x.id === a)?.label ?? a;

/** The planning day: the calendar date in America/New_York, rolled over at 06:00 (so 02:00 still counts as "last night"). */
export function planningDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 6 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(shifted);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Free minutes after "busy until", assuming the day ends at 22:00 and a third of what is left is really available. */
export function suggestMinutes(busyUntil: string | null, now: Date = new Date()): number | null {
  const [h, m] = (busyUntil ?? "").split(":").map(Number);
  if (!busyUntil || !Number.isFinite(h) || !Number.isFinite(m)) return null;
  const start = Math.max(h * 60 + m, now.getHours() * 60 + now.getMinutes());
  const left = 22 * 60 - start;
  if (left <= 0) return 20;
  const third = Math.round(left / 3 / 5) * 5;
  return Math.max(20, Math.min(120, third));
}
export const nearestOption = (n: number) => PLAN_TIME_OPTIONS.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));

/** Default minutes per goal: the essential one gets half, the rest share the remainder by priority. Multiples of 5. */
export function defaultAllocations(goals: Goal[], total: number, essentialId: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!goals.length || total <= 0) return out;
  const ess = goals.find((g) => g.id === essentialId) ?? goals[0];
  const r5 = (x: number) => Math.max(0, Math.round(x / 5) * 5);
  const others = goals.filter((g) => g.id !== ess.id);
  const essMin = others.length ? r5(total / 2) : total;
  out[ess.id] = essMin;
  let left = total - essMin;
  others.forEach((g, i) => { const share = i === others.length - 1 ? left : r5(left / (others.length - i)); out[g.id] = Math.max(0, share); left -= out[g.id]; });
  return out;
}

/** The encouraging line. Deterministic, under 20 words, never a guilt trip. */
export function encouragement(total: number, essential: Goal | null, next: string | null): string {
  const t = total <= 20 ? `${total} minutes is a real day.` : total <= 40 ? `${total} minutes, well spent, moves everything.` : total <= 60 ? `An hour today. That is the whole method.` : `${total} minutes today. Use the first ones well.`;
  const what = essential ? `${essential.title} first` : next ? `${next} first` : "One thing first";
  return `${t} ${what}${next && essential ? `, then ${next}` : ""}. That is 1% better.`;
}
