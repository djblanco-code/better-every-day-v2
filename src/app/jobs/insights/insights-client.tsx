"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getJobs, startSearch } from "../actions";
import { ACTIVE, STAGES, STAGE_LABEL, type JobsState } from "@/lib/jobs/types";
import { bySource, funnel, headline, weekly } from "@/lib/jobs/metrics";
import { btn, btnGhost, Card, field, JobsNav, localDate, Shell } from "../ui";

// Insights: the landing page of the tracker. One hue for data (identity is in the labels), thin marks with
// rounded ends, hover tooltips, direct labels only where they matter, and a table view for every chart.
// Forms chosen per the dataviz method: stat tiles for headline numbers, bars for magnitude over weeks,
// sorted horizontal bars (not a trapezoid funnel) for stage reach and conversion.
const sidKey = "jobs.sid";
const INK = "var(--viz-ink, #2a78d6)";

export function InsightsClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tables, setTables] = useState(false);
  const [newSearch, setNewSearch] = useState<string | null>(null);
  const load = () => getJobs(typeof localStorage !== "undefined" ? localStorage.getItem(sidKey) : null, localDate()).then(setS).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  if (err) return <Shell><JobsNav active="insights" /><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!S) return <Shell><JobsNav active="insights" /><p className="text-neutral-500">Loading…</p></Shell>;

  const A = S.apps, today = S.today;
  const H = headline(A, today), W = weekly(A, today, 12), F = funnel(A), SRC = bySource(A);
  const sv = S.searches.find((s) => s.id === S.viewing);
  const byStage = STAGES.map((s) => ({ stage: s, label: STAGE_LABEL[s], n: A.filter((a) => a.stage === s).length })).sort((a, b) => b.n - a.n);
  const needs = S.assessments.filter((a) => a.status === "todo" || a.status === "expired").length + S.actions.filter((a) => !a.done).length + A.filter((a) => a.next_action_on && a.next_action_on <= today).length;
  const delta = H.last7 - H.prior7;

  return (
    <Shell>
      <style>{`.viz{--viz-ink:#2a78d6;--viz-grid:#e5e7eb;--viz-muted:#9ca3af}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .viz{--viz-ink:#3987e5;--viz-grid:#3a3a3a;--viz-muted:#8b8b8b}}`}</style>
      <JobsNav active="insights" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{sv ? `${sv.name} · ${sv.end ? `${sv.start} to ${sv.end} (finished)` : `since ${sv.start}`}` : "All time"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={field} aria-label="Search window" value={S.viewing} onChange={(e) => { localStorage.setItem(sidKey, e.target.value); load(); }}>{S.searches.map((s) => <option key={s.id} value={s.id}>{s.name}{s.end ? "" : " (current)"}</option>)}<option value="all">All time</option></select>
          {newSearch === null ? <button className={btnGhost} onClick={() => setNewSearch(`Job search ${S.searches.length + 1}`)}>New search</button> : (
            <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await startSearch(newSearch, localDate()); localStorage.setItem(sidKey, r.id); setNewSearch(null); load(); }}>
              <input className={field} autoFocus value={newSearch} onChange={(e) => setNewSearch(e.target.value)} aria-label="Name of the new search" />
              <button className={btn} type="submit">Start today</button><button type="button" className={btnGhost} onClick={() => setNewSearch(null)}>Cancel</button>
              <span className="text-xs text-neutral-500">Closes the current search today; it stays viewable.</span>
            </form>
          )}
          <button className={btnGhost} aria-pressed={tables} onClick={() => setTables((v) => !v)}>{tables ? "Show charts" : "Show as tables"}</button>
        </div>
      </div>

      {needs ? <Link href="/jobs/pipeline" className="block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100">{needs} thing{needs === 1 ? "" : "s"} need you · open the Pipeline →</Link> : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Applications" value={String(H.total)} sub={`${H.open} still open`} />
        <Tile label="Last 7 days" value={String(H.last7)} sub={`${delta >= 0 ? "+" : ""}${delta} vs the 7 before`} tone={delta > 0 ? "up" : delta < 0 ? "down" : undefined} />
        <Tile label="Response rate" value={`${H.responseRate}%`} sub={`${H.responded} replied (any answer)`} />
        <Tile label="Interview rate" value={`${H.interviewRate}%`} sub="reached an interview" />
        <Tile label="Days to first reply" value={H.medianDays == null ? "–" : String(H.medianDays)} sub="median, when they replied" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Applications per week" sub="Last 12 weeks, Monday to Sunday" className="lg:col-span-3">
          {tables ? <DataTable head={["Week of", "Applications"]} rows={W.map((w) => [w.start, String(w.n)])} /> : <WeeklyBars weeks={W} />}
        </Card>
        <Card title="How far they got" sub="Each bar counts every application that reached that step; the % is conversion from the step before" className="lg:col-span-2">
          {tables ? <DataTable head={["Step", "Applications", "Of previous", "Of all"]} rows={F.map((s) => [s.label, String(s.n), s.ofPrev == null ? "–" : `${s.ofPrev}%`, `${s.ofAll}%`])} /> : <HBars rows={F.map((s) => ({ label: s.label, n: s.n, note: s.ofPrev == null ? "" : `${s.ofPrev}% of previous` }))} max={F[0]?.n ?? 1} />}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Where everything stands now" sub="Current stage of every application in this window" className="lg:col-span-3">
          {tables ? <DataTable head={["Stage", "Applications"]} rows={byStage.map((s) => [s.label, String(s.n)])} /> : <HBars rows={byStage.filter((s) => s.n).map((s) => ({ label: s.label, n: s.n, note: `${Math.round((100 * s.n) / Math.max(1, A.length))}%` }))} max={Math.max(1, ...byStage.map((s) => s.n))} />}
          <p className="mt-3 text-xs text-neutral-500">{A.filter((a) => ACTIVE.includes(a.stage)).length} in calls or interviews right now.</p>
        </Card>
        <Card title="By who sent it" sub="Does what the agent sends get answered as often as what you send?" className="lg:col-span-2">
          <DataTable head={["", "Sent", "Replied", "Interview"]} rows={SRC.map((r) => [r.label, String(r.n), `${r.responseRate}%`, `${r.interviewRate}%`])} />
          <p className="mt-3 text-xs text-neutral-500">Rough yardsticks from tracker vendors: 50-70% response is average, under 5% interview rate points at targeting or the resume. Treat as hints, not standards.</p>
        </Card>
      </div>
    </Shell>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "up" | "down" }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p><p className={`mt-0.5 text-xs ${tone === "up" ? "text-green-700" : tone === "down" ? "text-red-700" : "text-neutral-500"}`}>{sub}</p></div>;
}

function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-neutral-500">{head.map((h, i) => <th key={i} className={`py-1 pr-3 ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-neutral-100">{r.map((c, j) => <td key={j} className={`py-1.5 pr-3 tabular-nums ${j ? "text-right" : ""}`}>{c}</td>)}</tr>)}</tbody></table></div>;
}

/** Single-series weekly bars in SVG: thin marks, 2px gap, rounded data ends, hover tooltip, labels on the max and the last week only. */
function WeeklyBars({ weeks }: { weeks: { start: string; end: string; n: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 180, padL = 28, padB = 26, padT = 18;
  const max = Math.max(1, ...weeks.map((w) => w.n));
  const iw = (W - padL) / weeks.length, bw = Math.max(6, iw - 6);
  const y = (n: number) => padT + (H - padT - padB) * (1 - n / max);
  const maxI = weeks.findIndex((w) => w.n === max), lastI = weeks.length - 1;
  const fmt = (d: string) => new Date(d + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <div className="viz relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label={`Applications per week, ${weeks.length} weeks`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth="1" /><text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--viz-muted)">{t}</text></g>)}
        {weeks.map((w, i) => { const x = padL + i * iw + (iw - bw) / 2, top = y(w.n), h = Math.max(0, H - padB - top); return (
          <g key={w.start} onMouseEnter={() => setHover(i)}>
            <rect x={padL + i * iw} y={padT} width={iw} height={H - padT - padB} fill="transparent" />
            {w.n ? <rect x={x} y={top} width={bw} height={h} rx="4" ry="4" fill={INK} opacity={hover == null || hover === i ? 1 : 0.55} /> : <line x1={x} x2={x + bw} y1={H - padB} y2={H - padB} stroke="var(--viz-muted)" strokeWidth="2" />}
            {(i === maxI || i === lastI) && w.n ? <text x={x + bw / 2} y={top - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">{w.n}</text> : null}
            {i % 2 === lastI % 2 ? <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--viz-muted)">{fmt(w.start)}</text> : null}
          </g>); })}
      </svg>
      {hover != null ? <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs shadow-sm" role="status">Week of {fmt(weeks[hover].start)} · <span className="font-semibold">{weeks[hover].n}</span> application{weeks[hover].n === 1 ? "" : "s"}</div> : null}
    </div>
  );
}

/** Sorted horizontal bars with the value at the end and a muted note. One hue. */
function HBars({ rows, max }: { rows: { label: string; n: number; note?: string }[]; max: number }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <ul className="viz space-y-2" onMouseLeave={() => setHover(null)}>
      {rows.map((r, i) => (
        <li key={r.label} className="text-sm" onMouseEnter={() => setHover(i)}>
          <div className="flex items-baseline justify-between gap-3"><span className="text-neutral-700">{r.label}</span><span className="tabular-nums"><span className="font-semibold">{r.n}</span>{r.note ? <span className="ml-2 text-xs text-neutral-500">{r.note}</span> : null}</span></div>
          <div className="mt-1 h-2.5 w-full rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${Math.max(r.n ? 1.5 : 0, (100 * r.n) / Math.max(1, max))}%`, background: INK, opacity: hover == null || hover === i ? 1 : 0.55 }} /></div>
        </li>
      ))}
      {!rows.length ? <li className="py-4 text-center text-sm text-neutral-500">Nothing in this window yet.</li> : null}
    </ul>
  );
}
