"use client";
import Link from "next/link";
// Shared building blocks for the Jobs pages: nav, stage pills, dialog, stats.
import { STAGE_LABEL, type Stage } from "@/lib/jobs/types";

export const STAGE_TONE: Record<Stage, string> = {
  applied: "bg-neutral-100 text-neutral-700", intro_call: "bg-blue-50 text-blue-700", interview: "bg-blue-50 text-blue-700", final: "bg-green-50 text-green-700",
  offer: "bg-green-50 text-green-700", ghosted: "bg-amber-50 text-amber-700", rejected: "bg-red-50 text-red-700", passed: "bg-red-50 text-red-700",
};
export const field = "h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm";
export const btn = "inline-flex h-9 items-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";
export const btnGhost = "inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm hover:bg-neutral-50 disabled:opacity-50";
export const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${STAGE_TONE[stage]}`}>{STAGE_LABEL[stage]}</span>;
}
export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "orange" | "green" }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-1 text-2xl font-semibold ${tone === "orange" ? "text-amber-600" : tone === "green" ? "text-green-700" : ""}`}>{value}</p></div>;
}
export function Card({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-neutral-200 bg-white p-5 ${className}`}>{title ? <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="font-medium">{title}</h2>{sub ? <p className="text-xs text-neutral-500">{sub}</p> : null}</div>{right}</div> : null}{children}</section>;
}
export function JobsNav({ active }: { active: "pipeline" | "board" | "todo" | "mail" | "insights" | "action" }) {
  const tabs: [typeof active, string, string][] = [["insights", "Insights", "/jobs"], ["pipeline", "Pipeline", "/jobs/pipeline"], ["board", "Board", "/jobs/board"], ["todo", "Leads", "/jobs/todo"], ["mail", "Mail", "/jobs/mail"]];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Home</Link><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Job Tracker</h1></div>
      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-200/60 p-1">{tabs.map(([k, l, h]) => <a key={k} href={h} className={`rounded-lg px-3 py-1.5 text-sm ${k === active ? "bg-white shadow-sm" : "text-neutral-600"}`}>{l}</a>)}</div>
    </div>
  );
}
export { Shell } from "../shell";
