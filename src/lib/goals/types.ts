// Goals and the daily plan. The questionnaire is short on purpose (research: under ten questions, mixed types) and
// borrows its shape from WOOP (wish, outcome, obstacle, plan) and implementation intentions (if-then plans, d≈.61
// on goal attainment in Gollwitzer & Sheeran's meta-analysis). docs/PRD.md §4.7.
export type Area = "job" | "interview" | "network" | "health" | "money" | "learn" | "other";
export const AREAS: { id: Area; label: string; hint: string }[] = [
  { id: "job", label: "Land the job", hint: "applications, follow-ups, offers" },
  { id: "interview", label: "Be ready for interviews", hint: "the daily hour: LeetCode, system design, the rest" },
  { id: "network", label: "Grow my network", hint: "people, mentors, referrals" },
  { id: "health", label: "Health and energy", hint: "sleep, exercise, habits" },
  { id: "money", label: "Money", hint: "spend less than planned, know where it goes" },
  { id: "learn", label: "Learn a skill", hint: "a book, a course, a side project" },
  { id: "other", label: "Something else", hint: "your words" },
];
export interface Goal { id: string; area: Area; title: string; why: string; priority: number; active: boolean }
export interface GoalProfile { wish: string; obstacle: string; if_then: string; hours_per_week: number; best_time: "morning" | "afternoon" | "evening"; days_off: string[] }
export interface DayPlan { day: string; time_available: number; energy: number | null; focus_goal_id: string | null; note: string }

export const PLAN_TIME_OPTIONS = [20, 40, 60, 90, 120] as const;
export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** The planning day: the calendar date in America/New_York, rolled over at 06:00 (so 02:00 still counts as "last night"). */
export function planningDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 6 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(shifted);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const areaLabel = (a: Area) => AREAS.find((x) => x.id === a)?.label ?? a;
