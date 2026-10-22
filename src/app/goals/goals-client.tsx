"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "../shell";
import { btn, btnGhost, Card, field } from "../jobs/ui";
import { getGoals, removeGoal, saveQuestionnaire, type GoalsState } from "./actions";
import { AREAS, DAYS, areaLabel, type Area, type GoalProfile } from "@/lib/goals/types";

// Seven questions, one screen each. Shape: WOOP (wish → what done looks like → obstacle → if-then plan) plus the
// two constraints the planner needs (hours a week, best time, days off). Under five minutes. Editable any time.
type Draft = { wish: string; areas: Area[]; titles: Partial<Record<Area, string>>; obstacle: string; if_then: string; hours_per_week: number; best_time: GoalProfile["best_time"]; days_off: string[] };
const empty: Draft = { wish: "", areas: [], titles: {}, obstacle: "", if_then: "", hours_per_week: 7, best_time: "morning", days_off: [] };

export function GoalsClient() {
  const [G, setG] = useState<GoalsState | null>(null);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(empty);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => getGoals().then((g) => { setG(g); if (!g.goals.length && !g.profile) setEditing(true); }).catch((e) => setMsg(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  if (!G) return <Shell width="read"><p className="text-neutral-500">Loading…</p></Shell>;

  const startEdit = () => {
    const areas = Array.from(new Set(G.goals.map((g) => g.area))) as Area[];
    const titles: Partial<Record<Area, string>> = {}; for (const g of G.goals) if (!titles[g.area]) titles[g.area] = g.title;
    setD({ wish: G.profile?.wish ?? "", areas, titles, obstacle: G.profile?.obstacle ?? "", if_then: G.profile?.if_then ?? "", hours_per_week: G.profile?.hours_per_week ?? 7, best_time: G.profile?.best_time ?? "morning", days_off: G.profile?.days_off ?? [] });
    setStep(0); setEditing(true);
  };
  const save = async () => {
    setMsg(null);
    try {
      await saveQuestionnaire({ profile: { wish: d.wish, obstacle: d.obstacle, if_then: d.if_then, hours_per_week: d.hours_per_week, best_time: d.best_time, days_off: d.days_off }, goals: d.areas.map((a) => ({ id: G.goals.find((g) => g.area === a)?.id, area: a, title: (d.titles[a] ?? "").trim() || areaLabel(a) })) });
      setEditing(false); setStep(0); load();
    } catch (e) { setMsg(String((e as Error)?.message ?? e)); }
  };

  if (!editing) {
    return (
      <Shell width="read">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-3xl sm:text-4xl">Your goals</h1></div><button className={btnGhost} onClick={startEdit}>Edit</button></div>
        {G.profile?.wish ? <p className="text-lg text-neutral-700">“{G.profile.wish}”</p> : null}
        <ul className="space-y-2">{G.goals.map((g, i) => <li key={g.id} className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4"><span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{i + 1}</span><div className="min-w-0 flex-1"><p className="text-xs text-neutral-500">{areaLabel(g.area)}</p><p className="font-medium">{g.title}</p>{g.why ? <p className="text-sm text-neutral-500">{g.why}</p> : null}</div><button className="text-xs text-neutral-400 hover:text-red-700" onClick={() => removeGoal(g.id).then(load)}>Remove</button></li>)}</ul>
        {G.profile ? <Card title="How you work"><dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-neutral-500">Hours a week</dt><dd>{G.profile.hours_per_week}</dd></div><div><dt className="text-neutral-500">Best time</dt><dd className="capitalize">{G.profile.best_time}</dd></div><div><dt className="text-neutral-500">Days off</dt><dd className="capitalize">{G.profile.days_off.length ? G.profile.days_off.join(", ") : "none"}</dd></div><div className="sm:col-span-2"><dt className="text-neutral-500">What gets in the way</dt><dd>{G.profile.obstacle || "–"}</dd></div><div className="sm:col-span-2"><dt className="text-neutral-500">When it does, I will</dt><dd>{G.profile.if_then || "–"}</dd></div></dl></Card> : null}
        {msg ? <p className="text-sm text-red-700">{msg}</p> : null}
      </Shell>
    );
  }

  const steps = [
    { q: "Three months from now, what do you want to be true?", hint: "One sentence. The wish, in your words.", body: <textarea className="min-h-[96px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" autoFocus value={d.wish} onChange={(e) => setD({ ...d, wish: e.target.value })} placeholder="An offer from a company I'm excited about, and a body that feels good." /> },
    { q: "Which of these matter most right now?", hint: "Pick up to three. The daily plan asks which one gets today.", body: <div className="grid gap-2 sm:grid-cols-2">{AREAS.map((a) => { const on = d.areas.includes(a.id); return <button key={a.id} aria-pressed={on} onClick={() => setD({ ...d, areas: on ? d.areas.filter((x) => x !== a.id) : d.areas.length < 3 ? [...d.areas, a.id] : d.areas })} className={`rounded-xl border p-3 text-left ${on ? "border-neutral-900 bg-neutral-900 text-neutral-50" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}><p className="font-medium">{a.label}</p><p className={`text-xs ${on ? "text-neutral-300" : "text-neutral-500"}`}>{a.hint}</p></button>; })}</div> },
    { q: "For each one: what does done look like?", hint: "Concrete enough that you'd know the day it happened.", body: <div className="space-y-3">{d.areas.map((a) => <label key={a} className="block"><span className="text-sm text-neutral-600">{areaLabel(a)}</span><input className={`${field} mt-1 w-full`} value={d.titles[a] ?? ""} onChange={(e) => setD({ ...d, titles: { ...d.titles, [a]: e.target.value } })} placeholder={a === "job" ? "Signed offer by January" : a === "interview" ? "Readiness 70% across tracks" : a === "network" ? "Three referrals in hand" : a === "health" ? "Gym four times a week, asleep by midnight" : a === "money" ? "Under the monthly limit three months running" : "…"} /></label>)}{!d.areas.length ? <p className="text-sm text-neutral-500">Pick an area first.</p> : null}</div> },
    { q: "What usually gets in the way?", hint: "The honest one. Research calls this the obstacle, and naming it is what makes the plan work.", body: <textarea className="min-h-[80px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" autoFocus value={d.obstacle} onChange={(e) => setD({ ...d, obstacle: e.target.value })} placeholder="I open my phone instead of the first problem." /> },
    { q: "When that happens, what will you do?", hint: "An if-then plan: “If I reach for my phone, then I open the first slot and start the timer.”", body: <textarea className="min-h-[80px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" autoFocus value={d.if_then} onChange={(e) => setD({ ...d, if_then: e.target.value })} placeholder="If I reach for my phone, then I start the timer on slot one first." /> },
    { q: "How many hours a week can you really give this?", hint: "Not the hopeful number. The one you'll keep.", body: <div className="flex flex-wrap gap-2">{[3, 5, 7, 10, 14, 20].map((h) => <button key={h} aria-pressed={d.hours_per_week === h} onClick={() => setD({ ...d, hours_per_week: h })} className={`h-10 rounded-lg border px-4 ${d.hours_per_week === h ? "border-neutral-900 bg-neutral-900 text-neutral-50" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{h}</button>)}</div> },
    { q: "When are you at your best, and which days are off?", hint: "The plan leans on your best time and stays quiet on days off.", body: <div className="space-y-4"><div className="flex gap-2">{(["morning", "afternoon", "evening"] as const).map((t) => <button key={t} aria-pressed={d.best_time === t} onClick={() => setD({ ...d, best_time: t })} className={`h-10 rounded-lg border px-4 capitalize ${d.best_time === t ? "border-neutral-900 bg-neutral-900 text-neutral-50" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{t}</button>)}</div><div className="flex flex-wrap gap-2">{DAYS.map((day) => { const on = d.days_off.includes(day); return <button key={day} aria-pressed={on} onClick={() => setD({ ...d, days_off: on ? d.days_off.filter((x) => x !== day) : [...d.days_off, day] })} className={`h-9 rounded-lg border px-3 text-sm capitalize ${on ? "border-neutral-900 bg-neutral-900 text-neutral-50" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{day}</button>; })}</div></div> },
  ];
  const last = step === steps.length - 1;
  const canNext = step === 1 ? d.areas.length > 0 : true;
  return (
    <Shell width="read">
      <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-3xl sm:text-4xl">{G.goals.length ? "Edit your goals" : "Let's find your goals"}</h1><p className="mt-1 text-sm text-neutral-500">Seven questions, about five minutes. You can change any of it later.</p></div>
      <section className="rise rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="text-xs text-neutral-500">{step + 1} of {steps.length}</p>
        <h2 className="mt-1 text-xl font-medium">{steps[step].q}</h2>
        <p className="mb-4 text-sm text-neutral-500">{steps[step].hint}</p>
        <div key={step}>{steps[step].body}</div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {step > 0 ? <button className={btnGhost} onClick={() => setStep(step - 1)}>Back</button> : null}
          {last ? <button className={btn} onClick={save}>Save my goals</button> : <button className={btn} disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button>}
          {G.goals.length ? <button className="ml-auto text-sm text-neutral-500 hover:underline" onClick={() => setEditing(false)}>Cancel</button> : null}
        </div>
        {msg ? <p className="mt-3 text-sm text-red-700">{msg}</p> : null}
      </section>
    </Shell>
  );
}
