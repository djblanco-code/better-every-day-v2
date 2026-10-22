// Life: habits, daily check-in, money. Plain row shapes shared by actions and pages.
export type Cadence = "daily" | "weekdays" | "weekly";
export interface Habit { id: string; name: string; icon: string; cadence: Cadence; target_per_week: number; active: boolean; sort: number }
export interface HabitLog { habit_id: string; date: string; done: boolean; note: string }
export interface Checkin { date: string; sleep_hours: number | null; energy: number | null; mood: number | null; exercise_minutes: number; weight: number | null; time_available: number | null; note: string }
export interface Transaction { id: string; date: string; kind: "expense" | "income"; amount_cents: number; category: string; merchant: string; note: string }
export interface Budget { category: string; limit_cents: number }
export const CATEGORIES = ["food", "groceries", "rent", "transport", "health", "subscriptions", "fun", "clothes", "education", "gifts", "travel", "other"] as const;
export const ENERGY = ["", "Drained", "Low", "Okay", "Good", "Great"] as const;   // index = 1..5
export const MOOD = ["", "Rough", "Meh", "Fine", "Good", "Great"] as const;
export const TIME_OPTIONS = [20, 40, 60, 90] as const;

/** Habit due today? daily: yes; weekdays: Mon-Fri; weekly: counts against target_per_week, always offered. */
export function dueToday(h: Habit, date: string): boolean {
  if (h.cadence === "daily" || h.cadence === "weekly") return true;
  const dow = new Date(date + "T12:00").getDay();
  return dow >= 1 && dow <= 5;
}
export const money = (cents: number) => (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
