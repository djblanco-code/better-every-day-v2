"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "../shell";
import { btn, Card, field } from "../jobs/ui";
import { getLife, logHabit, removeHabit, removeTransaction, saveBudget, saveCheckin, saveHabit, saveTransaction, type LifeState } from "./actions";
import { CATEGORIES, ENERGY, MOOD, dueToday, money, type Checkin, type Habit } from "@/lib/life/types";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const lastDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(today + "T12:00"); d.setDate(d.getDate() - (n - 1 - i)); return d.toISOString().slice(0, 10); });

export function LifeClient() {
  const [L, setL] = useState<LifeState | null>(null);
  const [tab, setTab] = useState<"habits" | "health" | "money">("habits");
  const [err, setErr] = useState<string | null>(null);
  const load = () => getLife(localDate()).then(setL).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  const run = (p: Promise<unknown>) => p.then(load).catch((e) => setErr(String((e as Error)?.message ?? e)));
  if (err) return <Shell><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!L) return <Shell><p className="text-neutral-500">Loading…</p></Shell>;
  const doneToday = L.habits.filter((h) => h.active && L.logs.some((l) => l.habit_id === h.id && l.date === L.today && l.done)).length;
  const spent = L.transactions.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount_cents, 0);
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Life</h1><p className="text-sm text-neutral-500">{doneToday}/{L.habits.filter((h) => h.active && dueToday(h, L.today)).length} habits today · {money(spent)} spent in {new Date(L.month + "-15").toLocaleDateString(undefined, { month: "long" })}</p></div>
        <div className="flex gap-1 rounded-xl bg-neutral-200/60 p-1">{(["habits", "health", "money"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-white shadow-sm" : "text-neutral-600"}`}>{t}</button>)}</div>
      </div>
      {tab === "habits" ? <Habits L={L} run={run} /> : tab === "health" ? <Health L={L} run={run} /> : <Money L={L} run={run} />}
    </Shell>
  );
}

type P = { L: LifeState; run: (p: Promise<unknown>) => void };

function Habits({ L, run }: P) {
  const [name, setName] = useState(""); const [cadence, setCadence] = useState<Habit["cadence"]>("daily");
  const days = lastDays(L.today, 14);
  const isDone = (h: Habit, d: string) => L.logs.some((l) => l.habit_id === h.id && l.date === d && l.done);
  const week = lastDays(L.today, 7);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <Card title="Last 14 days" sub="One tap per day. Misses just stay empty.">
        {L.habits.filter((h) => h.active).length ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="py-1 pr-2 text-left text-xs font-medium text-neutral-500">Habit</th>{days.map((d) => <th key={d} className={`px-0.5 py-1 text-center text-[10px] font-normal ${d === L.today ? "text-neutral-900" : "text-neutral-400"}`}>{new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</th>)}<th className="py-1 pl-2 text-right text-xs font-medium text-neutral-500">Week</th></tr></thead>
            <tbody>{L.habits.filter((h) => h.active).map((h) => { const wk = week.filter((d) => isDone(h, d)).length; return (
              <tr key={h.id} className="border-t border-neutral-100">
                <td className="py-2 pr-2 font-medium">{h.icon ? `${h.icon} ` : ""}{h.name}<div className="text-[11px] font-normal text-neutral-400">{h.cadence}{h.cadence === "weekly" ? ` · ${h.target_per_week}×` : ""}</div></td>
                {days.map((d) => { const on = isDone(h, d); const due = dueToday(h, d); return <td key={d} className="px-0.5 py-2 text-center"><button aria-label={`${h.name} ${d}`} aria-pressed={on} disabled={d > L.today} onClick={() => run(logHabit(h.id, d, !on))} className={`h-7 w-7 rounded-md border text-xs ${on ? "border-green-600 bg-green-600 text-white" : due ? "border-neutral-300 bg-white hover:bg-neutral-100" : "border-neutral-100 bg-neutral-50 text-neutral-300"} ${d === L.today ? "ring-2 ring-neutral-900/10" : ""}`}>{on ? "✓" : ""}</button></td>; })}
                <td className={`py-2 pl-2 text-right text-xs ${wk >= h.target_per_week ? "text-green-700" : "text-neutral-500"}`}>{wk}/{h.target_per_week}</td>
              </tr>); })}</tbody></table></div>
        ) : <p className="py-6 text-center text-sm text-neutral-500">No habits yet. Add two or three you actually want to keep.</p>}
      </Card>
      <div className="space-y-4">
        <Card title="Add a habit">
          <div className="grid gap-2"><input className={field} placeholder="Gym, read 20 pages, no phone after 11" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2"><select className={field} value={cadence} onChange={(e) => setCadence(e.target.value as Habit["cadence"])}><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">A few times a week</option></select><button className={btn} disabled={!name.trim()} onClick={() => { run(saveHabit({ name, cadence })); setName(""); }}>Add</button></div></div>
        </Card>
        {L.habits.length ? <Card title="Manage"><ul className="divide-y divide-neutral-100 text-sm">{L.habits.map((h) => <li key={h.id} className="flex items-center justify-between gap-2 py-2"><span className={h.active ? "" : "text-neutral-400 line-through"}>{h.name}</span><span className="flex gap-2"><button className="text-xs text-neutral-500 hover:underline" onClick={() => run(saveHabit({ ...h, active: !h.active }))}>{h.active ? "Pause" : "Resume"}</button><button className="text-xs text-red-700 hover:underline" onClick={() => { if (confirm(`Remove "${h.name}" and its history?`)) run(removeHabit(h.id)); }}>Remove</button></span></li>)}</ul></Card> : null}
      </div>
    </div>
  );
}

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

function Health({ L, run }: P) {
  const todayRow = L.checkins.find((c) => c.date === L.today) ?? null;
  const avg = (k: "sleep_hours" | "energy" | "mood") => { const v = L.checkins.slice(0, 7).map((c) => c[k]).filter((x): x is number => typeof x === "number"); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–"; };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="space-y-4">
        <Card title={`Check-in · ${new Date(L.today + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`} sub="Twenty seconds. Today uses it to size your plan."><CheckinForm key={JSON.stringify(todayRow)} today={L.today} current={todayRow} onSaved={() => run(Promise.resolve())} /></Card>
        <Card title="Last 28 days"><div className="overflow-x-auto"><table className="tbl-cards w-full text-sm"><thead><tr className="text-left text-xs text-neutral-500"><th className="px-2 py-1">Day</th><th className="px-2 py-1">Sleep</th><th className="px-2 py-1">Energy</th><th className="px-2 py-1">Mood</th><th className="px-2 py-1">Exercise</th><th className="px-2 py-1">Weight</th></tr></thead><tbody>{L.checkins.map((c) => <tr key={c.date} className="border-t border-neutral-100"><td className="px-2 py-1.5 text-neutral-600">{c.date}</td><td className="px-2 py-1.5">{c.sleep_hours ?? "–"}</td><td className="px-2 py-1.5">{c.energy ? `${c.energy} · ${ENERGY[c.energy]}` : "–"}</td><td className="px-2 py-1.5">{c.mood ? `${c.mood} · ${MOOD[c.mood]}` : "–"}</td><td className="px-2 py-1.5">{c.exercise_minutes ? `${c.exercise_minutes} min` : "–"}</td><td className="px-2 py-1.5">{c.weight ?? "–"}</td></tr>)}</tbody></table>{!L.checkins.length ? <p className="p-6 text-center text-sm text-neutral-500">No check-ins yet.</p> : null}</div></Card>
      </div>
      <Card title="This week" sub="Averages of the last seven check-ins"><div className="grid grid-cols-3 gap-3"><Stat l="Sleep" v={avg("sleep_hours")} /><Stat l="Energy" v={avg("energy")} /><Stat l="Mood" v={avg("mood")} /></div><p className="mt-3 text-xs text-neutral-500">Exercise this week: {L.checkins.slice(0, 7).reduce((a, c) => a + (c.exercise_minutes || 0), 0)} min</p></Card>
    </div>
  );
}
const Stat = ({ l, v }: { l: string; v: string }) => <div className="rounded-xl border border-neutral-200 bg-white p-3"><p className="text-xs text-neutral-500">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>;

function Money({ L, run }: P) {
  const [f, setF] = useState({ date: L.today, kind: "expense" as "expense" | "income", amount: "", category: "food", merchant: "", note: "" });
  const [limits, setLimits] = useState<Record<string, string>>(Object.fromEntries(L.budgets.map((b) => [b.category, String(b.limit_cents / 100)])));
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, L.transactions.filter((t) => t.kind === "expense" && t.category === c).reduce((a, t) => a + t.amount_cents, 0)]));
  const spent = Object.values(byCat).reduce((a, b) => a + b, 0), income = L.transactions.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount_cents, 0);
  const limitTotal = L.budgets.reduce((a, b) => a + b.limit_cents, 0);
  const monthName = new Date(L.month + "-15").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayOfMonth = +L.today.slice(8), daysInMonth = new Date(+L.month.slice(0, 4), +L.month.slice(5, 7), 0).getDate();
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="space-y-4">
        <Card title={monthName} sub={limitTotal ? `${money(spent)} of ${money(limitTotal)} planned · day ${dayOfMonth} of ${daysInMonth}` : `${money(spent)} spent · set limits on the right to see what is left`}>
          <div className="grid grid-cols-3 gap-3"><Stat l="Spent" v={money(spent)} /><Stat l="Left to spend" v={limitTotal ? money(Math.max(0, limitTotal - spent)) : "–"} /><Stat l="Income" v={money(income)} /></div>
          <ul className="mt-4 space-y-2">{CATEGORIES.filter((c) => byCat[c] || L.budgets.some((b) => b.category === c)).map((c) => { const lim = L.budgets.find((b) => b.category === c)?.limit_cents ?? 0; const pct = lim ? Math.min(100, Math.round((100 * byCat[c]) / lim)) : 0; const over = lim > 0 && byCat[c] > lim; return (
            <li key={c}><div className="flex justify-between text-sm"><span className="capitalize">{c}</span><span className={over ? "font-medium text-red-700" : "text-neutral-600"}>{money(byCat[c])}{lim ? ` / ${money(lim)}` : ""}</span></div>{lim ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full rounded-full ${over ? "bg-red-600" : pct > 80 ? "bg-amber-500" : "bg-green-600"}`} style={{ width: `${pct}%` }} /></div> : null}</li>); })}</ul>
          {!L.transactions.length ? <p className="mt-4 text-center text-sm text-neutral-500">Nothing logged this month. Add what you spend on the right, or tell the home page (&quot;spent $14 on lunch&quot;).</p> : null}
        </Card>
        <Card title="This month's entries"><ul className="divide-y divide-neutral-100 text-sm">{L.transactions.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><span className="text-neutral-500">{t.date.slice(5)}</span> <span className="font-medium">{t.merchant || t.note || t.category}</span> <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize">{t.category}</span></div><div className="flex items-center gap-3"><span className={t.kind === "income" ? "text-green-700" : ""}>{t.kind === "income" ? "+" : "−"}{money(t.amount_cents)}</span><button className="text-xs text-neutral-400 hover:text-red-700" onClick={() => run(removeTransaction(t.id))} aria-label="Remove">✕</button></div></li>)}</ul></Card>
      </div>
      <div className="space-y-4">
        <Card title="Add" sub="Expense or income">
          <div className="grid gap-2">
            <div className="flex gap-2"><select className={field} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "expense" | "income" })}><option value="expense">Expense</option><option value="income">Income</option></select><input className={`${field} flex-1`} inputMode="decimal" placeholder="Amount" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div className="flex gap-2"><select className={`${field} flex-1`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select><input className={field} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <input className={field} placeholder="Where / what (optional)" value={f.merchant} onChange={(e) => setF({ ...f, merchant: e.target.value })} />
            <button className={btn} disabled={!+f.amount} onClick={() => { run(saveTransaction(f)); setF({ ...f, amount: "", merchant: "", note: "" }); }}>Add</button>
          </div>
        </Card>
        <Card title="Monthly limits" sub="Per category. Leave empty for no limit."><ul className="space-y-1.5">{CATEGORIES.map((c) => { const saved = String((L.budgets.find((b) => b.category === c)?.limit_cents ?? 0) / 100); return <li key={c} className="flex items-center justify-between gap-2 text-sm"><span className="capitalize">{c}</span><input className={`${field} h-8 w-28 text-right`} inputMode="decimal" value={limits[c] ?? ""} placeholder="–" onChange={(e) => setLimits({ ...limits, [c]: e.target.value })} onBlur={(e) => { const v = e.target.value; if ((v || "0") !== saved) run(saveBudget(c, v || 0)); }} /></li>; })}</ul></Card>
      </div>
    </div>
  );
}
