"use client";
import { PLAN_TIME_OPTIONS } from "@/lib/goals/types";

// The one daily question. Goals are set once (/goals); what changes day to day is time, and time decides what is
// possible. Tapping a chip makes the plan; there is no second screen.
export function DayPlanCard({ pending, onDone }: { pending: boolean; onDone: (minutes: number) => void }) {
  return (
    <section className="rise mx-auto w-full max-w-2xl rounded-3xl border border-accent/40 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-medium">How much time do you have today?</h2>
      <p className="mb-6 text-sm text-neutral-500">Be honest. The plan shows what fits and leaves the rest for tomorrow.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {PLAN_TIME_OPTIONS.map((m) => <button key={m} disabled={pending} onClick={() => onDone(m)} className="h-16 rounded-2xl border border-neutral-300 bg-white text-lg font-medium hover:border-neutral-900 hover:bg-neutral-50 disabled:opacity-50"><span className="display text-2xl">{m}</span><span className="ml-1 text-sm text-neutral-500">min</span></button>)}
      </div>
    </section>
  );
}

/** Shown between the tap and the plan. */
export function MakingPlan() {
  return (
    <div className="rise mx-auto mt-16 flex w-full max-w-2xl flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" style={{ animationDuration: "1.1s" }} />
      </div>
      <p className="display text-2xl">Making today&apos;s plan…</p>
      <p className="text-sm text-neutral-500">Fitting the hour and your goals into the time you have.</p>
    </div>
  );
}
