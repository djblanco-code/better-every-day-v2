"use client";
import Link from "next/link";
import { Shell } from "../shell";
import { useEffect, useState, useTransition } from "react";
import { clearDayPlan, getToday, logMinutes, makeDayPlan, markDone, swapSlot, tickHabit, type DayExtras, type TodayData } from "./actions";
import { DayPlanCard, MakingPlan } from "./day-plan-card";
import { JournalCard } from "../journal/journal-card";
import type { PlanView, SlotView } from "@/lib/recall/plan";
import type { Track } from "@/lib/recall/types";
import { money } from "@/lib/life/types";
import { areaLabel, type Goal } from "@/lib/goals/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const hourNow = () => new Date().getHours();

// Home tells you what today is. One daily question (time); the goals are fixed; the time decides what is possible:
// the hour's slots in order while they fit, then the goals' small items with the minutes left. Glanced at several
// times a day, so the hour shows only the next slot that fits. docs/SOUL.md, PRD §4.7.
type Possible = { key: string; goal: Goal | null; label: string; minutes: number; href: string; count?: number };

function possibleToday(day: DayExtras, minutesLeft: number): { items: Possible[]; left: number } {
  const items: Possible[] = [];
  let left = minutesLeft;
  const push = (p: Possible) => { if (p.minutes <= left) { items.push(p); left -= p.minutes; } };
  for (const g of day.goals) {
    if (g.area === "job") {
      const due = day.due.filter((d) => d.href.startsWith("/jobs")).slice(0, 3);
      if (due.length) push({ key: "due", goal: g, label: `${due.length} thing${due.length === 1 ? "" : "s"} due in Jobs`, minutes: 10 * due.length, href: "/jobs/pipeline", count: due.length });
      if (day.leads) push({ key: "leads", goal: g, label: "Apply to 1 from Leads", minutes: 20, href: "/jobs/todo" });
      if (day.stale) push({ key: "stale", goal: g, label: `Nudge or close ${Math.min(day.stale, 5)} quiet application${day.stale === 1 ? "" : "s"}`, minutes: 5, href: "/jobs/pipeline" });
    } else if (g.area === "network") {
      const fu = day.due.filter((d) => d.href === "/network").slice(0, 3);
      if (fu.length) push({ key: "followups", goal: g, label: `${fu.length} follow-up${fu.length === 1 ? "" : "s"} to send`, minutes: 10 * fu.length, href: "/network", count: fu.length });
      else push({ key: "network-one", goal: g, label: "Reach out to one person", minutes: 10, href: "/network" });
    } else if (g.area === "health") {
      const open = day.habits.filter((h) => !h.done);
      if (open.length) push({ key: "habits", goal: g, label: `${open.length} habit${open.length === 1 ? "" : "s"} left today`, minutes: 0, href: "/life", count: open.length });
    } else if (g.area === "money") {
      push({ key: "money", goal: g, label: "Log today's spending", minutes: 3, href: "/life" });
    } else if (g.area === "learn") {
      push({ key: "learn", goal: g, label: "20 minutes on it", minutes: 20, href: "/life" });
    }
  }
  return { items, left };
}

export function TodayClient({ counts, top }: { counts: { apps: number; interviewing: number; people: number; events: number }; top?: React.ReactNode }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [making, setMaking] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => { getToday(localDate()).then(setData).catch((e) => setErr(String(e?.message ?? e))); }, []);
  const run = (fn: () => Promise<TodayData>) => start(async () => { try { setData(await fn()); } catch (e) { setErr(String((e as Error)?.message ?? e)); } });

  if (err) return <Shell width="wide"><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!data) return <Shell width="wide"><p className="text-neutral-500">Setting up your day…</p></Shell>;

  const { plan, summary, day } = data;
  const hour = hourNow();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date(data.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const pct = Math.min(100, Math.round((100 * plan.minutes_done) / plan.target));

  if (making) return <Shell width="wide">{top}<MakingPlan /></Shell>;
  if (!day.day_plan) {
    return (
      <Shell width="wide">
        {top}
        <header className="rise mx-auto w-full max-w-2xl">
          <p className="text-sm text-neutral-500">{greeting} · {dateLabel}</p>
          <h1 className="text-3xl sm:text-4xl">Let&apos;s make your daily plan.</h1>
        </header>
        <DayPlanCard pending={pending} onDone={(minutes) => { setMaking(true); const started = Date.now(); start(async () => { try { const next = await makeDayPlan({ time_available: minutes, focus_goal_id: null, energy: null }, localDate()); await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started)))); setData(next); } catch (e) { setErr(String((e as Error)?.message ?? e)); } finally { setMaking(false); } }); }} />
      </Shell>
    );
  }

  // What fits: the hour's slots in order, then the goals' items with what is left.
  const budget = day.day_plan.time_available;
  const fit = fitSlots(plan, budget);
  const nextSlot = plan.slots.find((s, i) => !s.done && fit.fits[i]) ?? null;
  const nextIndex = nextSlot ? plan.slots.indexOf(nextSlot) : -1;
  const rest = plan.slots.filter((s) => s !== nextSlot);
  const { items: possible } = possibleToday(day, Math.max(0, budget - fit.used));
  const habitsDone = day.habits.filter((h) => h.done).length;
  const todayLine = [
    `${budget} min today`,
    plan.complete ? "the hour is done" : nextSlot ? `next: ${nextSlot.title ?? "the next slot"} (${nextSlot.minutes} min${fit.over ? ", a little over" : ""})` : "the hour is done",
    possible.length ? `then ${possible.map((p) => p.label.toLowerCase()).slice(0, 2).join(" and ")}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Shell width="wide">
      {top}
      <header className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{greeting} · {dateLabel}</p>
          <h1 className="text-3xl sm:text-4xl">{plan.complete ? "Hour done." : pct ? `${plan.target - Math.round(plan.minutes_done)} minutes to go.` : summary.sessions_total === 0 ? "Your first hour." : "Your hour."}</h1>
        </div>
        <Ring pct={pct} label={`${Math.round(plan.minutes_done)}`} sub={`of ${plan.target}`} />
      </header>

      {/* The one sentence. */}
      <section className="rise rise-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-white px-4 py-3">
        <p className="text-base"><span className="font-medium">Today:</span> {todayLine}.</p>
        <button className="text-sm text-neutral-600 hover:underline" onClick={() => run(() => clearDayPlan(localDate()))}>Change</button>
      </section>

      <UpdatesLine onSaved={() => run(() => getToday(localDate()))} evening={hour >= 17} />

      {/* The hour: the next slot that fits. */}
      <section className="rise rise-3 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">The hour</h2>
          <span className="text-xs text-neutral-500">{fit.fits.filter(Boolean).length} of {plan.slots.length} fit in {budget} min{summary.due ? ` · ${summary.due} due for review` : ""}</span>
        </div>
        {plan.complete ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="display text-2xl text-green-900">Day {Math.max(1, summary.streak)}. Readiness {summary.readiness_overall}%.</p>
            <p className="mt-1 text-sm text-green-900/80">{Math.round(plan.minutes_done)} minutes today. {summary.streak > 1 ? `${summary.streak} days in a row.` : "Tomorrow's plan is ready at six."}</p>
          </div>
        ) : nextSlot ? (
          <SlotCard i={nextIndex} s={nextSlot} later={false} pending={pending} onSwap={() => run(() => swapSlot(nextIndex, localDate()))} onDone={(m) => run(() => markDone((nextSlot as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((nextSlot as { id: string }).id, 0, true, localDate()))} />
        ) : <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">Nothing else fits in {budget} minutes. Change the time above, or log minutes you did elsewhere.</p>}
        {rest.length ? (
          <div>
            <button className="text-sm text-neutral-600 hover:underline" aria-expanded={showRest} onClick={() => setShowRest((v) => !v)}>{showRest ? "Hide the rest" : `Show the rest (${rest.length})`}</button>
            {showRest ? <div className="mt-3 space-y-3">{rest.map((s) => { const i = plan.slots.indexOf(s); return <SlotCard key={i} i={i} s={s} later={!fit.fits[i]} pending={pending} onSwap={() => run(() => swapSlot(i, localDate()))} onDone={(m) => run(() => markDone((s as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((s as { id: string }).id, 0, true, localDate()))} />; })}</div> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <input value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="numeric" placeholder="min" className="h-8 w-16 rounded-lg border border-neutral-300 bg-white px-2 text-sm" aria-label="Extra minutes" />
          <button disabled={pending || !+extra} onClick={() => { run(() => logMinutes(+extra, localDate())); setExtra(""); }} className="h-8 rounded-lg px-2 hover:bg-neutral-100 disabled:opacity-50">Log minutes outside the app</button>
          <Link href="/program" className="ml-auto hover:underline">Readiness by track →</Link>
        </div>
      </section>

      {/* What else fits today, from the goals. */}
      <section className="rise rise-4 space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Also possible today</h2>
        {possible.length ? (
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
            {possible.map((p) => <li key={p.key} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{p.label}</p><p className="text-xs text-neutral-500">{p.goal ? `${areaLabel(p.goal.area)} · ${p.goal.title}` : ""}{p.minutes ? ` · ~${p.minutes} min` : ""}</p></div><Link href={p.href} className="text-sm text-neutral-600 hover:underline">Open</Link></li>)}
          </ul>
        ) : <p className="text-sm text-neutral-500">{day.goals.length ? `The hour fills today's ${budget} minutes. The rest of your goals wait for a longer day.` : <>No goals yet. <Link href="/goals" className="underline">Seven questions</Link> and this list fills itself.</>}</p>}
      </section>

      {day.habits.length ? (
        <section className="rise rise-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium uppercase tracking-wide text-neutral-500">Habits · {habitsDone}/{day.habits.length}</span>
          {day.habits.map(({ habit, done }) => <button key={habit.id} disabled={pending} aria-pressed={done} onClick={() => run(() => tickHabit(habit.id, !done, localDate()))} className={`h-9 rounded-xl border px-3 text-sm ${done ? "border-green-600 bg-green-600 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{done ? "✓ " : ""}{habit.icon ? `${habit.icon} ` : ""}{habit.name}</button>)}
        </section>
      ) : null}

      <p className="rise rise-4 text-xs text-neutral-500">{counts.interviewing ? `${counts.interviewing} in interviews · ` : ""}{day.spent_cents ? `${money(day.spent_cents)} spent this month · ` : ""}<Link href="/jobs" className="underline">Jobs</Link> · <Link href="/network" className="underline">Network</Link> · <Link href="/life" className="underline">Life</Link> · <Link href="/goals" className="underline">Goals</Link></p>
    </Shell>
  );
}

function fitSlots(plan: PlanView, budget: number): { fits: boolean[]; used: number; over: boolean } {
  let used = 0; const fits: boolean[] = [];
  for (const s of plan.slots) {
    if (s.done) { fits.push(true); used += s.minutes ?? 0; continue; }
    const m = s.minutes ?? 0;
    if (used + m <= budget) { fits.push(true); used += m; } else fits.push(false);
  }
  // A short day still gets one slot: the shortest open one, a little over budget, rather than nothing.
  const anyOpenFits = plan.slots.some((s, i) => !s.done && fits[i]);
  let over = false;
  if (!anyOpenFits) {
    let best = -1;
    plan.slots.forEach((s, i) => { if (!s.done && (best < 0 || (s.minutes ?? 0) < (plan.slots[best].minutes ?? 0))) best = i; });
    if (best >= 0) { fits[best] = true; used += plan.slots[best].minutes ?? 0; over = true; }
  }
  return { fits, used: Math.min(used, budget), over };
}

function UpdatesLine({ onSaved, evening }: { onSaved: () => void; evening: boolean }) {
  const [open, setOpen] = useState(evening);
  if (!open) return <button className="rise rise-2 w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-left text-sm text-neutral-600 hover:bg-white" onClick={() => setOpen(true)}>+ Add an update</button>;
  return <div className="rise rise-2"><JournalCard compact onSaved={() => { onSaved(); if (!evening) setOpen(false); }} /></div>;
}

function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  return (
    <div className="grid h-20 w-20 flex-none place-items-center rounded-full" style={{ background: `conic-gradient(${pct >= 100 ? "#16a34a" : "var(--accent)"} ${pct * 3.6}deg, var(--color-neutral-200) 0)` }} role="img" aria-label={`${label} ${sub} minutes`}>
      <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-center"><div><div className="display text-xl leading-none">{label}</div><div className="text-[10px] text-neutral-500">{sub}</div></div></div>
    </div>
  );
}
function SlotCard({ i, s, later, pending, onSwap, onDone, onUndo }: { i: number; s: SlotView; later: boolean; pending: boolean; onSwap: () => void; onDone: (m: number) => void; onUndo: () => void }) {
  const [mins, setMins] = useState(String(s.minutes ?? 20));
  const isP = s.kind === "practice";
  const meta = isP ? [TRACK_NAME[s.track], s.difficulty, s.topic, `${s.minutes} min`].filter(Boolean).join(" · ") : [s.kind === "reading" ? "Reading" : "Homework", s.book, `${s.minutes} min`].filter(Boolean).join(" · ");
  const why = isP ? `${s.track_why ? `${TRACK_NAME[s.track]} today: ${s.track_why}. ` : ""}${s.why ?? ""}` : `Week ${s.week} of the program.`;
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 ${later ? "opacity-60" : ""}`}>
      <div className={`grid h-10 w-10 flex-none place-items-center rounded-full text-sm font-semibold ${s.done ? "bg-green-100 text-green-700" : later ? "bg-neutral-100 text-neutral-500" : "bg-blue-50 text-blue-700"}`}>{s.done ? "✓" : i + 1}</div>
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <p className="text-xs text-neutral-500">{meta}{later ? " · tomorrow, or a longer day" : ""}</p>
        <p className={`font-medium ${s.done ? "text-neutral-400 line-through" : ""}`}>{s.title ?? "(nothing left in this track)"}</p>
        <p className="text-xs text-neutral-400">{why}</p>
      </div>
      {s.done ? (
        <div className="flex items-center gap-2 text-sm">
          {isP && s.score != null ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">{s.score}/10</span> : null}
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">{s.substituted ? "Done (different problem)" : "Done"}</span>
          {!isP ? <button disabled={pending} onClick={onUndo} className="text-neutral-500 hover:underline">Undo</button> : null}
        </div>
      ) : isP ? (
        <div className="flex items-center gap-2">
          <button disabled={pending} onClick={onSwap} className="h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-50">Swap</button>
          <a href={`/practice/${s.track}/${encodeURIComponent(s.id ?? "")}`} className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ${later ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50" : "bg-accent text-accent-ink hover:brightness-110"}`}>Start</a>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={mins} onChange={(e) => setMins(e.target.value)} inputMode="numeric" className="h-9 w-20 rounded-lg border border-neutral-300 bg-white px-2 text-sm" aria-label="Minutes spent" />
          <button disabled={pending} onClick={() => onDone(+mins || 0)} className="h-9 rounded-lg bg-accent px-3 text-sm font-medium text-accent-ink hover:brightness-110">Done</button>
        </div>
      )}
    </div>
  );
}
