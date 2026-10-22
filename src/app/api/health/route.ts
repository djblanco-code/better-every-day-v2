import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// Health + keep-alive. The daily Vercel cron (vercel.json) calls this; the `ping()` RPC is the cheapest statement
// that counts as database activity, which stops a free Supabase project from pausing after 7 idle days. When
// CRON_SECRET is set, only Vercel's cron (which sends it as a bearer token) may call it.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const t0 = Date.now();
  try {
    const env = publicEnv();
    const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.rpc("ping");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
    return NextResponse.json({ ok: true, db_time: data, ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 503 });
  }
}
