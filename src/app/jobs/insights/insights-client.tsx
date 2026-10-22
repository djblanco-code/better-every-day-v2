"use client";
import { useEffect, useState } from "react";
import { getJobs } from "../actions";
import { ACTIVE, STAGES, STAGE_LABEL, type JobsState } from "@/lib/jobs/types";
import { Card, field, JobsNav, localDate, Shell, Stat } from "../ui";

const sidKey = "jobs.sid";
export function InsightsClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => getJobs(typeof localStorage !== "undefined" ? localStorage.getItem(sidKey) : null, localDate()).then(setS).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  if (err) return <Shell><JobsNav active="insights" /><p className="text-red-700">{err}</p></Shell>;
  if (!S) return <Shell><JobsNav active="insights" /><p className="text-neutral-500">Loading…</p></Shell>;
  const A = S.apps, by: Record<string, number> = {}; A.forEach((a) => (by[a.stage] = (by[a.stage] ?? 0) + 1));
  const d = (n: number) => { const x = new Date(S.today + "T12:00"); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const wk = new Set(Array.from({ length: 7 }, (_, i) => d(i)));
  const days = Array.from({ length: 21 }, (_, i) => d(20 - i)).map((date) => ({ date, n: A.filter((a) => a.applied_on === date).length }));
  const max = Math.max(1, ...days.map((x) => x.n));
  const asN = S.assessments.filter((a) => a.status === "todo" || a.status === "expired").length, callN = S.actions.filter((a) => !a.done).length;
  const sv = S.searches.find((s) => s.id === S.viewing);
  const replied = A.filter((a) => a.stage !== "applied" && a.stage !== "ghosted").length, interviews = A.filter((a) => ["interview", "final", "offer"].includes(a.stage) || a.history.some((h) => ["interview", "final", "offer"].includes(h.stage))).length, finals = A.filter((a) => ["final", "offer"].includes(a.stage) || a.history.some((h) => ["final", "offer"].includes(h.stage))).length, offers = by.offer ?? 0;
  const funnel = [["Applied", A.length], ["Heard back", replied], ["Interviewing", interviews], ["Final round", finals], ["Offer", offers]] as [string, number][];
  return (
    <Shell>
      <JobsNav active="insights" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{sv ? `${sv.name} · ${sv.end ? `${sv.start} to ${sv.end} (finished)` : `since ${sv.start}`}` : "All time"}</p>
        <div className="flex items-center gap-2">
          <select className={field} value={S.viewing} onChange={(e) => { localStorage.setItem(sidKey, e.target.value); load(); }}>{S.searches.map((s) => <option key={s.id} value={s.id}>{s.name}{s.end ? "" : " (current)"}</option>)}<option value="all">All time</option></select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total applied" value={A.length} /><Stat label="By the agent" value={A.filter((a) => a.source === "agent").length} /><Stat label="By you" value={A.filter((a) => a.source === "me").length} /><Stat label="Last 7 days" value={A.filter((a) => wk.has(a.applied_on)).length} />
        <Stat label="In calls / interviews" value={A.filter((a) => ACTIVE.includes(a.stage)).length} /><Stat label="Assessments needed" value={asN} tone={asN ? "orange" : undefined} /><Stat label="Intro calls to set up" value={callN} tone={callN ? "orange" : undefined} /><Stat label="Waiting for you to apply" value={S.todo.length} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Applications per day" sub="Last 21 days" className="lg:col-span-2"><div className="flex h-40 items-end gap-[3px]">{days.map((x) => <div key={x.date} title={`${x.date}: ${x.n}`} className="flex-1 rounded-t bg-blue-600" style={{ height: `${(100 * x.n) / max}%`, minHeight: x.n ? 2 : 0 }} />)}</div></Card>
        <Card title="Where everything stands" sub="Every application by stage"><ul className="divide-y divide-neutral-100 text-sm">{STAGES.map((s) => <li key={s} className="flex justify-between py-1.5"><span>{STAGE_LABEL[s]}</span><span className="font-semibold">{by[s] ?? 0}</span></li>)}</ul></Card>
      </div>
      <Card title="Application funnel" sub="From applied to offer. Assessments are a separate step from interviews.">
        <div className="space-y-2">{funnel.map(([l, n], i) => <div key={l} className="flex items-center gap-3 text-sm"><span className="w-28 text-neutral-600">{l}</span><div className="h-6 flex-1 overflow-hidden rounded bg-neutral-100"><div className="h-full rounded" style={{ width: `${A.length ? Math.max(2, (100 * n) / A.length) : 0}%`, background: i === 0 ? "#2563eb" : i < 3 ? "#16a34a" : "#ca8a04" }} /></div><span className="w-20 text-right font-semibold">{n}{A.length && i ? <span className="ml-1 text-xs font-normal text-neutral-500">{Math.round((100 * n) / A.length)}%</span> : null}</span></div>)}</div>
      </Card>
    </Shell>
  );
}
