"use client";
import { useState } from "react";
import { updateApplication, removeItem } from "./actions";
import { STAGES, STAGE_LABEL, type Application, type Stage } from "@/lib/jobs/types";
import { btn, btnGhost, field, localDate } from "./ui";

// Edit one application: stage, notes, follow-up. Used by the board, the table and the overview.
export function AppDialog({ app, onClose, onSaved }: { app: Application; onClose: () => void; onSaved: () => void }) {
  const [stage, setStage] = useState<Stage>(app.stage);
  const [notes, setNotes] = useState(app.notes);
  const [follow, setFollow] = useState(app.follow_up);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => { setBusy(true); setErr(null); try { await updateApplication(app.id, { stage, notes, follow_up: follow }, localDate()); onSaved(); onClose(); } catch (e) { setErr(String((e as Error)?.message ?? e)); } finally { setBusy(false); } };
  const remove = async () => { if (!confirm(`Remove ${app.company} · ${app.role}? This can't be undone.`)) return; setBusy(true); await removeItem("applications", app.id); onSaved(); onClose(); };
  return (
    <div role="dialog" aria-modal="true" aria-label={app.company} className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div><h2 className="text-xl font-semibold">{app.company}</h2><p className="text-sm text-neutral-500">{app.role}{app.location ? ` · ${app.location}` : ""}{app.pay ? ` · ${app.pay}` : ""} · applied {app.applied_on} {app.source === "agent" ? "by the agent" : "by you"}</p>{app.url ? <a className="text-sm text-blue-700 hover:underline" href={app.url} target="_blank" rel="noopener">Open posting ↗</a> : null}</div>
        <label className="block text-sm"><span className="text-neutral-600">Stage</span><select className={`${field} mt-1 w-full`} value={stage} onChange={(e) => setStage(e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></label>
        <label className="block text-sm"><span className="text-neutral-600">Follow-up</span><input className={`${field} mt-1 w-full`} value={follow} onChange={(e) => setFollow(e.target.value)} placeholder="e.g. Email the recruiter on Friday" /></label>
        <label className="block text-sm"><span className="text-neutral-600">Notes</span><textarea className="mt-1 min-h-[96px] w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {app.history.length ? <p className="text-xs text-neutral-500">History: {app.history.map((h) => `${STAGE_LABEL[h.stage]} ${h.on}`).join(" → ")}</p> : null}
        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={save} className={btn}>Save</button><button onClick={onClose} className={btnGhost}>Cancel</button><button disabled={busy} onClick={remove} className="ml-auto text-sm text-red-700 hover:underline">Remove</button></div>
      </div>
    </div>
  );
}
