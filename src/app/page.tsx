import { publicEnv } from "@/lib/env";

// Rendered per request so a missing env var is reported on the page instead of failing the build.
export const dynamic = "force-dynamic";

export default function Home() {
  let host: string | null = null;
  let problem: string | null = null;
  try {
    host = new URL(publicEnv().NEXT_PUBLIC_SUPABASE_URL).host;
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-sm text-neutral-500">Task 0.3 · hello</p>
      <h1 className="text-3xl font-semibold tracking-tight">Better Every Day</h1>
      {host ? (
        <p className="text-neutral-600">
          Deployed and configured. Supabase project: <code className="rounded bg-neutral-100 px-1">{host}</code>
        </p>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Deployed, but not configured yet.</p>
          <p className="mt-1">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in
            Vercel → Settings → Environment Variables (all environments), then redeploy.
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-amber-800">{problem}</pre>
        </div>
      )}
    </main>
  );
}
