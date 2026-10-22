"use client";
import { useEffect, useState } from "react";
import { getJobs, removeItem, saveAction, saveAssessment } from "../actions";
import type { Action, Assessment, JobsState } from "@/lib/jobs/types";
import { btn, btnGhost, Card, field, JobsNav, localDate, Shell } from "../ui";

export function ActionClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [edA, setEdA] = useState<Partial<Assessment> | null>(null);
  const [edC, setEdC] = useState<Partial<Action> | null>(null);
  const load = () => getJobs(localStorage.getItem("jobs.sid"), localDate()).then(setS);
  useEffect(() => { load(); }, []);
  if (!S) return <Shell><JobsNav active="action" /><p className="text-neutral-500">Loading…</p></Shell>;
  const todoA = S.assessments.filter((a) => a.status === "todo" || a.status === "expired"), doneA = S.assessments.filter((a) => a.status === "done" || a.status === "skipped");
  const todoC = S.actions.filter((a) => !a.done), doneC = S.actions.filter((a) => a.done);
  const dueTone = (d: string | null) => (d && d < S.today ? "text-red-700" : d === S.today ? "text-amber-700" : "text-neutral-500");
  return (
    <Shell>
      <JobsNav active="action" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Assessments needed" sub="HackerRank, CodeSignal, take-homes. Not interviews." right={<button className={btn} onClick={() => setEdA({ status: "todo" })}>Add</button>}>
          <ul className="divide-y divide-neutral-100">{todoA.map((a) => <li key={a.id} className="flex items-start gap-3 py-3"><input type="checkbox" className="mt-1 h-4 w-4" onChange={() => saveAssessment({ ...a, status: "done" }).then(load)} /><div className="min-w-0 flex-1"><p className="font-medium">{a.company}{a.role ? ` · ${a.role}` : ""}</p><p className="text-sm text-neutral-600">{a.platform}{a.minutes ? ` · ${a.minutes} min` : ""}{a.invited ? ` · invited ${a.invited}` : ""} · <span className={dueTone(a.due)}>{a.due ? `due ${a.due}` : "no deadline"}</span></p>{a.notes ? <p className="mt-1 text-sm text-neutral-500">{a.notes}</p> : null}</div><button className="text-sm text-neutral-500 hover:underline" onClick={() => setEdA(a)}>Edit</button></li>)}{!todoA.length ? <li className="py-6 text-center text-sm text-neutral-500">Nothing to do.</li> : null}</ul>
          {doneA.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-neutral-500">{doneA.length} done</summary><ul className="mt-1 text-sm text-neutral-500">{doneA.map((a) => <li key={a.id} className="py-1 line-through">{a.company} · {a.platform}</li>)}</ul></details> : null}
        </Card>
        <Card title="Intro calls to set up" sub="Scheduling links waiting on you, recruiter threads to answer." right={<button className={btn} onClick={() => setEdC({ type: "schedule" })}>Add</button>}>
          <ul className="divide-y divide-neutral-100">{todoC.map((a) => <li key={a.id} className="flex items-start gap-3 py-3"><input type="checkbox" className="mt-1 h-4 w-4" onChange={() => saveAction({ ...a, done: true }).then(load)} /><div className="min-w-0 flex-1"><p className="font-medium">{a.company}</p><p className="text-sm text-neutral-600">{a.text} · <span className={dueTone(a.due)}>{a.due ? `by ${a.due}` : "no date"}</span></p>{a.note ? <p className="mt-1 text-sm text-neutral-500">{a.note}</p> : null}</div><button className="text-sm text-neutral-500 hover:underline" onClick={() => setEdC(a)}>Edit</button></li>)}{!todoC.length ? <li className="py-6 text-center text-sm text-neutral-500">Nothing to set up.</li> : null}</ul>
          {doneC.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-neutral-500">{doneC.length} done</summary><ul className="mt-1 text-sm text-neutral-500">{doneC.map((a) => <li key={a.id} className="py-1 line-through">{a.company} · {a.text}</li>)}</ul></details> : null}
        </Card>
      </div>
      {edA ? <Dlg title={edA.id ? "Edit assessment" : "Add assessment"} onClose={() => setEdA(null)} onSave={async () => { await saveAssessment(edA); setEdA(null); load(); }} onRemove={edA.id ? async () => { await removeItem("assessments", edA.id!); setEdA(null); load(); } : undefined}>
        <In l="Company" v={edA.company} s={(v) => setEdA({ ...edA, company: v })} /><In l="Role" v={edA.role} s={(v) => setEdA({ ...edA, role: v })} /><In l="Platform" v={edA.platform} s={(v) => setEdA({ ...edA, platform: v })} ph="HackerRank" /><In l="Minutes" v={edA.minutes} s={(v) => setEdA({ ...edA, minutes: v })} /><In l="Invited" v={edA.invited ?? ""} s={(v) => setEdA({ ...edA, invited: v || null })} type="date" /><In l="Due" v={edA.due ?? ""} s={(v) => setEdA({ ...edA, due: v || null })} type="date" />
        <label className="block text-sm"><span className="text-neutral-600">Status</span><select className={`${field} mt-1 w-full`} value={edA.status ?? "todo"} onChange={(e) => setEdA({ ...edA, status: e.target.value as Assessment["status"] })}>{["todo", "done", "expired", "skipped"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="block text-sm sm:col-span-2"><span className="text-neutral-600">Notes</span><textarea className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" value={edA.notes ?? ""} onChange={(e) => setEdA({ ...edA, notes: e.target.value })} /></label>
      </Dlg> : null}
      {edC ? <Dlg title={edC.id ? "Edit" : "Add an intro call to set up"} onClose={() => setEdC(null)} onSave={async () => { await saveAction(edC); setEdC(null); load(); }} onRemove={edC.id ? async () => { await removeItem("actions", edC.id!); setEdC(null); load(); } : undefined}>
        <In l="Company" v={edC.company} s={(v) => setEdC({ ...edC, company: v })} /><In l="What" v={edC.text} s={(v) => setEdC({ ...edC, text: v })} ph="Book the recruiter screen" /><In l="By" v={edC.due ?? ""} s={(v) => setEdC({ ...edC, due: v || null })} type="date" />
        <label className="block text-sm sm:col-span-2"><span className="text-neutral-600">Note</span><textarea className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" value={edC.note ?? ""} onChange={(e) => setEdC({ ...edC, note: e.target.value })} /></label>
      </Dlg> : null}
    </Shell>
  );
}
function In({ l, v, s, ph, type = "text" }: { l: string; v?: string | null; s: (v: string) => void; ph?: string; type?: string }) {
  return <label className="block text-sm"><span className="text-neutral-600">{l}</span><input type={type} className={`${field} mt-1 w-full`} value={v ?? ""} placeholder={ph} onChange={(e) => s(e.target.value)} /></label>;
}
function Dlg({ title, children, onClose, onSave, onRemove }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => Promise<void>; onRemove?: () => Promise<void> }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 className="mb-3 text-xl font-semibold">{title}</h2><div className="grid gap-3 sm:grid-cols-2">{children}</div><div className="mt-4 flex gap-2"><button className={btn} onClick={onSave}>Save</button><button className={btnGhost} onClick={onClose}>Cancel</button>{onRemove ? <button className="ml-auto text-sm text-red-700 hover:underline" onClick={() => { if (confirm("Remove?")) onRemove(); }}>Remove</button> : null}</div></div></div>;
}
