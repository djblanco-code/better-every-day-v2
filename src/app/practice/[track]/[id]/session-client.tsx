"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDraft } from "./actions";
import { assess } from "./grade";
import type { Statement } from "@/lib/recall/statement";
import type { Track } from "@/lib/recall/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const DEFAULT_MIN = 25;

export function SessionClient(props: {
  track: Track; item: { id: string; title: string; difficulty: string; topic: string; url?: string };
  statement: Statement; draft: { text: string; startedAt: string | null }; best: number | null; attempts: number;
}) {
  const { track, item, statement } = props;
  const [text, setText] = useState(props.draft.text);
  const [startedAt, setStartedAt] = useState<number | null>(props.draft.startedAt ? Date.parse(props.draft.startedAt) : null);
  const [mins, setMins] = useState(DEFAULT_MIN);
  const [now, setNow] = useState(Date.now());
  const [saved, setSaved] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grading, setGrading] = useState<string | null>(null);
  const router = useRouter();

  // tick the clock once a second only while running
  useEffect(() => { if (startedAt == null) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [startedAt]);

  // debounced autosave (DB), so a draft from the phone shows up on the laptop
  const queueSave = (t: string, s: number | null) => {
    setSaved("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaved("saving");
      try { await saveDraft(track, item.id, t, s == null ? null : new Date(s).toISOString()); setSaved("saved"); } catch { setSaved("error"); }
    }, 800);
  };

  const elapsed = startedAt == null ? 0 : now - startedAt;
  const left = mins * 60000 - elapsed;
  const a = Math.abs(left), mm = Math.floor(a / 60000), ss = Math.floor((a % 60000) / 1000);
  const clock = `${left < 0 ? "-" : ""}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const clockColor = startedAt == null ? "" : left < 0 ? "text-red-600" : left < 120000 ? "text-amber-600" : "";

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 bg-neutral-50 px-4 py-5 text-neutral-900 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/today" className="text-sm text-neutral-600 hover:underline">← Today</a>
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-2">
          <span className={`min-w-[5ch] text-2xl font-semibold tabular-nums ${clockColor}`}>{startedAt == null ? `${String(mins).padStart(2, "0")}:00` : clock}</span>
          {startedAt == null ? (
            <button onClick={() => { const s = Date.now(); setStartedAt(s); setNow(s); queueSave(text, s); }} className="h-8 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">Start</button>
          ) : null}
          <select value={mins} onChange={(e) => setMins(+e.target.value)} className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm" aria-label="Timer length">
            {[15, 25, 35, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
      </div>

      <article className="mx-auto w-full max-w-[860px] rounded-2xl bg-white px-6 pb-6 pt-8 shadow-sm sm:px-12">
        <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {TRACK_NAME[track]}{item.difficulty ? ` · ${item.difficulty}` : ""}{item.topic ? ` · ${item.topic}` : ""}{props.attempts ? ` · best ${props.best}/10` : ""}
          {item.url ? <> · <a className="hover:underline" href={item.url} target="_blank" rel="noopener">LeetCode ↗</a></> : null}
        </p>
        {statement.source === "none" ? (
          <p className="mt-6 text-neutral-500">No local statement for this problem yet. <a className="underline" href={statement.url} target="_blank" rel="noopener">Read it on LeetCode</a>, then write here.</p>
        ) : (
          <div className="mt-6 text-[15px] leading-7" dangerouslySetInnerHTML={{ __html: statement.html }} />
        )}
        <hr className="my-6 border-neutral-200" />
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); queueSave(e.target.value, startedAt); }}
          spellCheck={false}
          placeholder="Write your solution and your reasoning here. Nothing is executed."
          className="min-h-[480px] w-full resize-y bg-transparent font-mono text-[14px] leading-7 outline-none"
        />
      </article>

      <div className="mx-auto flex w-full max-w-[860px] flex-wrap items-center gap-3 text-sm">
        <button
          disabled={grading === "…" || text.trim().length < 20}
          onClick={async () => {
            if (timer.current) clearTimeout(timer.current);
            setGrading("…");
            const used = startedAt == null ? 0 : Math.round(((Date.now() - startedAt) / 60000) * 10) / 10;
            const d = new Date(); const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            try { const r = await assess({ track, id: item.id, answer: text, minutes_used: used, timer_minutes: mins, clientDate: local }); router.push(`/history/${r.session_id}`); }
            catch (e) { setGrading(String((e as Error)?.message ?? e)); }
          }}
          className="h-10 rounded-lg bg-neutral-900 px-4 font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >{grading === "…" ? "Grading…" : "Submit for grading"}</button>
        {grading && grading !== "…" ? <span className="text-red-700">{grading}</span> : null}
        <span className="text-neutral-500">{text.length} chars · {saved === "saved" ? "saved" : saved === "saving" ? "saving…" : saved === "error" ? "not saved (offline?)" : "unsaved"}</span>
      </div>
    </main>
  );
}
