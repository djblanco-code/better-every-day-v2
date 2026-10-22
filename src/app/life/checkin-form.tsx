"use client";
import { useState } from "react";
import { btn, field } from "../jobs/ui";
import { saveCheckin } from "./actions";
import { ENERGY, MOOD, type Checkin } from "@/lib/life/types";

/** The daily check-in form. Shared with Today. Render it with key={current?.updated_at} so a fresh row resets the fields. */
export function CheckinForm({ today, current, onSaved, compact = false }: { today: string; current: Checkin | null; onSaved: (c: Checkin) => void; compact?: boolean }) {
  const [c, setC] = useState({ sleep_hours: current?.sleep_hours ?? null, energy: current?.energy ?? null, mood: current?.mood ?? null, exercise_minutes: current?.exercise_minutes ?? 0, weight: current?.weight ?? null });
  const [msg, setMsg] = useState<string | null>(null);
  const scale = (label: string, names: readonly string[], v: number | null, set: (n: number) => void) => (
    <div><p className="text-xs text-neutral-500">{label}</p><div className="mt-1 flex gap-1" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={v === n} title={names[n]} onClick={() => set(n)} className={`h-9 min-w-9 flex-1 rounded-lg border text-sm ${v === n ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:bg-neutral-50"}`}>{n}</button>)}</div>{v ? <p className="mt-1 text-[11px] text-neutral-500">{names[v]}</p> : null}</div>
  );
  const save = () => saveCheckin({ date: today, ...c }).then((r) => { onSaved(r); setMsg("Saved."); setTimeout(() => setMsg(null), 1500); }).catch((e) => setMsg(String(e?.message ?? e)));
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
      <label className="block"><span className="text-xs text-neutral-500">Sleep (hours)</span><input className={`${field} mt-1 w-full`} inputMode="decimal" value={c.sleep_hours ?? ""} onChange={(e) => setC({ ...c, sleep_hours: e.target.value === "" ? null : +e.target.value })} placeholder="7" /></label>
      {scale("Energy", ENERGY, c.energy, (n) => setC({ ...c, energy: n }))}
      {scale("Mood", MOOD, c.mood, (n) => setC({ ...c, mood: n }))}
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="text-xs text-neutral-500">Exercise (min)</span><input className={`${field} mt-1 w-full`} inputMode="numeric" value={c.exercise_minutes || ""} onChange={(e) => setC({ ...c, exercise_minutes: +e.target.value || 0 })} placeholder="0" /></label>
        <label className="block"><span className="text-xs text-neutral-500">Weight</span><input className={`${field} mt-1 w-full`} inputMode="decimal" value={c.weight ?? ""} onChange={(e) => setC({ ...c, weight: e.target.value === "" ? null : +e.target.value })} placeholder="optional" /></label>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-4"><button className={btn} onClick={save}>Save check-in</button>{msg ? <span role="status" aria-live="polite" className="text-sm text-neutral-600">{msg}</span> : null}</div>
    </div>
  );
}

