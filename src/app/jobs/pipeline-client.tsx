"use client";
import { useEffect, useState } from "react";
import { completeNextAction, getJobs, nudge, saveAction, saveAssessment, startSearch, updateApplication } from "./actions";
import { ACTIVE, OPEN, STAGES, STAGE_LABEL, isStale, type Application, type JobsState, type Stage } from "@/lib/jobs/types";
import { AppDialog } from "./app-dialog";
import { btn, btnGhost, Card, field, JobsNav, localDate, Shell, StagePill } from "./ui";

const sidKey = "jobs.sid";
type Due = { kind: "action" | "assessment" | "call"; id: string; title: string; detail: string; due: string | null; overdue: boolean; app?: Application };

// Pipeline: the landing page of the tracker. Order of the page = order of a day: what is due, what is stale,
// then the applications themselves. Rules in docs/JOBS-UX.md §4.
export function PipelineClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Application | null>(null);
  const [chip, setChip] = useState<"open" | Stage | "all">("open");
  const [q, setQ] = useState("");
  const [newSearch, setNewSearch] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => getJobs(typeof localStorage !== "undefined" ? localStorage.getItem(sidKey) : null, localDate()).then(setS).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  const run = async (key: string, p: Promise<unknown>) => { setBusy(key); try { await p; await load(); } catch (e) { setErr(String((e as Error)?.message ?? e)); } finally { setBusy(null); } };
  if (err) return <Shell><JobsNav active="pipeline" /><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</p></Shell>;
  if (!S) return <Shell><JobsNav active="pipeline" /><p className="text-neutral-500">Loading…</p></Shell>;

  const today = S.today, soon = (() => { const d = new Date(today + "T12:00"); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })();
  const sv = S.searches.find((s) => s.id === S.viewing);
  // Needs you: dated next actions, assessments and calls (within 3 days or overdue), overdue first.
  const due: Due[] = [];
  for (const a of S.apps) if (a.next_action_on && a.next_action_on <= soon && (OPEN as string[]).includes(a.stage)) due.push({ kind: "action", id: a.id, title: `${a.company}: ${a.next_action || "next step"}`, detail: a.role, due: a.next_action_on, overdue: a.next_action_on < today, app: a });
  for (const x of S.assessments) if ((x.status === "todo" || x.status === "expired") && (!x.due || x.due <= soon)) due.push({ kind: "assessment", id: x.id, title: `${x.company} assessment`, detail: [x.platform, x.role].filter(Boolean).join(" · "), due: x.due, overdue: !!x.due && x.due < today });
  for (const x of S.actions) if (!x.done && (!x.due || x.due <= soon)) due.push({ kind: "call", id: x.id, title: `${x.company}: ${x.text}`, detail: "intro call", due: x.due, overdue: !!x.due && x.due < today });
  due.sort((a, b) => (a.overdue === b.overdue ? (a.due ?? "9999").localeCompare(b.due ?? "9999") : a.overdue ? -1 : 1));
  const stale = S.apps.filter((a) => isStale(a, today)).sort((a, b) => a.applied_on.localeCompare(b.applied_on));

  const counts: Record<string, number> = { open: 0, all: S.apps.length };
  for (const a of S.apps) { counts[a.stage] = (counts[a.stage] ?? 0) + 1; if ((OPEN as string[]).includes(a.stage)) counts.open += 1; }
  const list = S.apps.filter((a) => (chip === "all" ? true : chip === "open" ? (OPEN as string[]).includes(a.stage) : a.stage === chip)).filter((a) => !q || (a.company + " " + a.role + " " + a.location).toLowerCase().includes(q.toLowerCase()));
  const nextLabel = (a: Application) => a.next_action_on ? `${a.next_action || "next step"} · ${a.next_action_on < today ? "was due" : "by"} ${a.next_action_on}` : a.next_action || "";

  return (
    <Shell>
      <JobsNav active="pipeline" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">{sv ? `${sv.name} · ${sv.end ? `${sv.start} to ${sv.end} (finished)` : `since ${sv.start}`}` : "All time"} · {S.apps.length} applications · {S.apps.filter((a) => ACTIVE.includes(a.stage)).length} in interviews</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={field} aria-label="Search window" value={S.viewing} onChange={(e) => { localStorage.setItem(sidKey, e.target.value); load(); }}>{S.searches.map((s) => <option key={s.id} value={s.id}>{s.name}{s.end ? "" : " (current)"}</option>)}<option value="all">All time</option></select>
          {newSearch === null ? <button className={btnGhost} onClick={() => setNewSearch(`Job search ${S.searches.length + 1}`)}>New search</button> : (
            <form className="flex items-center gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await startSearch(newSearch, localDate()); localStorage.setItem(sidKey, r.id); setNewSearch(null); load(); }}>
              <input className={field} autoFocus value={newSearch} onChange={(e) => setNewSearch(e.target.value)} aria-label="Name of the new search" />
              <button className={btn} type="submit">Start today</button><button type="button" className={btnGhost} onClick={() => setNewSearch(null)}>Cancel</button>
              <span className="text-xs text-neutral-500">The current search closes today and stays viewable.</span>
            </form>
          )}
        </div>
      </div>

      <Card title={`Needs you · ${due.length}`} sub="Next actions you set, assessments and calls due within three days. Overdue first.">
        {due.length ? <ul className="divide-y divide-neutral-100">{due.map((d) => (
          <li key={d.kind + d.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className={`rounded-full px-2 py-0.5 text-xs ${d.overdue ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{d.overdue ? "overdue" : d.kind === "assessment" ? "assessment" : d.kind === "call" ? "call" : "next step"}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{d.title}</p><p className="truncate text-xs text-neutral-500">{d.detail}{d.due ? ` · ${d.overdue ? "was due" : "due"} ${d.due}` : " · no date"}</p></div>
            {d.kind === "action" && d.app ? <><button className={btnGhost} disabled={busy === d.id} onClick={() => run(d.id, completeNextAction(d.id, localDate()))}>Done</button><button className="text-sm text-neutral-600 hover:underline" onClick={() => setOpen(d.app!)}>Open</button></> : null}
            {d.kind === "assessment" ? <><button className={btnGhost} disabled={busy === d.id} onClick={() => run(d.id, saveAssessment({ ...S.assessments.find((x) => x.id === d.id)!, status: "done" }))}>Done</button><a href="/jobs/action" className="text-sm text-neutral-600 hover:underline">Edit</a></> : null}
            {d.kind === "call" ? <><button className={btnGhost} disabled={busy === d.id} onClick={() => run(d.id, saveAction({ ...S.actions.find((x) => x.id === d.id)!, done: true }))}>Done</button><a href="/jobs/action" className="text-sm text-neutral-600 hover:underline">Edit</a></> : null}
          </li>))}</ul> : <p className="py-4 text-center text-sm text-neutral-500">Nothing due. Set a next action on any application and it shows up here.</p>}
        <p className="mt-3 text-xs text-neutral-500"><a href="/jobs/action" className="underline">Add an assessment or an intro call</a> · <a href="/jobs/mail" className="underline">Check mail for new invites</a></p>
      </Card>

      {stale.length ? (
        <Card title={`Gone quiet · ${stale.length}`} sub="Applied 14+ days ago, no reply, nothing scheduled. Nudge sets a follow-up for today; No reply closes it out. Nothing changes until you choose.">
          <ul className="divide-y divide-neutral-100">{stale.slice(0, 25).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1"><button className="truncate text-left text-sm font-medium hover:underline" onClick={() => setOpen(a)}>{a.company}</button><p className="truncate text-xs text-neutral-500">{a.role} · applied {a.applied_on}</p></div>
              <button className={btnGhost} disabled={busy === a.id} onClick={() => run(a.id, nudge(a.id, localDate()))}>Nudge</button>
              <button className="text-sm text-neutral-500 hover:underline" disabled={busy === a.id} onClick={() => run(a.id, updateApplication(a.id, { stage: "ghosted" }, localDate()))}>No reply</button>
            </li>))}</ul>
          {stale.length > 25 ? <p className="mt-2 text-xs text-neutral-500">{stale.length - 25} more below in the table.</p> : null}
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {([["open", "Open"], ["all", "All"], ...STAGES.map((s) => [s, STAGE_LABEL[s]] as [Stage, string])] as [typeof chip, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={chip === k} onClick={() => setChip(k)} className={`h-8 rounded-full border px-3 text-sm ${chip === k ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`}>{l} <span className={chip === k ? "text-neutral-300" : "text-neutral-400"}>{counts[k] ?? 0}</span></button>
          ))}
          <input className={`${field} ml-auto w-full sm:w-64`} placeholder="Search company, role, location" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="tbl-cards w-full text-sm">
            <thead><tr className="text-left text-xs text-neutral-500"><th className="px-4 py-2">Company</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Stage</th><th className="px-4 py-2">Applied</th><th className="px-4 py-2">Next action</th></tr></thead>
            <tbody>{list.slice(0, 500).map((a) => (
              <tr key={a.id} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50" onClick={() => setOpen(a)}>
                <td className="px-4 py-2 font-medium">{a.company}<div className="text-xs font-normal text-neutral-400">{a.location}{a.pay ? ` · ${a.pay}` : ""}</div></td>
                <td className="px-4 py-2 text-neutral-700">{a.role}</td>
                <td className="px-4 py-2"><StagePill stage={a.stage} /></td>
                <td className="whitespace-nowrap px-4 py-2 text-neutral-600">{a.applied_on}</td>
                <td className={`px-4 py-2 ${a.next_action_on && a.next_action_on < today ? "text-red-700" : "text-neutral-600"}`}>{nextLabel(a) || <span className="text-neutral-300">–</span>}</td>
              </tr>))}</tbody>
          </table>
          {!list.length ? <p className="p-8 text-center text-sm text-neutral-500">Nothing here. <a href="/jobs/todo" className="underline">Add one by link</a> on Leads.</p> : null}
        </div>
      </section>
      {open ? <AppDialog app={open} onClose={() => setOpen(null)} onSaved={load} /> : null}
    </Shell>
  );
}
