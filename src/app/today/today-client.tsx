"use client";
import Link from "next/link";
import { Shell } from "../shell";
import { useEffect, useState, useTransition } from "react";
import { clearDayPlan, getToday, logMinutes, makeDayPlan, markDone, swapSlot, tickHabit, type TodayData } from "./actions";
import { DayPlanCard, MakingPlan } from "./day-plan-card";
import { areaLabel } from "@/lib/goals/types";
import { JournalCard } from "../journal/journal-card";
import type { SlotView } from "@/lib/recall/plan";
import type { Track } from "@/lib/recall/types";
import { ENERGY, MOOD, money } from "@/lib/life/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const hourNow = () => new Date().getHours();

// Home = the hour. Three things: check in, the plan, the journal. Everything else is one line and one tap away.
// docs/SOUL.md: mornings open the check-in; evenings lead with the journal; a finished hour folds the plan and
// says one quiet line. The journal is always on the page: it is where you say what you did today.
export function TodayClient({ email, counts, top }: { email: string; counts: { apps: number; interviewing: number; people: number; events: number }; top?: React.ReactNode }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [making, setMaking] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => { getToday(localDate()).then(setData).catch((e) => setErr(String(e?.message ?? e))); }, []);
  const run = (fn: () => Promise<TodayData>) => start(async () => { try { setData(await fn()); } catch (e) { setErr(String((e as Error)?.message ?? e)); } });

  if (err) return <Shell width="wide"><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!data) return <Shell width="wide"><p className="text-neutral-500">Setting up your hour…</p></Shell>;

  const { plan, summary, day } = data;
  const ck = day.checkin;
  const hour = hourNow();
  const evening = hour >= 17, morning = hour < 12;
  const greeting = morning ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date(data.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const pct = Math.min(100, Math.round((100 * plan.minutes_done) / plan.target));

  const budget = ck?.time_available ?? null;
  const lowEnergy = !!ck?.energy && ck.energy <= 2 && budget == null;
  const effective = budget ?? (lowEnergy ? 40 : null);
  const fits = plan.slots.reduce<{ used: number; out: boolean[] }>((acc, s) => {
    if (effective == null || s.done) { acc.out.push(true); return acc; }
    acc.used += s.minutes ?? 0; acc.out.push(acc.used <= effective); return acc;
  }, { used: 0, out: [] }).out;
  const habitsDone = day.habits.filter((h) => h.done).length;
  const elsewhere = [
    day.due.length ? `${day.due.length} need${day.due.length === 1 ? "s" : ""} you in Jobs` : null,
    counts.interviewing ? `${counts.interviewing} in interviews` : null,
    day.habits.length ? `habits ${habitsDone}/${day.habits.length}` : null,
    day.spent_cents ? `${money(day.spent_cents)} spent this month` : null,
  ].filter(Boolean);
  const focus = day.day_plan?.focus_goal_id ? day.goals.find((g) => g.id === day.day_plan!.focus_goal_id) ?? null : null;

  if (making) return <Shell width="wide">{top}<MakingPlan /></Shell>;
  if (!day.day_plan) {
    return (
      <Shell width="wide">
        {top}
        <header className="rise mx-auto w-full max-w-2xl">
          <p className="text-sm text-neutral-500">{greeting} · {dateLabel} · week {plan.week}</p>
          <h1 className="text-3xl sm:text-4xl">Let&apos;s make your daily plan.</h1>
        </header>
        <DayPlanCard goals={day.goals} pending={pending} defaultTime={budget ?? 60} onDone={(v) => { setMaking(true); const started = Date.now(); start(async () => { try { const next = await makeDayPlan(v, localDate()); const wait = Math.max(0, 1400 - (Date.now() - started)); await new Promise((r) => setTimeout(r, wait)); setData(next); } catch (e) { setErr(String((e as Error)?.message ?? e)); } finally { setMaking(false); } }); }} />
      </Shell>
    );
  }

  return (
    <Shell width="wide">
      {top}
      <header className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{greeting} · {dateLabel} · week {plan.week}</p>
          <h1 className="text-3xl sm:text-4xl">{plan.complete ? "Hour done." : pct ? `${plan.target - Math.round(plan.minutes_done)} minutes to go.` : summary.sessions_total === 0 ? "Your first hour." : "Your hour."}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Ring pct={pct} label={`${Math.round(plan.minutes_done)}`} sub={`of ${plan.target}`} />
          <form action="/auth/sign-out" method="post"><button className="text-xs text-neutral-500 hover:underline">{email} · Sign out</button></form>
        </div>
      </header>

      {elsewhere.length ? <p className="rise rise-2 text-sm text-neutral-600">{elsewhere.map((t, i) => <span key={i}>{i ? " · " : ""}{t}</span>)} · <Link href="/jobs/pipeline" className="underline">Jobs</Link> · <Link href="/network" className="underline">Network</Link> · <Link href="/life" className="underline">Life</Link> · <Link href="/goals" className="underline">Goals</Link></p> : null}

      {/* The daily plan line: time, the goal that gets today, how you are. Change asks again. */}
      <section className="rise rise-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm">
        <p><span className="font-medium">Today:</span> {day.day_plan!.time_available} min{focus ? <> · for <span className="font-medium">{focus.title}</span> <span className="text-neutral-500">({areaLabel(focus.area)})</span></> : day.goals.length ? "" : <> · <Link href="/goals" className="underline">set your goals</Link></>}{ck?.energy ? ` · energy ${ENERGY[ck.energy].toLowerCase()}` : ""}{ck?.mood ? ` · mood ${MOOD[ck.mood].toLowerCase()}` : ""}{ck?.sleep_hours != null ? ` · ${ck.sleep_hours} h sleep` : ""}</p>
        <button className="text-neutral-600 hover:underline" onClick={() => run(() => clearDayPlan(localDate()))}>Change</button>
      </section>


      {/* The plan. Done → it folds to one line. */}
      <section className="rise rise-3 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">The hour</h2>
          <span className="text-xs text-neutral-500">{effective != null ? `${fits.filter(Boolean).length} of ${plan.slots.length} fit in ${effective} min` : `${plan.minutes_planned} min planned`}{summary.due ? ` · ${summary.due} due for review` : ""}</span>
        </div>
        {plan.complete ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="display text-2xl text-green-900">Day {Math.max(1, summary.streak)}. Readiness {summary.readiness_overall}%.</p>
            <p className="mt-1 text-sm text-green-900/80">{Math.round(plan.minutes_done)} minutes today. {summary.streak > 1 ? `${summary.streak} days in a row.` : "Tomorrow's plan is ready at midnight."}</p>
            <details className="mt-3 text-sm"><summary className="cursor-pointer text-green-900/80">What you did</summary><div className="mt-3 space-y-3">{plan.slots.map((s, i) => <SlotCard key={i} i={i} s={s} later={false} pending={pending} onSwap={() => undefined} onDone={() => undefined} onUndo={() => run(() => markDone((s as { id: string }).id, 0, true, localDate()))} />)}</div></details>
          </div>
        ) : plan.slots.map((s, i) => <SlotCard key={i} i={i} s={s} later={!fits[i]} pending={pending} onSwap={() => run(() => swapSlot(i, localDate()))} onDone={(m) => run(() => markDone((s as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((s as { id: string }).id, 0, true, localDate()))} />)}
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <input value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="numeric" placeholder="min" className="h-8 w-16 rounded-lg border border-neutral-300 bg-white px-2 text-sm" aria-label="Extra minutes" />
          <button disabled={pending || !+extra} onClick={() => { run(() => logMinutes(+extra, localDate())); setExtra(""); }} className="h-8 rounded-lg px-2 hover:bg-neutral-100 disabled:opacity-50">Log minutes outside the app</button>
          <Link href="/program" className="ml-auto hover:underline">Readiness by track →</Link>
        </div>
      </section>

      {day.habits.length ? (
        <section className="rise rise-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium uppercase tracking-wide text-neutral-500">Habits</span>
          {day.habits.map(({ habit, done }) => <button key={habit.id} disabled={pending} aria-pressed={done} onClick={() => run(() => tickHabit(habit.id, !done, localDate()))} className={`h-9 rounded-xl border px-3 text-sm ${done ? "border-green-600 bg-green-600 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{done ? "✓ " : ""}{habit.icon ? `${habit.icon} ` : ""}{habit.name}</button>)}
        </section>
      ) : null}

      {/* Evening: the journal leads. */}
      <div className={`rise rise-4 ${evening ? "rounded-2xl ring-2 ring-accent/30" : ""}`}>
        <JournalCard onSaved={() => run(() => getToday(localDate()))} />
      </div>
    </Shell>
  );
}

function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  return (
    <div className="grid h-20 w-20 flex-none place-items-center rounded-full" style={{ background: `conic-gradient(${pct >= 100 ? "#16a34a" : "var(--accent)"} ${pct * 3.6}deg, var(--color-neutral-200) 0)` }} role="img" aria-label={`${label} ${sub} minutes`}>
      <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-white text-center"><div><div className="display text-xl leading-none">{label}</div><div className="text-[10px] text-neutral-500">{sub}</div></div></div>
    </div>
  );
}
function SlotCard({ i, s, later, pending, big = false, onSwap, onDone, onUndo }: { i: number; s: SlotView; later: boolean; pending: boolean; big?: boolean; onSwap: () => void; onDone: (m: number) => void; onUndo: () => void }) {
  const [mins, setMins] = useState(String(s.minutes ?? 20));
  const isP = s.kind === "practice";
  const meta = isP ? [TRACK_NAME[s.track], s.difficulty, s.topic, `${s.minutes} min`].filter(Boolean).join(" · ") : [s.kind === "reading" ? "Reading" : "Homework", s.book, `${s.minutes} min`].filter(Boolean).join(" · ");
  const why = isP ? `${s.track_why ? `${TRACK_NAME[s.track]} today: ${s.track_why}. ` : ""}${s.why ?? ""}` : `Week ${s.week} of the program.`;
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white ${big ? "p-5 sm:p-6" : "p-5"} ${later ? "opacity-60" : ""}`}>
      <div className={`grid h-10 w-10 flex-none place-items-center rounded-full text-sm font-semibold ${s.done ? "bg-green-100 text-green-700" : later ? "bg-neutral-100 text-neutral-500" : "bg-blue-50 text-blue-700"}`}>{s.done ? "✓" : i + 1}</div>
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <p className="text-xs text-neutral-500">{meta}{later ? " · if time allows" : ""}</p>
        <p className={`${big ? "text-xl" : ""} font-medium ${s.done ? "text-neutral-400 line-through" : ""}`}>{s.title ?? "(nothing left in this track)"}</p>
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
          <a href={`/practice/${s.track}/${encodeURIComponent(s.id ?? "")}`} className={`inline-flex items-center rounded-lg text-sm font-medium ${big ? "h-11 px-5 text-base" : "h-9 px-3"} ${later ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50" : "bg-accent text-accent-ink hover:brightness-110"}`}>Start</a>
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
