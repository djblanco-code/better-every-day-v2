"use client";
import Link from "next/link";
import { useState } from "react";
import { btn, btnGhost } from "../jobs/ui";
import { ENERGY } from "@/lib/life/types";
import { PLAN_TIME_OPTIONS, areaLabel, type Goal } from "@/lib/goals/types";

// "Let's make your daily plan." Three questions, three taps: time, the goal that gets today, energy. The answers
// size the hour (time), pick what the page leads with (goal) and soften the plan on a low day (energy).
export function DayPlanCard({ goals, pending, defaultTime, onDone }: { goals: Goal[]; pending: boolean; defaultTime: number; onDone: (v: { time_available: number; focus_goal_id: string | null; energy: number | null }) => void }) {
  const [step, setStep] = useState(0);
  const [time, setTime] = useState<number>(defaultTime);
  const [goal, setGoal] = useState<string | null>(goals[0]?.id ?? null);
  const [energy, setEnergy] = useState<number | null>(null);
  const steps = goals.length ? 3 : 2;
  const opt = "h-10 rounded-lg border px-4 text-sm";
  const on = "border-neutral-900 bg-neutral-900 text-neutral-50", off = "border-neutral-300 bg-white hover:bg-neutral-50";
  return (
    <section className="rise rise-2 rounded-2xl border border-accent/40 bg-white p-5 sm:p-6">
      <p className="text-xs text-neutral-500">Let&apos;s make your daily plan · {step + 1} of {steps}</p>
      {step === 0 ? (<>
        <h2 className="mt-1 text-xl font-medium">How much time do you have today?</h2>
        <p className="mb-4 text-sm text-neutral-500">For the hour and everything around it. Be honest; the plan trims itself.</p>
        <div className="flex flex-wrap gap-2">{PLAN_TIME_OPTIONS.map((m) => <button key={m} aria-pressed={time === m} onClick={() => setTime(m)} className={`${opt} ${time === m ? on : off}`}>{m} min</button>)}</div>
      </>) : step === 1 && goals.length ? (<>
        <h2 className="mt-1 text-xl font-medium">Of your goals, which one gets today?</h2>
        <p className="mb-4 text-sm text-neutral-500">The page leads with it. The others wait their turn.</p>
        <div className="grid gap-2 sm:grid-cols-2">{goals.map((g) => <button key={g.id} aria-pressed={goal === g.id} onClick={() => setGoal(g.id)} className={`rounded-xl border p-3 text-left ${goal === g.id ? on : off}`}><p className={`text-xs ${goal === g.id ? "text-neutral-300" : "text-neutral-500"}`}>{areaLabel(g.area)}</p><p className="font-medium">{g.title}</p></button>)}</div>
      </>) : (<>
        <h2 className="mt-1 text-xl font-medium">How much energy do you have to give?</h2>
        <p className="mb-4 text-sm text-neutral-500">Low days get the review first and a shorter hour. No judgement.</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Energy">{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={energy === n} title={ENERGY[n]} onClick={() => setEnergy(n)} className={`${opt} flex-1 ${energy === n ? on : off}`}>{n}<span className="ml-1 hidden text-xs sm:inline">{ENERGY[n]}</span></button>)}</div>
        {!goals.length ? <p className="mt-3 text-sm text-neutral-500">No goals yet. <Link href="/goals" className="underline">Five questions</Link> and the plan can ask which one gets the day.</p> : null}
      </>)}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {step > 0 ? <button className={btnGhost} onClick={() => setStep(step - 1)}>Back</button> : null}
        {step < steps - 1 ? <button className={btn} onClick={() => setStep(step + 1)}>Next</button> : <button className={btn} disabled={pending} onClick={() => onDone({ time_available: time, focus_goal_id: goals.length ? goal : null, energy })}>Make my plan</button>}
        <button className="ml-auto text-sm text-neutral-500 hover:underline" disabled={pending} onClick={() => onDone({ time_available: defaultTime, focus_goal_id: goals.length ? goal : null, energy: null })}>Skip today</button>
      </div>
    </section>
  );
}
