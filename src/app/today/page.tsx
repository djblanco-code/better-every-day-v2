import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "@/lib/auth/routes";

// Placeholder for the Recall "Today" page (task 1.4). For 0.4 it proves the session reaches a server component.
export const dynamic = "force-dynamic";   // never prerendered: it depends on the session cookie and runtime env
export default async function Today() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(SIGN_IN_PATH);
  const provider = data.user.app_metadata?.provider ?? "unknown";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-sm text-neutral-500">Task 0.4 · signed in</p>
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      <p className="text-neutral-600">
        Signed in as <span className="font-medium text-neutral-900">{data.user.email}</span> via {provider}.
      </p>
      <form action="/auth/sign-out" method="post">
        <button className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50">Sign out</button>
      </form>
    </main>
  );
}
