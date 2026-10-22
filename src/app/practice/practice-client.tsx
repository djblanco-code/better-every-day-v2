"use client";
import { useEffect, useMemo, useState } from "react";
import { getPractice, type PracticeData } from "./actions";
import type { Track } from "@/lib/recall/types";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "DSA", debugging: "Debugging" };
const TRACKS = Object.keys(TRACK_NAME) as Track[];
const DIFF_TONE: Record<string, string> = { Easy: "bg-green-50 text-green-700", Medium: "bg-amber-50 text-amber-700", Hard: "bg-red-50 text-red-700" };
const field = "h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm";
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function PracticeClient({ initialTrack }: { initialTrack: string }) {
  const [track, setTrack] = useState<Track>((TRACKS as string[]).includes(initialTrack) ? (initialTrack as Track) : "leetcode");
  const [D, setD] = useState<PracticeData | null>(null);
  const [f, setF] = useState({ q: "", d: "", c: "", list: "", co: "", due: true });
  useEffect(() => { setD(null); getPractice(track).then(setD).catch(() => setD(null)); }, [track]);
  const today = localDate();

  const L = useMemo(() => {
    if (!D) return [];
    const q = f.q.toLowerCase();
    let out = D.items.filter((i) => (!q || (i.title + " " + (i.topics ?? []).join(" ")).toLowerCase().includes(q)) && (!f.d || i.difficulty === f.d) && (!f.c || i.topic === f.c) && (!f.list || (i.lists ?? []).includes(f.list)) && (!f.co || ((i as { companies?: string[] }).companies ?? []).includes(f.co)));
    if (f.due) out = out.filter((i) => { const p = D.progress[i.id]; return !p?.attempts || (p.next_due && p.next_due <= today); });
    return out;
  }, [D, f, today]);
  const next = useMemo(() => {
    if (!D) return null;
    return L.find((i) => { const p = D.progress[i.id]; return p?.next_due && p.next_due <= today; }) ?? L.find((i) => !D.progress[i.id]?.attempts) ?? L[0] ?? null;
  }, [D, L, today]);
  const href = (id: string) => `/practice/${track}/${encodeURIComponent(id)}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6">
      <div><a href="/today" className="text-sm text-neutral-600 hover:underline">← Today</a><h1 className="text-3xl font-semibold tracking-tight">Practice</h1></div>
      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-200/60 p-1 self-start">{TRACKS.map((t) => <button key={t} onClick={() => { setTrack(t); setF({ ...f, c: "", list: "", co: "" }); }} className={`rounded-lg px-3 py-1.5 text-sm ${t === track ? "bg-white shadow-sm" : "text-neutral-600"}`}>{TRACK_NAME[t]}</button>)}</div>
      {!D ? <p className="text-neutral-500">Loading…</p> : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${field} w-56`} placeholder="Search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <select className={field} value={f.d} onChange={(e) => setF({ ...f, d: e.target.value })}><option value="">Any difficulty</option>{["Easy", "Medium", "Hard"].map((x) => <option key={x}>{x}</option>)}</select>
            <select className={field} value={f.c} onChange={(e) => setF({ ...f, c: e.target.value })}><option value="">Any topic</option>{D.categories.map((x) => <option key={x}>{x}</option>)}</select>
            {track === "leetcode" ? <>
              <select className={field} value={f.list} onChange={(e) => setF({ ...f, list: e.target.value })}><option value="">Any list</option><option value="neetcode150">NeetCode 150</option><option value="blind75">Blind 75</option><option value="neetcode250">NeetCode 250</option>{D.company_lists.map((c) => <option key={c} value={`company:${c}`}>{c} · last 30 days</option>)}</select>
              <select className={field} value={f.co} onChange={(e) => setF({ ...f, co: e.target.value })}><option value="">Any company</option>{D.companies.map((c) => <option key={c}>{c}</option>)}</select>
            </> : null}
            <label className="ml-auto flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={f.due} onChange={(e) => setF({ ...f, due: e.target.checked })} />Due and new only</label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {next ? <a href={href(next.id)} className="inline-flex h-9 items-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800">Start next: {next.title}</a> : null}
            {L.length ? <a href={href(L[Math.floor(Math.random() * L.length)].id)} className="inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm hover:bg-neutral-50">Random</a> : null}
            <span className="text-sm text-neutral-500">{L.length} of {D.items.length}</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <table className="tbl-cards w-full text-sm">
              <thead><tr className="text-left text-xs text-neutral-500"><th className="px-4 py-2">Problem</th><th className="px-4 py-2">Difficulty</th><th className="px-4 py-2">Topic</th>{track === "leetcode" ? <th className="px-4 py-2">Companies</th> : null}<th className="px-4 py-2">Best</th><th className="px-4 py-2">Next due</th></tr></thead>
              <tbody>{L.slice(0, 300).map((i) => { const p = D.progress[i.id]; const due = p?.next_due && p.next_due <= today; const cos = (i as { companies?: string[]; company_count?: number }); return (
                <tr key={i.id} className="cursor-pointer border-t border-neutral-100 hover:bg-neutral-50" onClick={() => { window.location.href = href(i.id); }}>
                  <td className="px-4 py-2"><div className="font-medium">{i.title}</div>{track === "leetcode" ? <div className="text-xs text-neutral-500">{(i.lists ?? []).includes("blind75") ? "Blind 75 · " : ""}{(i.lists ?? []).includes("neetcode150") ? "NeetCode 150" : (i.lists ?? []).includes("neetcode250") ? "NeetCode 250" : (i.lists ?? []).filter((l) => l.startsWith("company:")).map((l) => l.slice(8) + " · 30 days").join(", ")}</div> : null}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${DIFF_TONE[String(i.difficulty)] ?? "bg-neutral-100"}`}>{i.difficulty || "–"}</span></td>
                  <td className="px-4 py-2 text-neutral-600">{i.topic}</td>
                  {track === "leetcode" ? <td className="px-4 py-2 text-neutral-600">{(cos.companies ?? []).slice(0, 3).join(", ")}{(cos.company_count ?? 0) > 3 ? ` +${(cos.company_count ?? 0) - 3}` : ""}</td> : null}
                  <td className="px-4 py-2">{p?.attempts ? <span className={`rounded-full px-2 py-0.5 text-xs ${p.best >= 8 ? "bg-green-50 text-green-700" : p.best >= 5 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{p.best}/10</span> : <span className="text-neutral-400">–</span>}</td>
                  <td className="px-4 py-2">{p?.next_due ? <span className={`rounded-full px-2 py-0.5 text-xs ${due ? "bg-amber-50 text-amber-700" : "bg-neutral-100"}`}>{due ? "Due" : p.next_due}</span> : <span className="text-neutral-400">new</span>}</td>
                </tr>); })}</tbody>
            </table>
            {!L.length ? <p className="p-8 text-center text-sm text-neutral-500">Nothing matches.</p> : null}
          </div>
        </>
      )}
    </main>
  );
}
