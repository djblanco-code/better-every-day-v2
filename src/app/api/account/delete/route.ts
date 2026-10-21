import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

// Delete the signed-in user's account. Deleting the auth user cascades to public.users (and later tables).
// This is the one place the secret key is used, server-side only, and only against the caller's own id.
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== data.user.email) {
    return NextResponse.json({ error: "Type your email address to confirm." }, { status: 400 });
  }
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Account deletion is not configured on this deployment." }, { status: 503 });
  const admin = createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, secret, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
