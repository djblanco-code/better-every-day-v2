import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Action, Application, Assessment, JobsState, Search } from "./types";

// Loads the Jobs state for the signed-in user, scoped to a search window (port of v1 state(sid)).
export async function loadJobs(supabase: SupabaseClient, userId: string, sid: string | null, today: string): Promise<JobsState> {
  const [s, a, as, ac] = await Promise.all([
    supabase.from("searches").select("id,name,start,end").order("start"),
    supabase.from("applications").select("id,company,role,location,pay,url,source,stage,applied_on,notes,follow_up,history,record,search_id,kind,blocker,todo,todo_status").order("applied_on", { ascending: false }),
    supabase.from("assessments").select("id,company,role,platform,minutes,invited,due,status,notes"),
    supabase.from("actions").select("id,company,text,type,due,note,done"),
  ]);
  for (const r of [s, a, as, ac]) if (r.error) throw new Error("jobs: " + r.error.message);
  let searches = (s.data ?? []) as Search[];
  if (!searches.length) {
    const first = ((a.data ?? []) as Application[]).map((x) => x.applied_on).sort()[0] ?? today;
    const row = { id: "s1", user_id: userId, name: "Job search 1", start: first, end: null };
    await supabase.from("searches").insert(row);
    searches = [{ id: "s1", name: "Job search 1", start: first, end: null }];
  }
  const cur = searches.find((x) => !x.end) ?? searches[searches.length - 1];
  const view = sid === "all" ? null : searches.find((x) => x.id === sid) ?? cur;
  const inside = (d: string) => !view || (view.start <= d && (!view.end || d < view.end));
  const all = (a.data ?? []) as Application[];
  const apps = all.filter((x) => x.kind === "applied" && inside(x.applied_on));
  const todo = all.filter((x) => x.kind === "todo" && inside(x.applied_on));
  const assessments = ((as.data ?? []) as Assessment[]).filter((x) => !view || view === cur || inside(x.invited ?? x.due ?? ""));
  const actions = ((ac.data ?? []) as Action[]).filter((x) => !view || view === cur || inside(x.due ?? ""));
  return { apps, todo, assessments, actions, searches, search: cur.id, viewing: view ? view.id : "all", today };
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
