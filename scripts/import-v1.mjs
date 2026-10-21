// One-off import of a v1 Recall state (please-hire-me/state/recall.json) into the signed-in user's v2 rows.
//   node scripts/import-v1.mjs <path-to-recall.json> --user <uuid>            (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY)
//   node scripts/import-v1.mjs <path-to-recall.json> --user <uuid> --sql      (prints SQL for the Supabase SQL editor)
// Idempotent: upserts on the natural keys. Progress, sessions, external reps, program (start/done/minutes/snapshots), plans.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [, , file, ...rest] = process.argv;
const user = rest[rest.indexOf("--user") + 1];
if (!file || !user) { console.error("usage: node scripts/import-v1.mjs state/recall.json --user <uuid> [--sql]"); process.exit(2); }
const v1 = JSON.parse(readFileSync(file, "utf8"));

const progress = Object.entries(v1.items ?? {}).map(([k, p]) => {
  const [track, item_id] = k.split(/:(.+)/);
  return { user_id: user, track, item_id, attempts: p.attempts ?? 0, best: p.best ?? 0, last: p.last ?? null, last_date: p.last_date ?? null, interval: p.interval ?? 0, next_due: p.next_due ?? null };
});
const sessions = (v1.sessions ?? []).map((s) => ({
  id: s.id, user_id: user, date: s.date, time: s.time ?? "00:00", track: s.track, item_id: s.item, title: s.title ?? "", difficulty: s.difficulty ?? "", topic: s.topic ?? "",
  minutes_used: s.minutes_used ?? null, timer_minutes: s.timer_minutes ?? null, score: s.score, sub: s.sub ?? {}, verdict: s.verdict ?? "", strengths: s.strengths ?? [], gaps: s.gaps ?? [],
  next_step: s.next_step ?? "", model_outline: s.model_outline ?? "", answer: s.answer ?? "", grader: s.grader ?? 1, model: s.model ?? null,
}));
const reps = (v1.external ?? []).map((e) => ({ id: e.id ?? `${e.date}-${Math.random().toString(36).slice(2, 8)}`, user_id: user, date: e.date, kind: e.kind, with_who: e.with ?? "", format: e.format ?? "", rating: e.rating ?? null, minutes: e.minutes ?? null, notes: e.notes ?? "" }));
const pr = v1.program ?? {};
const program = { user_id: user, start: pr.start ?? null, done: pr.done ?? {}, minutes: pr.minutes ?? {}, snapshots: pr.snapshots ?? {} };
const plans = Object.entries(v1.plans ?? {}).map(([date, plan]) => ({ user_id: user, date, plan }));

if (rest.includes("--sql")) {
  const lit = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
  const j = (v) => lit(JSON.stringify(v)) + "::jsonb";
  const out = ["begin;"];
  for (const p of progress) out.push(`insert into public.progress (user_id,track,item_id,attempts,best,last,last_date,interval,next_due) values (${lit(p.user_id)},${lit(p.track)},${lit(p.item_id)},${p.attempts},${p.best},${lit(p.last)},${lit(p.last_date)},${p.interval},${lit(p.next_due)}) on conflict (user_id,track,item_id) do update set attempts=excluded.attempts,best=excluded.best,last=excluded.last,last_date=excluded.last_date,interval=excluded.interval,next_due=excluded.next_due;`);
  for (const s of sessions) out.push(`insert into public.sessions (id,user_id,date,time,track,item_id,title,difficulty,topic,minutes_used,timer_minutes,score,sub,verdict,strengths,gaps,next_step,model_outline,answer,grader,model) values (${lit(s.id)},${lit(s.user_id)},${lit(s.date)},${lit(s.time)},${lit(s.track)},${lit(s.item_id)},${lit(s.title)},${lit(s.difficulty)},${lit(s.topic)},${lit(s.minutes_used)},${lit(s.timer_minutes)},${s.score},${j(s.sub)},${lit(s.verdict)},${j(s.strengths)},${j(s.gaps)},${lit(s.next_step)},${lit(s.model_outline)},${lit(s.answer)},${lit(s.grader)},${lit(s.model)}) on conflict (id) do nothing;`);
  for (const e of reps) out.push(`insert into public.external_reps (id,user_id,date,kind,with_who,format,rating,minutes,notes) values (${lit(e.id)},${lit(e.user_id)},${lit(e.date)},${lit(e.kind)},${lit(e.with_who)},${lit(e.format)},${lit(e.rating)},${lit(e.minutes)},${lit(e.notes)}) on conflict (id) do nothing;`);
  out.push(`insert into public.program (user_id,start,done,minutes,snapshots) values (${lit(program.user_id)},${lit(program.start)},${j(program.done)},${j(program.minutes)},${j(program.snapshots)}) on conflict (user_id) do update set start=coalesce(public.program.start, excluded.start),done=public.program.done||excluded.done,minutes=public.program.minutes||excluded.minutes,snapshots=public.program.snapshots||excluded.snapshots;`);
  for (const p of plans) out.push(`insert into public.plans (user_id,date,plan) values (${lit(p.user_id)},${lit(p.date)},${j(p.plan)}) on conflict (user_id,date) do nothing;`);
  out.push("commit;", `select 'imported' as r, (select count(*) from public.progress where user_id=${lit(user)}) as progress, (select count(*) from public.sessions where user_id=${lit(user)}) as sessions, (select count(*) from public.external_reps where user_id=${lit(user)}) as reps;`);
  process.stdout.write(out.join("\n") + "\n");
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, or use --sql."); process.exit(2); }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const up = async (t, rows, onConflict) => { if (!rows.length) return; const { error } = await sb.from(t).upsert(rows, { onConflict }); if (error) throw new Error(t + ": " + error.message); };
  await up("progress", progress, "user_id,track,item_id");
  await up("sessions", sessions, "id");
  await up("external_reps", reps, "id");
  await up("program", [program], "user_id");
  await up("plans", plans, "user_id,date");
  console.log(`imported: ${progress.length} progress, ${sessions.length} sessions, ${reps.length} reps, ${plans.length} plans`);
}
