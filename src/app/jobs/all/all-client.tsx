"use client";
import { useEffect, useMemo, useState } from "react";
import { getJobs } from "../actions";
import { STAGES, STAGE_LABEL, type Application, type JobsState, type Stage } from "@/lib/jobs/types";
import { AppDialog } from "../app-dialog";
import { field, JobsNav, localDate, Shell, StagePill } from "../ui";

export function AllClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [q, setQ] = useState(""); const [sf, setSf] = useState<"" | Stage>(""); const [sort, setSort] = useState<{ k: keyof Application; d: 1 | -1 }>({ k: "applied_on", d: -1 });
  const [open, setOpen] = useState<Application | null>(null);
  const load = () => getJobs(localStorage.getItem("jobs.sid"), localDate()).then(setS);
  useEffect(() => { load(); }, []);
  const L = useMemo(() => {
    if (!S) return [];
    const qq = q.toLowerCase();
    return S.apps.filter((a) => (!qq || (a.company + a.role + a.stage + a.location).toLowerCase().includes(qq)) && (!sf || a.stage === sf)).sort((a, b) => String(a[sort.k] ?? "").localeCompare(String(b[sort.k] ?? "")) * sort.d || b.applied_on.localeCompare(a.applied_on));
  }, [S, q, sf, sort]);
  const th = (k: keyof Application, l: string) => <th className="cursor-pointer px-4 py-2 text-left text-xs font-medium text-neutral-500 hover:text-neutral-900" onClick={() => setSort({ k, d: sort.k === k ? (sort.d === 1 ? -1 : 1) : 1 })}>{l}{sort.k === k ? (sort.d === 1 ? " ↑" : " ↓") : ""}</th>;
  if (!S) return <Shell><JobsNav active="all" /><p className="text-neutral-500">Loading…</p></Shell>;
  return (
    <Shell>
      <JobsNav active="all" />
      <div className="flex flex-wrap items-center gap-2"><input className={`${field} w-64`} placeholder="Search company, role, stage" value={q} onChange={(e) => setQ(e.target.value)} /><select className={field} value={sf} onChange={(e) => setSf(e.target.value as "" | Stage)}><option value="">Any stage</option>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select><span className="text-sm text-neutral-500">{L.length} of {S.apps.length}. Select a row to change its stage, add notes or set a follow-up.</span></div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full text-sm"><thead><tr>{th("applied_on", "Applied")}{th("company", "Company")}{th("role", "Role")}{th("location", "Location")}{th("pay", "Pay")}{th("stage", "Stage")}<th className="px-4 py-2 text-left text-xs font-medium text-neutral-500">Follow-up</th></tr></thead>
        <tbody>{L.slice(0, 500).map((a) => <tr key={a.id} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50" onClick={() => setOpen(a)}><td className="whitespace-nowrap px-4 py-2 text-neutral-600">{a.applied_on}</td><td className="px-4 py-2 font-medium">{a.company}</td><td className="px-4 py-2">{a.role}</td><td className="px-4 py-2 text-neutral-600">{a.location}</td><td className="whitespace-nowrap px-4 py-2 text-neutral-600">{a.pay}</td><td className="px-4 py-2"><StagePill stage={a.stage} /></td><td className="px-4 py-2 text-neutral-600">{a.follow_up}</td></tr>)}</tbody></table>{!L.length ? <p className="p-8 text-center text-sm text-neutral-500">Nothing here.</p> : null}</div>
      {open ? <AppDialog app={open} onClose={() => setOpen(null)} onSaved={load} /> : null}
    </Shell>
  );
}
