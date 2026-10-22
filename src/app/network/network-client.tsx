"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getNetwork, removeNetwork, saveEvent, savePerson, type Event, type NetworkState, type Person } from "./actions";
import { btn, btnGhost, Card, field, Shell } from "../jobs/ui";

const REL: Record<Person["relationship"], string> = { contact: "bg-neutral-100 text-neutral-700", mentor: "bg-green-50 text-green-700", recruiter: "bg-blue-50 text-blue-700", peer: "bg-amber-50 text-amber-700" };
export function NetworkClient() {
  const [N, setN] = useState<NetworkState | null>(null);
  const [tab, setTab] = useState<"people" | "events">("people");
  const [q, setQ] = useState("");
  const [edP, setEdP] = useState<Partial<Person> | null>(null);
  const [edE, setEdE] = useState<Partial<Event> | null>(null);
  const load = () => getNetwork().then(setN);
  useEffect(() => { load(); }, []);
  if (!N) return <Shell><p className="text-neutral-500">Loading…</p></Shell>;
  const people = N.people.filter((p) => !q || (p.name + p.company + p.role + p.met_at + p.how_they_can_help).toLowerCase().includes(q.toLowerCase()));
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-3xl font-semibold tracking-tight">Network</h1><p className="text-sm text-neutral-500">{N.people.length} people · {N.people.filter((p) => p.relationship === "mentor").length} mentors · {N.events.length} events · {N.follow_ups.length} follow-up{N.follow_ups.length === 1 ? "" : "s"} open</p></div>
        <div className="flex items-center gap-2"><div className="flex gap-1 rounded-xl bg-neutral-200/60 p-1">{(["people", "events"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-white shadow-sm" : "text-neutral-600"}`}>{t}</button>)}</div><button className={btn} onClick={() => (tab === "people" ? setEdP({ relationship: "contact", date: N.today }) : setEdE({ kind: "other", date: N.today }))}>{tab === "people" ? "Add a person" : "Add an event"}</button></div>
      </div>
      {tab === "people" ? <>
        {N.follow_ups.length ? <Card title="Follow-ups" sub="Promised or planned next steps"><ul className="divide-y divide-neutral-100">{N.follow_ups.map((p) => <li key={p.id} className="flex items-start gap-3 py-2"><input type="checkbox" className="mt-1 h-4 w-4" onChange={() => savePerson({ ...p, follow_up_done: true }).then(load)} /><div><p className="text-sm">{p.follow_up}</p><p className="text-xs text-neutral-500">{p.name}{p.company ? ` · ${p.company}` : ""}</p></div></li>)}</ul></Card> : null}
        <input className={`${field} w-72`} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-neutral-500"><th className="px-4 py-2">Name</th><th className="px-4 py-2">Company · role</th><th className="px-4 py-2">Met at</th><th className="px-4 py-2">How they can help</th><th className="px-4 py-2">Follow-up</th></tr></thead>
          <tbody>{people.map((p) => <tr key={p.id} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50" onClick={() => setEdP(p)}><td className="px-4 py-2"><div className="font-medium">{p.name}</div><span className={`rounded-full px-2 py-0.5 text-xs ${REL[p.relationship]}`}>{p.relationship}</span></td><td className="px-4 py-2 text-neutral-600">{p.company}{p.role ? ` · ${p.role}` : ""}</td><td className="px-4 py-2 text-neutral-600">{p.met_at}<div className="text-xs text-neutral-400">{p.date ?? ""}</div></td><td className="px-4 py-2">{p.how_they_can_help}</td><td className="px-4 py-2 text-neutral-600">{p.follow_up ? (p.follow_up_done ? <s>{p.follow_up}</s> : p.follow_up) : "–"}</td></tr>)}</tbody></table>{!people.length ? <p className="p-8 text-center text-sm text-neutral-500">No one yet. Add a person, or tell the home page who you met today.</p> : null}</div>
      </> : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-neutral-500"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Event</th><th className="px-4 py-2">Kind</th><th className="px-4 py-2">Host</th><th className="px-4 py-2">People met</th><th className="px-4 py-2">Notes</th></tr></thead>
          <tbody>{N.events.map((e) => <tr key={e.id} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50" onClick={() => setEdE(e)}><td className="whitespace-nowrap px-4 py-2 text-neutral-600">{e.date ?? ""}</td><td className="px-4 py-2 font-medium">{e.name}</td><td className="px-4 py-2"><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{e.kind}</span></td><td className="px-4 py-2 text-neutral-600">{e.org}</td><td className="px-4 py-2">{e.people ?? 0}</td><td className="px-4 py-2 text-neutral-600">{e.notes}</td></tr>)}</tbody></table>{!N.events.length ? <p className="p-8 text-center text-sm text-neutral-500">No events yet.</p> : null}</div>
      )}
      {edP ? <Dlg title={edP.id ? edP.name ?? "" : "Add a person"} onClose={() => setEdP(null)} onSave={async () => { await savePerson(edP); setEdP(null); load(); }} onRemove={edP.id ? async () => { await removeNetwork("person", edP.id!); setEdP(null); load(); } : undefined}>
        <In l="Name" v={edP.name} s={(v) => setEdP({ ...edP, name: v })} /><In l="Company" v={edP.company} s={(v) => setEdP({ ...edP, company: v })} /><In l="Role" v={edP.role} s={(v) => setEdP({ ...edP, role: v })} />
        <label className="block text-sm"><span className="text-neutral-600">Relationship</span><select className={`${field} mt-1 w-full`} value={edP.relationship ?? "contact"} onChange={(e) => setEdP({ ...edP, relationship: e.target.value as Person["relationship"] })}>{["contact", "mentor", "recruiter", "peer"].map((r) => <option key={r}>{r}</option>)}</select></label>
        <In l="Met at" v={edP.met_at} s={(v) => setEdP({ ...edP, met_at: v })} ph="NYC tech meetup" /><In l="Date" v={edP.date ?? ""} s={(v) => setEdP({ ...edP, date: v || null })} type="date" /><In l="Email" v={edP.email} s={(v) => setEdP({ ...edP, email: v })} /><In l="LinkedIn" v={edP.linkedin} s={(v) => setEdP({ ...edP, linkedin: v })} />
        <div className="sm:col-span-2"><In l="How they can help" v={edP.how_they_can_help} s={(v) => setEdP({ ...edP, how_they_can_help: v })} ph="Referral at X, intro to Y, resume feedback" /></div>
        <div className="sm:col-span-2"><In l="Follow-up" v={edP.follow_up} s={(v) => setEdP({ ...edP, follow_up: v, follow_up_done: v === edP.follow_up ? edP.follow_up_done : false })} ph="Send resume by Friday" /></div>
        <label className="block text-sm sm:col-span-2"><span className="text-neutral-600">Notes</span><textarea className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" value={edP.notes ?? ""} onChange={(e) => setEdP({ ...edP, notes: e.target.value })} /></label>
      </Dlg> : null}
      {edE ? <Dlg title={edE.id ? edE.name ?? "" : "Add an event"} onClose={() => setEdE(null)} onSave={async () => { await saveEvent(edE); setEdE(null); load(); }} onRemove={edE.id ? async () => { await removeNetwork("event", edE.id!); setEdE(null); load(); } : undefined}>
        <In l="Event" v={edE.name} s={(v) => setEdE({ ...edE, name: v })} /><label className="block text-sm"><span className="text-neutral-600">Kind</span><select className={`${field} mt-1 w-full`} value={edE.kind ?? "other"} onChange={(e) => setEdE({ ...edE, kind: e.target.value })}>{["job fair", "meetup", "conference", "info session", "other"].map((k) => <option key={k}>{k}</option>)}</select></label><In l="Host" v={edE.org} s={(v) => setEdE({ ...edE, org: v })} /><In l="Date" v={edE.date ?? ""} s={(v) => setEdE({ ...edE, date: v || null })} type="date" />
        <label className="block text-sm sm:col-span-2"><span className="text-neutral-600">Notes</span><textarea className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" value={edE.notes ?? ""} onChange={(e) => setEdE({ ...edE, notes: e.target.value })} /></label>
      </Dlg> : null}
    </Shell>
  );
}
function In({ l, v, s, ph, type = "text" }: { l: string; v?: string | null; s: (v: string) => void; ph?: string; type?: string }) {
  return <label className="block text-sm"><span className="text-neutral-600">{l}</span><input type={type} className={`${field} mt-1 w-full`} value={v ?? ""} placeholder={ph} onChange={(e) => s(e.target.value)} /></label>;
}
function Dlg({ title, children, onClose, onSave, onRemove }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => Promise<void>; onRemove?: () => Promise<void> }) {
  const [err, setErr] = useState<string | null>(null);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 className="mb-3 text-xl font-semibold">{title}</h2><div className="grid gap-3 sm:grid-cols-2">{children}</div>{err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}<div className="mt-4 flex gap-2"><button className={btn} onClick={() => onSave().catch((e) => setErr(String(e?.message ?? e)))}>Save</button><button className={btnGhost} onClick={onClose}>Cancel</button>{onRemove ? <button className="ml-auto text-sm text-red-700 hover:underline" onClick={() => { if (confirm("Remove?")) onRemove(); }}>Remove</button> : null}</div></div></div>;
}
