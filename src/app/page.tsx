import { publicEnv } from "@/lib/env";

export default function Home() {
  const env = publicEnv();
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <p className="text-sm text-neutral-500">Task 0.2 · hello</p>
      <h1 className="text-3xl font-semibold tracking-tight">Better Every Day</h1>
      <p className="text-neutral-600">
        Deployed and configured. Supabase project: <code className="rounded bg-neutral-100 px-1">{host}</code>
      </p>
    </main>
  );
}
