import { publicEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { ACTIVE } from "@/lib/jobs/types";
import { TodayClient } from "./today/today-client";
import { InstallHint } from "./install-hint";
import { sessionUser } from "@/lib/supabase/session";

// Signed out: a short landing with sign-in. Signed in: the launcher (journal + the three apps with live counts).
export const dynamic = "force-dynamic";

export default async function Home() {
  let host: string | null = null, problem: string | null = null;
  try { host = new URL(publicEnv().NEXT_PUBLIC_SUPABASE_URL).host; } catch (e) { problem = e instanceof Error ? e.message : String(e); }
  const supabase = host ? await supabaseServer() : null;
  const user = supabase ? (await sessionUser(supabase)).user : null;
  if (!user || !supabase) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Better Every Day</h1>
        <p className="text-neutral-600">One hour a day of interview practice, every application in one place, and the people who can help. Private, invite-only, your own AI key.</p>
        {host ? <a href="/sign-in" className="inline-flex h-10 w-fit items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink hover:brightness-110">Sign in</a> : <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-medium">Deployed, but not configured yet.</p><p className="mt-1">Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in Vercel, then redeploy.</p><pre className="mt-2 whitespace-pre-wrap text-xs">{problem}</pre></div>}
      </main>
    );
  }
  const [apps, people, events] = await Promise.all([
    supabase.from("applications").select("stage,kind").eq("kind", "applied"),
    supabase.from("people").select("id"),
    supabase.from("events").select("id"),
  ]);
  const A = (apps.data ?? []) as { stage: string }[];
  return <TodayClient email={user.email ?? ""} counts={{ apps: A.length, interviewing: A.filter((a) => (ACTIVE as string[]).includes(a.stage)).length, people: people.data?.length ?? 0, events: events.data?.length ?? 0 }} top={<InstallHint />} />;
}
