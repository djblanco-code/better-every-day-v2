"use client";
import { useEffect, useState } from "react";
import { addApplication, getJobs, lookupUrl, skipTodo } from "../actions";
import type { Application, JobsState } from "@/lib/jobs/types";
import { btn, btnGhost, Card, field, JobsNav, localDate, Shell } from "../ui";

export function TodoClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ url: "", company: "", role: "", location: "", pay: "", applied_on: localDate(), notes: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => getJobs(localStorage.getItem("jobs.sid"), localDate()).then(setS);
  useEffect(() => { load(); }, []);
  const fill = async () => { if (!f.url) return; setBusy("lookup"); setMsg(null); const r = await lookupUrl(f.url); setF({ ...f, url: r.url || f.url, company: r.company || f.company, role: r.role || f.role, location: r.location || f.location, pay: r.pay || f.pay }); setMsg(r.error ? `Could not read the page (${r.error}); fill it in by hand.` : r.company ? `Found: ${r.company} · ${r.role}` : "Nothing structured on that page; fill it in by hand."); setBusy(null); };
  const add = async () => { if (!f.company) { setMsg("Company is required."); return; } setBusy("add"); try { await addApplication(f, localDate()); setF({ url: "", company: "", role: "", location: "", pay: "", applied_on: localDate(), notes: "" }); setMsg("Added."); load(); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(null); } };
  const applied = async (m: Application) => { setBusy(m.id); await addApplication({ url: m.url, company: m.company, role: m.role, location: m.location, pay: m.pay, fromTodo: m.id }, localDate()); setBusy(null); load(); };
  if (!S) return <Shell><JobsNav active="todo" /><p className="text-neutral-500">Loading…</p></Shell>;
  const L = S.todo.filter((m) => !q || (m.company + " " + m.role + " " + m.blocker).toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell>
      <JobsNav active="todo" />
      <Card title="Add by link" sub="Paste the posting URL; Greenhouse, Ashby, Lever and most career pages auto-fill. Then mark it applied.">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input className={field} placeholder="https://job-boards.greenhouse.io/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /><button className={btnGhost} disabled={busy === "lookup" || !f.url} onClick={fill}>{busy === "lookup" ? "Reading…" : "Auto-fill"}</button></div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3"><input className={field} placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /><input className={field} placeholder="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /><input className={field} placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /><input className={field} placeholder="Pay (as posted)" value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })} /><input className={field} type="date" value={f.applied_on} onChange={(e) => setF({ ...f, applied_on: e.target.value })} /><input className={field} placeholder="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="mt-2 flex items-center gap-2"><button className={btn} disabled={busy === "add"} onClick={add}>I applied to this</button>{msg ? <span className="text-sm text-neutral-600">{msg}</span> : null}</div>
      </Card>
      <div className="flex items-center gap-2"><input className={`${field} w-64`} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-sm text-neutral-500">{L.length} roles the agent could not submit. Mark each applied or skip it.</span></div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-neutral-500"><th className="px-4 py-2">Found</th><th className="px-4 py-2">Company · role</th><th className="px-4 py-2">Pay</th><th className="px-4 py-2">Why the agent stopped</th><th className="px-4 py-2">Your next step</th><th className="px-4 py-2"></th></tr></thead>
        <tbody>{L.slice(0, 400).map((m) => <tr key={m.id} className="border-t border-neutral-100 align-top"><td className="whitespace-nowrap px-4 py-2 text-neutral-600">{m.applied_on}</td><td className="px-4 py-2"><a className="font-medium hover:underline" href={m.url} target="_blank" rel="noopener">{m.company}</a><div className="text-neutral-600">{m.role}</div><div className="text-xs text-neutral-400">{m.location}</div></td><td className="whitespace-nowrap px-4 py-2 text-neutral-600">{m.pay}</td><td className="max-w-xs px-4 py-2 text-neutral-600">{m.blocker}</td><td className="max-w-xs px-4 py-2 text-neutral-600">{m.todo}</td><td className="whitespace-nowrap px-4 py-2"><button className={btn} disabled={busy === m.id} onClick={() => applied(m)}>Applied</button> <button className="text-sm text-neutral-500 hover:underline" onClick={() => skipTodo(m.id).then(load)}>Skip</button></td></tr>)}</tbody></table>{!L.length ? <p className="p-8 text-center text-sm text-neutral-500">Nothing waiting.</p> : null}</div>
    </Shell>
  );
}
