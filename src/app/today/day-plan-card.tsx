"use client";
import Link from "next/link";
import { useState } from "react";
import { btn, btnGhost, field } from "../jobs/ui";
import { PLAN_TIME_OPTIONS, areaLabel, defaultAllocations, nearestOption, suggestMinutes, type Goal } from "@/lib/goals/types";

// The morning check-in (PRD §4.8), same card, one question per screen:
//   1. today (busy until, which proposes a free-time number)  2. confirm the time  3. the one essential thing
//   4. minutes per goal  → "Making today's plan…" with an encouraging line → the page.
// Goals are the user's own. Steps 3 and 4 only appear when there are goals.
export interface CheckinAnswers { time_available: number; focus_goal_id: string | null; allocations: Record<string, number>; busy_until: string | null; suggested_minutes: number | null }

export function DayPlanCard({ goals, pending, onDone }: { goals: Goal[]; pending: boolean; onDone: (v: CheckinAnswers) => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState("");
  const suggested = suggestMinutes(busy || null);
  const [time, setTime] = useState<number | null>(null);
  const [essential, setEssential] = useState<string | null>(goals[0]?.id ?? null);
  const [alloc, setAlloc] = useState<Record<string, number> | null>(null);
  const steps = goals.length ? 4 : 2;
  const chosen = time ?? (suggested != null ? nearestOption(suggested) : 60);
  const allocations = alloc ?? defaultAllocations(goals, chosen, essential);
  const allocTotal = Object.values(allocations).reduce((a, b) => a + b, 0);
  const on = "border-neutral-900 bg-neutral-900 text-neutral-50", off = "border-neutral-300 bg-white hover:bg-neutral-50";
  const finish = () => onDone({ time_available: chosen, focus_goal_id: goals.length ? essential : null, allocations: goals.length ? allocations : {}, busy_until: busy || null, suggested_minutes: suggested });

  return (
    <section className="rise mx-auto w-full max-w-2xl rounded-3xl border border-accent/40 bg-white p-6 sm:p-8">
      <p className="text-xs text-neutral-500">Morning check-in · {step + 1} of {steps}</p>
      {step === 0 ? (<>
        <h2 className="mt-1 text-2xl font-medium">What does today look like?</h2>
        <p className="mb-5 text-sm text-neutral-500">Work, class, appointments: when are you free? A calendar can fill this in later; for now, one time.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><span className="text-neutral-600">Busy until</span><input type="time" className={`${field} h-11`} value={busy} onChange={(e) => { setBusy(e.target.value); setTime(null); setAlloc(null); }} /></label>
          {suggested != null ? <p className="text-sm text-neutral-600">About <span className="font-medium">{suggested} minutes</span> are realistically yours after that.</p> : <p className="text-sm text-neutral-500">Or skip this and just pick a number.</p>}
        </div>
      </>) : step === 1 ? (<>
        <h2 className="mt-1 text-2xl font-medium">How much time do you actually have?</h2>
        <p className="mb-5 text-sm text-neutral-500">{suggested != null ? `The day suggests ${suggested}. Confirm or change it.` : "Be honest. Even 20 minutes is a day."}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{PLAN_TIME_OPTIONS.map((m) => <button key={m} aria-pressed={chosen === m} onClick={() => { setTime(m); setAlloc(null); }} className={`h-16 rounded-2xl border text-lg font-medium ${chosen === m ? on : off}`}><span className="display text-2xl">{m}</span><span className={`ml-1 text-sm ${chosen === m ? "text-neutral-300" : "text-neutral-500"}`}>min</span></button>)}</div>
      </>) : step === 2 ? (<>
        <h2 className="mt-1 text-2xl font-medium">What is the one essential thing today?</h2>
        <p className="mb-5 text-sm text-neutral-500">If only one thing happens, which one. The others still get minutes, after it.</p>
        <div className="grid gap-2 sm:grid-cols-2">{goals.map((g) => <button key={g.id} aria-pressed={essential === g.id} onClick={() => { setEssential(g.id); setAlloc(null); }} className={`rounded-xl border p-3 text-left ${essential === g.id ? on : off}`}><p className={`text-xs ${essential === g.id ? "text-neutral-300" : "text-neutral-500"}`}>{areaLabel(g.area)}</p><p className="font-medium">{g.title}</p></button>)}</div>
      </>) : (<>
        <h2 className="mt-1 text-2xl font-medium">Minutes for each, out of {chosen}</h2>
        <p className="mb-5 text-sm text-neutral-500">The essential one is first. Zero is allowed; a goal can rest today.</p>
        <ul className="space-y-2">{[...goals].sort((a, b) => (a.id === essential ? -1 : b.id === essential ? 1 : a.priority - b.priority)).map((g) => { const v = allocations[g.id] ?? 0; const set = (n: number) => setAlloc({ ...allocations, [g.id]: Math.max(0, Math.min(chosen, n)) }); return (
          <li key={g.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{g.title}{g.id === essential ? <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">essential</span> : null}</p><p className="text-xs text-neutral-500">{areaLabel(g.area)}</p></div>
            <div className="flex items-center gap-1"><button aria-label={`Less time for ${g.title}`} className="h-9 w-9 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => set(v - 5)}>−</button><span className="w-14 text-center text-sm tabular-nums">{v} min</span><button aria-label={`More time for ${g.title}`} className="h-9 w-9 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50" onClick={() => set(v + 5)}>+</button></div>
          </li>); })}</ul>
        <p className={`mt-3 text-xs ${allocTotal > chosen ? "text-amber-700" : "text-neutral-500"}`}>{allocTotal} of {chosen} minutes committed{allocTotal > chosen ? ". A little over is fine; the plan will trim." : ""}</p>
      </>)}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {step > 0 ? <button className={btnGhost} onClick={() => setStep(step - 1)}>Back</button> : null}
        {step < steps - 1 ? <button className={btn} onClick={() => setStep(step + 1)}>Next</button> : <button className={btn} disabled={pending} onClick={finish}>Make my plan</button>}
        {step === 0 ? <button className="ml-auto text-sm text-neutral-500 hover:underline" onClick={() => setStep(1)}>Skip</button> : null}
        {!goals.length && step === 1 ? <Link href="/goals" className="ml-auto text-sm text-neutral-500 hover:underline">Set your goals first</Link> : null}
      </div>
    </section>
  );
}

/** Between "Make my plan" and the plan: the encouraging line. */
export function MakingPlan({ line }: { line: string | null }) {
  return (
    <div className="rise mx-auto mt-16 flex w-full max-w-2xl flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" style={{ animationDuration: "1.1s" }} />
      </div>
      <p className="display text-2xl">{line ?? "Making today's plan…"}</p>
      <p className="text-sm text-neutral-500">{line ? "Making today's plan…" : "Fitting your goals into the time you have."}</p>
    </div>
  );
}
