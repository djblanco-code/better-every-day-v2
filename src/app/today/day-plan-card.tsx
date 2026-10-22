"use client";
import Link from "next/link";
import { useState } from "react";
import { btn, btnGhost, field } from "../jobs/ui";
import { ENERGY, MOOD } from "@/lib/life/types";
import { PLAN_TIME_OPTIONS, areaLabel, type Goal } from "@/lib/goals/types";

// "Let's make your daily plan." One question per screen, nothing else on the page: time, the goal that gets today,
// energy, then the check-in (sleep, mood, exercise). The answers size the hour, pick what leads, and feed Life.
export interface DayPlanAnswers { time_available: number; focus_goal_id: string | null; energy: number | null; sleep_hours: number | null; mood: number | null; exercise_minutes: number | null }

export function DayPlanCard({ goals, pending, defaultTime, onDone }: { goals: Goal[]; pending: boolean; defaultTime: number; onDone: (v: DayPlanAnswers) => void }) {
  const [step, setStep] = useState(0);
  const [time, setTime] = useState<number>(defaultTime);
  const [goal, setGoal] = useState<string | null>(goals[0]?.id ?? null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState<string>("");
  const [mood, setMood] = useState<number | null>(null);
  const [exercise, setExercise] = useState<string>("");
  const order = (["time", ...(goals.length ? ["goal"] : []), "energy", "checkin"] as const);
  const kind = order[step];
  const opt = "h-11 rounded-lg border px-4 text-sm";
  const on = "border-neutral-900 bg-neutral-900 text-neutral-50", off = "border-neutral-300 bg-white hover:bg-neutral-50";
  const answers = (): DayPlanAnswers => ({ time_available: time, focus_goal_id: goals.length ? goal : null, energy, sleep_hours: sleep === "" ? null : Math.max(0, Math.min(24, +sleep)), mood, exercise_minutes: exercise === "" ? null : Math.max(0, Math.min(600, Math.trunc(+exercise))) });
  const scale = (names: readonly string[], v: number | null, set: (n: number) => void, label: string) => (
    <div className="flex gap-2" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={v === n} title={names[n]} onClick={() => set(n)} className={`${opt} flex-1 ${v === n ? on : off}`}>{n}<span className="ml-1 hidden text-xs sm:inline">{names[n]}</span></button>)}</div>
  );
  return (
    <section className="rise mx-auto w-full max-w-2xl rounded-3xl border border-accent/40 bg-white p-6 sm:p-8">
      <p className="text-xs text-neutral-500">Let&apos;s make your daily plan · {step + 1} of {order.length}</p>
      {kind === "time" ? (<>
        <h2 className="mt-1 text-2xl font-medium">How much time do you have today?</h2>
        <p className="mb-5 text-sm text-neutral-500">For the hour and everything around it. Be honest; the plan trims itself.</p>
        <div className="flex flex-wrap gap-2">{PLAN_TIME_OPTIONS.map((m) => <button key={m} aria-pressed={time === m} onClick={() => setTime(m)} className={`${opt} ${time === m ? on : off}`}>{m} min</button>)}</div>
      </>) : kind === "goal" ? (<>
        <h2 className="mt-1 text-2xl font-medium">Of your goals, which one gets today?</h2>
        <p className="mb-5 text-sm text-neutral-500">The page leads with it. The others wait their turn.</p>
        <div className="grid gap-2 sm:grid-cols-2">{goals.map((g) => <button key={g.id} aria-pressed={goal === g.id} onClick={() => setGoal(g.id)} className={`rounded-xl border p-3 text-left ${goal === g.id ? on : off}`}><p className={`text-xs ${goal === g.id ? "text-neutral-300" : "text-neutral-500"}`}>{areaLabel(g.area)}</p><p className="font-medium">{g.title}</p></button>)}</div>
      </>) : kind === "energy" ? (<>
        <h2 className="mt-1 text-2xl font-medium">How much energy do you have to give?</h2>
        <p className="mb-5 text-sm text-neutral-500">Low days get the review first and a shorter hour. No judgement.</p>
        {scale(ENERGY, energy, setEnergy, "Energy")}
        {!goals.length ? <p className="mt-4 text-sm text-neutral-500">No goals yet. <Link href="/goals" className="underline">Seven questions</Link> and the plan can ask which one gets the day.</p> : null}
      </>) : (<>
        <h2 className="mt-1 text-2xl font-medium">And how are you, really?</h2>
        <p className="mb-5 text-sm text-neutral-500">Sleep and mood go to Life so you can see the pattern over weeks. Skip anything you don&apos;t know.</p>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
          <label className="block"><span className="text-xs text-neutral-500">Sleep (hours)</span><input className={`${field} mt-1 h-11 w-28`} inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7" autoFocus /></label>
          <div><p className="text-xs text-neutral-500">Mood</p><div className="mt-1">{scale(MOOD, mood, setMood, "Mood")}</div></div>
          <label className="block sm:col-span-2"><span className="text-xs text-neutral-500">Exercise today or planned (minutes)</span><input className={`${field} mt-1 h-11 w-28`} inputMode="numeric" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="0" /></label>
        </div>
      </>)}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {step > 0 ? <button className={btnGhost} onClick={() => setStep(step - 1)}>Back</button> : null}
        {step < order.length - 1 ? <button className={btn} onClick={() => setStep(step + 1)}>Next</button> : <button className={btn} disabled={pending} onClick={() => onDone(answers())}>Make my plan</button>}
        <button className="ml-auto text-sm text-neutral-500 hover:underline" disabled={pending} onClick={() => onDone({ ...answers(), energy: null, mood: null })}>Skip the rest</button>
      </div>
    </section>
  );
}

/** Shown between "Make my plan" and the plan itself. */
export function MakingPlan() {
  return (
    <div className="rise mx-auto mt-16 flex w-full max-w-2xl flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" style={{ animationDuration: "1.1s" }} />
      </div>
      <p className="display text-2xl">Making today&apos;s plan…</p>
      <p className="text-sm text-neutral-500">Sizing the hour, choosing what leads.</p>
    </div>
  );
}
