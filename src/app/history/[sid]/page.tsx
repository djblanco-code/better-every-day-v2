import Link from "next/link";
import { Shell } from "@/app/shell";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import type { Track } from "@/lib/recall/types";
import { sessionUser } from "@/lib/supabase/session";

const TRACK_NAME: Record<Track, string> = { leetcode: "LeetCode", python: "Python", system_design: "System Design", dsa: "Data Structures & Algorithms", debugging: "Debugging" };
const tone = (s: number) => (s >= 8 ? "#16a34a" : s >= 5 ? "#d97706" : "#dc2626");
export const dynamic = "force-dynamic";

// One graded session: score ring, sub-scores, strengths, gaps, next step, outline, what you wrote.
export default async function Result({ params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  const supabase = await supabaseServer();
  const auth = await sessionUser(supabase);
  if (!auth.user) redirect(SIGN_IN_PATH);
  const { data: s } = await supabase.from("sessions").select("*").eq("id", sid).maybeSingle();
  if (!s) notFound();
  const { data: p } = await supabase.from("progress").select("best,next_due").eq("track", s.track).eq("item_id", s.item_id).maybeSingle();
  const track = s.track as Track;
  const sub = s.sub as Record<string, number>;
  const labels: [string, string][] = [
    ["correctness", track === "debugging" ? "Root cause" : "Correctness"],
    ["complexity", track === "system_design" ? "Scalability" : track === "debugging" ? "Method" : "Complexity"],
    ["code_quality", track === "system_design" ? "Structure" : track === "debugging" ? "The fix" : "Code quality"],
    ["communication", "Communication"],
  ];
  return (
    <Shell width="read">
      <div><Link href="/" className="text-sm text-neutral-600 hover:underline">← Today</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-sm text-neutral-500">{TRACK_NAME[track]} · {s.date} {s.time} · {s.minutes_used} of {s.timer_minutes} min · grader v{s.grader} · {s.model}</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:col-span-2">
          <div className="grid h-28 w-28 flex-none place-items-center rounded-full" style={{ background: `conic-gradient(${tone(s.score)} ${s.score * 36}deg, #e5e7eb 0)` }}>
            <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white text-2xl font-semibold">{s.score}<span className="text-xs text-neutral-400">/10</span></div>
          </div>
          <div><p className="font-medium">{s.verdict}</p><p className="mt-1 text-sm text-neutral-500">Best on this problem: {p?.best ?? s.score}/10 · next review {p?.next_due ?? "–"}</p></div>
        </div>
        <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          {labels.map(([k, l]) => (
            <div key={k} className="flex items-center justify-between text-sm"><span className="text-neutral-500">{l}</span>
              <div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${(sub[k] ?? 0) * 10}%`, background: tone(sub[k] ?? 0) }} /></div><span className="w-5 text-right font-semibold">{sub[k] ?? 0}</span></div></div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Strengths"><ul className="list-disc space-y-1 pl-5 text-sm">{(s.strengths as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></Card>
        <Card title="Gaps to fix"><ul className="list-disc space-y-1 pl-5 text-sm">{(s.gaps as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></Card>
      </div>
      <Card title="Next step"><p className="text-sm">{s.next_step}</p></Card>
      <details className="rounded-2xl border border-neutral-200 bg-white"><summary className="cursor-pointer px-5 py-3 text-sm font-medium">Outline of a strong answer</summary><pre className="whitespace-pre-wrap border-t border-neutral-200 px-5 py-4 font-sans text-sm">{s.model_outline}</pre></details>
      <details className="rounded-2xl border border-neutral-200 bg-white"><summary className="cursor-pointer px-5 py-3 text-sm font-medium text-neutral-600">What you wrote</summary><pre className="whitespace-pre-wrap border-t border-neutral-200 px-5 py-4 font-mono text-[13px] leading-6">{s.answer}</pre></details>
      <div className="flex flex-wrap gap-2">
        <a href={`/practice/${track}/${encodeURIComponent(s.item_id)}`} className="inline-flex h-10 items-center rounded-lg border border-neutral-300 px-4 text-sm hover:bg-neutral-50">Try it again</a>
        <Link href="/" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110">Back to Today</Link>
      </div>
    </Shell>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="mb-2 font-medium">{title}</h2>{children}</section>;
}
