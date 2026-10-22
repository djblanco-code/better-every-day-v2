"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addEntry, deleteEntry, getJournal, type Entry, type Item } from "./actions";
import { btn, btnGhost, Card } from "../jobs/ui";

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
type SR = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };

export function JournalCard({ onSaved, compact = false }: { onSaved?: () => void; compact?: boolean }) {
  const [J, setJ] = useState<{ entries: Entry[]; has_key: boolean } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  const load = () => getJournal().then(setJ).catch(() => setJ({ entries: [], has_key: false }));
  useEffect(() => { load(); }, []);
  const canMic = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  const mic = () => {
    if (rec.current) { rec.current.stop(); return; }
    const Ctor = ((window as unknown as { SpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition)!;
    const r = new Ctor(); r.continuous = true; r.interimResults = true; r.lang = "en-US";
    const base = text ? text.replace(/\s*$/, " ") : ""; let fin = "";
    r.onresult = (e) => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t + " "; else interim += t; } setText(base + fin + interim); };
    r.onerror = (e) => setMsg(e.error === "not-allowed" ? "Allow the microphone in the address bar." : `Mic: ${e.error}`);
    r.onend = () => { rec.current = null; setListening(false); };
    r.start(); rec.current = r; setListening(true); setMsg("Listening… press Stop when you are done.");
  };
  const save = async () => { if (text.trim().length < 3) { setMsg("Say or type what happened first."); return; } setBusy(true); setMsg(J?.has_key ? "Sorting it out…" : "Saving…"); try { const e = await addEntry(text, localDate()); setText(""); onSaved?.(); setMsg(e.items.length ? `Logged ${e.items.length} thing${e.items.length === 1 ? "" : "s"}.` : e.parse_error ? `Saved as a note only: ${e.parse_error}` : "Saved."); load(); } catch (e) { setMsg(String((e as Error)?.message ?? e)); } finally { setBusy(false); } };
  return (
    <Card title={compact ? "Any updates?" : "What did you do today?"} sub={compact ? undefined : "A job fair, people you met, a mock interview, what you spent, how you slept. Say it or type it; it gets sorted into Network, Recall and Life."}>
      <textarea className={(compact ? "min-h-[56px]" : "min-h-[88px]") + " w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"} value={text} onChange={(e) => setText(e.target.value)} placeholder="Went to the NYC tech meetup, met three people. Did a mock interview, aced it. Google phone screen went okay." />
      <div className="mt-2 flex flex-wrap items-center gap-2">{canMic ? <button className={listening ? "inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white" : btnGhost} onClick={mic}>{listening ? "Stop" : "Speak"}</button> : <span className="text-xs text-neutral-400">Dictation needs Chrome or Safari.</span>}<button className={btn} disabled={busy} onClick={save}>Save</button>{msg ? <span role="status" aria-live="polite" className="text-sm text-neutral-600">{msg}</span> : null}{J && !J.has_key ? <span className="text-xs text-neutral-500">Add an AI key in <Link className="underline" href="/settings">Settings</Link> and notes get sorted into people, events and interviews.</span> : null}</div>
      {J?.entries.length && !compact ? <ul className="mt-4 divide-y divide-neutral-100">{J.entries.slice(0, 8).map((e) => <li key={e.id} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-xs text-neutral-500">{e.date} {e.time}</p><p className="text-sm">{e.summary || e.text}</p>{e.items.length ? <div className="mt-1 flex flex-wrap gap-1">{e.items.map((i) => <span key={i.id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">{line(i)}</span>)}</div> : e.parse_error ? <p className="text-xs text-amber-700">Saved as a note only: {e.parse_error}</p> : null}</div><button className="text-xs text-neutral-400 hover:text-red-700" onClick={async () => { if (confirm("Remove this entry and what it added?")) { await deleteEntry(e.id); load(); } }}>Remove</button></li>)}</ul> : null}
    </Card>
  );
}
function line(i: Item): string {
  const r = i.rating ? ` ${i.rating}/10` : "";
  switch (i.type) {
    case "mock_interview": return `Mock interview${i.with ? ` with ${i.with}` : ""}${i.format ? ` · ${i.format}` : ""}${r}`;
    case "interview": return `Interview · ${i.company ?? ""}${i.stage ? ` · ${i.stage}` : ""}${r}`;
    case "event": return `Event · ${i.name ?? ""}${i.kind ? ` · ${i.kind}` : ""}`;
    case "person": return `Met ${i.name ?? "someone"}${i.company ? ` (${i.company})` : ""}${i.how_they_can_help ? ` · ${i.how_they_can_help}` : ""}`;
    case "study": return `Study · ${i.what ?? ""}${i.minutes ? ` · ${i.minutes} min` : ""}`;
    default: return String(i.notes ?? "");
  }
}
