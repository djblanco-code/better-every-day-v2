"use client";
import { useEffect, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { getJobs, updateApplication } from "../actions";
import { STAGES, STAGE_LABEL, type Application, type JobsState, type Stage } from "@/lib/jobs/types";
import { AppDialog } from "../app-dialog";
import { JobsNav, localDate, Shell, STAGE_TONE } from "../ui";

const COLS: Stage[] = ["applied", "intro_call", "interview", "final", "offer", "ghosted", "rejected", "passed"];
export function BoardClient() {
  const [S, setS] = useState<JobsState | null>(null);
  const [open, setOpen] = useState<Application | null>(null);
  const [dragging, setDragging] = useState<Application | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const load = () => getJobs(localStorage.getItem("jobs.sid"), localDate()).then(setS).catch((e) => setErr(String(e?.message ?? e)));
  useEffect(() => { load(); }, []);
  if (err) return <Shell><JobsNav active="board" /><p className="text-red-700">{err}</p></Shell>;
  if (!S) return <Shell><JobsNav active="board" /><p className="text-neutral-500">Loading…</p></Shell>;
  const apps = S.apps.filter((a) => !q || (a.company + " " + a.role).toLowerCase().includes(q.toLowerCase()));
  const onStart = (e: DragStartEvent) => setDragging(apps.find((a) => a.id === e.active.id) ?? null);
  const onEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const to = e.over?.id as Stage | undefined, app = apps.find((a) => a.id === e.active.id);
    if (!to || !app || !(STAGES as readonly string[]).includes(to) || app.stage === to) return;
    setS({ ...S, apps: S.apps.map((a) => (a.id === app.id ? { ...a, stage: to } : a)) });   // optimistic
    try { await updateApplication(app.id, { stage: to }, localDate()); } catch (x) { setErr(String((x as Error)?.message ?? x)); load(); }
  };
  return (
    <Shell>
      <JobsNav active="board" />
      <div className="flex items-center gap-2"><input className="h-9 w-64 rounded-lg border border-neutral-300 bg-white px-2 text-sm" placeholder="Filter by company or role" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-sm text-neutral-500">Drag a card to change its stage. Keyboard: focus a card, Space, arrows, Space.</span></div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragEnd={onEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLS.map((s) => <Column key={s} stage={s} apps={apps.filter((a) => a.stage === s)} onOpen={setOpen} />)}
        </div>
        <DragOverlay>{dragging ? <CardView app={dragging} /> : null}</DragOverlay>
      </DndContext>
      {open ? <AppDialog app={open} onClose={() => setOpen(null)} onSaved={load} /> : null}
    </Shell>
  );
}
function Column({ stage, apps, onOpen }: { stage: Stage; apps: Application[]; onOpen: (a: Application) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`flex w-64 flex-none flex-col rounded-2xl border p-2 ${isOver ? "border-blue-400 bg-blue-50/40" : "border-neutral-200 bg-neutral-100/60"}`}>
      <div className="flex items-center justify-between px-2 py-1"><span className={`rounded-full px-2 py-0.5 text-xs ${STAGE_TONE[stage]}`}>{STAGE_LABEL[stage]}</span><span className="text-xs text-neutral-500">{apps.length}</span></div>
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-1">{apps.slice(0, 200).map((a) => <DragCard key={a.id} app={a} onOpen={onOpen} />)}{apps.length > 200 ? <p className="p-2 text-xs text-neutral-500">+{apps.length - 200} more (use the table)</p> : null}</div>
    </div>
  );
}
function DragCard({ app, onOpen }: { app: Application; onOpen: (a: Application) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onOpen(app)} className={isDragging ? "opacity-30" : ""}><CardView app={app} /></div>;
}
function CardView({ app }: { app: Application }) {
  return (
    <div className="cursor-grab rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-sm active:cursor-grabbing">
      <p className="font-medium">{app.company}</p><p className="truncate text-neutral-600">{app.role}</p>
      <p className="mt-1 text-xs text-neutral-400">{app.applied_on}{app.pay ? ` · ${app.pay}` : ""}{app.follow_up ? " · follow-up" : ""}</p>
    </div>
  );
}
