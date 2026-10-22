"use client";
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

// Today = your day: check in, what needs you, the Recall plan sized to the time you have, habits, and a glance
// at readiness and money. The plan itself never changes shape (the engine owns it); only what is asked of
// you today does.
export function TodayClient({ email, counts, top }: { email: string; counts: { apps: number; interviewing: number; people: number; events: number }; top?: React.ReactNode }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [showCheckin, setShowCheckin] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => { getToday(localDate()).then(setData).catch((e) => setErr(String(e?.message ?? e))); }, []);
  const run = (fn: () => Promise<TodayData>) => start(async () => { try { setData(await fn()); } catch (e) { setErr(String((e as Error)?.message ?? e)); } });

  if (err) return <Shell><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!data) return <Shell><p className="text-neutral-500">Building today&apos;s plan…</p></Shell>;

  const { plan, summary, day } = data;
  const ck = day.checkin;
  const checkedIn = !!(ck && (ck.energy || ck.mood || ck.sleep_hours != null));
  const pct = Math.min(100, Math.round((100 * plan.minutes_done) / plan.target));
  const dateLabel = new Date(data.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Trim the plan to the time available: slots fit in order until the budget runs out; the rest wait.
  const budget = ck?.time_available ?? null;
  const lowEnergy = !!ck?.energy && ck.energy <= 2 && budget == null;
  const effective = budget ?? (lowEnergy ? 40 : null);
  const fits = plan.slots.reduce<{ used: number; out: boolean[] }>((acc, s) => {
    if (effective == null || s.done) { acc.out.push(true); return acc; }
    acc.used += s.minutes ?? 0; acc.out.push(acc.used <= effective); return acc;
  }, { used: 0, out: [] }).out;
  const habitsDone = day.habits.filter((h) => h.done).length;

  return (
    <Shell>
      {top}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Week {plan.week} of the program</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{dateLabel}</h1>
        </div>
        <form action="/auth/sign-out" method="post"><button className="text-sm text-neutral-500 hover:underline">{email} · Sign out</button></form>
      </header>

      {/* 1. Check in: twenty seconds, then the day sizes itself. */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">{checkedIn ? "Checked in" : "How are you today?"}</h2>
            <p className="text-sm text-neutral-500">{checkedIn ? [ck?.sleep_hours != null ? `${ck.sleep_hours} h sleep` : null, ck?.energy ? `energy ${ENERGY[ck.energy].toLowerCase()}` : null, ck?.mood ? `mood ${MOOD[ck.mood].toLowerCase()}` : null, ck?.exercise_minutes ? `${ck.exercise_minutes} min exercise` : null].filter(Boolean).join(" · ") : "Sleep, energy, mood. It sizes your plan and shows up in Life."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Time for Recall today</span>
            {TIME_OPTIONS.map((m) => <button key={m} disabled={pending} aria-pressed={budget === m} onClick={() => run(() => setTimeAvailable(budget === m ? null : m, localDate()))} className={`h-8 rounded-lg border px-2.5 text-sm ${budget === m ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{m} min</button>)}
            <button className="h-8 rounded-lg px-2 text-sm text-neutral-600 hover:bg-neutral-50" onClick={() => setShowCheckin((v) => !v)}>{showCheckin ? "Hide" : checkedIn ? "Edit check-in" : "Check in"}</button>
          </div>
        </div>
        {showCheckin || (!checkedIn && !ck) ? <div className="mt-4 border-t border-neutral-100 pt-4"><CheckinForm key={JSON.stringify(ck)} today={data.today} current={ck} compact onSaved={() => { setShowCheckin(false); run(() => getToday(localDate())); }} /></div> : null}
        {lowEnergy ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Low energy day. The plan below is sized to 40 minutes with the review slot first; pick a time above to change that.</p> : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="space-y-5">
          {/* 2. Needs you today: dated things from Jobs and Network. */}
          {day.due.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Needs you today</h2>
              <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
                {day.due.map((d) => <li key={d.kind + d.id} className="flex items-center gap-3 px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${d.overdue ? "bg-red-50 text-red-700" : d.kind === "follow_up" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{d.overdue ? "overdue" : d.kind === "assessment" ? "assessment" : d.kind === "call" ? (d.id.startsWith("na-") ? "next step" : "call") : "follow-up"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.title}</p><p className="truncate text-xs text-neutral-500">{d.detail}{d.due ? ` · ${d.overdue ? "was due" : "due"} ${d.due}` : ""}</p></div><a href={d.href} className="text-sm text-neutral-600 hover:underline">Open</a></li>)}
              </ul>
            </section>
          ) : null}

          {/* 3. The Recall plan, sized to the time available. */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">The plan · fixed for today</h2>
              {effective != null ? <span className="text-xs text-neutral-500">{fits.filter(Boolean).length} of {plan.slots.length} slots fit in {effective} min</span> : null}
            </div>
            {plan.complete ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-900">Day done. Every slot is finished — {Math.round(plan.minutes_done)} minutes.</p> : null}
            {plan.slots.map((s, i) => <SlotCard key={i} i={i} s={s} later={!fits[i]} pending={pending} onSwap={() => run(() => swapSlot(i, localDate()))} onDone={(m) => run(() => markDone((s as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((s as { id: string }).id, 0, true, localDate()))} />)}
          </section>

          {/* 4. Habits due today. */}
          {day.habits.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Habits · {habitsDone}/{day.habits.length}</h2>
              <div className="flex flex-wrap gap-2">
                {day.habits.map(({ habit, done }) => <button key={habit.id} disabled={pending} aria-pressed={done} onClick={() => run(() => tickHabit(habit.id, !done, localDate()))} className={`h-10 rounded-xl border px-3 text-sm ${done ? "border-green-600 bg-green-600 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{done ? "✓ " : ""}{habit.icon ? `${habit.icon} ` : ""}{habit.name}</button>)}
                <a href="/life" className="inline-flex h-10 items-center px-2 text-sm text-neutral-500 hover:underline">Edit</a>
              </div>
            </section>
          ) : <p className="text-sm text-neutral-500">No habits yet. <a href="/life" className="underline">Add a couple in Life</a> and they show up here each day.</p>}

          {/* 5. End of day: the journal. What it finds lands in Network, Recall and Life. */}
          <JournalCard onSaved={() => run(() => getToday(localDate()))} />
        </div>

        {/* 5. At a glance. */}
        <aside className="space-y-4 lg:sticky lg:top-16 lg:h-fit">
          <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
            <Ring pct={pct} label={`${Math.round(plan.minutes_done)}`} sub={`of ${plan.target} min`} />
            <div className="min-w-0">
              <p className="font-medium">{pct >= 100 ? "Hour done" : pct ? `${plan.target - Math.round(plan.minutes_done)} min to go` : "Start the first slot"}</p>
              <p className="text-sm text-neutral-500">{summary.streak} day streak · {summary.due} due for review</p>
              <div className="mt-3 flex items-center gap-2">
                <input value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="numeric" placeholder="min" className="h-8 w-20 rounded-lg border border-neutral-300 px-2 text-sm" aria-label="Extra minutes" />
                <button disabled={pending || !+extra} onClick={() => { run(() => logMinutes(+extra, localDate())); setExtra(""); }} className="h-8 rounded-lg border border-neutral-300 px-3 text-sm hover:bg-neutral-50 disabled:opacity-50">Log extra</button>
              </div>
            </div>
          </div>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-baseline justify-between"><h2 className="font-medium">Readiness</h2><span className="text-2xl font-semibold">{summary.readiness_overall}%</span></div>
            <div className="mt-3 space-y-2">
              {(Object.keys(TRACK_NAME) as Track[]).map((t) => (
                <div key={t}>
                  <div className="flex justify-between text-sm"><span>{TRACK_NAME[t]}</span><span className="font-medium">{summary.readiness[t]}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${summary.readiness[t]}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="font-medium">Where things stand</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex justify-between"><a href="/jobs" className="hover:underline">Jobs</a><span className="text-neutral-600">{counts.apps} applied · {counts.interviewing} in interviews</span></li>
              <li className="flex justify-between"><a href="/network" className="hover:underline">Network</a><span className="text-neutral-600">{counts.people} people · {counts.events} events</span></li>
              <li className="flex justify-between"><a href="/program" className="hover:underline">Program</a><span className="text-neutral-600">week {plan.week} · {summary.streak} day streak</span></li>
            </ul>
          </section>
          <a href="/life" className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:shadow-md">
            <div className="flex items-baseline justify-between"><h2 className="font-medium">Money this month</h2><span className="text-sm text-neutral-500">Life →</span></div>
            <p className="mt-1 text-2xl font-semibold">{money(day.spent_cents)}</p>
            {day.limit_cents ? <><p className="text-xs text-neutral-500">of {money(day.limit_cents)} planned</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full rounded-full ${day.spent_cents > day.limit_cents ? "bg-red-600" : "bg-green-600"}`} style={{ width: `${Math.min(100, Math.round((100 * day.spent_cents) / day.limit_cents))}%` }} /></div></> : <p className="text-xs text-neutral-500">Set monthly limits in Life to see what is left.</p>}
          </a>
        </aside>
      </div>
    </Shell>
  );
}

function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  return (
    <div className="grid h-28 w-28 flex-none place-items-center rounded-full" style={{ background: `conic-gradient(${pct >= 100 ? "#16a34a" : "#2563eb"} ${pct * 3.6}deg, #e5e7eb 0)` }}>
      <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-center"><div><div className="text-2xl font-semibold">{label}</div><div className="text-xs text-neutral-500">{sub}</div></div></div>
    </div>
  );
}
function SlotCard({ i, s, later, pending, onSwap, onDone, onUndo }: { i: number; s: SlotView; later: boolean; pending: boolean; onSwap: () => void; onDone: (m: number) => void; onUndo: () => void }) {
  const [mins, setMins] = useState(String(s.minutes ?? 20));
  const isP = s.kind === "practice";
  const meta = isP ? [TRACK_NAME[s.track], s.difficulty, s.topic, `${s.minutes} min`].filter(Boolean).join(" · ") : [s.kind === "reading" ? "Reading" : "Homework", s.book, `${s.minutes} min`].filter(Boolean).join(" · ");
  const why = isP ? `${s.track_why ? `Second slot is ${TRACK_NAME[s.track]}: ${s.track_why}. ` : ""}${s.why ?? ""}` : `Week ${s.week} of the program.`;
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 ${later ? "opacity-60" : ""}`}>
      <div className={`grid h-10 w-10 flex-none place-items-center rounded-full text-sm font-semibold ${s.done ? "bg-green-100 text-green-700" : later ? "bg-neutral-100 text-neutral-500" : "bg-blue-50 text-blue-700"}`}>{s.done ? "✓" : i + 1}</div>
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <p className="text-xs text-neutral-500">{meta}{later ? " · if time allows" : ""}</p>
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
          <a href={`/practice/${s.track}/${encodeURIComponent(s.id ?? "")}`} className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ${later ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}>Start</a>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={mins} onChange={(e) => setMins(e.target.value)} inputMode="numeric" className="h-9 w-20 rounded-lg border border-neutral-300 px-2 text-sm" aria-label="Minutes spent" />
          <button disabled={pending} onClick={() => onDone(+mins || 0)} className="h-9 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">Done</button>
        </div>
      )}
    </div>
  );
}
