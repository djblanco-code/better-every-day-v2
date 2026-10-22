"use client";
import Link from "next/link";
import { Shell } from "../shell";
import { useEffect, useState, useTransition } from "react";
import { getProgram, type ProgramData } from "./actions";
import { markDone } from "../today/actions";
import type { Track } from "@/lib/recall/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function ProgramClient() {
  const [P, setP] = useState<ProgramData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const load = () => getProgram(localDate()).then(setP).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  if (err) return <Shell><p className="text-red-700">{err}</p></Shell>;
  if (!P) return <Shell><p className="text-neutral-500">Loading…</p></Shell>;
  const M = P.metrics, n = week ?? P.week, w = P.weeks.find((x) => x.week === n) ?? P.weeks[0];
  const weeksDone = P.weeks.filter((x) => x.reading_done === x.reading.length && x.homework_done === x.homework.length).length;
  const toggle = (id: string, est: number, on: boolean) => start(async () => {
    if (on) { const m = prompt("Minutes spent?", String(est)); if (m === null) return; await markDone(id, +m || 0, false, localDate()); }
    else await markDone(id, 0, true, localDate());
    await load();
  });

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-3xl font-semibold tracking-tight">Program</h1>
          <p className="text-sm text-neutral-500">Week {P.week} of {P.of} · {P.phase === "speed" ? "speed phase" : "learning phase"} · started {P.start ?? "today"}{P.end ? ` · ends ${P.end}` : ""} · {P.daily_minutes} min a day</p></div>
        <a href="/settings" className="text-sm text-neutral-600 hover:underline">Settings</a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Readiness" value={`${M.readiness_overall}%`} />
        <Stat label="Hours logged" value={String(M.total_hours)} />
        <Stat label="Days active" value={String(M.days_active)} />
        <Stat label="Hit the hour, 30 days" value={`${M.adherence_30}%`} />
        <Stat label="On time and 7+" value={M.under_time_rate == null ? "–" : `${M.under_time_rate}%`} />
        <Stat label="Score trend, 14 days" value={M.trend_14d == null ? "–" : `${M.trend_14d > 0 ? "+" : ""}${M.trend_14d}`} />
      </div>

      <Card title="Readiness over time" sub="One snapshot a day. The goal is a steady climb, not a spike.">
        {M.snapshots.length > 1 ? <Line points={M.snapshots.map((s) => s.readiness)} labels={M.snapshots.map((s) => s.date.slice(5))} /> : <p className="text-sm text-neutral-500">Your first point is today ({M.readiness_overall}%). The curve appears from tomorrow.</p>}
      </Card>

      <Card title="Minutes per day" sub={`Last 30 days against the ${M.target}-minute line`}>
        <Bars rows={M.days} target={M.target} />
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title={`Week ${w.week}`} sub={`${w.phase === "speed" ? "Speed phase" : "Learning phase"} · LeetCode ${w.focus.leetcode ?? ""} · Python ${w.focus.python ?? ""} · System Design ${w.focus.system_design ?? ""}`}
          right={<select value={n} onChange={(e) => setWeek(+e.target.value)} className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm">{P.weeks.map((x) => <option key={x.week} value={x.week}>Week {x.week}{x.week === P.week ? " (now)" : ""}</option>)}</select>}>
          <p className="mb-1 text-xs text-neutral-500">Reading · {w.reading_done}/{w.reading.length}</p>
          <ul className="divide-y divide-neutral-100">{w.reading.map((r) => <Check key={r.id} id={r.id} text={r.what ?? ""} sub={`${r.book ?? ""} · ${r.est_min} min`} done={P.done[r.id]} pending={pending} onToggle={(on) => toggle(r.id, r.est_min ?? 20, on)} />)}</ul>
          <p className="mb-1 mt-4 text-xs text-neutral-500">Homework · {w.homework_done}/{w.homework.length}</p>
          <ul className="divide-y divide-neutral-100">{w.homework.map((r) => <Check key={r.id} id={r.id} text={r.text ?? ""} sub={`${r.est_min} min`} done={P.done[r.id]} pending={pending} onToggle={(on) => toggle(r.id, r.est_min ?? 20, on)} />)}</ul>
          <p className="mt-4 text-xs text-neutral-400">{weeksDone} of {P.of} weeks fully complete.</p>
        </Card>
        <div className="space-y-3">
          <Card title="LeetCode mastery" sub="A category is mastered at three problems scored 8+">
            {P.categories.filter((c) => M.mastery.leetcode[c]).map((c) => <MRow key={c} name={c} m={M.mastery.leetcode[c]} />)}
          </Card>
          <Card title="Other tracks">
            {(["python", "system_design", "dsa", "debugging"] as Track[]).map((t) => (
              <div key={t} className="mt-2"><p className="text-xs text-neutral-500">{TRACK_NAME[t]} · {M.readiness[t]}%</p>
                {Object.entries(M.mastery[t]).map(([c, m]) => <MRow key={c} name={c} m={m} />)}</div>
            ))}
          </Card>
          <Card title="Real reps" sub="Mock and real interviews logged from the journal">
            <p className="text-sm">Mocks: {M.reps.mocks} ({M.reps.mocks_30d} in 30 days{M.reps.mock_avg ? `, avg ${M.reps.mock_avg}` : ""}) · Interviews: {M.reps.interviews} ({M.reps.interviews_30d} in 30 days{M.reps.interview_avg ? `, avg ${M.reps.interview_avg}` : ""})</p>
          </Card>
        </div>
      </div>

      <Card title="How the recommender works" sub="The principles behind every plan">
        <ul className="space-y-2 text-sm">{P.principles.map(([k, v]) => <li key={k}><span className="font-semibold">{k}.</span> <span className="text-neutral-600">{v}</span></li>)}</ul>
      </Card>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function Card({ title, sub, right, children }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-medium">{title}</h2>{sub ? <p className="text-xs text-neutral-500">{sub}</p> : null}</div>{right}</div>{children}</section>;
}
function Check({ id, text, sub, done, pending, onToggle }: { id: string; text: string; sub: string; done?: { date: string; minutes: number }; pending: boolean; onToggle: (on: boolean) => void }) {
  return <li className="flex items-start gap-3 py-2"><input id={id} type="checkbox" checked={!!done} disabled={pending} onChange={(e) => onToggle(e.target.checked)} className="mt-1 h-4 w-4" /><label htmlFor={id} className="cursor-pointer"><p className={`text-sm ${done ? "text-neutral-400 line-through" : ""}`}>{text}</p><p className="text-xs text-neutral-500">{sub}{done ? ` · done ${done.date}` : ""}</p></label></li>;
}
function MRow({ name, m }: { name: string; m: { strong: number; total: number; mastered: boolean } }) {
  const cap = Math.min(3, m.total);
  return <div className="flex items-center gap-3 py-1 text-sm"><span className="w-44 flex-none truncate">{name}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${(100 * m.strong) / cap}%`, background: m.mastered ? "#16a34a" : "#2563eb" }} /></div><span className="w-12 flex-none text-right text-neutral-500">{m.strong}/{cap}</span></div>;
}
function Line({ points, labels }: { points: number[]; labels: string[] }) {
  const W = 600, H = 160, n = points.length;
  const x = (i: number) => 24 + (i * (W - 48)) / Math.max(1, n - 1), y = (v: number) => H - 20 - (v / 100) * (H - 40);
  return <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full"><polyline fill="none" stroke="#2563eb" strokeWidth="2" points={points.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />{points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#2563eb" />)}<text x="24" y={H - 4} fontSize="10" fill="#737373">{labels[0]}</text><text x={W - 24} y={H - 4} fontSize="10" fill="#737373" textAnchor="end">{labels[n - 1]}</text></svg>;
}
function Bars({ rows, target }: { rows: { date: string; minutes: number; hit: boolean }[]; target: number }) {
  const max = Math.max(target * 1.5, ...rows.map((r) => r.minutes));
  return <div className="relative h-40"><div className="absolute left-0 right-0 border-t border-dashed border-amber-400" style={{ bottom: `${(100 * target) / max}%` }} /><div className="flex h-full items-end gap-[3px]">{rows.map((r) => <div key={r.date} title={`${r.date}: ${Math.round(r.minutes)} min`} className="flex-1 rounded-t" style={{ height: `${(100 * r.minutes) / max}%`, background: r.hit ? "#16a34a" : "#2563eb", minHeight: r.minutes ? 2 : 0 }} />)}</div></div>;
}
