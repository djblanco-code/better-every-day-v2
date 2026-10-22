"use client";
import Link from "next/link";
import { Shell } from "../shell";
import { useEffect, useState, useTransition } from "react";
import { getToday, logMinutes, markDone, setTimeAvailable, swapSlot, tickHabit, type TodayData } from "./actions";
import { CheckinForm } from "../life/checkin-form";
import { JournalCard } from "../journal/journal-card";
import type { SlotView } from "@/lib/recall/plan";
import type { Track } from "@/lib/recall/types";
import { ENERGY, MOOD, TIME_OPTIONS, money } from "@/lib/life/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const hourNow = () => new Date().getHours();

// Home = the hour. Three things: check in, the plan, the journal. Everything else is one line and one tap away.
// docs/SOUL.md: day zero is a single card; mornings open the check-in; evenings lead with the journal; a finished
// hour folds the plan and says one quiet line.
export function TodayClient({ email, counts, top }: { email: string; counts: { apps: number; interviewing: number; people: number; events: number }; top?: React.ReactNode }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [showCheckin, setShowCheckin] = useState<boolean | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => { getToday(localDate()).then(setData).catch((e) => setErr(String(e?.message ?? e))); }, []);
  const run = (fn: () => Promise<TodayData>) => start(async () => { try { setData(await fn()); } catch (e) { setErr(String((e as Error)?.message ?? e)); } });

  if (err) return <Shell width="wide"><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!data) return <Shell width="wide"><p className="text-neutral-500">Setting up your hour…</p></Shell>;

  const { plan, summary, day } = data;
  const ck = day.checkin;
  const checkedIn = !!(ck && (ck.energy || ck.mood || ck.sleep_hours != null));
  const hour = hourNow();
  const evening = hour >= 17, morning = hour < 12;
  const greeting = morning ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date(data.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const pct = Math.min(100, Math.round((100 * plan.minutes_done) / plan.target));
  const dayZero = summary.sessions_total === 0 && plan.minutes_done === 0 && !checkedIn;
  const checkinOpen = showCheckin ?? (morning && !checkedIn);

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

  // Day zero: one card, one button.
  if (dayZero && !showAll) {
    const first = plan.slots[0];
    return (
      <Shell width="read">
        {top}
        <section className="rise mt-10 rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10">
          <p className="text-sm text-neutral-500">{dateLabel}</p>
          <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">Your first hour starts here.</h1>
          <p className="mt-4 max-w-prose text-neutral-600">One hour a day, every day, until you&apos;re hired. The plan is already made. Today it begins with this:</p>
          {first ? <div className="mt-6"><SlotCard i={0} s={first} later={false} pending={pending} big onSwap={() => run(() => swapSlot(0, localDate()))} onDone={(m) => run(() => markDone((first as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((first as { id: string }).id, 0, true, localDate()))} /></div> : null}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <button className="text-neutral-600 hover:underline" onClick={() => setShowAll(true)}>See the whole plan for today</button>
            <Link href="/program" className="text-neutral-600 hover:underline">How the six months work</Link>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell width="wide">
      {top}
      <header className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{greeting} · {dateLabel} · week {plan.week}</p>
          <h1 className="text-3xl sm:text-4xl">{plan.complete ? "Hour done." : pct ? `${plan.target - Math.round(plan.minutes_done)} minutes to go.` : "Your hour."}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Ring pct={pct} label={`${Math.round(plan.minutes_done)}`} sub={`of ${plan.target}`} />
          <form action="/auth/sign-out" method="post"><button className="text-xs text-neutral-500 hover:underline">{email} · Sign out</button></form>
        </div>
      </header>

      {elsewhere.length ? <p className="rise rise-2 text-sm text-neutral-600">{elsewhere.map((t, i) => <span key={i}>{i ? " · " : ""}{t}</span>)} · <Link href="/jobs/pipeline" className="underline">Jobs</Link> · <Link href="/network" className="underline">Network</Link> · <Link href="/life" className="underline">Life</Link></p> : null}

      {/* Morning: check in. Evening: it folds to one line. */}
      <section className={`rise rise-2 rounded-2xl border bg-white p-4 sm:p-5 ${checkinOpen ? "border-accent/40" : "border-neutral-200"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{checkedIn ? "Checked in" : morning ? "How did you sleep?" : "How are you today?"}</h2>
            <p className="text-sm text-neutral-500">{checkedIn ? [ck?.sleep_hours != null ? `${ck.sleep_hours} h sleep` : null, ck?.energy ? `energy ${ENERGY[ck.energy].toLowerCase()}` : null, ck?.mood ? `mood ${MOOD[ck.mood].toLowerCase()}` : null, ck?.exercise_minutes ? `${ck.exercise_minutes} min exercise` : null].filter(Boolean).join(" · ") : "Three taps. It sizes your hour."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Time today</span>
            {TIME_OPTIONS.map((m) => <button key={m} disabled={pending} aria-pressed={budget === m} onClick={() => run(() => setTimeAvailable(budget === m ? null : m, localDate()))} className={`h-8 rounded-lg border px-2.5 text-sm ${budget === m ? "border-neutral-900 bg-neutral-900 text-neutral-50" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{m}</button>)}
            <button className="h-8 rounded-lg px-2 text-sm text-neutral-600 hover:bg-neutral-50" onClick={() => setShowCheckin(!checkinOpen)}>{checkinOpen ? "Later" : checkedIn ? "Edit" : "Check in"}</button>
          </div>
        </div>
        {checkinOpen ? <div className="mt-4 border-t border-neutral-100 pt-4"><CheckinForm key={JSON.stringify(ck)} today={data.today} current={ck} compact onSaved={() => { setShowCheckin(false); run(() => getToday(localDate())); }} /></div> : null}
        {lowEnergy ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Low-energy day. The hour is sized to 40 minutes with the review first. Pick a time above to change that.</p> : null}
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
