// Pure metrics for the Insights page (docs/JOBS-UX.md §2 step 6). No DB, no dates from the clock: `today` is passed in.
import type { Application, Stage } from "./types";

const REPLIED: Stage[] = ["intro_call", "interview", "final", "offer", "rejected", "passed"];
const INTERVIEWED: Stage[] = ["interview", "final", "offer"];
const FINAL: Stage[] = ["final", "offer"];

const reached = (a: Application, set: Stage[]) => set.includes(a.stage) || (a.history ?? []).some((h) => set.includes(h.stage));
export const heardBack = (a: Application) => reached(a, REPLIED);
export const interviewed = (a: Application) => reached(a, INTERVIEWED);
export const reachedFinal = (a: Application) => reached(a, FINAL);
export const gotOffer = (a: Application) => reached(a, ["offer"]);

export const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
export const addDays = (d: string, n: number) => { const x = new Date(d + "T12:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

/** Days from applying to the first stage change (any reply). null when nothing happened yet. */
export function daysToFirstResponse(a: Application): number | null {
  const first = (a.history ?? []).find((h) => h.stage !== "applied");
  if (!first?.on || !a.applied_on) return null;
  const d = Math.round((Date.parse(first.on) - Date.parse(a.applied_on)) / 86400000);
  return Number.isFinite(d) && d >= 0 ? d : null;
}
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export interface Week { start: string; end: string; n: number }
/** Applications per ISO-ish week (Monday start), last `weeks` weeks ending with the week of `today`. */
export function weekly(apps: Application[], today: string, weeks = 12): Week[] {
  const t = new Date(today + "T12:00"); const dow = (t.getDay() + 6) % 7;   // Monday = 0
  const thisMonday = addDays(today, -dow);
  const out: Week[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisMonday, -7 * i), end = addDays(start, 6);
    out.push({ start, end, n: apps.filter((a) => a.applied_on >= start && a.applied_on <= end).length });
  }
  return out;
}

export interface FunnelStep { label: string; n: number; ofPrev: number | null; ofAll: number }
export function funnel(apps: Application[]): FunnelStep[] {
  const steps: [string, number][] = [
    ["Applied", apps.length],
    ["Heard back", apps.filter(heardBack).length],
    ["Interviewing", apps.filter(interviewed).length],
    ["Final round", apps.filter(reachedFinal).length],
    ["Offer", apps.filter(gotOffer).length],
  ];
  return steps.map(([label, n], i) => ({ label, n, ofPrev: i ? pct(n, steps[i - 1][1]) : null, ofAll: pct(n, apps.length) }));
}

export interface Headline { total: number; last7: number; prior7: number; responseRate: number; interviewRate: number; medianDays: number | null; responded: number; open: number }
export function headline(apps: Application[], today: string): Headline {
  const d7 = addDays(today, -6), d14 = addDays(today, -13);
  const responded = apps.filter(heardBack).length;
  return {
    total: apps.length,
    last7: apps.filter((a) => a.applied_on >= d7 && a.applied_on <= today).length,
    prior7: apps.filter((a) => a.applied_on >= d14 && a.applied_on < d7).length,
    responseRate: pct(responded, apps.length),
    interviewRate: pct(apps.filter(interviewed).length, apps.length),
    medianDays: median(apps.map(daysToFirstResponse).filter((x): x is number => x != null)),
    responded,
    open: apps.filter((a) => ["applied", "intro_call", "interview", "final"].includes(a.stage)).length,
  };
}

export interface SourceRow { source: "agent" | "me"; label: string; n: number; responseRate: number; interviewRate: number }
export function bySource(apps: Application[]): SourceRow[] {
  return (["agent", "me"] as const).map((source) => {
    const xs = apps.filter((a) => a.source === source);
    return { source, label: source === "agent" ? "Sent by the agent" : "Sent by you", n: xs.length, responseRate: pct(xs.filter(heardBack).length, xs.length), interviewRate: pct(xs.filter(interviewed).length, xs.length) };
  });
}
