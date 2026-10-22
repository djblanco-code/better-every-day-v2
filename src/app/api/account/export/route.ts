import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/supabase/session";

// Export everything the signed-in user owns as JSON (PRD section 5: privacy). RLS guarantees the query can only
// ever return this user's rows, so no user_id filter is needed here; later tables are appended to EXPORT_TABLES.
const EXPORT_TABLES = ["users"] as const;

export async function GET() {
  const supabase = await supabaseServer();
  const data = await sessionUser(supabase);
  if (!data.user) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: data.user.id };
  for (const t of EXPORT_TABLES) {
    const { data: rows, error } = await supabase.from(t).select("*");
    out[t] = error ? { error: error.message } : rows;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="better-every-day-export.json"` },
  });
}
