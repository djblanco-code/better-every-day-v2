"use client";
import { useEffect, useState, useTransition } from "react";
import { getToday, logMinutes, markDone, swapSlot, type TodayData } from "./actions";
import type { SlotView } from "@/lib/recall/plan";
import type { Track } from "@/lib/recall/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function TodayClient({ email }: { email: string }) {
  const [data, setData] = useState<TodayData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => { getToday(localDate()).then(setData).catch((e) => setErr(String(e?.message ?? e))); }, []);

  const run = (fn: () => Promise<TodayData>) => start(async () => { try { setData(await fn()); } catch (e) { setErr(String((e as Error)?.message ?? e)); } });

  if (err) return <Shell><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!data) return <Shell><p className="text-neutral-500">Building today&apos;s plan…</p></Shell>;

  const { plan, summary } = data;
  const pct = Math.min(100, Math.round((100 * plan.minutes_done) / plan.target));
  const dateLabel = new Date(data.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{dateLabel} · Week {plan.week}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
        <form action="/auth/sign-out" method="post"><button className="text-sm text-neutral-500 hover:underline">{email} · Sign out</button></form>
      </header>

      {plan.complete ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-900">Day done. Every slot is finished — {Math.round(plan.minutes_done)} minutes.</p> : null}

      <section className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <Ring pct={pct} label={`${Math.round(plan.minutes_done)}`} sub={`of ${plan.target} min`} />
          <div>
            <p className="font-medium">{pct >= 100 ? "Hour done" : pct ? `${plan.target - Math.round(plan.minutes_done)} min to go` : "Start the first slot"}</p>
            <p className="text-sm text-neutral-500">Plan: {plan.minutes_planned} min across {plan.slots.length} slots</p>
            <div className="mt-3 flex items-center gap-2">
              <input value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="numeric" placeholder="min" className="h-8 w-20 rounded-lg border border-neutral-300 px-2 text-sm" aria-label="Extra minutes" />
              <button disabled={pending || !+extra} onClick={() => { run(() => logMinutes(+extra, localDate())); setExtra(""); }} className="h-8 rounded-lg border border-neutral-300 px-3 text-sm hover:bg-neutral-50 disabled:opacity-50">Log extra time</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Readiness" value={`${summary.readiness_overall}%`} />
          <Stat label="Day streak" value={String(summary.streak)} />
          <Stat label="Due for review" value={String(summary.due)} />
          <Stat label="Minutes today" value={String(Math.round(summary.today_minutes))} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">The plan · fixed for today</h2>
        {plan.slots.map((s, i) => <SlotCard key={i} i={i} s={s} pending={pending} onSwap={() => run(() => swapSlot(i, localDate()))} onDone={(m) => run(() => markDone((s as { id: string }).id, m, false, localDate()))} onUndo={() => run(() => markDone((s as { id: string }).id, 0, true, localDate()))} />)}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="font-medium">Readiness by track</h2>
        <p className="text-sm text-neutral-500">70% coverage of problems you scored 8+ on, 30% your last ten scores</p>
        <div className="mt-3 space-y-2">
          {(Object.keys(TRACK_NAME) as Track[]).map((t) => (
            <div key={t}>
              <div className="flex justify-between text-sm"><span>{TRACK_NAME[t]}</span><span className="font-medium">{summary.readiness[t]}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${summary.readiness[t]}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6">{children}</main>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  return (
    <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(${pct >= 100 ? "#16a34a" : "#2563eb"} ${pct * 3.6}deg, #e5e7eb 0)` }}>
      <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-center"><div><div className="text-2xl font-semibold">{label}</div><div className="text-xs text-neutral-500">{sub}</div></div></div>
    </div>
  );
}
function SlotCard({ i, s, pending, onSwap, onDone, onUndo }: { i: number; s: SlotView; pending: boolean; onSwap: () => void; onDone: (m: number) => void; onUndo: () => void }) {
  const [mins, setMins] = useState(String(s.minutes ?? 20));
  const isP = s.kind === "practice";
  const meta = isP ? [TRACK_NAME[s.track], s.difficulty, s.topic, `${s.minutes} min`].filter(Boolean).join(" · ") : [s.kind === "reading" ? "Reading" : "Homework", s.book, `${s.minutes} min`].filter(Boolean).join(" · ");
  const why = isP ? `${s.track_why ? `Second slot is ${TRACK_NAME[s.track]}: ${s.track_why}. ` : ""}${s.why ?? ""}` : `Week ${s.week} of the program.`;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className={`grid h-10 w-10 flex-none place-items-center rounded-full text-sm font-semibold ${s.done ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"}`}>{s.done ? "✓" : i + 1}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-neutral-500">{meta}</p>
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
          <a href={`/practice/${s.track}/${encodeURIComponent(s.id ?? "")}`} className="inline-flex h-9 items-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">Start</a>
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
