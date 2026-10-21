// Recall engine: deterministic, pure functions over plain objects. Port of v1 scripts/recall.py; the golden test
// (engine.golden.test.ts) must pass byte-for-byte against v1's recorded outputs before any behaviour changes.
//
// Principles (data/recall-curriculum.json "principles"): spaced repetition, retrieval practice, interleaving,
// deliberate practice on the weakest category, 25-minute time-boxing, mastery gating at 3 strong scores per category.
import {
  type Bank, type BankItem, type Banks, type Curriculum, type Plan, type PracticeSlot, type Progress,
  type RecallState, type Recommendation, type StudySlot, type Track, ROTATION, TRACKS,
} from "./types";

export const DAILY_MIN = 60;
export const SLOT_MIN = 25;
export const MASTER_N = 3;
const DIFF_W: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

export const key = (track: Track, id: string) => `${track}:${id}`;

// ---------------------------------------------------------------- dates (UTC-free: YYYY-MM-DD strings only)
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  const p = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.floor((p(a) - p(b)) / 86400000);
}

// ---------------------------------------------------------------- spaced repetition
/** SM-2-lite. 8+ doubles the interval, 5-7 repeats tomorrow, below 5 comes back today. Mutates `item`. */
export function schedule(item: Progress, score: number, today: string): void {
  let interval = item.interval ?? 0;
  if (score >= 8) interval = interval ? Math.max(1, interval * 2) : 1;
  else if (score >= 5) interval = 1;
  else interval = 0;
  item.interval = interval;
  item.next_due = addDays(today, interval);
}

// ---------------------------------------------------------------- program
export function weekNo(st: RecallState, cur: Curriculum, today: string): number {
  const s = st.program?.start;
  if (!s) return 1;
  const days = daysBetween(today, s);
  const max = cur.weeks.length || 26;
  return Math.max(1, Math.min(max, Math.floor(days / 7) + 1));
}
export const weekOf = (cur: Curriculum, n: number) => cur.weeks.find((w) => w.week === n);

// ---------------------------------------------------------------- mastery / readiness
export interface CategoryMastery { total: number; attempted: number; strong: number; mastered: boolean; avg: number | null }

export function mastery(st: RecallState, banks: Banks, track: Track): Record<string, CategoryMastery> {
  const out: Record<string, CategoryMastery & { _scores?: number[] }> = {};
  for (const it of banks[track].items) {
    const cat = it.topic ?? "";
    const c = (out[cat] ??= { total: 0, attempted: 0, strong: 0, mastered: false, avg: null, _scores: [] });
    c.total += 1;
    const p = st.items[key(track, it.id)];
    if (p && p.attempts) {
      c.attempted += 1;
      c._scores!.push(p.best ?? 0);
      if ((p.best ?? 0) >= 8) c.strong += 1;
    }
  }
  for (const c of Object.values(out)) {
    c.mastered = c.strong >= Math.min(MASTER_N, c.total);
    c.avg = c._scores!.length ? pyRound1(c._scores!.reduce((a, b) => a + b, 0) / c._scores!.length) : null;
    delete c._scores;
  }
  return out;
}

/** 0-100. 70% difficulty-weighted coverage of strong (8+) items, 30% average of the last 10 scores.
 *  LeetCode coverage is measured against NeetCode 150 so the denominator is reachable in 6 months. */
export function readiness(st: RecallState, banks: Banks, track: Track): number {
  let B = banks[track].items;
  if (track === "leetcode") {
    const only150 = B.filter((i) => (i.lists ?? []).includes("neetcode150"));
    if (only150.length) B = only150;
  }
  const tot = B.reduce((s, i) => s + (DIFF_W[i.difficulty ?? ""] ?? 2), 0) || 1;
  const strong = B.filter((i) => (st.items[key(track, i.id)]?.best ?? 0) >= 8).reduce((s, i) => s + (DIFF_W[i.difficulty ?? ""] ?? 2), 0);
  const recent = st.sessions.filter((s) => s.track === track).slice(-10).map((s) => s.score);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  return pyRound((70 * strong) / tot + (30 * avg) / 10);
}

// Python's round(x, 1) is banker's rounding at an exact .x5; match it so golden values agree (7.25 -> 7.2).
export function pyRound1(x: number): number {
  return pyRound(x * 10) / 10;
}
// Python's round() is banker's rounding at exact .5; match it so golden values agree.
export function pyRound(x: number): number {
  const f = Math.floor(x), diff = x - f;
  if (Math.abs(diff - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

// ---------------------------------------------------------------- recommender
export interface RecommendOpts { exclude?: string[]; companyFocus?: string }

/** Pick the next item for a track. Tiers: due reviews (weakest first) > company-focus list > new in this week's
 *  focus category > new in the earliest unmastered roadmap category > attempted but weak > everything else.
 *  Difficulty steps up as a category gets strong scores; a category practised yesterday is pushed down unless due. */
export function recommend(st: RecallState, banks: Banks, cur: Curriculum, track: Track, today: string, opts: RecommendOpts = {}): Recommendation | null {
  const ex = new Set(opts.exclude ?? []);
  const B = banks[track].items.filter((i) => !ex.has(i.id));
  if (!B.length) return null;
  const yday = addDays(today, -1);
  const recent = new Set(st.sessions.filter((s) => s.track === track && (s.date === today || s.date === yday)).map((s) => s.topic));
  const wk = weekOf(cur, weekNo(st, cur, today));
  const focus = wk?.focus?.[track] ?? "";
  const mast = mastery(st, banks, track);
  const road = [...banks[track].categories];
  const focusCo = track === "leetcode" ? opts.companyFocus ?? "" : "";
  const crank = new Map<string, number>();
  if (focusCo) (banks.leetcode.company_lists?.[focusCo] ?? []).forEach((s, n) => crank.set(s, n));

  const diffRank = (i: BankItem) => {
    const m = mast[i.topic ?? ""] ?? { strong: 0, attempted: 0 };
    const s = m.strong;
    const order = s >= 2 ? ["Medium", "Hard", "Easy"] : s >= 1 || m.attempted >= 2 ? ["Medium", "Easy", "Hard"] : ["Easy", "Medium", "Hard"];
    const ix = order.indexOf(i.difficulty ?? "");
    return ix === -1 ? 3 : ix;
  };
  const roadRank = (i: BankItem) => {
    const cat = i.topic ?? "";
    const unm = road.filter((c) => !mast[c]?.mastered);
    const u = unm.indexOf(cat);
    if (u !== -1) return u;
    const r = road.indexOf(cat);
    return road.length + (r === -1 ? 99 : r);
  };
  type Key = [number, number[]];
  const keyOf = (n: number, i: BankItem): Key => {
    const p = st.items[key(track, i.id)] ?? ({} as Partial<Progress>);
    const cat = i.topic ?? "";
    const attempted = !!p.attempts;
    const due = attempted && !!p.next_due && p.next_due <= today;
    const pref150 = track !== "leetcode" || (i.lists ?? []).includes("neetcode150") ? 0 : 1;
    let tier: number, sub: number[];
    if (due) { tier = 0; sub = [p.best ?? 0, n]; }
    else if (!attempted && crank.has(i.id)) { tier = 1; sub = [crank.get(i.id)!, n]; }
    else if (!attempted && cat === focus) { tier = 1.2; sub = [pref150, diffRank(i), n]; }
    else if (!attempted) { tier = 2; sub = [roadRank(i), pref150, diffRank(i), n]; }
    else if ((p.best ?? 0) < 8) { tier = 3; sub = [p.best ?? 0, n]; }
    else { tier = 4; sub = [p.next_due ? 1 : 0, n]; }   // v1 sorts tier 4 by next_due string; approximated below
    if (tier && recent.has(cat)) tier += 0.5;
    return [tier, sub];
  };
  // Tier-4 tie-break in v1 is the next_due string; keep a parallel string key for exactness.
  const dueStr = (i: BankItem) => st.items[key(track, i.id)]?.next_due ?? "";
  let bestN = -1, bestKey: Key | null = null, bestDue = "";
  B.forEach((i, n) => {
    const k = keyOf(n, i);
    const d = dueStr(i);
    if (bestKey === null || cmp(k, d, bestKey, bestDue) < 0) { bestKey = k; bestN = n; bestDue = d; }
  });
  const best = B[bestN];
  const p = st.items[key(track, best.id)] ?? ({} as Partial<Progress>);
  const cat = best.topic ?? "";
  const isDue = !!(p.attempts && p.next_due && p.next_due <= today);
  let why: string;
  if (isDue) why = `Due for review (best ${p.best ?? 0}/10)`;
  else if (!p.attempts && crank.has(best.id)) why = `#${crank.get(best.id)! + 1} on ${focusCo}'s last-30-days list`;
  else if (!p.attempts && cat === focus) why = `This week's focus: ${focus}`;
  else if (!p.attempts) why = `New, in your weakest category: ${cat}`;
  else if ((p.best ?? 0) < 8) why = `Below 8 last time (${p.best ?? 0}/10), try again`;
  else why = "Keeping a strong topic warm";
  return { id: best.id, title: best.title, difficulty: best.difficulty ?? "", topic: cat, why };
}

function cmp(a: [number, number[]], ad: string, b: [number, number[]], bd: string): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  // tier 4: v1 compares (next_due string, n); other tiers compare the numeric tuple
  if (a[0] === 4 || a[0] === 4.5) {
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a[1][1] - b[1][1];
  }
  for (let i = 0; i < Math.max(a[1].length, b[1].length); i++) {
    const x = a[1][i] ?? 0, y = b[1][i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function dueCount(st: RecallState, track: Track, today: string): number {
  return Object.entries(st.items).filter(([k, v]) => k.startsWith(track + ":") && !!v.next_due && v.next_due <= today).length;
}

/** Rotate the second slot: most due reviews wins, else the lowest readiness, never the same track two days running. */
export function secondTrack(st: RecallState, banks: Banks, today: string): [Track, string] {
  let prev: Track | null = null;
  for (const pd of Object.keys(st.plans).sort()) {
    if (pd < today) for (const s of st.plans[pd].slots) if (s.kind === "practice" && ROTATION.includes(s.track)) prev = s.track;
  }
  const cands = ROTATION.filter((t) => t !== prev);
  const pool = cands.length ? cands : ROTATION;
  const due = Object.fromEntries(pool.map((t) => [t, dueCount(st, t, today)])) as Record<Track, number>;
  let top = pool[0];
  for (const t of pool) if (due[t] > due[top]) top = t;
  if (due[top] > 0) return [top, `has ${due[top]} review${due[top] === 1 ? "" : "s"} due`];
  let t = pool[0];
  for (const c of pool) {
    const a = [readiness(st, banks, c), ROTATION.indexOf(c)], b = [readiness(st, banks, t), ROTATION.indexOf(t)];
    if (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])) t = c;
  }
  return [t, `your lowest readiness (${readiness(st, banks, t)}%)`];
}

/** First unfinished reading of the current week, else first unfinished homework, else next week's first reading. */
export function thirdSlot(st: RecallState, cur: Curriculum, today: string): StudySlot | null {
  const done = st.program?.done ?? {};
  const n = weekNo(st, cur, today);
  for (const wn of [n, n + 1]) {
    const w = weekOf(cur, wn);
    if (!w) continue;
    for (const kind of ["reading", "homework"] as const) {
      for (const r of w[kind] ?? []) {
        if (!(r.id in done)) {
          return { kind, id: r.id, week: wn, minutes: Math.trunc(r.est_min ?? 20), title: r.what ?? r.text, book: r.book ?? "", track: r.track ?? "" };
        }
      }
    }
  }
  return null;
}

export function buildPlan(st: RecallState, banks: Banks, cur: Curriculum, today: string, opts: RecommendOpts = {}): Plan {
  if (!st.program.start) st.program.start = today;
  const lc = recommend(st, banks, cur, "leetcode", today, opts);
  const [t2, why2] = secondTrack(st, banks, today);
  const it2 = recommend(st, banks, cur, t2, today);
  const s1: PracticeSlot = { kind: "practice", track: "leetcode", minutes: SLOT_MIN, ...(lc ?? {}) };
  const s2: PracticeSlot = { kind: "practice", track: t2, minutes: SLOT_MIN, track_why: why2, ...(it2 ?? {}) };
  const slots: Plan["slots"] = [s1, s2];
  const third = thirdSlot(st, cur, today);
  if (third) slots.push(third);
  return { date: today, week: weekNo(st, cur, today), slots };
}

// ---------------------------------------------------------------- minutes
export function minutesOn(st: RecallState, d: string): number {
  let m = st.sessions.filter((s) => s.date === d).reduce((a, s) => a + Number(s.minutes_used ?? 0), 0);
  m += Number(st.program?.minutes?.[d] ?? 0);
  m += (st.external ?? []).filter((e) => e.date === d).reduce((a, e) => a + Number(e.minutes ?? 0), 0);
  return Math.round(m * 10) / 10;
}

export { TRACKS };
export type { Bank };
